// The real "your guy": problems live in Supabase, the agent works in the background.

import type { Answer, DoneOutcome, Intro, NetworkSignal, Problem, Provider, Review } from "../types";
import { ask, triagePrompt, whyPrompt, type Triage } from "./agent";
import { inList, insert, select, update, upsert } from "./db";
import { placesNear, type Place } from "./monid";
import { milesBetween, rank } from "./rank";
import { sendEmail, transcribe } from "./services";

const CHECKIN_AFTER_MS = Number(process.env.CHECKIN_AFTER_MS ?? 20000);
const AREA = () => process.env.DEMO_AREA || "the Mission, San Francisco";

interface Meta {
  text?: string;
  answer?: string;
  lat: number;
  lng: number;
  triage?: Triage;
  introsAt?: number;
  via?: string;
  error?: string;
}

interface Row {
  id: string;
  status: string;
  data: Problem;
  meta: Meta;
  session_id?: string | null;
}

interface ProviderRow {
  id: string;
  name: string;
  trade?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  rating?: number;
  reviews?: number;
  lat?: number;
  lng?: number;
}

interface ReviewRow {
  id: string;
  guy_id: string;
  provider_id: string;
  outcome: Review["outcome"];
  quote: string;
  price?: number | null;
  date: string;
  rating: number;
}

