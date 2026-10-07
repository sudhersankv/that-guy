"use client";

import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { useEffect, useRef } from "react";
import { useVoiceNote, type VoiceNote } from "@/lib/useVoiceNote";
import { toast } from "./Toast";

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Hold to record a voice note; release to hand it back. */
export function VoiceHold({
  size = "sm",
  disabled,
  onRecorded,
  onRecordingChange,
  label = "Hold to record a voice note",
}: {
  size?: "sm" | "lg";
  disabled?: boolean;
  onRecorded: (v: VoiceNote) => void;
  onRecordingChange?: (on: boolean) => void;
  label?: string;
}) {
  const v = useVoiceNote();
  const ref = useRef<HTMLButtonElement>(null);
  const big = size === "lg";

  useEffect(() => onRecordingChange?.(v.recording), [v.recording, onRecordingChange]);

  const finish = async () => {
    const note = await v.stop();
    if (note) onRecorded(note);
    else toast("Hold it down while you talk", "👆");
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.button
        ref={ref}
        type="button"
        aria-label={v.recording ? "Recording. Release to finish" : label}
        disabled={disabled}
        onPointerDown={(e) => {
          if (disabled) return;
          e.preventDefault();
          ref.current?.setPointerCapture(e.pointerId);
          void v.start(() => void finish());
        }}
        onPointerUp={() => v.recording && void finish()}
        onPointerCancel={() => v.recording && void finish()}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat && !v.recording) {
            e.preventDefault();
            void v.start();
          }
        }}
        onKeyUp={(e) => (e.key === " " || e.key === "Enter") && void finish()}
        onContextMenu={(e) => e.preventDefault()}
        animate={v.recording ? { scale: big ? 1.08 : 1.12 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        className={`no-select relative grid touch-none place-items-center rounded-full border-[2.5px] border-line text-cardink disabled:opacity-40 ${
          big ? "h-28 w-28" : "h-12 w-12"
        } ${v.recording ? "bg-[#ff5a4e]" : big ? "bg-orange" : "bg-card"}`}
        style={{ boxShadow: "3px 3px 0 var(--shadow)" }}
      >
        {v.recording && (
          <motion.span
            className="absolute inset-0 rounded-full border-[3px] border-[#ff5a4e]"
            animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}
        <Mic size={big ? 44 : 20} strokeWidth={2.4} />
      </motion.button>
      {big && (
        <span className="font-hand text-[22px] font-bold leading-none">
          {v.recording ? `Mhm… go on… ${fmt(v.ms)}` : "Hold & tell me"}
        </span>
      )}
      {!big && v.recording && <span className="font-mono text-xs font-bold tabular-nums">{fmt(v.ms)}</span>}
    </div>
  );
}
