// AgentMail (intro emails) and Whisper (voice notes).

export async function sendEmail(to: string, subject: string, text: string) {
  const inbox = process.env.AGENTMAIL_INBOX;
  if (!inbox || !process.env.AGENTMAIL_API_KEY) throw new Error("AgentMail not configured");
  const res = await fetch(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inbox)}/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: [to], subject, text }),
  });
  if (!res.ok) throw new Error(`AgentMail ${res.status}: ${await res.text()}`);
}

export async function transcribe(audio: Blob): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI not configured");
  const form = new FormData();
  const type = audio.type || "audio/webm";
  const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
  form.append("file", audio, `voice.${ext}`);
  form.append("model", "whisper-1");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Whisper ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return (data.text as string).trim();
}
