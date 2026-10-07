// Seed neighbor reviews on 3 REAL providers found by the first search of a trade.
// Creates the demo contrasts (simulated neighbors, disclosed in the demo):
//  - a high-star pro the neighbors warn about
//  - a mediocre-star pro the neighbors vouch for
//  - a low-review-count hidden gem
// Usage: node --env-file=.env.local scripts/seed-network.mjs [Plumber]
const trade = process.argv[2] ?? "Plumber";
const base = `${process.env.SUPABASE_URL}/rest/v1`;
const H = { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" };
const ps = await (await fetch(`${base}/providers?trade=ilike.${trade}&rating=not.is.null`, { headers: H })).json();
if (ps.length < 3) throw new Error(`Only ${ps.length} ${trade} providers in the db. Run a real search first.`);
const byRating = [...ps].sort((a, b) => b.rating - a.rating);
const warned = byRating[0];
const vouched = byRating.filter((p) => p !== warned).at(-1);
const gem = [...ps].filter((p) => p !== warned && p !== vouched).sort((a, b) => (a.reviews ?? 0) - (b.reviews ?? 0))[0];
const ids = [warned, vouched, gem].map((p) => `"${p.id}"`).join(",");
await fetch(`${base}/reviews?provider_id=in.(${ids})&guy_id=neq.me`, { method: "DELETE", headers: H });
const R = (guy_id, p, outcome, quote, price, date, rating) => ({ guy_id, provider_id: p.id, outcome, quote, price, date, rating });
const rows = [
  R("priya", warned, "no_show", "Booked twice, never showed up", null, "2026-08-09", 1),
  R("leo", vouched, "great", "Fixed our burst pipe same day", 260, "2026-07-14", 5),
  R("dana", vouched, "great", "Came in an hour, fair price", 240, "2026-05-02", 5),
  R("wen", vouched, "great", "Honest quote, no upsell on the water heater", 300, "2026-06-21", 4),
  R("ana", gem, "great", "Small shop, cleared our drain fast and cheap", 180, "2026-08-30", 5),
  R("raj", gem, "great", "Owner came himself, fixed the leak for good", 220, "2026-03-11", 5),
];
const res = await fetch(`${base}/reviews`, { method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(rows) });
console.log(res.status, await res.text());
console.log({ warned: [warned.name, warned.rating], vouched: [vouched.name, vouched.rating], gem: [gem.name, gem.reviews] });
