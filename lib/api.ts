// The only module the UI talks to. Every function is async and returns plain
// data from lib/types.ts, fetched from the Next API routes in app/api/problems.

import type { Answer, DoneOutcome, Problem, ProblemInput } from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.url}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

const post = <T>(path: string, body: FormData | object) =>
  fetch(path, {
    method: "POST",
    ...(body instanceof FormData
      ? { body }
      : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
  }).then((r) => json<T>(r));

/** Where you are: the browser's location if allowed quickly, else the server's DEMO_LOCATION. */
function locate(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), 4000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(t);
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {
        clearTimeout(t);
        resolve(null);
      },
      { maximumAge: 600_000, timeout: 4000 },
    );
  });
}

/** Dump a problem: any mix of text, photos, a voice note and a video. */
export async function submitProblem(input: ProblemInput): Promise<Problem> {
  const form = new FormData();
  if (input.text) form.set("text", input.text);
  if (input.audio) form.set("audio", input.audio);
  const here = await locate();
  if (here) {
    form.set("lat", String(here.lat));
    form.set("lng", String(here.lng));
  }
  return post<Problem>("/api/problems", form);
}

export async function listProblems(): Promise<Problem[]> {
  return fetch("/api/problems", { cache: "no-store" }).then((r) => json<Problem[]>(r));
}

export async function getProblem(id: string): Promise<Problem | null> {
  return fetch(`/api/problems/${encodeURIComponent(id)}`, { cache: "no-store" }).then((r) => json<Problem | null>(r));
}

/** Answer the (single) follow-up question: a quick reply and/or composer input. */
export async function answerQuestion(id: string, answer: Answer): Promise<Problem> {
  const form = new FormData();
  if (answer.text) form.set("text", answer.text);
  if (answer.audio) form.set("audio", answer.audio);
  return post<Problem>(`/api/problems/${encodeURIComponent(id)}/answer`, form);
}

/** Pick providers from the deck. Your guy emails each of them an intro. */
export async function pickProviders(id: string, providerIds: string[]): Promise<Problem> {
  return post<Problem>(`/api/problems/${encodeURIComponent(id)}/pick`, { providerIds });
}

export async function markDone(id: string, providerId: string, outcome: DoneOutcome): Promise<Problem> {
  return post<Problem>(`/api/problems/${encodeURIComponent(id)}/done`, { providerId, outcome });
}

/** Voice feedback. The backend transcribes it and shares it with the network. */
export async function submitFeedback(id: string, providerId: string, audioBlob: Blob | null): Promise<Problem> {
  const form = new FormData();
  form.set("providerId", providerId);
  if (audioBlob) form.set("audio", audioBlob);
  return post<Problem>(`/api/problems/${encodeURIComponent(id)}/feedback`, form);
}