const uid = () => `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function demoLocation() {
  const [lat, lng] = (process.env.DEMO_LOCATION || "37.7599,-122.4148").split(",").map(Number);
  return { lat, lng };
}

// --- Storage -------------------------------------------------------------------

async function load(id: string): Promise<Row> {
  const [row] = await select<Row>("problems", `id=eq.${encodeURIComponent(id)}`);
  if (!row) throw new Error(`No problem ${id}`);
  return row;
}

async function save(row: Row) {
  await update<Row>("problems", `id=eq.${encodeURIComponent(row.id)}`, {
    status: row.data.status,
    data: row.data,
    meta: row.meta,
    session_id: row.session_id ?? null,
  });
  return row.data;
}

/** Patch the problem the UI sees (activity lines etc). */
async function patch(id: string, fn: (p: Problem, m: Meta) => void) {
  const row = await load(id);
  fn(row.data, row.meta);
  await save(row);
  return row;
}

/** Time-based stage change: "Did X get it done?" a while after intros go out. */
function advance(row: Row): boolean {
  const p = row.data;
  if (p.status === "contacted" && row.meta.introsAt && Date.now() - row.meta.introsAt >= CHECKIN_AFTER_MS) {
    const next = p.picks.find((id) => !p.outcomes[id]);
    p.checkin = p.candidates.find((c) => c.provider.id === next)?.provider;
    p.status = p.checkin ? "checkin" : "done";
    return true;
  }
  return false;
}

// --- The agent's work ----------------------------------------------------------

const toProvider = (r: ProviderRow, here: { lat: number; lng: number }, why = ""): Provider => ({
  id: r.id,
  name: r.name,
  trade: r.trade ?? "",
  phone: r.phone ?? "",
  email: r.email ?? "",
  distanceMi: milesBetween(here, { lat: r.lat, lng: r.lng }),
  rating: r.rating ?? undefined,
  reviews: r.reviews ?? undefined,
  why,
});

const toReview = (r: ReviewRow): Review => ({
  id: r.id,
  guyId: r.guy_id,
  providerId: r.provider_id,
  outcome: r.outcome,
  quote: r.quote ?? "",
  price: r.price ?? undefined,
  date: r.date,
  rating: r.rating ?? 3,
});

function fallbackTriage(text: string): Triage {
  const t = text.toLowerCase();
  const table: [string[], Triage][] = [
    [["roof", "ceiling", "shingle", "gutter", "attic"], { title: "Roof leak", trade: "Roofer", search: "roofer", keywords: ["roof", "leak", "ceiling"] }],
    [["electric", "outlet", "breaker", "light", "wiring"], { title: "Electrical problem", trade: "Electrician", search: "electrician", keywords: ["wiring", "outlet", "breaker"] }],
    [["lock", "key", "locked"], { title: "Locked out", trade: "Locksmith", search: "locksmith", keywords: ["lock", "key"] }],
  ];
  const hit = table.find(([ks]) => ks.some((k) => t.includes(k)));
  return hit?.[1] ?? { title: "Plumbing problem", trade: "Plumber", search: "plumber", keywords: ["pipe", "leak", "water", "drain", "sink"] };
}

async function findPlaces(triage: Triage, here: { lat: number; lng: number }): Promise<ProviderRow[]> {
  const cacheKey = `${triage.trade.toLowerCase()}:${here.lat.toFixed(2)},${here.lng.toFixed(2)}`;
  try {
    const places: Place[] = await placesNear(triage.search, here.lat, here.lng, 8);
    if (!places.length) throw new Error("no places");
    const rows: ProviderRow[] = places.map((p) => ({
      id: p.id,
      name: p.name,
      trade: triage.trade,
      phone: p.phone,
      website: p.website,
      address: p.address,
      rating: p.rating,
      reviews: p.reviews,
      lat: p.lat,
      lng: p.lng,
    }));
    const existing = new Set((await select<{ id: string }>("providers", `select=id&id=${inList(rows.map((r) => r.id))}`)).map((r) => r.id));
    const fresh = rows.filter((r) => !existing.has(r.id));
    if (fresh.length) await upsert("providers", fresh);
    await upsert("agent_cache", { key: cacheKey, result: { ids: rows.map((r) => r.id) } });
    // Also consider pros of this trade the network already knows nearby.
    const known = await select<ProviderRow>("providers", `trade=ilike.${encodeURIComponent(triage.trade.slice(0, 4))}*&limit=30`);
    const seen = new Set(rows.map((r) => r.id));
    const near = known.filter((k) => !seen.has(k.id) && milesBetween(here, { lat: k.lat, lng: k.lng }) < 6);
    return [...rows, ...near].slice(0, 14);
  } catch (e) {
    console.warn("[guy] monid failed, using cache:", (e as Error).message);
    const [cached] = await select<{ result: { ids: string[] } }>("agent_cache", `key=eq.${encodeURIComponent(cacheKey)}`);
    if (cached?.result.ids.length) return select<ProviderRow>("providers", `id=${inList(cached.result.ids)}`);
    return select<ProviderRow>("providers", `trade=ilike.${encodeURIComponent(triage.trade.slice(0, 4))}*&limit=12`);
  }
}

const networkLine = (s: NetworkSignal) =>
  [
    s.vouches ? `${s.vouches} neighbor vouch(es)${s.quote ? `: "${s.quote.text}"` : ""}` : "",
    s.warning ? `${s.warning.count} warning(s): ${s.warning.label}` : "",
  ]
    .filter(Boolean)
    .join("; ") || "no network history";

/** Runs in the background after submit / answer. Writes activity lines as it goes. */
export async function work(id: string) {
  try {
    let row = await patch(id, (p) => (p.activity = "Reading what you sent…"));
    const { meta } = row;
    const here = { lat: meta.lat, lng: meta.lng };

    let triage: Triage;
    let sessionId = row.session_id ?? undefined;
    try {
      const r = await ask<Triage>(triagePrompt(meta.text ?? "", AREA(), !meta.answer, meta.answer), sessionId);
      triage = r.result;
      sessionId = r.sessionId;
      meta.via = r.via;
    } catch (e) {
      console.warn("[guy] triage failed:", (e as Error).message);
      triage = fallbackTriage(`${meta.text ?? ""} ${meta.answer ?? ""}`);
    }
    triage.keywords = (triage.keywords ?? []).map((k) => k.toLowerCase());

    if (triage.question?.text && !meta.answer) {
      await patch(id, (p, m) => {
        m.triage = triage;
        m.via = meta.via;
        p.title = triage.title || p.title;
        p.question = { text: triage.question!.text, quickReplies: (triage.question!.quickReplies ?? []).slice(0, 4) };
        p.status = "question";
        p.activity = undefined;
      }).then((r) => save({ ...r, session_id: sessionId }));
      return;
    }

    const trade = (triage.trade || "pro").toLowerCase();
    row = await patch(id, (p, m) => {
      m.triage = triage;
      p.title = triage.title || p.title;
      p.activity = `Checking nearby ${trade}s on Google Maps…`;
    });

    const places = await findPlaces(triage, here);
    await patch(id, (p) => (p.activity = `Asking 8 neighbors' guys about ${trade}s…`));

    const [reviewRows, guys] = await Promise.all([
      places.length ? select<ReviewRow>("reviews", `provider_id=${inList(places.map((p) => p.id))}`) : [],
      select<{ id: string; name: string }>("guys"),
    ]);
    const reviews = reviewRows.map(toReview);
    const guyNames = Object.fromEntries(guys.map((g) => [g.id, g.name]));
    const providers = places.map((r) => toProvider(r, here));
    const { candidates, summary } = rank(providers, triage.keywords, reviews, guyNames);

    await patch(id, (p) => (p.activity = "Writing up your shortlist…"));
    try {
      const r = await ask<{ candidates: { id: string; why: string }[] }>(
        whyPrompt(
          triage.title,
          candidates.map((c) => ({ id: c.provider.id, name: c.provider.name, rating: c.provider.rating, reviews: c.provider.reviews, network: networkLine(c.signal) })),
        ),
        sessionId,
      );
      const whys = Object.fromEntries((r.result.candidates ?? []).map((c) => [c.id, c.why]));
      candidates.forEach((c) => (c.provider.why = whys[c.provider.id] ?? ""));
      sessionId = r.sessionId;
    } catch (e) {
      console.warn("[guy] why failed:", (e as Error).message);
    }
    candidates.forEach((c) => {
      if (!c.provider.why) c.provider.why = c.signal.vouches ? `${c.signal.vouches} neighbors vouch for them.` : "Strong public reviews nearby.";
    });

    row = await patch(id, (p) => {
      p.candidates = candidates;
      p.summary = summary;
      p.status = "picking";
      p.activity = undefined;
    });
    await save({ ...row, session_id: sessionId });
  } catch (e) {
    console.error("[guy] work failed:", e);
    await patch(id, (p, m) => {
      m.error = (e as Error).message;
      p.activity = "Hit a snag. Trying again shortly…";
    }).catch(() => {});
  }
}

