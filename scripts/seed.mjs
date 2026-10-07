// Seed the private network with REAL businesses near DEMO_LOCATION (via monid's
// Google Maps search) and reviews from the 8 simulated neighbors' guys
// (disclosed in the demo). Creates the demo contrasts per trade:
//  - the top-starred pro: a neighbor's guy warns about a no-show
//  - a pro with 2 bad network reviews: dropped
//  - the lowest-starred pro: 3 neighbors vouch for it
//  - the fewest-reviews pro: a hidden gem 2 neighbors vouch for
// Usage: node --env-file=.env scripts/seed.mjs
const E = (k) => (process.env[k] ?? "").trim();
const [lat, lng] = E("DEMO_LOCATION").split(",").map(Number);
const SB = `${E("SUPABASE_URL")}/rest/v1`;
const SH = { apikey: E("SUPABASE_SERVICE_KEY"), Authorization: `Bearer ${E("SUPABASE_SERVICE_KEY")}`, "Content-Type": "application/json" };
const MH = { Authorization: `Bearer ${E("MONID_API_KEY")}`, "Content-Type": "application/json" };
const sb = async (method, path, body, prefer = "return=minimal") => {
  const r = await fetch(`${SB}/${path}`, { method, headers: { ...SH, Prefer: prefer }, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${await r.text()}`);
};

async function places(keyword) {
  let r = await (await fetch("https://api.monid.ai/v1/run", { method: "POST", headers: MH, body: JSON.stringify({ provider: "dataforseo", endpoint: "/serp/google-maps", input: { body: { keyword, location_coordinate: `${lat},${lng},8000`, language_code: "en", depth: 20 } } }) })).json();
  while (!["COMPLETED", "FAILED", "BLOCKED"].includes(r.status)) {
    await new Promise((s) => setTimeout(s, 2000));
    r = await (await fetch(`https://api.monid.ai/v1/runs/${r.runId}`, { headers: MH })).json();
  }
  const d = r.providerResponse?.data ?? r.output;
  return (d?.[0]?.items ?? []).filter((i) => i.place_id && i.title).slice(0, 10);
}

const TRADES = {
  Plumber: {
    search: "plumber",
    warn: ["no_show", "Booked twice, never showed up"],
    bad: [["bad", "Leak was back in a week", 180], ["no_show", "No-show, no call", null]],
    good: [["Fixed our burst pipe same day", 260], ["Came in an hour, fair price", 240], ["Honest quote, no upsell on the water heater", 300], ["Unclogged the main line, super tidy", 220]],
    gem: [["Small shop, owner came himself and fixed the leak for good", 210], ["Cleared our kitchen drain fast and cheap", 160]],
  },
  Roofer: {
    search: "roofer",
    warn: ["no_show", "Quoted $900, then ghosted"],
    bad: [["bad", "Leak got worse after", 600], ["bad", "Left debris all over the yard", 450]],
    good: [["Fixed our flashing, dry since", 450], ["Same-day tarp, then a proper fix", 520], ["Fair price on a roof leak repair", 380]],
    gem: [["Patched our leak in a morning, dry all winter", 400], ["Honest: said we didn't need a new roof", 250]],
  },
  Electrician: {
    search: "electrician",
    warn: ["bad", "Breaker kept tripping after they left"],
    bad: [["bad", "Wrong panel part, had to redo", 700], ["no_show", "Took a deposit, never came", 200]],
    good: [["Rewired the kitchen, clean work", 900], ["Fixed our dead outlets same day", 180], ["Upfront price, no surprises", 350]],
    gem: [["Tiny outfit, found the short in 20 minutes", 150], ["Installed our EV charger, neat job", 600]],
  },
};
const NEIGHBORS = ["leo", "priya", "dana", "sam", "ana", "raj", "wen", "marco"];
const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

await sb("DELETE", "reviews?guy_id=neq.me");
const results = await Promise.all(Object.entries(TRADES).map(async ([trade, t]) => [trade, t, await places(t.search)]));
for (const [trade, t, items] of results) {
  const rows = items.map((i) => ({
    id: i.place_id, name: i.title, trade, phone: (i.phone ?? "").replace(/[^\d+]/g, ""), website: i.url ?? null,
    address: i.address ?? null, rating: i.rating?.value ?? null, reviews: i.rating?.votes_count ?? null, lat: i.latitude ?? null, lng: i.longitude ?? null,
  }));
  if (rows.length < 4) { console.log(trade, "only", rows.length, "results; skipping reviews"); continue; }
  await sb("POST", "providers", rows, "resolution=merge-duplicates,return=minimal");
  await sb("POST", "agent_cache", { key: `${trade.toLowerCase()}:${lat.toFixed(2)},${lng.toFixed(2)}`, result: { ids: rows.map((r) => r.id) } }, "resolution=merge-duplicates,return=minimal");
  const rated = rows.filter((r) => r.rating != null).sort((a, b) => b.rating - a.rating);
  const used = new Set();
  const take = (p) => (p && used.add(p.id), p);
  const warned = take(rated[0]);
  const vouched = take(rated.filter((r) => !used.has(r.id)).at(-1));
  const gem = take(rows.filter((r) => !used.has(r.id)).sort((a, b) => (a.reviews ?? 0) - (b.reviews ?? 0))[0]);
  const dropped = take(rated.filter((r) => !used.has(r.id))[0]);
  const ok = take(rows.find((r) => !used.has(r.id)));
  let n = 0;
  const g = () => NEIGHBORS[n++ % NEIGHBORS.length];
  const R = (p, outcome, quote, price, rating) => ({ guy_id: g(), provider_id: p.id, outcome, quote, price, date: day(10 + ((n * 37) % 300)), rating });
  const reviews = [
    R(warned, t.warn[0], t.warn[1], null, 1),
    ...t.good.slice(0, 3).map(([q, p], i) => R(vouched, "great", q, p, i === 2 ? 4 : 5)),
    ...t.gem.map(([q, p]) => R(gem, "great", q, p, 5)),
    ...(dropped ? t.bad.map(([o, q, p]) => R(dropped, o, q, p, 1)) : []),
    ...(ok ? [R(ok, "ok", t.good[3]?.[0] ?? "Did the job, a bit slow", t.good[3]?.[1] ?? 300, 4)] : []),
  ];
  await sb("POST", "reviews", reviews);
  console.log(trade, { warned: [warned.name, warned.rating], vouched: [vouched.name, vouched.rating], gem: [gem.name, gem.reviews], dropped: dropped?.name, ok: ok?.name, reviews: reviews.length });
}
