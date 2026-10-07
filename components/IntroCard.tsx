"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Mail, Phone } from "lucide-react";
import { useState } from "react";
import type { Intro } from "@/lib/types";
import { formatPhone } from "./ProviderCard";

/** A picked pro: big call button + the intro email your guy sent. */
export function IntroCard({ intro, tilt = 0 }: { intro: Intro; tilt?: number }) {
  const [open, setOpen] = useState(false);
  const { provider: p, email } = intro;
  const firstLines = email.body.split("\n").filter(Boolean).slice(0, 2).join(" ");
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: tilt * 3 }}
      animate={{ opacity: 1, y: 0, rotate: tilt }}
      className="sticker paper rounded-[22px] p-4 text-cardink"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-extrabold uppercase tracking-wider text-cardmuted">{p.trade}</div>
          <h3 className="truncate text-[22px] font-extrabold leading-tight">{p.name}</h3>
          <div className="text-sm font-semibold text-cardmuted">{formatPhone(p.phone)}</div>
        </div>
        <span className="mt-1 shrink-0 rotate-6 rounded-md border-2 border-line bg-mint px-1.5 py-0.5 text-[11px] font-extrabold">intro sent ✓</span>
      </div>

      <a
        href={`tel:${p.phone}`}
        className="sticker press mt-3 flex h-14 items-center justify-center gap-2 bg-orange font-display text-lg font-extrabold"
      >
        <Phone size={20} strokeWidth={2.6} /> Call {p.name}
      </a>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-3 w-full rounded-xl border-2 border-dashed border-line/40 p-3 text-left"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-cardmuted">
          <Mail size={14} strokeWidth={2.6} /> What your guy emailed them
          <ChevronDown size={16} className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
        <div className="mt-1 text-sm font-extrabold">{email.subject}</div>
        {!open && <div className="line-clamp-2 text-sm text-cardmuted">{firstLines}</div>}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-1 text-[11px] text-cardmuted">
                From {email.from} · To {email.to}
              </div>
              <div className="mt-2 whitespace-pre-line text-sm leading-relaxed">{email.body}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  );
}
