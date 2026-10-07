"use client";

import { useMotionValue } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { buzz } from "./haptics";

// getUserMedia calls must never overlap: with two in flight, stopping one can
// kill the other's video track (and some phones refuse a second camera open).
// React StrictMode's double effect in dev would otherwise trigger exactly that.
let mediaQueue: Promise<void> = Promise.resolve();
function serial(task: () => Promise<void>): Promise<void> {
  const run = mediaQueue.then(task);
  mediaQueue = run.catch(() => undefined);
  return run;
}

export type MediaPermission = "pending" | "granted" | "audio-only" | "denied" | "unavailable";

export interface Recording {
  audioBlob: Blob | null;
  /** The full clip, only used to replay the user's own video in the UI. */
  videoBlob: Blob | null;
  /** JPEG frames for the backend. Never rendered. */
  frames: string[];
  durationMs: number;
}

interface Options {
  maxMs?: number;
  maxFrames?: number;
  frameIntervalMs?: number;
  /** Called when the max duration is hit while still holding. */
  onAutoStop?: (r: Recording) => void;
  /** Start in voice-only mode (no camera request). */
  initialVideo?: boolean;
}

function stopRecorder(rec: MediaRecorder | null, chunks: Blob[]): Promise<Blob | null> {
  if (!rec || rec.state === "inactive") return Promise.resolve(chunks.length ? new Blob(chunks) : null);
  return new Promise((resolve) => {
    rec.onstop = () => resolve(chunks.length ? new Blob(chunks, { type: rec.mimeType }) : null);
    try {
      rec.stop();
    } catch {
      resolve(null);
    }
  });
}

/**
 * Camera + mic for the hold-to-record bubble.
 *
 * - Live preview stream via getUserMedia (front camera by default).
 * - While recording: audio (and the full clip) via MediaRecorder, a JPEG frame
 *   every second for the backend (last N kept), and a live volume `level`
 *   (0..1 motion value) for the doodles.
 * - Degrades: no camera → audio only; nothing → still "records" (timer and UI),
 *   returning an empty recording so the flow keeps working.
 */
