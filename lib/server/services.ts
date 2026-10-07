// AgentMail (intro emails) and transcription (AssemblyAI, or Whisper).

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

async function assembly(audio: Blob): Promise<string> {
  const H = { authorization: process.env.ASSEMBLYAI_API_KEY! };
  const up = await fetch("https://api.assemblyai.com/v2/upload", { method: "POST", headers: H, body: audio });
  const { upload_url } = await up.json();
  if (!up.ok || !upload_url) throw new Error(`AssemblyAI upload ${up.status}`);
  const t = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ audio_url: upload_url }),
  });
  let job = await t.json();
  const end = Date.now() + 60_000;
  while (job.status !== "completed") {
    if (job.status === "error" || Date.now() > end) throw new Error(`AssemblyAI ${job.status}: ${job.error ?? "timeout"}`);
    await new Promise((s) => setTimeout(s, 1000));
    job = await (await fetch(`https://api.assemblyai.com/v2/transcript/${job.id}`, { headers: H })).json();
  }
  return (job.text as string).trim();
}

export async function transcribe(audio: Blob): Promise<string> {
  if (process.env.ASSEMBLYAI_API_KEY) return assembly(audio);
  if (!process.env.OPENAI_API_KEY) throw new Error("No transcription key configured");
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
