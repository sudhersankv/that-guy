// Ranking from the private network. Ported from lib/mockBackend.ts.

import type { Candidate, NetworkSignal, Provider, Review } from "../types";

const OUTCOME_LABEL: Record<string, string> = { no_show: "no-show", bad: "bad job" };

/** Quote the vouch most relevant to this problem, then the best rated, then the newest. */
export function signalFor(
  providerId: string,
  keywords: string[],
  reviews: Review[],
  guyNames: Record<string, string>,
): NetworkSignal {
  const rs = reviews.filter((r) => r.providerId === providerId);
  const relevant = (q: string) => (keywords.some((k) => q.toLowerCase().includes(k)) ? 1 : 0);
  const good = rs
    .filter((r) => r.outcome === "great" || r.outcome === "ok")
    .sort((a, b) => relevant(b.quote) - relevant(a.quote) || b.rating - a.rating || b.date.localeCompare(a.date));
  const bad = rs.filter((r) => r.outcome === "bad" || r.outcome === "no_show");
  const best = good[0];
  return {
    vouches: good.length,
    quote: best
      ? { text: `${best.quote}${best.price ? `, ~$${best.price}` : ""}`, by: guyNames[best.guyId] ?? "a neighbor's guy" }
      : undefined,
    warning: bad.length
      ? { count: bad.length, label: OUTCOME_LABEL[bad[0].outcome] ?? "bad job", by: guyNames[bad[0].guyId] }
      : undefined,
    publicOnly: rs.length === 0,
  };
}

/** Neighbor signals outrank stars. */
export function score(p: Provider, s: NetworkSignal) {
  return s.vouches * 30 - (s.warning?.count ?? 0) * 45 + (p.rating ?? 3.5) * 10 - p.distanceMi * 2;
}

export function rank(
  providers: Provider[],
  keywords: string[],
  reviews: Review[],
  guyNames: Record<string, string>,
  deckSize = 5,
) {
  const all = providers.map((provider) => ({ provider, signal: signalFor(provider.id, keywords, reviews, guyNames) }));
  // Dropped: two or more neighbors' guys had a bad experience.
  const dropped = all.filter((c) => (c.signal.warning?.count ?? 0) >= 2);
  const kept = all
    .filter((c) => !dropped.includes(c))
    .sort((a, b) => score(b.provider, b.signal) - score(a.provider, a.signal))
    .slice(0, deckSize);
  // Keep one warned high-star pro in the deck (last) so the warning is visible.
  const warned = all
    .filter((c) => !dropped.includes(c) && c.signal.warning && !kept.includes(c))
    .sort((a, b) => (b.provider.rating ?? 0) - (a.provider.rating ?? 0))[0];
  if (warned && !kept.some((c) => c.signal.warning)) kept.splice(Math.min(kept.length, deckSize - 1), 1, warned);
  const candidates: Candidate[] = kept.map((c, i) => ({ ...c, rank: i + 1 }));
  const asked = new Set(reviews.filter((r) => providers.some((p) => p.id === r.providerId)).map((r) => r.guyId)).size;
  const summary =
    `Your guy checked ${all.length} nearby pros` +
    (asked ? `, heard from ${asked} neighbors' guys,` : "") +
    ` and dropped ${dropped.length} with bad reviews.`;
  return { candidates, summary };
}

export function milesBetween(a: { lat: number; lng: number }, b: { lat?: number; lng?: number }) {
  if (b.lat == null || b.lng == null) return 0;
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}
