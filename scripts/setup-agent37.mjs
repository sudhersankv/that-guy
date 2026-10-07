// Create the one Agent37 instance and give it a budget.
// Usage: node --env-file=.env.local scripts/setup-agent37.mjs
// Prints AGENT37_INSTANCE_URL to put in .env.local.
const H = { Authorization: `Bearer ${process.env.AGENT37_KEY}`, "Content-Type": "application/json" };
const res = await fetch("https://api.agent37.com/v1/instances", {
  method: "POST",
  headers: H,
  body: JSON.stringify({
    name: "that-guy",
    // env can't change after create
    env: { MONID_API_KEY: process.env.MONID_API_KEY ?? "" },
    budget: { monthly_cap_micros: 20_000_000, credit_micros: 5_000_000 },
  }),
});
const inst = await res.json();
console.log(res.status, JSON.stringify(inst, null, 2));
if (inst.id) {
  const b = await fetch(`https://api.agent37.com/v1/instances/${inst.id}/budget`, {
    method: "PATCH",
    headers: H,
    body: JSON.stringify({ monthly_cap_micros: 20_000_000 }),
  });
  console.log("budget", b.status, await b.text());
  console.log(`\nAGENT37_INSTANCE_URL=https://${inst.id}.agent37.app`);
}
