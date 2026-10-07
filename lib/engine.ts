// The mock backend: one shared in-memory store plus a deterministic, scripted
// timeline. The phone app and the Network Console both render from this store.
// Tabs stay in sync through a BroadcastChannel; only the tab that started a run
// owns its timers. Nothing is persisted, so a reload is a clean slate.

import { HELPED_PEOPLE, PROS, REPLY_AT_MS, SCENARIOS, SEED_SIGNALS, USERS, ZIP, networkFor } from "./mock";
import { trustLine, trustTable } from "./trust";
import type {
  AgentStatus,
  Case,
  LogLine,
  Note,
  Pulse,
  PulseTone,
  Reveal,
  ScenarioKey,
  Signal,
  Step,
  StepKind,
  UserId,
} from "./types";

export interface Sim {
  kind: "drop" | "vouch";
  user: UserId;
  startedAt: number;
  ms: number;
}

export interface State {
  user: UserId;
  demoMode: boolean;
  scenario: ScenarioKey;
  cases: Record<string, Case>;
  activeCase: Partial<Record<UserId, string>>;
  reveal: Record<string, Reveal>;
  signals: Signal[];
  log: LogLine[];
  pulses: Pulse[];
  sim?: Sim;
  autoplay?: { startedAt: number };
  /** Bumped on reset so views can drop stale local state. */
  epoch: number;
}

export function initialState(): State {
  return {
    user: "alex",
    demoMode: false,
    scenario: "pipe",
    cases: {},
    activeCase: {},
    reveal: {},
    signals: [...SEED_SIGNALS],
    log: [],
    pulses: [],
    epoch: 0,
  };
}

// ---------------------------------------------------------------------------
// Store + cross-tab sync
// ---------------------------------------------------------------------------

let state: State = initialState();
const listeners = new Set<() => void>();
let bc: BroadcastChannel | null = null;
let bcReady = false;

function initChannel() {
  if (bcReady || typeof window === "undefined") return;
  bcReady = true;
  if (!("BroadcastChannel" in window)) return;
  bc = new BroadcastChannel("thatguy-network");
  bc.onmessage = (e: MessageEvent) => {
    const m = e.data as { type: "state"; state: State } | { type: "hello" };
    if (m.type === "state") {
      state = m.state;
      listeners.forEach((l) => l());
    } else if (m.type === "hello" && (Object.keys(state.cases).length || state.user !== "alex" || state.epoch)) {
      bc?.postMessage({ type: "state", state });
    }
  };
  bc.postMessage({ type: "hello" });
}

export function getState(): State {
  initChannel();
  return state;
}

const serverState = initialState();
export const getServerState = () => serverState;

