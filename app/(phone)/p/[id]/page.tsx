"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, RotateCcw, Send } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Composer } from "@/components/Composer";
import { DoneCheck } from "@/components/DoneCheck";
import { Header } from "@/components/Header";
import { IntroCard } from "@/components/IntroCard";
import { StatusChip } from "@/components/StatusChip";
import { SwipeDeck, type SwipeDir } from "@/components/SwipeDeck";
import { ThatGuyAvatar, type Mood } from "@/components/ThatGuyAvatar";
import { ThatGuyCaption } from "@/components/ThatGuyCaption";
import * as api from "@/lib/api";
import type { Problem } from "@/lib/types";
import { usePoll } from "@/lib/usePoll";

export default function ProblemPage() {
  const { id } = useParams<{ id: string }>();
  const [problem, , setProblem] = usePoll(() => api.getProblem(id), 1000, [id]);
  const [recording, setRecording] = useState(false);
  const onRecordingChange = useCallback((on: boolean) => setRecording(on), []);

  if (problem === undefined)
    return (
      <>
        <Header back />
        <div className="grid place-items-center pt-20">
          <ThatGuyAvatar mood="dialing" size={140} />
        </div>
      </>
    );

  if (problem === null)
    return (
      <>
        <Header back />
        <div className="flex flex-col items-center px-6 pt-10 text-center">
          <ThatGuyAvatar mood="shrug" size={150} />
          <p className="mt-3 font-display text-xl font-extrabold">Can&apos;t find that problem.</p>
          <Link href="/" className="mt-2 font-bold underline underline-offset-4">
            Back to my problems
          </Link>
        </div>
      </>
    );

  const mood: Mood =
    recording ? "listening"
    : problem.status === "working" ? "dialing"
    : problem.status === "picking" || problem.status === "done" ? "proud"
    : "idle";

  return (
    <>
      <Header back />
      <div className="px-4 pb-10">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h1 className="text-[28px] font-extrabold leading-[1.05]">{problem.title}</h1>
          <div className="pt-1.5">
            <StatusChip status={problem.status} />
          </div>
        </div>

        {problem.status === "working" && <Working problem={problem} mood={mood} />}
        {problem.status === "question" && (
          <FollowUp problem={problem} mood={mood} onChange={setProblem} onRecordingChange={onRecordingChange} />
        )}
        {problem.status === "picking" && <Pick problem={problem} mood={mood} onChange={setProblem} />}
        {["contacted", "checkin", "feedback", "done"].includes(problem.status) && (
          <Intros problem={problem} mood={mood} onChange={setProblem} onRecordingChange={onRecordingChange} />
        )}
      </div>
    </>
  );
}

function GuySays({ mood, text }: { mood: Mood; text: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="-ml-2 shrink-0">
        <ThatGuyAvatar mood={mood} size={96} />
      </div>
      <div className="bubble min-w-0 flex-1 px-3 py-1">
        <ThatGuyCaption text={text} align="left" />
      </div>
    </div>
  );
}

// 1 → working
function Working({ problem, mood }: { problem: Problem; mood: Mood }) {
  return (
    <div>
      <GuySays mood={mood} text={problem.activity ?? "On it…"} />
      {problem.answer && (
        <p className="mt-3 font-hand text-xl font-bold text-muted">
          You said: {problem.answer}
        </p>
      )}
      <p className="mt-6 text-center font-hand text-xl font-bold text-muted">You can leave. I&apos;ll ping you.</p>
    </div>
  );
}