export function useRecorder({ maxMs = 60_000, maxFrames = 6, frameIntervalMs = 1000, onAutoStop, initialVideo = true }: Options = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRec = useRef<MediaRecorder | null>(null);
  const videoRec = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const videoChunks = useRef<Blob[]>([]);
  const framesRef = useRef<string[]>([]);
  const frameTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const tickTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const raf = useRef(0);
  const audioCtx = useRef<AudioContext | null>(null);
  const startedAt = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onAutoStopRef = useRef(onAutoStop);
  onAutoStopRef.current = onAutoStop;

  const level = useMotionValue(0);
  const [permission, setPermission] = useState<MediaPermission>("pending");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [videoOn, setVideoOn] = useState(initialVideo);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // (Re)acquire the stream whenever camera direction or video toggle changes.
  useEffect(() => {
    let cancelled = false;
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!md?.getUserMedia) {
      setPermission("unavailable");
      return;
    }
    void serial(async () => {
      if (cancelled) return;
      // Release the old camera first: phones can't open two at once.
      stopStream();
      let stream: MediaStream | null = null;
      let next: MediaPermission = "denied";
      if (videoOn) {
        try {
          stream = await md.getUserMedia({
            video: { facingMode, width: { ideal: 640 }, height: { ideal: 640 } },
            audio: true,
          });
          next = "granted";
        } catch (err) {
          console.warn("[useRecorder] camera unavailable, trying audio only:", err);
        }
      }
      if (!stream) {
        try {
          stream = await md.getUserMedia({ audio: true });
          next = "audio-only";
        } catch (err) {
          console.warn("[useRecorder] mic unavailable:", err);
          next = "denied";
        }
      }
      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setPermission(next);
      if (videoRef.current) {
        videoRef.current.srcObject = stream && stream.getVideoTracks().length ? stream : null;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [facingMode, videoOn, stopStream]);

  // Release the camera on unmount.
  useEffect(() => stopStream, [stopStream]);

  // Keep the <video> element attached if it mounts after the stream.
  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current?.getVideoTracks().length) el.srcObject = streamRef.current;
  }, []);

  const grabFrame = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !streamRef.current?.getVideoTracks().length) return;
    const size = 240;
    const c = canvasRef.current ?? (canvasRef.current = document.createElement("canvas"));
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // Center-crop to a square, matching the round preview.
    const s = Math.min(v.videoWidth, v.videoHeight);
    ctx.save();
    if (facingMode === "user") {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, size, size);
    ctx.restore();
    framesRef.current = [...framesRef.current, c.toDataURL("image/jpeg", 0.7)].slice(-maxFrames);
  }, [facingMode, maxFrames]);

  const stopMeter = useCallback(() => {
    cancelAnimationFrame(raf.current);
    void audioCtx.current?.close().catch(() => undefined);
    audioCtx.current = null;
    level.set(0);
  }, [level]);

  /** Live volume for the doodles. Falls back to a gentle fake wobble. */
  const startMeter = useCallback(
    (tracks: MediaStreamTrack[]) => {
      const Ctx = typeof window !== "undefined" ? window.AudioContext : undefined;
      if (tracks.length && Ctx) {
        try {
          const ctx = new Ctx();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          ctx.createMediaStreamSource(new MediaStream(tracks)).connect(analyser);
          audioCtx.current = ctx;
          const buf = new Uint8Array(analyser.fftSize);
          const loop = () => {
            analyser.getByteTimeDomainData(buf);
            let sum = 0;
            for (const b of buf) sum += ((b - 128) / 128) ** 2;
            level.set(Math.min(1, Math.sqrt(sum / buf.length) * 5));
            raf.current = requestAnimationFrame(loop);
          };
          loop();
          return;
        } catch {
          /* fall through to fake */
        }
      }
      const loop = () => {
        level.set(0.35 + 0.3 * Math.abs(Math.sin(Date.now() / 180)));
        raf.current = requestAnimationFrame(loop);
      };
      loop();
    },
    [level],
  );

  const finish = useCallback(async (): Promise<Recording> => {
    clearInterval(frameTimer.current);
    clearInterval(tickTimer.current);
    stopMeter();
    const durationMs = Date.now() - startedAt.current;
    setRecording(false);
    buzz(10);
    const frames = framesRef.current;
    const [audioBlob, videoBlob] = await Promise.all([
      stopRecorder(audioRec.current, audioChunks.current),
      stopRecorder(videoRec.current, videoChunks.current),
    ]);
    audioRec.current = null;
    videoRec.current = null;
    return { audioBlob, videoBlob, frames, durationMs };
  }, [stopMeter]);

  const start = useCallback(() => {
    if (recording) return;
    framesRef.current = [];
    audioChunks.current = [];
    videoChunks.current = [];
    setElapsedMs(0);
    startedAt.current = Date.now();
    setRecording(true);
    buzz(10);

    const stream = streamRef.current;
    const audioTracks = stream?.getAudioTracks() ?? [];
    const make = (s: MediaStream, chunks: Blob[]) => {
      try {
        const rec = new MediaRecorder(s);
        rec.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        rec.start(250);
        return rec;
      } catch {
        return null;
      }
    };
    if (typeof MediaRecorder !== "undefined") {
      if (audioTracks.length) audioRec.current = make(new MediaStream(audioTracks), audioChunks.current);
      if (stream?.getVideoTracks().length) videoRec.current = make(stream, videoChunks.current);
    }
    startMeter(audioTracks);

    grabFrame();
    frameTimer.current = setInterval(grabFrame, frameIntervalMs);
    tickTimer.current = setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsedMs(ms);
      if (ms >= maxMs) {
        void finish().then((r) => onAutoStopRef.current?.(r));
      }
    }, 100);
  }, [recording, grabFrame, frameIntervalMs, maxMs, finish, startMeter]);

  /** Release: stop and return what was captured. */
  const stop = useCallback(() => (recording ? finish() : Promise.resolve(null)), [recording, finish]);

  /** Cancel without sending (e.g. a tap that was too short). */
  const cancel = useCallback(() => {
    if (recording) void finish();
  }, [recording, finish]);

  useEffect(
    () => () => {
      clearInterval(frameTimer.current);
      clearInterval(tickTimer.current);
      cancelAnimationFrame(raf.current);
      void audioCtx.current?.close().catch(() => undefined);
      for (const r of [audioRec.current, videoRec.current]) {
        try {
          r?.stop();
        } catch {
          /* already stopped */
        }
      }
    },
    [],
  );

  const hasVideo = permission === "granted" && videoOn;

  return {
    videoRef: attachVideo,
    permission,
    hasVideo,
    facingMode,
    flip: () => setFacingMode((f) => (f === "user" ? "environment" : "user")),
    videoOn,
    toggleVideo: () => setVideoOn((v) => !v),
    recording,
    elapsedMs,
    progress: Math.min(1, elapsedMs / maxMs),
    level,
    start,
    stop,
    cancel,
  };
}
