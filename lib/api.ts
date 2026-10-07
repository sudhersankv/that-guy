// The only module the UI talks to. Every function is async and returns plain
// data from lib/types.ts. Right now they call the in-browser mock backend; to go
// live, replace each body with a fetch to the real API and delete
// lib/mock.ts + lib/mockBackend.ts. No component needs to change.

import * as mock from "./mockBackend";
import type { Answer, DoneOutcome, Problem, ProblemInput } from "./types";

const latency = (min = 250, max = 700) => new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

/** Dump a problem: any mix of text, photos, a voice note and a video. */
export async function submitProblem(input: ProblemInput): Promise<Problem> {
  await latency(400, 800);
  return mock.submitProblem(input);
}

export async function listProblems(): Promise<Problem[]> {
  await latency(150, 300);
  return mock.listProblems();
}

export async function getProblem(id: string): Promise<Problem | null> {
  await latency(150, 300);
  return mock.getProblem(id);
}

/** Answer the (single) follow-up question: a quick reply and/or composer input. */
export async function answerQuestion(id: string, answer: Answer): Promise<Problem> {
  await latency();
  return mock.answerQuestion(id, answer);
}

/** Pick providers from the deck. Your guy emails each of them an intro. */
export async function pickProviders(id: string, providerIds: string[]): Promise<Problem> {
  await latency(600, 1100);
  return mock.pickProviders(id, providerIds);
}

export async function markDone(id: string, providerId: string, outcome: DoneOutcome): Promise<Problem> {
  await latency();
  return mock.markDone(id, providerId, outcome);
}

/** Voice feedback. The backend transcribes it and shares it with the network. */
export async function submitFeedback(id: string, providerId: string, audioBlob: Blob | null): Promise<Problem> {
  void audioBlob;
  await latency(700, 1200);
  return mock.submitFeedback(id, providerId);
}
