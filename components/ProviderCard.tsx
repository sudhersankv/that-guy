"use client";

import { MapPin, Phone, Star } from "lucide-react";
import type { Candidate, NetworkSignal } from "@/lib/types";

/** The key element: what neighbors' guys say about this pro. */
export function SignalBlock({ signal }: { signal: NetworkSignal }) {
  return (
    <div className="space-y-2">
      {signal.vouches > 0 ? (
        <div className="sticker-sm -rotate-1 bg-mint p-2.5">
          <div className="font-display text-[15px] font-extrabold leading-tight">
            🤝 {signal.vouches} neighbor{signal.vouches > 1 ? "s'" : "'s"} guy{signal.vouches > 1 ? "s" : ""} vouch
          </div>
          {signal.quote && (
            <p className="mt-0.5 font-hand text-[21px] font-bold leading-[1.05]">
              “{signal.quote.text}” <span className="whitespace-nowrap text-base">— {signal.quote.by}</span>
            </p>
          )}
        </div>
      ) : signal.publicOnly ? (
        <div className="inline-flex rotate-1 items-center gap-1.5 rounded-lg border-2 border-dashed border-line/60 bg-[#ece4d6] px-2.5 py-1 text-sm font-bold">
          🔎 Google reviews only
        </div>
      ) : null}
      {signal.warning && (
        <div className="inline-flex rotate-1 items-center gap-1.5 rounded-lg border-2 border-line bg-pink px-2.5 py-1 text-sm font-extrabold">
          ⚠ {signal.warning.count} neighbor{signal.warning.count > 1 ? "s'" : "'s"} guy{signal.warning.count > 1 ? "s" : ""} warn
          {signal.warning.count > 1 ? "" : "s"}: {signal.warning.label}
        </div>
      )}
    </div>
  );
}

/** A business card from your guy's Rolodex. Fills its parent's height. */
export function ProviderCard({ candidate }: { candidate: Candidate }) {
  const { provider: p, signal, rank } = candidate;
  return (
    <article className="paper sticker relative flex h-full flex-col rounded-[24px] px-4 pb-4 pt-5 text-cardink">
      <span className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-3 border border-line/20 bg-yellow/75" aria-hidden />
      <span
        className="absolute right-3 top-3 rotate-[9deg] rounded-md border-[2.5px] border-stamp px-2 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-stamp"
        style={{ boxShadow: "inset 0 0 0 1.5px #fffbf0, inset 0 0 0 3px #c2301c" }}
      >
        {p.trade}
      </span>
      <span className="font-hand text-[26px] font-bold leading-none text-stamp">#{rank}</span>
      <h3 className="mt-1 pr-20 text-[26px] font-extrabold leading-[1.02]">{p.name}</h3>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
        <span className="inline-flex items-center gap-1">
          <MapPin size={14} strokeWidth={2.6} /> {p.distanceMi} mi
        </span>
        {p.rating && (
          <span className="inline-flex items-center gap-1">
            <Star size={14} className="fill-yellow" strokeWidth={2.4} /> {p.rating.toFixed(1)}
            <span className="font-normal text-cardmuted">({p.reviews})</span>
          </span>
        )}
      </div>

      <p className="mt-3 text-[15px] leading-snug">{p.why}</p>

      <div className="mt-3">
        <SignalBlock signal={signal} />
      </div>

      <div className="mt-auto flex items-center gap-2 border-t-2 border-dashed border-line/25 pt-3 text-sm font-bold">
        <Phone size={15} strokeWidth={2.6} /> {formatPhone(p.phone)}
      </div>
    </article>
  );
}

export function formatPhone(e164: string) {
  const d = e164.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
}
