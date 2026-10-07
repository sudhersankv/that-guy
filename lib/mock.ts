// Mock world for the demo. Deterministic: same input, same story, every run.
// All businesses are fictional; phone numbers are in the reserved 555-01xx range.

import type { Agent, Pro, ScenarioKey, Signal, Trade, UserId } from "./types";

export const TODAY = "2026-10";
export const ZIP = "94110";

export const USERS: Record<UserId, { id: UserId; label: string; human: string }> = {
  alex: { id: "alex", label: "Me", human: "Alex" },
  dana: { id: "dana", label: "Dana", human: "Dana" },
};

const HUMANS: Record<string, string> = {
  alex: "Alex",
  dana: "Dana",
  leo: "Leo",
  priya: "Priya",
  sam: "Sam",
  ana: "Ana",
  raj: "Raj",
  wen: "Wen",
};

/**
 * Each household's neighbor agents, in the order they answer, with distance
 * from that household. Agents answer at 6, 8, 10, 12, 13 and 14 s.
 */
const NETWORKS: Record<UserId, [string, number][]> = {
  alex: [
    ["leo", 0.2],
    ["priya", 0.35],
    ["dana", 0.5],
    ["sam", 0.6],
    ["ana", 0.8],
    ["raj", 1.0],
  ],
  dana: [
    ["leo", 0.3],
    ["priya", 0.6],
    ["alex", 0.5],
    ["sam", 0.75],
    ["wen", 0.25],
    ["raj", 0.9],
  ],
};

export const REPLY_AT_MS = [6000, 8000, 10000, 12000, 13000, 14000];

export function networkFor(user: UserId): Agent[] {
  return NETWORKS[user].map(([id, distanceMi]) => ({ id, human: HUMANS[id], name: `${HUMANS[id]}'s guy`, distanceMi }));
}

export function humanOf(agentId: string) {
  return HUMANS[agentId] ?? agentId;
}

export const PROS: Record<string, Pro> = Object.fromEntries(
  (
    [
      // Plumbers
      { id: "mike", name: "Mike's Plumbing", contact: "Mike", trade: "plumber", source: "network", distanceMi: 1.1, phone: "+14155550161", email: "mike@mikesplumbing.example" },
      { id: "quickflow", name: "QuickFlow Plumbing", contact: "QuickFlow", trade: "plumber", source: "network", rating: 4.1, reviews: 88, distanceMi: 2.3, phone: "+14155550162", email: "jobs@quickflow.example" },
      { id: "baydrain", name: "Bay Drain Co.", contact: "Bay Drain", trade: "plumber", source: "public", rating: 4.5, reviews: 140, distanceMi: 1.8, phone: "+14155550163", email: "service@baydrain.example" },
      { id: "pipepros", name: "SF Pipe Pros", contact: "SF Pipe Pros", trade: "plumber", source: "public", rating: 4.3, reviews: 61, distanceMi: 2.9, phone: "+14155550164", email: "hi@sfpipepros.example" },
      // Roofers
      { id: "summit", name: "Summit Roofing", contact: "Summit", trade: "roofer", source: "network", distanceMi: 2.0, phone: "+14155550171", email: "crew@summitroofing.example" },
      { id: "patchwork", name: "Patchwork Roofs", contact: "Patchwork", trade: "roofer", source: "network", rating: 3.9, reviews: 40, distanceMi: 3.2, phone: "+14155550172", email: "info@patchworkroofs.example" },
      { id: "ggroof", name: "Golden Gate Roof Co.", contact: "Golden Gate Roof", trade: "roofer", source: "public", rating: 4.4, reviews: 112, distanceMi: 2.6, phone: "+14155550173", email: "office@ggroof.example" },
      { id: "sunsetroof", name: "Sunset Roofers", contact: "Sunset Roofers", trade: "roofer", source: "public", rating: 4.2, reviews: 57, distanceMi: 4.1, phone: "+14155550174", email: "hello@sunsetroofers.example" },
      // Tenant lawyers
      { id: "baylegal", name: "Bay Legal Aid", contact: "Bay Legal Aid", trade: "lawyer", source: "public", rating: 4.8, reviews: 212, distanceMi: 1.4, phone: "+14155550181", email: "intake@baylegalaid.example" },
      { id: "missiontenant", name: "Mission Tenant Law", contact: "Mission Tenant Law", trade: "lawyer", source: "public", rating: 4.7, reviews: 96, distanceMi: 0.9, phone: "+14155550182", email: "help@missiontenantlaw.example" },
      { id: "hartcole", name: "Hart & Cole LLP", contact: "Hart & Cole", trade: "lawyer", source: "public", rating: 4.2, reviews: 40, distanceMi: 2.7, phone: "+14155550183", email: "contact@hartcole.example" },
    ] satisfies Pro[]
  ).map((p) => [p.id, p]),
);

/** What neighbors' households have been through. */
export const SEED_SIGNALS: Signal[] = [
  { id: "s-leo-mike", agentId: "leo", proId: "mike", kind: "vouch", note: "Mike's Plumbing. Came in 1h, $280, Mar 2026 ✅", pricePaid: 280, date: "2026-03" },
  { id: "s-priya-qf", agentId: "priya", proId: "quickflow", kind: "warning", note: "Avoid QuickFlow. No-show twice ❌", date: "2026-01" },
  { id: "s-dana-mike", agentId: "dana", proId: "mike", kind: "vouch", note: "Mike's again. Fair price ✅", pricePaid: 240, date: "2026-05" },
  { id: "s-wen-mike", agentId: "wen", proId: "mike", kind: "vouch", note: "Mike's Plumbing. Fixed our water heater, honest quote ✅", pricePaid: 300, date: "2026-06" },
  { id: "s-ana-summit", agentId: "ana", proId: "summit", kind: "vouch", note: "Summit Roofing. Fixed our flashing, $450, Feb 2026 ✅", pricePaid: 450, date: "2026-02" },
  { id: "s-raj-summit", agentId: "raj", proId: "summit", kind: "vouch", note: "Summit again. Same-day tarp, then a proper fix ✅", pricePaid: 520, date: "2025-12" },
  { id: "s-sam-patch", agentId: "sam", proId: "patchwork", kind: "warning", note: "Avoid Patchwork Roofs. Quoted $900, then ghosted ❌", date: "2026-04" },
];