// 2 → one follow-up question
function FollowUp({
  problem,
  mood,
  onChange,
  onRecordingChange,
}: {
  problem: Problem;
  mood: Mood;
  onChange: (p: Problem) => void;
  onRecordingChange: (on: boolean) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const q = problem.question!;
  const answer = async (a: Parameters<typeof api.answerQuestion>[1], key: string) => {
    setBusy(key);
    onChange(await api.answerQuestion(problem.id, a));
  };
  return (
    <div>
      <GuySays mood={mood} text={q.text} />
      <div className="mt-4 flex flex-wrap gap-2.5">
        {q.quickReplies.map((r, i) => (
          <button
            key={r}
            disabled={!!busy}
            onClick={() => answer({ text: r }, r)}
            className="sticker-sm press wiggle flex h-12 items-center gap-2 bg-yellow px-4 font-display font-extrabold text-cardink disabled:opacity-50"
            style={{ rotate: `${i % 2 ? 1.5 : -1.5}deg`, ["--tilt" as string]: `${i % 2 ? 1.5 : -1.5}deg` }}
          >
            {busy === r && <Loader2 size={16} className="animate-spin" />}
            {r}
          </button>
        ))}
      </div>
      <p className="mb-2 mt-5 font-hand text-xl font-bold text-muted">…or show / tell me:</p>
      <Composer
        placeholder="Anything else I should know?"
        onRecordingChange={onRecordingChange}
        disabled={!!busy}
        onSubmit={async (v) => answer({ text: v.text, photos: v.photos, audio: v.audio, videoFrames: v.videoFrames }, "composer")}
      />
    </div>
  );
}

// 3 → pick your guy
function Pick({ problem, mood, onChange }: { problem: Problem; mood: Mood; onChange: (p: Problem) => void }) {
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const total = problem.candidates.length;
  const done = idx >= total;

  const onSwipe = (pid: string, dir: SwipeDir) => {
    if (dir === "pick") setPicks((ps) => [...ps, pid]);
    setIdx((i) => i + 1);
  };

  return (
    <div>
      {problem.summary && (
        <div className="sticker-sm mb-4 -rotate-1 bg-card px-3 py-2 text-[15px] font-bold leading-snug text-cardink">🕵️ {problem.summary}</div>
      )}
      {!done ? (
        <SwipeDeck candidates={problem.candidates.slice(idx)} onSwipe={onSwipe} position={`${idx + 1} / ${total}`} />
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center pt-4 text-center">
          <ThatGuyAvatar mood={picks.length ? mood : "shrug"} size={130} />
          {picks.length ? (
            <>
              <p className="text-[30px] font-extrabold">
                You picked <span className="scribble">{picks.length}</span>
              </p>
              <p className="font-hand text-xl font-bold text-muted">
                {picks.map((p) => problem.candidates.find((c) => c.provider.id === p)?.provider.name).join(" & ")}
              </p>
              <button
                disabled={sending}
                onClick={async () => {
                  setSending(true);
                  onChange(await api.pickProviders(problem.id, picks));
                }}
                className="sticker press mt-5 flex h-14 items-center gap-2 bg-orange px-7 font-display text-lg font-extrabold text-cardink disabled:opacity-60"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} strokeWidth={2.6} />}
                Send intros
              </button>
            </>
          ) : (
            <>
              <p className="text-[26px] font-extrabold">You skipped everyone.</p>
              <button
                onClick={() => setIdx(0)}
                className="sticker-sm press mt-4 flex h-12 items-center gap-2 bg-yellow px-5 font-display font-extrabold text-cardink"
              >
                <RotateCcw size={16} strokeWidth={2.6} /> Look again
              </button>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

// 4 + 5 → intros sent, then "Done?"
function Intros({
  problem,
  mood,
  onChange,
  onRecordingChange,
}: {
  problem: Problem;
  mood: Mood;
  onChange: (p: Problem) => void;
  onRecordingChange: (on: boolean) => void;
}) {
  const [early, setEarly] = useState(false);
  const showCheck = problem.status !== "contacted" || early;
  return (
    <div className="space-y-4">
      <GuySays mood={mood} text={problem.status === "done" ? "All sorted. Nice work." : "I sent them the details. Give them a call when you're ready."} />
      <p className="text-center font-hand text-lg font-bold text-muted">I don&apos;t call anyone. You do. 📞</p>
      {problem.intros.map((intro, i) => (
        <IntroCard key={intro.providerId} intro={intro} tilt={i % 2 ? 0.8 : -0.8} />
      ))}
      <AnimatePresence>
        {showCheck && <DoneCheck key="check" problem={problem} onChange={onChange} onRecordingChange={onRecordingChange} />}
      </AnimatePresence>
      {!showCheck && problem.checkin && (
        <button onClick={() => setEarly(true)} className="mx-auto block h-11 text-sm font-bold text-muted underline underline-offset-4">
          Already done? Tell me how it went
        </button>
      )}
    </div>
  );
}
