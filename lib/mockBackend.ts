// MOCK BACKEND. Simulates your guy in the browser: routes a problem to a
// scenario, waits, asks at most one question, ranks pros using the network's
// reviews, writes intro emails and "transcribes" voice feedback.
// State lives in localStorage; stage changes are derived from timestamps on
// every read, so it survives reloads and needs no timers.

import { MOCK_CONFIG, NEIGHBORS, PROVIDERS, REVIEWS, SCENARIOS, type MockScenario } from "./mock";
import type { Answer, Candidate, DoneOutcome, Intro, NetworkSignal, Problem, ProblemInput, Provider } from "./types";

interface Stored {
  problem: Problem;
  scenario: string;
  inputText?: string;
  answeredAt?: number;
  introsAt?: number;
}

interface Db {
  problems: Stored[];
  rotation: number;
}

const byId = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map((x) => [x.id, x]));
const providers: Record<string, Provider> = byId(PROVIDERS);
const neighbors = byId(NEIGHBORS);

function load(): Db {
  if (typeof window === "undefined") return { problems: [], rotation: 0 };
  try {
    const raw = localStorage.getItem(MOCK_CONFIG.storageKey);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    /* fall through */
  }
  return { problems: [], rotation: 0 };
}

function save(db: Db) {
  try {
    localStorage.setItem(MOCK_CONFIG.storageKey, JSON.stringify(db));
  } catch {
    /* quota / private mode: in-memory only */
  }
}

