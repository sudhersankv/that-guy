// Trust scoring. Deterministic and explainable:
//   20 base
// + 20 per neighbor vouch        − 45 per warning
// + 8 if the latest vouch is within 9 months
// + 6 if a voucher lives within 0.6 mi
// + (rating − 4) × 30 and up to +5 for review volume, only if publicly listed
// clamped to 0–100. A pro with more warnings than vouches is struck.

import { PROS, TODAY, humanOf } from "./mock";
import type { Agent, Reveal, Signal, TrustRow } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthsAgo(date: string): number {
  const [y, m] = date.split("-").map(Number);
  const [ty, tm] = TODAY.split("-").map(Number);
  return (ty - y) * 12 + (tm - m);
}

export function prettyMonth(date: string) {
  const [y, m] = date.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function trustTable(reveal: Reveal, signals: Signal[], network: Agent[], selfAgentId: string): TrustRow[] {
  const byId = new Map(signals.map((s) => [s.id, s]));
  const revealed = reveal.signalIds.map((id) => byId.get(id)).filter((s): s is Signal => !!s);
  const proIds = Array.from(new Set([...revealed.map((s) => s.proId), ...reveal.publicIds]));
  const dist = (agentId: string) =>
    agentId === selfAgentId ? 0 : (network.find((a) => a.id === agentId)?.distanceMi ?? 1);

  const rows = proIds.map((proId): TrustRow => {
    const pro = PROS[proId];
    const sigs = revealed.filter((s) => s.proId === proId);
    const vouchSigs = sigs.filter((s) => s.kind === "vouch");
    const vouches = vouchSigs.length;
    const warnings = sigs.length - vouches;
    const latest = sigs.map((s) => s.date).sort().at(-1);
    const latestVouch = vouchSigs.map((s) => s.date).sort().at(-1);
    const listed = reveal.publicIds.includes(proId);

    let score = 20 + vouches * 20 - warnings * 45;
    if (latestVouch && monthsAgo(latestVouch) <= 9) score += 8;
    if (vouchSigs.some((s) => dist(s.agentId) <= 0.6)) score += 6;
    if (listed && pro.rating) score += (pro.rating - 4) * 30 + Math.min((pro.reviews ?? 0) / 40, 5);
    score = Math.max(0, Math.min(100, Math.round(score)));

    return {
      proId,
      pro,
      score,
      vouches,
      warnings,
      recency: latest ? prettyMonth(latest) : undefined,
      network: sigs.length > 0,
      listed,
      struck: warnings > vouches,
      vouchers: vouchSigs.map((s) => (s.agentId === selfAgentId ? "you" : humanOf(s.agentId))),
    };
  });

  return rows.sort((a, b) => Number(a.struck) - Number(b.struck) || b.score - a.score);
}

/** "Trusted by Leo's and Dana's guys" / "Trusted by 3 neighbors: …" */
export function trustLine(row: TrustRow): string {
  const names = row.vouchers.filter((v) => v !== "you").map((v) => `${v}'s`);
  if (!names.length) {
    return row.pro.rating
      ? `No neighbor history yet · ${row.pro.rating}★ on ${row.pro.reviews} public reviews`
      : "No neighbor history yet";
  }
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return names.length >= 3 ? `Trusted by ${names.length} neighbors: ${list} guys` : `Trusted by ${list} guys`;
}
