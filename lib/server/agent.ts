// "Your guy": one Agent37 instance. Falls back to OpenAI if Agent37 is not set
// up or too slow, so the demo never hangs.

export const INSTRUCTIONS = `You are "your guy", a personal assistant that finds the right local
service business for a homeowner's problem. Rules:
- Businesses only. Never suggest, look up or contact private individuals.
- Never call or email providers yourself; the app sends intros after the user picks.
- Ask at most ONE follow-up question, and only when the answer changes who to hire
  or how urgent it is. Quick replies are 2-4 short options.
- Reply with JSON only, no prose, no code fences.`;

export interface Triage {
  title: string; // short, e.g. "Burst pipe under the sink"
  trade: string; // singular, e.g. "Plumber"
  search: string; // Google Maps search, e.g. "emergency plumber"
  keywords: string[]; // lowercase words to match neighbors' past jobs
  question?: { text: string; quickReplies: string[] } | null;
}

export function triagePrompt(text: string, area: string, allowQuestion: boolean, answer?: string) {
  return `${INSTRUCTIONS}

Problem from a homeowner in ${area}: """${text || "(voice/video only, no text)"}"""
${answer ? `They answered your follow-up: """${answer}"""` : ""}
We already know their location. Never ask where they are.
title: 2-6 words, plain (e.g. "Burst pipe under the sink"). trade: one singular word.
search: 1-3 word Google Maps query (e.g. "emergency plumber"). keywords: 3-6 single lowercase words.
question: only if it changes who to hire or urgency; quickReplies must be 2-4 short options.
Return JSON: {"title": string, "trade": string, "search": string, "keywords": string[],
 "question": ${allowQuestion ? '{"text": string, "quickReplies": string[]} or null' : "null"}}`;
}

export function whyPrompt(title: string, candidates: { id: string; name: string; rating?: number; reviews?: number; network: string }[]) {
  return `${INSTRUCTIONS}

Job: ${title}. Here are nearby businesses with their public Google rating and what
neighbors' guys in our private network reported:
${JSON.stringify(candidates)}
For each, write one short, friendly line (max 12 words) on why or why not, citing the
network when it exists (neighbor signals matter more than stars). If a neighbor warned
about them, say so plainly. With no network history, lean on the public rating.
Return JSON: {"candidates": [{"id": string, "why": string}]}`;
}

export function parseJson<T>(text: string): T {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s < 0 || e < s) throw new Error(`No JSON in agent reply: ${text.slice(0, 200)}`);
  return JSON.parse(text.slice(s, e + 1)) as T;
}

async function agent37(input: string, sessionId?: string, timeoutMs = 150_000) {
  const url = process.env.AGENT37_INSTANCE_URL;
  if (!url || !process.env.AGENT37_KEY) throw new Error("Agent37 not configured");
  const res = await fetch(`${url.replace(/\/$/, "")}/v1/responses`, {
    method: "POST",
    headers: { "X-Agent37-Key": process.env.AGENT37_KEY.trim(), "Content-Type": "application/json" },
    body: JSON.stringify({ input, ...(sessionId ? { session_id: sessionId } : {}), stream: false }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = (await res.json()) as { status?: string; output_text?: string; session_id?: string; error?: unknown };
  if (data.status !== "completed") throw new Error(`Agent37 ${data.status}: ${JSON.stringify(data.error)}`);
  return { text: data.output_text ?? "", sessionId: data.session_id };
}

async function openai(input: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI not configured");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: input }],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return { text: data.choices[0].message.content as string, sessionId: undefined };
}

/** Ask the agent; JSON out. */
export async function ask<T>(input: string, sessionId?: string): Promise<{ result: T; sessionId?: string; via: string }> {
  try {
    const r = await agent37(input, sessionId);
    return { result: parseJson<T>(r.text), sessionId: r.sessionId ?? sessionId, via: "agent37" };
  } catch (e) {
    console.warn("[agent] Agent37 failed, falling back:", (e as Error).message);
    const r = await openai(input);
    return { result: parseJson<T>(r.text), sessionId, via: "openai" };
  }
}