const uid = () => `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function pickScenario(text: string | undefined, db: Db): MockScenario {
  const t = (text ?? "").toLowerCase();
  // Roof first: "leak" alone is ambiguous, "roof leak" is not.
  const ordered = [...SCENARIOS].sort((a, b) => (a.key === "roof" ? -1 : b.key === "roof" ? 1 : 0));
  const hit = t && ordered.find((s) => s.keywords.some((k) => t.includes(k)));
  if (hit) return hit;
  // Voice/video only: no transcription in the mock, so alternate scenarios.
  const s = SCENARIOS[db.rotation % SCENARIOS.length];
  db.rotation += 1;
  return s;
}

// --- Ranking from the private network ----------------------------------------

const OUTCOME_LABEL: Record<string, string> = { no_show: "no-show", bad: "bad job" };

/** Quote the vouch most relevant to this problem, then the best rated, then the newest. */
function signalFor(providerId: string, keywords: string[]): NetworkSignal {
  const rs = REVIEWS.filter((r) => r.providerId === providerId);
  const relevant = (q: string) => (keywords.some((k) => q.toLowerCase().includes(k)) ? 1 : 0);
  const good = rs
    .filter((r) => r.outcome === "great" || r.outcome === "ok")
    .sort((a, b) => relevant(b.quote) - relevant(a.quote) || b.rating - a.rating || b.date.localeCompare(a.date));
  const bad = rs.filter((r) => r.outcome === "bad" || r.outcome === "no_show");
  const best = good[0];
  return {
    vouches: good.length,
    quote: best
      ? { text: `${best.quote}${best.price ? `, ~$${best.price}` : ""}`, by: neighbors[best.guyId]?.name ?? "a neighbor's guy" }
      : undefined,
    warning: bad.length
      ? { count: bad.length, label: OUTCOME_LABEL[bad[0].outcome] ?? "bad job", by: neighbors[bad[0].guyId]?.name }
      : undefined,
    publicOnly: rs.length === 0,
  };
}

function score(p: Provider, s: NetworkSignal) {
  return s.vouches * 30 - (s.warning?.count ?? 0) * 45 + (p.rating ?? 3.5) * 10 - p.distanceMi * 2;
}

function rank(sc: MockScenario) {
  const all = sc.providerIds.map((id) => ({ provider: providers[id], signal: signalFor(id, sc.keywords) }));
  // Dropped: two or more neighbors' guys had a bad experience.
  const dropped = all.filter((c) => (c.signal.warning?.count ?? 0) >= 2);
  const kept = all
    .filter((c) => !dropped.includes(c))
    .sort((a, b) => score(b.provider, b.signal) - score(a.provider, a.signal))
    .slice(0, MOCK_CONFIG.deckSize);
  const candidates: Candidate[] = kept.map((c, i) => ({ ...c, rank: i + 1 }));
  const checked = all.length + sc.alsoChecked;
  const summary = `Your guy checked ${checked} nearby pros and dropped ${dropped.length} with bad reviews.`;
  return { candidates, summary };
}

// --- Stage machine ------------------------------------------------------------

function nextCheckin(s: Stored): Provider | undefined {
  const pid = s.problem.picks.find((id) => !s.problem.outcomes[id]);
  return pid ? providers[pid] : undefined;
}

/** Derive time-based stage changes. Mutates and returns whether anything changed. */
function advance(s: Stored, now = Date.now()): boolean {
  const p = s.problem;
  const sc = SCENARIOS.find((x) => x.key === s.scenario)!;
  const before = JSON.stringify([p.status, p.activity]);

  if (p.status === "working") {
    const since = s.answeredAt ?? p.createdAt;
    const total = s.answeredAt ? MOCK_CONFIG.afterAnswerMs : MOCK_CONFIG.workMs;
    const elapsed = now - since;
    const lines = s.answeredAt ? ["Got it. Asking around…", sc.activity.at(-1)!] : sc.activity;
    p.activity = lines[Math.min(lines.length - 1, Math.floor((elapsed / total) * lines.length))];
    if (elapsed >= total) {
      if (sc.question && !s.answeredAt) {
        p.status = "question";
        p.question = sc.question;
      } else {
        const { candidates, summary } = rank(sc);
        p.candidates = candidates;
        p.summary = summary;
        p.status = "picking";
      }
      p.activity = undefined;
    }
  }

  if (p.status === "contacted" && s.introsAt && now - s.introsAt >= MOCK_CONFIG.checkinAfterMs) {
    p.checkin = nextCheckin(s);
    p.status = p.checkin ? "checkin" : "done";
  }

  return JSON.stringify([p.status, p.activity]) !== before;
}

function read<T>(fn: (db: Db) => T): T {
  const db = load();
  let dirty = false;
  db.problems.forEach((s) => {
    if (advance(s)) dirty = true;
  });
  const out = fn(db);
  if (dirty) save(db);
  return out;
}

function write<T>(fn: (db: Db) => T): T {
  const db = load();
  db.problems.forEach((s) => advance(s));
  const out = fn(db);
  save(db);
  return out;
}

function find(db: Db, id: string): Stored {
  const s = db.problems.find((x) => x.problem.id === id);
  if (!s) throw new Error(`No problem ${id}`);
  return s;
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

// --- Operations ---------------------------------------------------------------

export function submitProblem(input: ProblemInput): Problem {
  return write((db) => {
    const sc = pickScenario(input.text, db);
    const problem: Problem = {
      id: uid(),
      title: sc.title,
      status: "working",
      createdAt: Date.now(),
      activity: sc.activity[0],
      candidates: [],
      picks: [],
      intros: [],
      outcomes: {},
    };
    db.problems.unshift({ problem, scenario: sc.key, inputText: input.text?.trim() || undefined });
    return clone(problem);
  });
}

export function listProblems(): Problem[] {
  return read((db) => clone(db.problems.map((s) => s.problem)));
}

export function getProblem(id: string): Problem | null {
  return read((db) => {
    const s = db.problems.find((x) => x.problem.id === id);
    return s ? clone(s.problem) : null;
  });
}

export function answerQuestion(id: string, answer: Answer): Problem {
  return write((db) => {
    const s = find(db, id);
    const parts = [
      answer.text?.trim(),
      answer.photos?.length ? `${answer.photos.length} photo${answer.photos.length > 1 ? "s" : ""}` : "",
      answer.audio ? "a voice note" : "",
      answer.videoFrames?.length ? "a video" : "",
    ].filter(Boolean);
    s.problem.answer = parts.join(" + ") || "Skipped";
    s.problem.status = "working";
    s.answeredAt = Date.now();
    advance(s);
    return clone(s.problem);
  });
}

function introFor(s: Stored, p: Provider): Intro {
  const me = MOCK_CONFIG.me;
  const details = [
    s.inputText ? `In their words: "${s.inputText}"` : "They sent a video/voice note and photos (attached).",
    s.problem.answer && s.problem.question ? `${s.problem.question.text} ${s.problem.answer}.` : "",
  ].filter(Boolean);
  return {
    providerId: p.id,
    provider: p,
    email: {
      from: `Your guy <${me.inbox}>`,
      to: p.email,
      subject: `${s.problem.title} in ${me.area}. Can you help?`,
      body: [
        `Hi ${p.name},`,
        "",
        `I'm an assistant for a neighbor in ${me.area}. ${s.problem.title}.`,
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

export function pickProviders(id: string, providerIds: string[]): Problem {
  return write((db) => {
    const s = find(db, id);
    s.problem.picks = providerIds;
    s.problem.intros = providerIds.map((pid) => introFor(s, providers[pid]));
    s.problem.status = "contacted";
    s.problem.checkin = nextCheckin(s);
    s.introsAt = Date.now();
    return clone(s.problem);
  });
}

export function markDone(id: string, providerId: string, outcome: DoneOutcome): Problem {
  return write((db) => {
    const s = find(db, id);
    s.problem.outcomes[providerId] = outcome;
    if (outcome === "didnt_use") {
      s.problem.checkin = nextCheckin(s);
      s.problem.status = s.problem.checkin ? "checkin" : "done";
    } else {
      s.problem.checkin = providers[providerId];
      s.problem.status = "feedback";
    }
    return clone(s.problem);
  });
}

export function submitFeedback(id: string, providerId: string): Problem {
  return write((db) => {
    const s = find(db, id);
    const sc = SCENARIOS.find((x) => x.key === s.scenario)!;
    const outcome = s.problem.outcomes[providerId] === "no" ? "no" : "yes";
    s.problem.feedback = { providerId, outcome, transcript: sc.transcripts[outcome], sharedAt: Date.now() };
    s.problem.status = "done";
    return clone(s.problem);
  });
}
