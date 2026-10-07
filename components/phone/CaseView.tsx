"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Phone, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import type { Case, Step } from "@/lib/types";
import { Confetti } from "../Confetti";
import { RecordBubble } from "../RecordBubble";
import { ThatGuyAvatar, type Mood } from "../ThatGuyAvatar";
import { ThatGuyCaption } from "../ThatGuyCaption";

function useNow(active: boolean, ms = 100) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(i);
  }, [active, ms]);
  return now;
}

function headline(c: Case): string {
  switch (c.status) {
    case "working":
      return c.steps.at(-1)?.label ?? "On it.";
    case "sorted":
      return "Found your guy.";
    case "booked":
      return "Booked ✅";
    case "stopped":
      return "Okay, holding off.";
    case "followup":
      return `How'd ${c.chosenProId ? api.config.pros[c.chosenProId].contact : "it"} do?`;
    case "vouched":
      return "Shared with your neighbors 🤝";
  }
}

function mood(c: Case): Mood {
  const last = c.steps.at(-1);
  if (c.status === "working") return last?.kind === "warn" ? "shrug" : "dialing";
  if (c.status === "stopped") return "shrug";
  if (c.status === "followup") return "idle";
  return "proud";
}

/** Screen 2–4: read-only. That Guy narrates; you never have to tap. */
export function CaseView({ caseId, seeHow }: { caseId: string; seeHow?: React.ReactNode }) {
  const snap = api.useSnapshot();
  const c = snap.cases[caseId];
  const sortedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (c && c.status !== "working") sortedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [c?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!c)
    return (
      <div className="flex flex-col items-center px-6 pt-10 text-center">
        <ThatGuyAvatar mood="shrug" size={150} />
        <p className="mt-3 font-display text-xl font-extrabold">I lost track of that one.</p>
        <p className="font-hand text-xl font-bold text-muted">Demo cases reset when the page reloads.</p>
      </div>
    );

  const pro = c.chosenProId ? api.config.pros[c.chosenProId] : undefined;

  return (
    <div className="px-4 pb-10">
      <div className="flex items-center gap-2">
        <div className="-ml-2 shrink-0">
          <ThatGuyAvatar mood={mood(c)} size={92} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-hand text-lg font-bold leading-none text-muted">
            {c.title} · {c.urgency}
          </div>
          <ThatGuyCaption text={headline(c)} size="lg" align="left" />
        </div>
      </div>

      <Timeline steps={c.steps} working={c.status === "working"} />

      <div ref={sortedRef} className="scroll-mt-4">
        <AnimatePresence>
          {c.status !== "working" && pro && <SortedCard key="sorted" c={c} />}
        </AnimatePresence>
        <AnimatePresence>{(c.status === "followup" || c.status === "vouched") && <FollowUp key="fu" c={c} />}</AnimatePresence>
      </div>

      {seeHow && <div className="mt-6 text-center">{seeHow}</div>}
    </div>
  );
}