// --- Operations ----------------------------------------------------------------

export async function submitProblem(input: { text?: string; audio?: Blob | null; lat?: number; lng?: number }) {
  let text = input.text?.trim() ?? "";
  if (input.audio && input.audio.size > 0) {
    try {
      const said = await transcribe(input.audio);
      text = [text, said].filter(Boolean).join(". ");
    } catch (e) {
      console.warn("[guy] transcribe failed:", (e as Error).message);
    }
  }
  const here = input.lat != null && input.lng != null && !Number.isNaN(input.lat) ? { lat: input.lat, lng: input.lng } : demoLocation();
  const problem: Problem = {
    id: uid(),
    title: text ? (text.length > 40 ? `${text.slice(0, 38)}…` : text) : "New problem",
    status: "working",
    createdAt: Date.now(),
    activity: "Reading what you sent…",
    candidates: [],
    picks: [],
    intros: [],
    outcomes: {},
  };
  await insert<Row>("problems", { id: problem.id, status: problem.status, data: problem, meta: { text, ...here } });
  return problem;
}

export async function listProblems(): Promise<Problem[]> {
  const rows = await select<Row>("problems", "order=created_at.desc&limit=30");
  await Promise.all(rows.filter(advance).map(save));
  return rows.map((r) => r.data);
}

export async function getProblem(id: string): Promise<Problem | null> {
  const [row] = await select<Row>("problems", `id=eq.${encodeURIComponent(id)}`);
  if (!row) return null;
  if (advance(row)) await save(row);
  return row.data;
}

