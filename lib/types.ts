// The contract between the UI and the backend. The UI renders only what these
// types carry; titles, questions, cards, signals, emails and transcripts all
// come from the API (mocked in lib/mock*.ts for now).

/** Another user's agent in the private neighborhood network. */
export interface NeighborGuy {
  id: string;
  /** "Leo's guy" */
  name: string;
  distanceMi: number;
}

export interface Provider {
  id: string;
  name: string;
  trade: string;
  phone: string;
  email: string;
  distanceMi: number;
  /** Public (Google) rating, if any. */
  rating?: number;
  reviews?: number;
  /** One line from your guy on why this one. */
  why: string;
}

export type ReviewOutcome = "great" | "ok" | "bad" | "no_show";

/** What actually happened, shared agent-to-agent. */
export interface Review {
  id: string;
  guyId: string;
  providerId: string;
  outcome: ReviewOutcome;
  quote: string;
  price?: number;
  /** ISO date */
  date: string;
  rating: number;
}

/** What the private network says about a provider, ready to render. */
export interface NetworkSignal {
  vouches: number;
  /** Best recent quote from a vouching neighbor's guy. */
  quote?: { text: string; by: string };
  /** e.g. { count: 1, label: "no-show" } */
  warning?: { count: number; label: string; by?: string };
  /** No network history: public reviews only. */
  publicOnly: boolean;
}

export interface Candidate {
  provider: Provider;
  signal: NetworkSignal;
  rank: number;
}

export interface Question {
  text: string;
  quickReplies: string[];
}

export interface IntroEmail {
  from: string;
  to: string;
  subject: string;
  body: string;
  sentAt: number;
}

export interface Intro {
  providerId: string;
  provider: Provider;
  email: IntroEmail;
}

export type DoneOutcome = "yes" | "no" | "didnt_use";

export interface Feedback {
  providerId: string;
  outcome: Exclude<DoneOutcome, "didnt_use">;
  transcript: string;
  sharedAt: number;
}

export type ProblemStatus =
  | "working" //  your guy is on it
  | "question" // needs one more thing
  | "picking" //  swipe the shortlist
  | "contacted" // intros sent, you call
  | "checkin" //  "Did X get it done?"
  | "feedback" // record how it went
  | "done";

export interface Problem {
  id: string;
  title: string;
  status: ProblemStatus;
  createdAt: number;
  /** Latest line from your guy while working ("Asking 8 neighbors' guys…"). */
  activity?: string;
  /** Header line for the deck ("Your guy checked 12 nearby pros…"). */
  summary?: string;
  question?: Question;
  answer?: string;
  /** Ranked best → worst. Empty until status is "picking". */
  candidates: Candidate[];
  picks: string[];
  intros: Intro[];
  /** Who the "Did X get it done?" check is about. */
  checkin?: Provider;
  outcomes: Record<string, DoneOutcome>;
  feedback?: Feedback;
}

export interface ProblemInput {
  text?: string;
  photos?: File[];
  audio?: Blob | null;
  videoFrames?: string[];
}

export interface Answer {
  /** A quick-reply chip, or typed text. */
  text?: string;
  photos?: File[];
  audio?: Blob | null;
  videoFrames?: string[];
}
