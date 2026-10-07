// MOCK DATA ONLY. Delete this file (and lib/mockBackend.ts) when the real backend
// is wired up. The UI never imports from here, only lib/api.ts does.
// All businesses are fictional; phone numbers are in the reserved 555-01xx range.

import type { NeighborGuy, Provider, Question, Review } from "./types";

export const MOCK_CONFIG = {
  /** "Working" before cards (or the follow-up question) appear. */
  workMs: 3000,
  /** Working again after you answer the follow-up. */
  afterAnswerMs: 2000,
  /** After intros go out, when your guy asks "Did X get it done?". */
  checkinAfterMs: 20000,
  /** How many cards to show. */
  deckSize: 5,
  me: { name: "Me", inbox: "your-guy@inbox.thatguy.app", area: "the Mission" },
  storageKey: "thatguy:mock:v3",
};

/** The one real account's simulated neighbors (their guys). */
export const NEIGHBORS: NeighborGuy[] = [
  { id: "leo", name: "Leo's guy", distanceMi: 0.2 },
  { id: "priya", name: "Priya's guy", distanceMi: 0.3 },
  { id: "dana", name: "Dana's guy", distanceMi: 0.5 },
  { id: "sam", name: "Sam's guy", distanceMi: 0.6 },
  { id: "ana", name: "Ana's guy", distanceMi: 0.8 },
  { id: "raj", name: "Raj's guy", distanceMi: 0.9 },
  { id: "wen", name: "Wen's guy", distanceMi: 1.1 },
  { id: "marco", name: "Marco's guy", distanceMi: 1.3 },
];

const P = (p: Provider) => p;

export const PROVIDERS: Provider[] = [
  // Plumbers
  P({ id: "mike", name: "Mike's Plumbing", trade: "Plumber", phone: "+14155550161", email: "mike@mikesplumbing.example", distanceMi: 1.1, rating: 4.7, reviews: 95, why: "Three neighbors swear by him for emergencies." }),
  P({ id: "pipepros", name: "SF Pipe Pros", trade: "Plumber", phone: "+14155550164", email: "hi@sfpipepros.example", distanceMi: 2.0, rating: 4.4, reviews: 61, why: "Good after-hours rates; one neighbor's guy liked them." }),
  P({ id: "mission", name: "Mission Plumbing & Heating", trade: "Plumber", phone: "+14155550165", email: "dispatch@missionph.example", distanceMi: 0.9, rating: 4.6, reviews: 212, why: "Closest, and strong public reviews." }),
  P({ id: "ggplumb", name: "Golden Gate Plumbers", trade: "Plumber", phone: "+14155550166", email: "service@ggplumbers.example", distanceMi: 2.6, rating: 4.3, reviews: 140, why: "Big crew, can usually come same day." }),
  P({ id: "quickflow", name: "QuickFlow Plumbing", trade: "Plumber", phone: "+14155550162", email: "jobs@quickflow.example", distanceMi: 1.6, rating: 4.1, reviews: 88, why: "Cheapest quote around, but read the warning." }),
  // Plumbers your guy dropped (bad network history)
  P({ id: "drippy", name: "Drip Doctors", trade: "Plumber", phone: "+14155550167", email: "x@dripdoctors.example", distanceMi: 1.4, rating: 3.9, reviews: 33, why: "" }),
  P({ id: "fastfix", name: "FastFix Rooter", trade: "Plumber", phone: "+14155550168", email: "x@fastfix.example", distanceMi: 2.2, rating: 4.0, reviews: 51, why: "" }),
  P({ id: "budget", name: "Budget Pipes", trade: "Plumber", phone: "+14155550169", email: "x@budgetpipes.example", distanceMi: 3.0, rating: 3.6, reviews: 19, why: "" }),
  // Roofers
  P({ id: "summit", name: "Summit Roofing", trade: "Roofer", phone: "+14155550171", email: "crew@summitroofing.example", distanceMi: 2.0, rating: 4.6, reviews: 73, why: "Two neighbors had leaks fixed and stayed dry." }),
  P({ id: "sunset", name: "Sunset Roofers", trade: "Roofer", phone: "+14155550174", email: "hello@sunsetroofers.example", distanceMi: 3.1, rating: 4.2, reviews: 57, why: "Fair price on a flashing repair nearby." }),
  P({ id: "ggroof", name: "Golden Gate Roof Co.", trade: "Roofer", phone: "+14155550173", email: "office@ggroof.example", distanceMi: 2.6, rating: 4.4, reviews: 112, why: "Solid public reviews, books within the week." }),
  P({ id: "patchwork", name: "Patchwork Roofs", trade: "Roofer", phone: "+14155550172", email: "info@patchworkroofs.example", distanceMi: 3.2, rating: 3.9, reviews: 40, why: "Available fast, but a neighbor got burned." }),
  // Roofers your guy dropped
  P({ id: "tarpit", name: "Tar Pit Roofing", trade: "Roofer", phone: "+14155550175", email: "x@tarpit.example", distanceMi: 2.8, rating: 3.7, reviews: 22, why: "" }),
  P({ id: "skyline", name: "Skyline Shingle", trade: "Roofer", phone: "+14155550176", email: "x@skyline.example", distanceMi: 4.0, rating: 4.0, reviews: 30, why: "" }),
  // Not in any scenario (keeps the network realistic)
  P({ id: "sparky", name: "Sparky Electric", trade: "Electrician", phone: "+14155550191", email: "hi@sparky.example", distanceMi: 1.0, rating: 4.8, reviews: 66, why: "" }),
];

