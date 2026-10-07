"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import type { DoneOutcome, Problem } from "@/lib/types";
import { Confetti } from "./Confetti";
import { VoiceHold } from "./VoiceHold";

const OUTCOMES: { key: DoneOutcome; label: string; bg: string }[] = [
  { key: "yes", label: "Yes", bg: "bg-mint" },
  { key: "no", label: "No", bg: "bg-pink" },
  { key: "didnt_use", label: "Didn't use them", bg: "bg-card" },
];

/** Step 5: "Did X get it done?" → voice note → shared with the network. */
export function DoneCheck({
  problem,
  onChange,
  onRecordingChange,
}: {
  problem: Problem;
  onChange: (p: Problem) => void;
  onRecordingChange?: (on: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const pro = problem.checkin;
  const ref = useRef<HTMLElement>(null);

  // Each step of the check-in lands in view (it sits below the intro cards).
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [problem.status]);

  if (problem.status === "done") {
    if (!problem.feedback) return null;
    return (
      <motion.section
        ref={ref}
        initial={{ opacity: 0, scale: 0.9, rotate: 3 }}
        animate={{ opacity: 1, scale: 1, rotate: -1 }}
        className="sticker relative bg-yellow p-4 text-cardink"
      >
        <Confetti />
        <div className="bubble rotate-1 px-3 py-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-cardmuted">You said</div>
          <p className="font-hand text-[24px] font-bold leading-tight">“{problem.feedback.transcript}”</p>
        </div>
        <p className="mt-5 font-display text-[19px] font-extrabold leading-tight">
          Thanks. Your guy shared this with the neighborhood network. 🤝
        </p>
      </motion.section>
    );
  }

  if (!pro) return null;

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticker paper rounded-[22px] p-4 text-cardink"
    >
      {problem.status === "feedback" ? (
        <>
          <h3 className="text-[22px] font-extrabold leading-tight">How&apos;d {pro.name} do?</h3>
          <p className="font-hand text-xl font-bold leading-tight text-cardmuted">Quick voice note. Price, speed, would you call them again?</p>
          <div className="mt-3 flex justify-center">
            {busy ? (
              <div className="flex h-36 flex-col items-center justify-center gap-2 font-hand text-xl font-bold">
                <Loader2 className="animate-spin" /> Writing that down…
              </div>
            ) : (
              <VoiceHold
                size="lg"
                onRecordingChange={onRecordingChange}
                onRecorded={async (v) => {
                  setBusy(true);
                  onChange(await api.submitFeedback(problem.id, pro.id, v.blob));
                }}
              />
            )}
          </div>
        </>
      ) : (
        <>
          <h3 className="text-[22px] font-extrabold leading-tight">Did {pro.name} get it done?</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {OUTCOMES.map((o, i) => (
              <button
                key={o.key}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  onChange(await api.markDone(problem.id, pro.id, o.key));
                  setBusy(false);
                }}
                className={`sticker-sm press wiggle h-12 px-4 font-display font-extrabold ${o.bg} disabled:opacity-50`}
                style={{ rotate: `${i % 2 ? 1.5 : -1.5}deg` }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </motion.section>
  );
}
