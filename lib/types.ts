// Domain types for That Guy: word of mouth, automated.
// Each household has an agent ("guy"). Agents ask each other who their humans
// trusted (and who to avoid), score the pros, and handle the rest.

export type UserId = "alex" | "dana";
export type Trade = "plumber" | "roofer" | "lawyer";
export type ScenarioKey = "pipe" | "roof" | "legal";

/** A neighbor's agent, placed by distance from the current household. */
export interface Agent {
  id: string;
  /** "Leo's guy" */
  name: string;
  /** "Leo" */
  human: string;
  distanceMi: number;
}

export interface Pro {
  id: string;
  name: string;
  /** Who replies by email, e.g. "Mike". */
  contact: string;
  trade: Trade;
  phone: string;
  email: string;
  /** Where That Guy first hears about them. */
  source: "network" | "public";
  rating?: number;
  reviews?: number;
  distanceMi: number;
}

/** One household's experience with a pro, shared agent-to-agent. */
export interface Signal {
  id: string;
  agentId: string;
  proId: string;
  kind: "vouch" | "warning";
  /** How the agent phrases it on the wire. */
  note: string;
  pricePaid?: number;
  /** "YYYY-MM" */
  date: string;
}

export interface TrustScore {
  proId: string;
  /** 0–100 */
  score: number;
  vouches: number;
  warnings: number;
}

export interface TrustRow extends TrustScore {
  pro: Pro;
  /** Latest signal, "Mar 2026". */
  recency?: string;
  network: boolean;
  listed: boolean;
  struck: boolean;
  /** Human names of the households that vouched ("Leo", "you"). */
  vouchers: string[];
}

export type StepKind = "info" | "safety" | "network" | "reply" | "email" | "warn" | "done" | "stop";

export interface Step {
  id: string;
  label: string;
  kind: StepKind;
  /** ms since the case started */
  t: number;
}

export type CaseStatus = "working" | "sorted" | "booked" | "stopped" | "followup" | "vouched";

export interface Case {
  id: string;
  user: UserId;
  scenario: ScenarioKey;
  trade: Trade;
  urgency: "emergency" | "soon";
  title: string;
  startedAt: number;
  steps: Step[];
  chosenProId?: string;
  status: CaseStatus;
  /** "Sorted. Mike's Plumbing is coming at 4pm, ~$280." */
  sortedText?: string;
  trustLine?: string;
  vetoEndsAt?: number;
  vetoMs: number;
  /** People reached by the shared vouch. */
  helped?: number;
  photos: number;
}

export type LogDir = "out" | "in" | "sys" | "email-out" | "email-in" | "share";

export interface LogLine {
  id: string;
  caseId: string;
  /** ms since the case started */
  t: number;
  dir: LogDir;
  who?: string;
  to?: string;
  text: string;
  tone?: "good" | "bad" | "muted";
}

export type PulseTone = "ask" | "good" | "bad" | "muted" | "share";

/** A message travelling along a graph edge (for the console animation). */
export interface Pulse {
  id: string;
  caseId: string;
  from: string;
  to: string;
  at: number;
  tone: PulseTone;
}

export type AgentStatus = "idle" | "asked" | "vouch" | "warning" | "none" | "offline" | "shared";

/** What a case has learned so far. */
export interface Reveal {
  signalIds: string[];
  publicIds: string[];
  agents: Record<string, AgentStatus>;
  scored: boolean;
  emailed: string[];
}

export interface Note {
  audioBlob: Blob | null;
  /** Sent to the backend for understanding; never shown. */
  frames: string[];
  photos: number;
}