/** ~20 past jobs, as told by neighbors' guys. */
export const REVIEWS: Review[] = [
  { id: "r1", guyId: "leo", providerId: "mike", outcome: "great", quote: "Fixed our frozen pipe same day", price: 250, date: "2026-01-14", rating: 5 },
  { id: "r2", guyId: "dana", providerId: "mike", outcome: "great", quote: "Came in an hour, fair price", price: 240, date: "2026-05-02", rating: 5 },
  { id: "r3", guyId: "wen", providerId: "mike", outcome: "great", quote: "Honest quote on our water heater", price: 300, date: "2026-06-21", rating: 4 },
  { id: "r4", guyId: "ana", providerId: "pipepros", outcome: "ok", quote: "Late-night visit, did the job", price: 350, date: "2025-11-30", rating: 4 },
  { id: "r5", guyId: "priya", providerId: "quickflow", outcome: "no_show", quote: "Never showed up, twice", date: "2026-01-09", rating: 1 },
  { id: "r6", guyId: "sam", providerId: "drippy", outcome: "bad", quote: "Leak was back in a week", price: 180, date: "2025-12-03", rating: 2 },
  { id: "r7", guyId: "raj", providerId: "drippy", outcome: "bad", quote: "Overcharged for a washer", price: 220, date: "2026-02-11", rating: 1 },
  { id: "r8", guyId: "marco", providerId: "fastfix", outcome: "no_show", quote: "No-show, no call", date: "2026-03-18", rating: 1 },
  { id: "r9", guyId: "leo", providerId: "fastfix", outcome: "bad", quote: "Flooded the bathroom worse", price: 400, date: "2025-10-22", rating: 1 },
  { id: "r10", guyId: "wen", providerId: "budget", outcome: "bad", quote: "Cheap parts, broke again", price: 120, date: "2026-04-05", rating: 2 },
  { id: "r11", guyId: "dana", providerId: "budget", outcome: "bad", quote: "Rude and slow", price: 160, date: "2026-07-12", rating: 2 },
  { id: "r12", guyId: "ana", providerId: "summit", outcome: "great", quote: "Fixed our flashing, dry since", price: 450, date: "2026-02-17", rating: 5 },
  { id: "r13", guyId: "raj", providerId: "summit", outcome: "great", quote: "Same-day tarp, then a proper fix", price: 520, date: "2025-12-08", rating: 5 },
  { id: "r14", guyId: "priya", providerId: "sunset", outcome: "ok", quote: "Fair price, a bit slow", price: 380, date: "2026-03-29", rating: 4 },
  { id: "r15", guyId: "sam", providerId: "patchwork", outcome: "no_show", quote: "Quoted $900, then ghosted", date: "2026-04-14", rating: 1 },
  { id: "r16", guyId: "marco", providerId: "tarpit", outcome: "bad", quote: "Leak got worse after", price: 600, date: "2025-09-30", rating: 1 },
  { id: "r17", guyId: "leo", providerId: "tarpit", outcome: "bad", quote: "Left debris all over the yard", price: 450, date: "2026-05-20", rating: 2 },
  { id: "r18", guyId: "wen", providerId: "skyline", outcome: "no_show", quote: "Took a deposit, never came", price: 200, date: "2026-02-02", rating: 1 },
  { id: "r19", guyId: "dana", providerId: "skyline", outcome: "bad", quote: "Wrong shingles, had to redo", price: 700, date: "2026-06-11", rating: 2 },
  { id: "r20", guyId: "sam", providerId: "sparky", outcome: "great", quote: "Rewired the kitchen, clean work", price: 900, date: "2026-08-03", rating: 5 },
];

export interface MockScenario {
  key: string;
  title: string;
  trade: string;
  /** How a problem gets routed here from free text. */
  keywords: string[];
  /** Providers considered for this trade. */
  providerIds: string[];
  /** Extra pros checked but not worth showing (too far / closed). */
  alsoChecked: number;
  question?: Question;
  /** Lines shown while your guy works, spread over the working time. */
  activity: string[];
  /** What the transcriber "hears" in the voice feedback. */
  transcripts: { yes: string; no: string };
}

export const SCENARIOS: MockScenario[] = [
  {
    key: "pipe",
    title: "Burst pipe under the sink",
    trade: "plumbers",
    keywords: ["pipe", "frozen", "burst", "water", "sink", "leak", "plumb", "drain", "toilet", "faucet"],
    providerIds: ["mike", "pipepros", "mission", "ggplumb", "quickflow", "drippy", "fastfix", "budget"],
    alsoChecked: 4,
    question: { text: "Is the water shut off?", quickReplies: ["Yes", "No", "Can't find the valve"] },
    activity: ["Reading what you sent…", "Asking 8 neighbors' guys about plumbers…", "Checking 12 nearby pros…"],
    transcripts: { yes: "Great, $240, came in an hour.", no: "Didn't fix it. Charged $150 and left." },
  },
  {
    key: "roof",
    title: "Roof leak",
    trade: "roofers",
    keywords: ["roof", "ceiling", "shingle", "gutter", "attic", "rain"],
    providerIds: ["summit", "sunset", "ggroof", "patchwork", "tarpit", "skyline"],
    alsoChecked: 3,
    activity: ["Reading what you sent…", "Asking 8 neighbors' guys about roofers…", "Checking 9 nearby pros…"],
    transcripts: { yes: "Patched it in a morning, $450, dry since.", no: "Still dripping after. Not great." },
  },
];