export async function answerQuestion(id: string, answer: Answer & { audio?: Blob | null }) {
  const row = await load(id);
  const parts = [answer.text?.trim()];
  if (answer.audio && answer.audio.size > 0) parts.push(await transcribe(answer.audio).catch(() => "a voice note"));
  row.data.answer = parts.filter(Boolean).join(". ") || "Skipped";
  row.meta.answer = row.data.answer;
  row.data.status = "working";
  row.data.activity = "Got it. Asking around…";
  return save(row);
}

function introFor(row: Row, p: Provider): Intro {
  const { data: problem, meta } = row;
  const demoTo = process.env.DEMO_EMAIL;
  const details = [
    meta.text ? `In their words: "${meta.text}"` : "They sent a voice/video note.",
    problem.answer && problem.question ? `${problem.question.text} ${problem.answer}.` : "",
  ].filter(Boolean);
  return {
    providerId: p.id,
    provider: p,
    email: {
      from: `Your guy <${process.env.AGENTMAIL_INBOX ?? "yourguy@agentmail.to"}>`,
      to: demoTo ? `${demoTo} (demo stand-in for ${p.name})` : p.email || p.name,
      subject: `${problem.title} in ${AREA()}. Can you help?`,
      body: [
        `Hi ${p.name},`,
        "",
        `I'm an assistant for a neighbor in ${AREA()}. ${problem.title}.`,
        ...details,
        "",
        "Neighbors recommended you. They'll call you directly shortly. Please let them know your earliest availability and a rough price.",
        "",
        "Thanks!",
        "Your guy (That Guy)",
      ].join("\n"),
      sentAt: Date.now(),
    },
  };
}

export async function pickProviders(id: string, providerIds: string[]) {
  const row = await load(id);
  const p = row.data;
  const picked = providerIds.map((pid) => p.candidates.find((c) => c.provider.id === pid)?.provider).filter((x): x is Provider => !!x);
  p.picks = picked.map((x) => x.id);
  p.intros = picked.map((x) => introFor(row, x));
  // Demo: every intro goes to our own address, never to the real business.
  const to = process.env.DEMO_EMAIL;
  if (to) {
    await Promise.all(
      p.intros.map((i) => sendEmail(to, `[demo → ${i.provider.name}] ${i.email.subject}`, i.email.body).catch((e) => console.warn("[guy] email failed:", e.message))),
    );
  }
  p.status = "contacted";
  p.checkin = picked[0];
  row.meta.introsAt = Date.now();
  return save(row);
}

export async function markDone(id: string, providerId: string, outcome: DoneOutcome) {
  const row = await load(id);
  const p = row.data;
  p.outcomes[providerId] = outcome;
  const byId = (pid?: string) => p.candidates.find((c) => c.provider.id === pid)?.provider;
  if (outcome === "didnt_use") {
    p.checkin = byId(p.picks.find((x) => !p.outcomes[x]));
    p.status = p.checkin ? "checkin" : "done";
  } else {
    p.checkin = byId(providerId);
    p.status = "feedback";
  }
  return save(row);
}

export async function submitFeedback(id: string, providerId: string, audio: Blob | null) {
  const row = await load(id);
  const p = row.data;
  const outcome = p.outcomes[providerId] === "no" ? "no" : "yes";
  let transcript = outcome === "yes" ? "Got it done." : "Didn't fix it.";
  if (audio && audio.size > 0) {
    try {
      transcript = await transcribe(audio);
    } catch (e) {
      console.warn("[guy] transcribe failed:", (e as Error).message);
    }
  }
  const price = Number(transcript.match(/\$\s?(\d[\d,]*)/)?.[1]?.replace(/,/g, "")) || null;
  await insert("reviews", {
    guy_id: "me",
    provider_id: providerId,
    outcome: outcome === "yes" ? "great" : "bad",
    quote: transcript.length > 140 ? `${transcript.slice(0, 138)}…` : transcript,
    price,
    rating: outcome === "yes" ? 5 : 2,
  });
  p.feedback = { providerId, outcome, transcript, sharedAt: Date.now() };
  p.status = "done";
  return save(row);
}
