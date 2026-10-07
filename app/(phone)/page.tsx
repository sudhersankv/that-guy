"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Composer, type ComposerValue } from "@/components/Composer";
import { Header } from "@/components/Header";
import { ProblemList } from "@/components/ProblemList";
import { NEEDS_YOU } from "@/components/StatusChip";
import { ThatGuyAvatar, type Mood } from "@/components/ThatGuyAvatar";
import { toast } from "@/components/Toast";
import * as api from "@/lib/api";
import type { Problem, ProblemStatus } from "@/lib/types";
import { usePoll } from "@/lib/usePoll";

const PING: Partial<Record<ProblemStatus, string>> = {
  question: "one quick question",
  picking: "pick your guy",
  checkin: "did it get done?",
};

export default function DumpPage() {
  const [problems, refresh] = usePoll(api.listProblems, 2000);
  const [sent, setSent] = useState<Problem | null>(null);
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);

  // "I'll ping you": nudge when a problem starts needing you.
  const seen = useRef<Record<string, ProblemStatus>>({});
  useEffect(() => {
    problems?.forEach((p) => {
      const prev = seen.current[p.id];
      if (prev && prev !== p.status && NEEDS_YOU.includes(p.status)) toast(`${p.title}: ${PING[p.status]}`, "👉");
      seen.current[p.id] = p.status;
    });
  }, [problems]);

  const submit = async (v: ComposerValue) => {
    setSending(true);
    try {
      const p = await api.submitProblem({ text: v.text, photos: v.photos, audio: v.audio, videoFrames: v.videoFrames });
      setSent(p);
      await refresh();
    } finally {
      setSending(false);
    }
  };

  const onRecordingChange = useCallback((on: boolean) => setRecording(on), []);
  const mood: Mood = sending ? "dialing" : recording ? "listening" : sent ? "proud" : "idle";

  return (
    <>
      <Header />
      <section className="px-4">
        <div className="relative flex items-end gap-1">
          <ThatGuyAvatar mood={mood} size={118} />
          <AnimatePresence mode="wait">
            <motion.div
              key={sent ? "sent" : "ask"}
              initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: -2 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bubble mb-16 px-3 py-2"
            >
              <span className="font-hand text-[22px] font-bold leading-none">{sent ? "On it! 🫡" : "Psst. I know a guy."}</span>
            </motion.div>
          </AnimatePresence>
        </div>
        <h1 className="relative z-10 mt-2 -rotate-1 text-[38px] font-extrabold leading-[1.02]">
          What&apos;s the <span className="scribble">problem</span>?
        </h1>
        <p className="mb-3 mt-1 font-hand text-[20px] font-bold leading-tight text-muted">
          Type it, snap it, say it or show me. Any mix works.
        </p>

        <Composer onSubmit={submit} onRecordingChange={onRecordingChange} />

        <AnimatePresence>
          {sent && (
            <motion.div
              initial={{ opacity: 0, y: -10, rotate: 4 }}
              animate={{ opacity: 1, y: 0, rotate: 1.5 }}
              exit={{ opacity: 0 }}
              className="sticker-sm mt-4 bg-mint p-3 text-cardink"
            >
              <p className="font-display text-[18px] font-extrabold leading-tight">Got it. Go do your thing, I&apos;ll ping you.</p>
              <Link href={`/p/${sent.id}`} className="mt-1 inline-flex h-9 items-center text-sm font-bold underline underline-offset-4">
                Or watch me work →
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="mt-7 px-4">
        <h2 className="mb-2 text-[22px] font-extrabold">My problems</h2>
        <ProblemList problems={problems} />
      </section>
    </>
  );
}