export interface ProReply {
  /** Phone timeline: "4pm, ~$250–300" */
  short: string;
  /** Email text on the wire */
  email: string;
  /** "Mike's Plumbing is coming at 4pm, ~$280." */
  sorted: string;
  /** "4pm" for the booking line */
  when: string;
}

export interface Scenario {
  key: ScenarioKey;
  label: string;
  title: string;
  trade: Trade;
  tradeLabel: string;
  urgency: "emergency" | "soon";
  safety: string;
  question: string;
  emailAsk: string;
  publicIds: string[];
  /** Agents that don't answer this time. */
  offline: string[];
  replies: Record<string, ProReply>;
  vouch: { stars: number; price: string; pricePaid?: number; note: string };
}

export const SCENARIOS: Record<ScenarioKey, Scenario> = {
  pipe: {
    key: "pipe",
    label: "Burst pipe",
    title: "Burst pipe",
    trade: "plumber",
    tradeLabel: "plumber",
    urgency: "emergency",
    safety: "Shut the valve under the sink.",
    question: `Who did your humans use for an emergency plumber? ${ZIP}`,
    emailAsk: "Burst pipe under the kitchen sink, valve's shut. Can you come today?",
    publicIds: ["quickflow", "baydrain", "pipepros"],
    offline: ["raj"],
    replies: {
      mike: { short: "4pm, ~$250–300", email: "4pm today works. Probably $250–300.", sorted: "Mike's Plumbing is coming at 4pm, ~$280.", when: "4pm today" },
      baydrain: { short: "tomorrow 10am, ~$320", email: "Earliest is tomorrow 10am, around $320.", sorted: "Bay Drain Co. is coming tomorrow at 10am, ~$320.", when: "tomorrow 10am" },
      pipepros: { short: "tonight 8pm, ~$350", email: "Tonight 8pm, $350 after-hours.", sorted: "SF Pipe Pros is coming tonight at 8pm, ~$350.", when: "8pm tonight" },
    },
    vouch: { stars: 5, price: "$260", pricePaid: 260, note: "Mike's Plumbing. Fixed our burst pipe, $260 ★5 ✅" },
  },
  roof: {
    key: "roof",
    label: "Roof leak",
    title: "Roof leak",
    trade: "roofer",
    tradeLabel: "roofer",
    urgency: "soon",
    safety: "Move stuff away from the drip and set out a bucket. Stay off the roof.",
    question: `Who did your humans use for a roof leak? ${ZIP}`,
    emailAsk: "Leak through the ceiling by the back window after last night's rain. When can you look?",
    publicIds: ["patchwork", "ggroof", "sunsetroof"],
    offline: ["leo"],
    replies: {
      summit: { short: "tomorrow 9am, ~$400–500", email: "Tomorrow 9am. Likely flashing, $400–500.", sorted: "Summit Roofing is coming tomorrow at 9am, ~$450.", when: "tomorrow 9am" },
      ggroof: { short: "Friday, ~$600", email: "Friday morning, ballpark $600.", sorted: "Golden Gate Roof Co. is coming Friday, ~$600.", when: "Friday" },
      sunsetroof: { short: "next week, ~$550", email: "Next Tuesday, around $550.", sorted: "Sunset Roofers is coming next Tuesday, ~$550.", when: "next Tuesday" },
    },
    vouch: { stars: 5, price: "$450", pricePaid: 450, note: "Summit Roofing. Patched our leak, $450 ★5 ✅" },
  },
  legal: {
    key: "legal",
    label: "Legal notice",
    title: "Legal notice",
    trade: "lawyer",
    tradeLabel: "tenant lawyer",
    urgency: "soon",
    safety: "Don't sign or reply yet. You've got 14 days.",
    question: `Who did your humans use for a landlord notice? ${ZIP}`,
    emailAsk: "Got a 14-day notice from my landlord. Can you review it this week?",
    publicIds: ["baylegal", "missiontenant", "hartcole"],
    offline: [],
    replies: {
      baylegal: { short: "Thu 11am, free consult", email: "Thursday 11am, free 30-min consult.", sorted: "Bay Legal Aid will see you Thu 11am, free consult.", when: "Thu 11am" },
      missiontenant: { short: "Mon, $350/hr", email: "Monday afternoon, $350/hr.", sorted: "Mission Tenant Law will see you Monday, $350/hr.", when: "Monday" },
      hartcole: { short: "next week, $400/hr", email: "Next week, $400/hr.", sorted: "Hart & Cole will see you next week, $400/hr.", when: "next week" },
    },
    vouch: { stars: 5, price: "free", note: "Bay Legal Aid. Sorted my landlord notice, free ★5 ✅" },
  },
};

export const SCENARIO_ORDER: ScenarioKey[] = ["pipe", "roof", "legal"];

/** People reached when a vouch is shared (households × people). */
export const HELPED_PEOPLE = 14;
