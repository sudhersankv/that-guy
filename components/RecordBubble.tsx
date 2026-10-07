"use client";

import { AnimatePresence, motion, useTransform, type MotionValue } from "framer-motion";
import { Mic, Video, VideoOff } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useRecorder, type Recording } from "@/lib/useRecorder";
import { toast } from "./Toast";

const MIN_HOLD_MS = 350;

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Waveform({ active, size }: { active: boolean; size: number }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-yellow">
      <div className="flex items-center gap-[6px]" style={{ height: size * 0.34 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className="w-[8px] rounded-full border-2 border-line bg-orange"
            style={{
              height: `${40 + ((i * 37) % 60)}%`,
              animation: `wave ${active ? 0.45 + (i % 3) * 0.12 : 1.4 + (i % 4) * 0.2}s ease-in-out ${i * 0.07}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Little doodle squiggles around the ring that pulse with your voice. */
function Squiggles({ level, radius, c }: { level: MotionValue<number>; radius: number; c: number }) {
  const scale = useTransform(level, [0, 1], [0.5, 1.5]);
  const opacity = useTransform(level, [0, 0.15, 1], [0.35, 0.8, 1]);
  const shapes = ["M0 -6 q5 -6 10 0 t10 0", "M0 0 L14 0", "M0 -5 L5 5 L10 -5 L15 5", "M0 0 q7 -10 14 0"];
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * 360 + 14;
        return (
          <g key={i} transform={`translate(${c} ${c}) rotate(${a}) translate(${radius} 0)`}>
            <motion.path
              d={shapes[i % shapes.length]}
              stroke="#141210"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{ scale, opacity, transformBox: "fill-box", transformOrigin: "0% 50%" }}
            />
          </g>
        );
      })}
    </motion.g>
  );
}

export function RecordBubble({
  size = 230,
  maxMs = 60_000,
  maxFrames = 6,
  controls = true,
  voiceOnly: startVoice = false,
  simulate = false,
  hints = { idle: "Hold & tell me", recording: "Mhm… go on…", sent: "Say no more." },
  extraControls,
  repeatable = false,
  disabled,
  onSend,
  onRecordingChange,
}: {
  size?: number;
  maxMs?: number;
  maxFrames?: number;
  /** Show the video/voice toggle (and any extra controls). */
  controls?: boolean;
  /** Start as a voice note instead of video. */
  voiceOnly?: boolean;
  /** Play the recording visuals without media (scripted demo). */
  simulate?: boolean;
  hints?: { idle: string; recording: string; sent: string };
  extraControls?: React.ReactNode;
  /** Allow recording again after a send (e.g. inside a composer). */
  repeatable?: boolean;
  disabled?: boolean;
  onSend: (r: Recording) => void;
  onRecordingChange?: (recording: boolean) => void;
}) {
  const uid = useId().replace(/:/g, "");
  const pressedAt = useRef(0);
  const [sent, setSent] = useState(false);
  const send = (r: Recording) => {
    if (!repeatable) setSent(true);
    onSend(r);
  };
  const rec = useRecorder({ maxMs, maxFrames, onAutoStop: send, initialVideo: !startVoice });
  const { permission, hasVideo, videoOn } = rec;

  // Scripted demo: fake a recording (timer, ring, squiggles) without touching media.
  const [simMs, setSimMs] = useState(0);
  useEffect(() => {
    if (!simulate) return;
    const t0 = Date.now();
    const level = rec.level;
    let raf = 0;
    const loop = () => {
      setSimMs(Date.now() - t0);
      level.set(0.35 + 0.35 * Math.abs(Math.sin(Date.now() / 160)));
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      level.set(0);
      setSimMs(0);
    };
  }, [simulate, rec.level]);

  const recording = rec.recording || simulate;
  const elapsedMs = simulate ? simMs : rec.elapsedMs;
  const progress = simulate ? Math.min(1, simMs / maxMs) : rec.progress;

  useEffect(() => onRecordingChange?.(recording), [recording, onRecordingChange]);

  const pad = 40;
  const total = size + pad * 2;
  const c = total / 2;
  const ringR = size / 2 + 11;
  const circ = 2 * Math.PI * ringR;
  const noMedia = permission === "denied" || permission === "unavailable";
  const voiceOnly = !hasVideo && !noMedia && permission !== "pending";

  const down = (e: React.PointerEvent) => {
    if (disabled || sent) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pressedAt.current = Date.now();
    rec.start();
  };

  const up = async () => {
    if (!rec.recording) return;
    if (Date.now() - pressedAt.current < MIN_HOLD_MS) {
      rec.cancel();
      toast("Hold it down & tell me", "👆");
      return;
    }
    const result = await rec.stop();
    if (result) send(result);
  };

  const hint = sent ? hints.sent : recording ? hints.recording : hints.idle;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: total, height: total, margin: `${-pad + 8}px ${-pad + 8}px 0` }}>
        {/* Timer sticker, on the bottom edge of the ring so it never covers That Guy */}
        <div className="absolute left-1/2 z-10 -translate-x-1/2" style={{ top: pad + size + 2 }}>
          <AnimatePresence>
            {recording && (
              <motion.div
                initial={{ opacity: 0, y: 8, rotate: -6 }}
                animate={{ opacity: 1, y: 0, rotate: -3 }}
                exit={{ opacity: 0, y: 8 }}
                className="sticker-sm flex items-center gap-2 whitespace-nowrap bg-card px-3 py-1 text-sm font-bold tabular-nums text-cardink"
              >
                <motion.span
                  className="h-3 w-3 rounded-full border-2 border-line bg-[#ff3b30]"
                  animate={{ opacity: [1, 0.25, 1], scale: [1, 0.8, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
                {fmt(elapsedMs)}
                <span className="font-normal opacity-70">/ {fmt(maxMs)}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <svg className="pointer-events-none absolute inset-0" width={total} height={total} aria-hidden overflow="visible">
          <defs>
            <filter id={`rough-${uid}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={4} />
              <feDisplacementMap in="SourceGraphic" scale={4} />
            </filter>
            <mask id={`prog-${uid}`}>
              <motion.circle
                cx={c}
                cy={c}
                r={ringR}
                fill="none"
                stroke="#fff"
                strokeWidth={16}
                strokeDasharray={circ}
                transform={`rotate(-90 ${c} ${c})`}
                animate={{ strokeDashoffset: circ * (1 - (recording ? progress : 0)) }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </mask>
          </defs>
          {/* Chunky outline ring: hard shadow, cream band, ink edges */}
          <circle cx={c + 4} cy={c + 4} r={ringR + 7} fill="var(--shadow)" />
          <circle cx={c} cy={c} r={ringR + 7} fill="#FFFBF0" stroke="#141210" strokeWidth={3.5} />
          {/* Hand-drawn dashed progress stroke */}
          <g filter={`url(#rough-${uid})`} mask={`url(#prog-${uid})`}>
            <circle cx={c} cy={c} r={ringR} fill="none" stroke="#FF6B1A" strokeWidth={8} strokeDasharray="13 8" strokeLinecap="round" />
          </g>
          <AnimatePresence>{recording && <Squiggles level={rec.level} radius={ringR + 16} c={c} />}</AnimatePresence>
        </svg>

        {/* The bubble */}
        <motion.button
          type="button"
          aria-label={recording ? "Recording. Release to send" : "Hold to record"}
          className="no-select absolute touch-none overflow-hidden rounded-full border-[3px] border-line bg-card outline-none disabled:opacity-60"
          style={{ width: size, height: size, left: pad, top: pad }}
          animate={{ scale: recording ? 1.03 : 1 }}
          whileTap={disabled ? undefined : { scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          disabled={disabled}
          onPointerDown={down}
          onPointerUp={up}
          onPointerCancel={up}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat && !recording && !sent) {
              e.preventDefault();
              pressedAt.current = Date.now();
              rec.start();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") void up();
          }}
        >
          {hasVideo && (
            <video
              ref={rec.videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: rec.facingMode === "user" ? "scaleX(-1)" : undefined }}
            />
          )}
          {voiceOnly && <Waveform active={recording} size={size} />}
          {(noMedia || permission === "pending") && (
            <div className="absolute inset-0 grid place-items-center bg-orange">
              <motion.div animate={recording ? { scale: [1, 1.15, 1] } : { scale: 1 }} transition={{ repeat: Infinity, duration: 0.8 }}>
                <Mic size={size * 0.26} className="text-cardink" strokeWidth={2.4} />
              </motion.div>
            </div>
          )}
        </motion.button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={hint}
          initial={{ opacity: 0, y: 6, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -1 }}
          exit={{ opacity: 0, y: -6 }}
          className="font-hand text-[28px] font-bold leading-none"
        >
          {hint}
        </motion.div>
      </AnimatePresence>
      {noMedia && !recording && <div className="mt-1 text-xs text-muted">No camera or mic here. Hold anyway to try it.</div>}

      {controls && (
        <div className="mt-3 flex items-center gap-4">
          <CtrlButton
            label={videoOn ? "Turn video off (voice only)" : "Turn video on"}
            onClick={rec.toggleVideo}
            disabled={recording || noMedia}
            active={!videoOn}
          >
            {videoOn ? <Video size={20} strokeWidth={2.4} /> : <VideoOff size={20} strokeWidth={2.4} />}
          </CtrlButton>
          {extraControls}
        </div>
      )}
    </div>
  );
}

function CtrlButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`sticker-sm press grid h-12 w-12 place-items-center rounded-full text-cardink disabled:opacity-40 ${
        active ? "bg-yellow" : "bg-card"
      }`}
    >
      {children}
    </button>
  );
}