export function subscribe(cb: () => void) {
  initChannel();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function set(fn: (s: State) => State) {
  state = fn(state);
  listeners.forEach((l) => l());
  bc?.postMessage({ type: "state", state });
}

// Timers owned by this tab. Cleared on reset so every run starts clean.
const timers = new Set<ReturnType<typeof setTimeout>>();
const vetoTimers = new Map<string, ReturnType<typeof setTimeout>>();
function later(ms: number, fn: () => void) {
  const id = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
  return id;
}
function clearTimers() {
  timers.forEach(clearTimeout);
  timers.clear();
  vetoTimers.clear();
}

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

// ---------------------------------------------------------------------------
// Mutation helpers
// ---------------------------------------------------------------------------

function patchCase(id: string, patch: Partial<Case>) {
  set((s) => (s.cases[id] ? { ...s, cases: { ...s.cases, [id]: { ...s.cases[id], ...patch } } } : s));
}

function addStep(caseId: string, label: string, kind: StepKind) {
  set((s) => {
    const c = s.cases[caseId];
    if (!c) return s;
    const step: Step = { id: uid("st"), label, kind, t: Date.now() - c.startedAt };
    return { ...s, cases: { ...s.cases, [caseId]: { ...c, steps: [...c.steps, step] } } };
  });
}

function addLog(caseId: string, line: Omit<LogLine, "id" | "caseId" | "t">) {
  set((s) => {
    const c = s.cases[caseId];
    if (!c) return s;
    return { ...s, log: [...s.log, { ...line, id: uid("lg"), caseId, t: Date.now() - c.startedAt }] };
  });
}

function addPulses(caseId: string, list: { from: string; to: string; tone: PulseTone }[]) {
  const now = Date.now();
  set((s) => ({
    ...s,
    pulses: [...s.pulses, ...list.map((p, i) => ({ ...p, id: uid("pu"), caseId, at: now + i * 60 }))].slice(-60),
  }));
}

function patchReveal(caseId: string, fn: (r: Reveal) => Reveal) {
  set((s) => (s.reveal[caseId] ? { ...s, reveal: { ...s.reveal, [caseId]: fn(s.reveal[caseId]) } } : s));
}

function setAgents(caseId: string, ids: string[], status: AgentStatus) {
  patchReveal(caseId, (r) => ({ ...r, agents: { ...r.agents, ...Object.fromEntries(ids.map((id) => [id, status])) } }));
}

export function tableFor(s: State, caseId: string) {
  const c = s.cases[caseId];
  const r = s.reveal[caseId];
  if (!c || !r) return [];
  return trustTable(r, s.signals, networkFor(c.user), c.user);
}

const fmtClock = (ms: number) => {
  const sec = Math.round(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
};

// ---------------------------------------------------------------------------
// The script
// ---------------------------------------------------------------------------

/** Opens a case for the current user and plays its timeline. */
export function startCase(note: Note): Case {
  const s = state;
  const user = s.user;
  const sc = SCENARIOS[s.scenario];
  const net = networkFor(user);
  const c: Case = {
    id: uid("case"),
    user,
    scenario: sc.key,
    trade: sc.trade,
    urgency: sc.urgency,
    title: sc.title,
    startedAt: Date.now(),
    steps: [],
    status: "working",
    vetoMs: s.demoMode ? 10_000 : 120_000,
    photos: note.photos,
  };
  set((st) => ({
    ...st,
    sim: undefined,
    cases: { ...st.cases, [c.id]: c },
    activeCase: { ...st.activeCase, [user]: c.id },
    reveal: {
      ...st.reveal,
      [c.id]: { signalIds: [], publicIds: [], agents: Object.fromEntries(net.map((a) => [a.id, "idle"])), scored: false, emailed: [] },
    },
  }));

  const id = c.id;
  const live = () => state.cases[id]?.status === "working";
  const at = (ms: number, fn: () => void) => later(ms, () => live() && fn());

  at(0, () => {
    addStep(id, "On it.", "info");
    addLog(id, {
      dir: "sys",
      text: `· New case from ${USERS[user].human}: ${sc.title.toLowerCase()} · ${sc.urgency} · ${ZIP}${note.photos ? ` · ${note.photos} photo${note.photos > 1 ? "s" : ""}` : ""}`,
      tone: "muted",
    });
  });

  at(2000, () => {
    addStep(id, sc.safety, "safety");
    addLog(id, { dir: "sys", text: `· Safety first → my human: "${sc.safety}"` });
  });

  at(4000, () => {
    addStep(id, `Asking ${net.length} neighbors' guys…`, "network");
    addLog(id, { dir: "out", who: "Your guy", to: `${net.length} agents`, text: `"${sc.question}"` });
    addPulses(id, net.map((a) => ({ from: user, to: a.id, tone: "ask" as const })));
    setAgents(id, net.map((a) => a.id), "asked");
  });

  net.forEach((agent, i) => {
    at(REPLY_AT_MS[i], () => {
      if (sc.offline.includes(agent.id)) {
        addLog(id, { dir: "sys", text: `· ${agent.name}: no answer (offline)`, tone: "muted" });
        setAgents(id, [agent.id], "offline");
        return;
      }
      const sig = state.signals
        .filter((x) => x.agentId === agent.id && PROS[x.proId]?.trade === sc.trade)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      addPulses(id, [{ from: agent.id, to: user, tone: sig ? (sig.kind === "vouch" ? "good" : "bad") : "muted" }]);
      if (!sig) {
        addLog(id, { dir: "in", who: agent.name, text: `"No ${sc.tradeLabel} history."`, tone: "muted" });
        setAgents(id, [agent.id], "none");
        return;
      }
      addLog(id, { dir: "in", who: agent.name, text: `"${sig.note}"`, tone: sig.kind === "vouch" ? "good" : "bad" });
      setAgents(id, [agent.id], sig.kind === "vouch" ? "vouch" : "warning");
      patchReveal(id, (r) => ({ ...r, signalIds: [...r.signalIds, sig.id] }));
    });
  });

  at(9000, () => {
    addLog(id, { dir: "sys", text: `· Public listings (monid): +${sc.publicIds.length} ${sc.tradeLabel}s` });
    patchReveal(id, (r) => ({ ...r, publicIds: [...sc.publicIds] }));
  });

  at(14_600, () => {
    const answered = Object.values(state.reveal[id].agents).filter((x) => x === "vouch" || x === "warning").length;
    if (answered) {
      addStep(id, `${answered} got back to me`, "reply");
    } else {
      addStep(id, "No neighbor history yet. You'll be the first.", "warn");
      addLog(id, { dir: "sys", text: "No neighbor history yet. You'll be the first.", tone: "bad" });
    }
  });

  at(16_000, () => {
    patchReveal(id, (r) => ({ ...r, scored: true }));
    const rows = tableFor(state, id);
    addLog(id, { dir: "sys", text: `· Scored ${rows.length} pros: vouches, warnings, recency, distance, public rating` });
    const struck = rows.filter((r) => r.struck);
    if (struck.length) addLog(id, { dir: "sys", text: `· Dropped ${struck.map((r) => r.pro.name).join(", ")} (neighbor warnings)`, tone: "bad" });
  });

  at(18_000, () => {
    const best = tableFor(state, id).filter((r) => !r.struck).slice(0, 2);
    patchReveal(id, (r) => ({ ...r, emailed: best.map((b) => b.proId) }));
    addStep(id, `Emailing the ${best.length} best`, "email");
    best.forEach((b) => addLog(id, { dir: "email-out", who: "Your guy", to: b.pro.name, text: `"${sc.emailAsk}"` }));
  });

  const replyFrom = (rank: number) => {
    const proId = state.reveal[id].emailed[rank];
    const reply = proId && sc.replies[proId];
    if (!proId || !reply) return;
    addLog(id, { dir: "email-in", who: PROS[proId].name, text: `"${reply.email}"`, tone: "good" });
    if (rank === 0) addStep(id, `${PROS[proId].contact} replied: ${reply.short}`, "reply");
  };
  at(21_000, () => replyFrom(1));
  at(24_000, () => replyFrom(0));

  at(27_000, () => {
    const proId = state.reveal[id].emailed[0];
    if (!proId) return;
    const row = tableFor(state, id).find((r) => r.proId === proId)!;
    const vetoEndsAt = Date.now() + c.vetoMs;
    patchCase(id, {
      status: "sorted",
      chosenProId: proId,
      sortedText: `Sorted. ${sc.replies[proId].sorted}`,
      trustLine: trustLine(row),
      vetoEndsAt,
    });
    addLog(id, {
      dir: "sys",
      text: `· Picked ${row.pro.name} (trust ${row.score}). Booking in ${fmtClock(c.vetoMs)} unless my human says stop.`,
      tone: "good",
    });
    vetoTimers.set(
      id,
      later(c.vetoMs, () => book(id)),
    );
  });

  return c;
}

function book(caseId: string) {
  const c = state.cases[caseId];
  if (!c || c.status !== "sorted" || !c.chosenProId) return;
  const reply = SCENARIOS[c.scenario].replies[c.chosenProId];
  patchCase(caseId, { status: "booked" });
  addStep(caseId, "Booked ✅", "done");
  addLog(caseId, { dir: "email-out", who: "Your guy", to: PROS[c.chosenProId].name, text: `"Booked for ${reply.when}. See you then." ✅`, tone: "good" });
}

export function stop(caseId: string) {
  const c = state.cases[caseId];
  if (!c || c.status !== "sorted") return;
  const t = vetoTimers.get(caseId);
  if (t) clearTimeout(t);
  patchCase(caseId, { status: "stopped" });
  addStep(caseId, "Okay, holding off. I won't book.", "stop");
  addLog(caseId, { dir: "sys", text: "· My human said stop. Not booking.", tone: "bad" });
}

export function nextDay(caseId?: string) {
  const id = caseId ?? state.activeCase[state.user];
  const c = id ? state.cases[id] : undefined;
  if (!c || c.status !== "booked") return;
  patchCase(c.id, { status: "followup" });
  addLog(c.id, { dir: "sys", text: "· Next day. Asking my human how it went.", tone: "muted" });
}

export function vouch(caseId: string) {
  const c = state.cases[caseId];
  if (!c || c.status !== "followup" || !c.chosenProId) return;
  const sc = SCENARIOS[c.scenario];
  const net = networkFor(c.user);
  const sig: Signal = {
    id: uid("sig"),
    agentId: c.user,
    proId: c.chosenProId,
    kind: "vouch",
    note: sc.vouch.note,
    pricePaid: sc.vouch.pricePaid,
    date: "2026-10",
  };
  set((s) => ({
    ...s,
    sim: undefined,
    signals: [...s.signals, sig],
    reveal: { ...s.reveal, [caseId]: { ...s.reveal[caseId], signalIds: [...s.reveal[caseId].signalIds, sig.id] } },
  }));
  patchCase(caseId, { status: "vouched", helped: HELPED_PEOPLE });
  addLog(caseId, {
    dir: "share",
    who: "Your guy",
    to: `${net.length} agents`,
    text: `shared vouch: ${PROS[c.chosenProId].name} ★${sc.vouch.stars}, ${sc.vouch.price}`,
    tone: "good",
  });
  addPulses(caseId, net.map((a) => ({ from: c.user, to: a.id, tone: "share" as const })));
  setAgents(caseId, net.map((a) => a.id), "shared");
}

// ---------------------------------------------------------------------------
// Demo controls
// ---------------------------------------------------------------------------

export function setUser(user: UserId) {
  set((s) => ({ ...s, user }));
}

export function setScenario(scenario: ScenarioKey) {
  set((s) => ({ ...s, scenario }));
}

export function setDemoMode(demoMode: boolean) {
  if (state.demoMode !== demoMode) set((s) => ({ ...s, demoMode }));
}

export function reset(keep?: Partial<Pick<State, "demoMode" | "scenario">>) {
  clearTimers();
  set((s) => ({ ...initialState(), demoMode: keep?.demoMode ?? s.demoMode, scenario: keep?.scenario ?? s.scenario, epoch: s.epoch + 1 }));
}

function simulate(kind: Sim["kind"], ms: number) {
  set((s) => ({ ...s, sim: { kind, user: s.user, startedAt: Date.now(), ms } }));
}

/**
 * The full ~1:45 story, hands-free: Alex drops a video → neighbors answer →
 * Sorted → veto runs out → Booked → next day → voice vouch → it propagates →
 * switch to Dana → Dana drops → Mike first, trusted by 3 neighbors.
 */
export function runDemo() {
  const scenario = state.scenario;
  reset({ demoMode: true, scenario });
  set((s) => ({ ...s, autoplay: { startedAt: Date.now() } }));

  const caseOf = (u: UserId) => state.activeCase[u];
  const drop = () => startCase({ audioBlob: null, frames: [], photos: 0 });

  // Alex
  simulate("drop", 3200);
  later(3200, drop); //                      Sorted ≈ 30s, Booked ≈ 40s
  later(44_000, () => nextDay(caseOf("alex")));
  later(47_000, () => simulate("vouch", 3000));
  later(50_000, () => {
    const id = caseOf("alex");
    if (id) vouch(id);
  });
  // Dana
  later(57_000, () => setUser("dana"));
  later(59_000, () => simulate("drop", 3000));
  later(62_000, drop); //                    Sorted ≈ 89s, Booked ≈ 99s
  later(101_000, () => set((s) => ({ ...s, autoplay: undefined })));
}
