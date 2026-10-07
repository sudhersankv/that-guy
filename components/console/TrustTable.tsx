"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { TrustRow } from "@/lib/types";

const barColor = (s: number) => (s >= 70 ? "#7EE8C2" : s >= 40 ? "#FFD23F" : "#FF9EBB");

export function TrustTable({
  rows,
  emailed,
  chosen,
  scored,
}: {
  rows: TrustRow[];
  emailed: string[];
  chosen?: string;
  scored: boolean;
}) {
  return (
    <div className="sticker paper flex h-full min-h-0 flex-col overflow-hidden rounded-[18px]">
      <div className="flex items-center justify-between border-b-2 border-line px-4 py-2">
        <h3 className="text-lg font-extrabold">Trust table</h3>
        <span className="font-hand text-lg font-bold text-cardmuted">
          {scored ? "scored · vouches, warnings, recency, distance, rating" : rows.length ? "scoring as replies land…" : "no signals yet"}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card text-left text-[11px] font-extrabold uppercase tracking-wider text-cardmuted">
            <tr>
              <th className="px-4 py-2">Pro</th>
              <th className="px-2 py-2 text-center">✅</th>
              <th className="px-2 py-2 text-center">❌</th>
              <th className="px-2 py-2">Recency</th>
              <th className="px-2 py-2">Distance</th>
              <th className="w-[34%] px-2 py-2">Trust</th>
              <th className="px-4 py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((r) => {
                const isChosen = r.proId === chosen;
                return (
                  <motion.tr
                    key={r.proId}
                    layout
                    initial={{ opacity: 0, y: -12, backgroundColor: "rgba(255,210,63,0.5)" }}
                    animate={{ opacity: r.struck ? 0.55 : 1, y: 0, backgroundColor: isChosen ? "rgba(126,232,194,0.45)" : "rgba(255,210,63,0)" }}
                    transition={{ type: "spring", stiffness: 260, damping: 28, backgroundColor: { duration: 1 } }}
                    className="border-b border-line/15"
                  >
                    <td className="px-4 py-2.5">
                      <div className={`font-display text-[15px] font-extrabold ${r.struck ? "line-through decoration-2" : ""}`}>
                        {r.pro.name}
                      </div>
                      <div className="flex flex-wrap gap-1 text-[11px] font-bold">
                        {r.struck && <span className="text-stamp">dropped · warnings</span>}
                        {isChosen && <span className="rounded border-2 border-line bg-yellow px-1">★ picked</span>}
                        {!isChosen && emailed.includes(r.proId) && <span className="rounded border-2 border-line bg-sky px-1">✉ emailed</span>}
                      </div>
                    </td>
                    <td className="px-2 text-center font-display text-base font-extrabold">
                      <Num v={r.vouches} />
                    </td>
                    <td className="px-2 text-center font-display text-base font-extrabold">
                      <Num v={r.warnings} />
                    </td>
                    <td className="px-2 text-cardmuted">{r.recency ?? "—"}</td>
                    <td className="px-2 text-cardmuted">{r.pro.distanceMi} mi</td>
                    <td className="px-2">
                      <div className="flex items-center gap-2">
                        <div className="h-4 flex-1 overflow-hidden rounded-full border-2 border-line bg-card">
                          <motion.div
                            className="h-full border-r-2 border-line"
                            animate={{ width: `${r.score}%`, backgroundColor: barColor(r.score) }}
                            transition={{ type: "spring", stiffness: 90, damping: 18 }}
                          />
                        </div>
                        <span className="w-8 text-right font-display font-extrabold tabular-nums">
                          <Num v={r.score} />
                        </span>
                      </div>
                    </td>
                    <td className="px-4">
                      <div className="flex gap-1">
                        {r.network && <span className="rounded-md border-2 border-line bg-mint px-1.5 text-[11px] font-extrabold">Network</span>}
                        {r.listed && <span className="rounded-md border-2 border-line bg-card px-1.5 text-[11px] font-extrabold">Public</span>}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Number that pops when it changes. */
function Num({ v }: { v: number }) {
  return (
    <motion.span key={v} initial={{ scale: 1.6, color: "#FF6B1A" }} animate={{ scale: 1, color: "#141210" }} className="inline-block">
      {v}
    </motion.span>
  );
}
