"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buzz } from "./haptics";

export interface VoiceNote {
  blob: Blob | null;
  ms: number;
}

const MIN_MS = 400;

/**
 * Hold-to-record voice. The mic is only opened while holding (no prompt on page
 * load). Without a mic it still "records" (timer only) so the flow keeps working.
 */
export function useVoiceNote(maxMs = 60_000) {
  const [recording, setRecording] = useState(false);
  const [ms, setMs] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const t0 = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const holding = useRef(false);
  const onMax = useRef<(() => void) | null>(null);

  const release = () => {
    clearInterval(tick.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };

  const start = useCallback(
    async (whenMaxed?: () => void) => {
      if (holding.current) return;
      holding.current = true;
      onMax.current = whenMaxed ?? null;
      chunks.current = [];
      t0.current = Date.now();
      setMs(0);
      setRecording(true);
      buzz(10);
      tick.current = setInterval(() => {
        const e = Date.now() - t0.current;
        setMs(e);
        if (e >= maxMs) onMax.current?.();
      }, 100);
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!holding.current) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        const r = new MediaRecorder(s);
        r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
        r.start(250);
        rec.current = r;
      } catch {
        rec.current = null; // no mic: timer-only
      }
    },
    [maxMs],
  );

  /** Release. Resolves null for a too-short tap. */
  const stop = useCallback(async (): Promise<VoiceNote | null> => {
    if (!holding.current) return null;
    holding.current = false;
    const duration = Date.now() - t0.current;
    setRecording(false);
    buzz(10);
    const r = rec.current;
    rec.current = null;
    const blob = await new Promise<Blob | null>((resolve) => {
      if (!r || r.state === "inactive") return resolve(null);
      r.onstop = () => resolve(chunks.current.length ? new Blob(chunks.current, { type: r.mimeType }) : null);
      try {
        r.stop();
      } catch {
        resolve(null);
      }
    });
    release();
    return duration < MIN_MS ? null : { blob, ms: duration };
  }, []);

  useEffect(() => () => release(), []);

  return { recording, ms, start, stop };
}
