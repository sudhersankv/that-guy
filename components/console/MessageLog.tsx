"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { LogLine } from "@/lib/types";

const ARROW: Record<LogLine["dir"], { sym: string; color: string }> = {
  out: { sym: "→", color: "#FF8A47" },
  in: { sym: "←", color: "#7EE8C2" },
  sys: { sym: " ", color: "#a59a8c" },
  "email-out": { sym: "✉→", color: "#9AD1FF" },
  "email-in": { sym: "✉←", color: "#9AD1FF" },
  share: { sym: "→", color: "#FFD23F" },
};

const TONE = { good: "#9ff0cf", bad: "#ffb3c4", muted: "#a59a8c" };

const stamp = (ms: number) => {
  const s = Math.max(0, ms) / 1000;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};

/** Terminal-style agent-to-agent wire. */
export function MessageLog({ lines, title }: { lines: LogLine[]; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="sticker flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] bg-[#141210] text-[#FFF4E0]">
      <div className="flex items-center gap-2 border-b-2 border-[#3a332c] px-3 py-2">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 truncate font-mono text-xs text-[#a59a8c]">{title}</span>
      </div>
      <div ref={ref} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3 font-mono text-[12.5px] leading-[1.45]">
        {lines.length === 0 && (
          <div className="text-[#a59a8c]">
            waiting for a drop…<span className="animate-pulse">▍</span>
          </div>
        )}
        {lines.map((l, i) => {
          const a = ARROW[l.dir];
          const last = i === lines.length - 1;
          return (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, x: -10, backgroundColor: "rgba(255,210,63,0.18)" }}
              animate={{ opacity: 1, x: 0, backgroundColor: "rgba(255,210,63,0)" }}
              transition={{ duration: 0.35, backgroundColor: { duration: 1.6 } }}
              className="rounded px-1"
            >
              <span className="text-[#6f665c]">[{stamp(l.t)}]</span>{" "}
              <span style={{ color: a.color }} className="font-bold">
                {a.sym}
              </span>{" "}
              {l.who && (
                <span className="font-bold text-[#FFF4E0]">
                  {l.who}
                  {l.to && <span className="text-[#a59a8c]"> → {l.to}</span>}:{" "}
                </span>
              )}
              <span style={{ color: l.tone ? TONE[l.tone] : "#FFF4E0" }}>{l.text}</span>
              {last && <span className="ml-0.5 animate-pulse text-[#FF8A47]">▍</span>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
