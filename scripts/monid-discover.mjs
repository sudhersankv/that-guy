// Find and inspect the monid endpoints the agent uses.
// Usage: node --env-file=.env.local scripts/monid-discover.mjs "google maps places"
const H = { Authorization: `Bearer ${process.env.MONID_API_KEY}`, "Content-Type": "application/json" };
const q = process.argv[2] ?? "google maps places search";
const d = await fetch("https://api.monid.ai/v1/discover", { method: "POST", headers: H, body: JSON.stringify({ query: q, limit: 6 }) });
console.log(JSON.stringify(await d.json(), null, 2).slice(0, 6000));
if (process.argv[3] && process.argv[4]) {
  const i = await fetch("https://api.monid.ai/v1/inspect", { method: "POST", headers: H, body: JSON.stringify({ provider: process.argv[3], endpoint: process.argv[4] }) });
  console.log(JSON.stringify(await i.json(), null, 2).slice(0, 8000));
}