function Timeline({ steps, working }: { steps: Step[]; working: boolean }) {
  return (
    <ol className="relative mt-3 space-y-2.5 pl-1" aria-label="What That Guy is doing">
      <span className="absolute bottom-3 left-[18px] top-3 w-[3px] rounded-full bg-line/15" aria-hidden />
      <AnimatePresence initial={false}>
        {steps.map((s, i) => {
          const current = working && i === steps.length - 1;
          const safety = s.kind === "safety";
          return (
            <motion.li
              key={s.id}
              layout
              initial={{ opacity: 0, x: -16, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="relative flex items-start gap-3"
            >
              <span
                className={`relative z-10 mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border-[2.5px] border-line ${
                  safety ? "bg-yellow" : current ? "bg-card" : s.kind === "stop" ? "bg-pink" : "bg-mint"
                }`}
              >
                {safety ? (
                  <ShieldAlert size={15} strokeWidth={2.6} className="text-cardink" />
                ) : current ? (
                  <motion.span
                    className="h-3 w-3 rounded-full bg-orange"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 0.9 }}
                  />
                ) : (
                  <Check size={16} strokeWidth={3.2} className="text-cardink" />
                )}
              </span>
              {safety ? (
                <div className="sticker-sm -rotate-1 bg-yellow px-3 py-2 text-cardink">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider">Do this now</div>
                  <div className="font-display text-[17px] font-extrabold leading-tight">{s.label}</div>
                </div>
              ) : (
                <div className={`pt-1 text-[15px] leading-snug ${current ? "font-extrabold" : "font-semibold text-muted"}`}>{s.label}</div>
              )}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}

function VetoRing({ endsAt, total }: { endsAt: number; total: number }) {
  const now = useNow(true);
  const left = Math.max(0, endsAt - now);
  const r = 34;
  const circ = 2 * Math.PI * r;
  const sec = Math.ceil(left / 1000);
  return (
    <div className="relative h-[88px] w-[88px] shrink-0" role="timer" aria-label={`Booking in ${sec} seconds`}>
      <svg width={88} height={88} className="-rotate-90">
        <circle cx={44} cy={44} r={r} fill="#FFFBF0" stroke="#141210" strokeWidth={3} />
        <circle
          cx={44}
          cy={44}
          r={r}
          fill="none"
          stroke="#FF6B1A"
          strokeWidth={8}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - left / total)}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-xl font-extrabold tabular-nums text-cardink">
        {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}
      </span>
    </div>
  );
}

function SortedCard({ c }: { c: Case }) {
  const pro = api.config.pros[c.chosenProId!];
  const booked = c.status === "booked" || c.status === "followup" || c.status === "vouched";
  return (
    <motion.section
      initial={{ opacity: 0, y: 30, rotate: 3, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, rotate: -1, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 16 }}
      className={`sticker relative mt-5 p-4 text-cardink ${booked ? "bg-mint" : c.status === "stopped" ? "paper" : "bg-yellow"}`}
    >
      {c.status === "booked" && <Confetti key="booked" />}
      <p className="font-display text-[21px] font-extrabold leading-tight">{c.sortedText}</p>
      {c.trustLine && (
        <p className="mt-2 inline-block rounded-lg border-2 border-line bg-card px-2 py-1 text-[13px] font-bold leading-tight">
          🤝 {c.trustLine}
        </p>
      )}

      {c.status === "sorted" && c.vetoEndsAt && (
        <div className="mt-3 flex items-center gap-3">
          <VetoRing endsAt={c.vetoEndsAt} total={c.vetoMs} />
          <div>
            <div className="font-hand text-[23px] font-bold leading-tight">Booking unless you say stop</div>
            <button
              onClick={() => api.stopBooking(c.id)}
              className="mt-1 h-11 px-1 text-sm font-extrabold underline decoration-2 underline-offset-4"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {booked && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-display text-2xl font-extrabold">Booked ✅</span>
          <a
            href={`tel:${pro.phone}`}
            className="sticker-sm press flex h-12 items-center gap-2 bg-orange px-4 font-display font-extrabold text-cardink"
          >
            <Phone size={18} strokeWidth={2.6} /> Call {pro.contact}
          </a>
        </div>
      )}

      {c.status === "stopped" && (
        <p className="mt-2 font-hand text-xl font-bold">Okay, I won&apos;t book. Drop me another video if you change your mind.</p>
      )}
    </motion.section>
  );
}

function FollowUp({ c }: { c: Case }) {
  const snap = api.useSnapshot();
  const pro = api.config.pros[c.chosenProId!];
  const simulating = snap.sim?.kind === "vouch" && snap.sim.user === c.user;
  const [sent, setSent] = useState(false);
  return (
    <motion.section
      initial={{ opacity: 0, y: -24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="sticker paper mt-5 p-4"
    >
      <div className="flex items-center gap-2 text-xs font-bold text-cardmuted">
        <Bell size={14} strokeWidth={2.6} /> THAT GUY · next day
      </div>
      {c.status === "followup" ? (
        <>
          <p className="mt-1 font-display text-[22px] font-extrabold">How&apos;d {pro.contact} do?</p>
          <div className="mt-1 flex justify-center">
            <RecordBubble
              size={140}
              controls={false}
              voiceOnly
              simulate={simulating}
              disabled={sent || simulating}
              hints={{ idle: "Hold & tell me", recording: "Mhm… go on…", sent: "Noted." }}
              onSend={(r) => {
                setSent(true);
                void api.submitVouch(c.id, { audioBlob: r.audioBlob, frames: [], photos: 0 });
              }}
            />
          </div>
        </>
      ) : (
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-1 font-display text-[20px] font-extrabold leading-tight"
        >
          Got it. Shared with your neighbors 🤝 — you just helped {c.helped ?? api.config.helped} people.
        </motion.p>
      )}
    </motion.section>
  );
}
