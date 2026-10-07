// Grow the private network: 10 more simulated neighbors' guys (disclosed in the
// demo) around DEMO_LOCATION, each with real past incidents on REAL nearby
// businesses (via monid's Google Maps search) across 8 trades.
// Safe with the original seed: never touches reviews from the first 8 guys,
// only adds positive reviews to already-vouched providers, never reviews the
// deliberately "warned" ones, and never overwrites an existing provider's trade.
// Idempotent: replaces only reviews written by the 10 new guys.
// Usage: node --env-file=.env scripts/seed-neighbors.mjs   (DRY=1 to preview)
const E = (k) => (process.env[k] ?? "").trim();
const [lat, lng] = E("DEMO_LOCATION").split(",").map(Number);
const DRY = !!E("DRY");
const SB = `${E("SUPABASE_URL")}/rest/v1`;
const SH = { apikey: E("SUPABASE_SERVICE_KEY"), Authorization: `Bearer ${E("SUPABASE_SERVICE_KEY")}`, "Content-Type": "application/json" };
const MH = { Authorization: `Bearer ${E("MONID_API_KEY")}`, "Content-Type": "application/json" };
const sb = async (method, path, body, prefer = "return=minimal") => {
  const r = await fetch(`${SB}/${path}`, { method, headers: { ...SH, Prefer: prefer }, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${await r.text()}`);
  return method === "GET" ? r.json() : null;
};

async function listings(category) {
  let r = await (await fetch("https://api.monid.ai/v1/run", { method: "POST", headers: MH, body: JSON.stringify({ provider: "dataforseo", endpoint: "/business/listings", input: { body: { categories: [category], location_coordinate: `${lat},${lng},6`, limit: 25, order_by: ["rating.votes_count,desc"] } } }) })).json();
  while (!["COMPLETED", "FAILED", "BLOCKED"].includes(r.status)) {
    await new Promise((s) => setTimeout(s, 2000));
    r = await (await fetch(`https://api.monid.ai/v1/runs/${r.runId}`, { headers: MH })).json();
  }
  if (r.status !== "COMPLETED") throw new Error(`${category}: monid ${r.status}`);
  let d = r.providerResponse?.data ?? r.output;
  if (d?.data?.download_link) d = await (await fetch(d.data.download_link)).json(); // big results come as a file
  const norm = (s) => (s ?? "").toLowerCase().replace(/[^a-z]+/g, "_");
  // Keep only businesses whose PRIMARY category is the trade.
  return (d?.[0]?.items ?? []).filter((i) => i.place_id && i.title && norm(i.category).startsWith(category.split("_")[0]) && (category.includes("_") ? norm(i.category).includes(category.split("_").at(-1)) : true));
}

const GUYS = [
  ["maya", "Maya's guy", 37.7526, -122.4141], // 24th & Folsom, Mission
  ["jordan", "Jordan's guy", 37.7412, -122.4158], // Cortland Ave, Bernal Heights
  ["tomas", "Tomas's guy", 37.7516, -122.4338], // 24th & Castro, Noe Valley
  ["aisha", "Aisha's guy", 37.7621, -122.3976], // 18th & Connecticut, Potrero Hill
  ["ben", "Ben's guy", 37.7582, -122.4284], // 20th & Church, Dolores Heights
  ["lucia", "Lucia's guy", 37.7649, -122.4217], // 16th & Valencia, Mission
  ["kenji", "Kenji's guy", 37.7566, -122.4064], // 22nd & Potrero Ave
  ["olivia", "Olivia's guy", 37.7471, -122.4119], // Precita Park, Bernal
  ["diego", "Diego's guy", 37.7496, -122.4126], // 26th & Harrison, Mission
  ["nora", "Nora's guy", 37.7546, -122.4319], // 22nd & Noe, Noe Valley
];
const NEW_IDS = GUYS.map((g) => g[0]);
const ORIGINAL = ["leo", "priya", "dana", "sam", "ana", "raj", "wen", "marco"];

// [quote, price] per role. vouch3 = 3 neighbors agree, vouch2 = small-shop gem,
// dropped = 2 bad, warn = one bad story on a top-starred pro, ok = meh.
const TRADES = {
  Plumber: {
    category: "plumber",
    more: [["Water heater died on a Sunday, they had a new one in by 3pm", 1850], ["Snaked the sewer line and showed us the camera footage", 325]],
    vouch2: [["Garbage disposal jammed before Thanksgiving, fixed in 30 minutes", 145], ["Replaced our shutoff valve, charged less than the quote", 190]],
    ok: ["Fixed the running toilet but it took two visits", 210],
  },
  Roofer: {
    category: "roofing_contractor",
    more: [["Found the leak behind the chimney flashing, dry through the atmospheric river", 480], ["Replaced cracked tiles after the windstorm, sent photos of every step", 560]],
    vouch2: [["Re-sealed our skylight in an afternoon, no more drips", 340], ["Cleaned the gutters and fixed two loose shingles for one price", 275]],
    ok: ["Good repair, but the crew showed up a day late", 620],
  },
  Locksmith: {
    category: "locksmith",
    vouch3: [["Locked out at 11pm, he was there in 25 minutes and didn't damage the door", 145], ["Rekeyed all our locks the day we moved in", 180], ["Opened the car with the kid's backpack inside, $95 flat", 95]],
    vouch2: [["Swapped the deadbolt on our back door, fair and quick", 160], ["Made a copy of the weird old mailbox key nobody else could", 25]],
    ok: ["Got us back inside, but quoted $90 on the phone and charged $140", 140],
    dropped: [["bad", "Drilled the lock when it could've been picked, $320 for a lockout", 320], ["no_show", "Said 30 minutes, waited 2 hours on the stoop, never came", null]],
    warn: ["bad", "Phone quote was $75, the bill was $289 before he'd even open the door", 289],
  },
  Electrician: {
    category: "electrician",
    vouch3: [["Half the flat lost power, he traced a burnt neutral in an hour", 280], ["Added outlets in the home office, patched the drywall too", 640], ["Swapped our Federal Pacific panel, pulled the permit and everything", 3200]],
    vouch2: [["Installed ceiling fans in two bedrooms, super neat", 420], ["Fixed the buzzing light switch everyone else ignored", 120]],
    ok: ["Fixed the GFCI issue, but left a mess in the garage", 230],
    dropped: [["bad", "Breaker started tripping again the next day, wouldn't come back", 350], ["no_show", "Took a $200 deposit for the EV charger, stopped answering", 200]],
  },
  HVAC: {
    category: "hvac_contractor",
    vouch3: [["Furnace quit in a January cold snap, heat back on same evening", 390], ["Serviced our old boiler instead of pushing a new one", 220], ["Installed a mini-split for the top floor, quiet and tidy", 5400]],
    vouch2: [["Cleaned the ducts and the dust problem is gone", 450], ["Replaced the thermostat wiring for less than the big guys quoted", 175]],
    ok: ["Fixed the pilot light, but the appointment window was 8 hours", 160],
    dropped: [["bad", "Charged $600 to 'recharge' a furnace that just needed a filter", 600], ["no_show", "No-showed twice for the heater tune-up", null]],
    warn: ["no_show", "Booked a furnace check in December, they never showed or called", null],
  },
  Handyman: {
    category: "handyman",
    vouch3: [["Hung all our shelves and the TV mount in one afternoon", 260], ["Fixed the sticky front door and the broken fence gate", 180], ["Patched and painted the hallway after the leak, can't tell", 420]],
    vouch2: [["Assembled the IKEA wardrobe and anchored it to the wall", 140], ["Re-caulked the tub and replaced the bathroom fan", 230]],
    ok: ["Good work on the cabinet doors, a little pricey for the time", 300],
    dropped: [["bad", "Mounted the TV crooked and cracked the plaster", 150], ["no_show", "Cancelled the morning of, three times in a row", null]],
  },
  "Pest control": {
    category: "pest_control_service",
    vouch3: [["Mice in the kitchen walls, sealed the entry points and they're gone", 375], ["Handled the ant invasion without spraying near the cat", 210], ["Found the rat path under the deck, gone in two visits", 450]],
    vouch2: [["Bed bug heat treatment, one visit and done", 1200], ["Wasp nest under the eaves removed in 20 minutes", 165]],
    ok: ["Roaches mostly gone, needed a free follow-up visit", 240],
    dropped: [["bad", "Sprayed and left, the mice were back in a week", 280], ["bad", "Signed us up for a monthly plan we never asked for", 95]],
  },
  "Appliance repair": {
    category: "appliance_repair_service",
    vouch3: [["Dryer stopped heating, replaced the element same visit", 210], ["Fridge was warm on a Friday, fixed the fan before the food spoiled", 285], ["Fixed our dishwasher drain pump, told us not to replace it", 175]],
    vouch2: [["Washer stuck mid-cycle, he had the part in his van", 190], ["Oven igniter replaced the day before our party", 230]],
    ok: ["Fixed the ice maker, but it took a week to get the part", 260],
    dropped: [["bad", "$120 diagnostic, wrong part ordered, still broken", 120], ["no_show", "Said he'd come back with the part, never did", null]],
  },
};

// ---- existing state ----
const existingTrade = new Map((await sb("GET", "providers?select=id,trade")).map((p) => [p.id, (p.trade ?? "").toLowerCase()]));
const existingProviders = new Set(existingTrade.keys());
const origReviews = await sb("GET", `reviews?select=provider_id,outcome&guy_id=in.(${ORIGINAL.join(",")})`);
const prior = {};
for (const r of origReviews) (prior[r.provider_id] ??= []).push(r.outcome);
const positive = (o) => o === "great" || o === "ok";
// May a new neighbor's guy write `outcome` about this provider?
const allowed = (id, outcome) => {
  const p = prior[id];
  if (!p) return true; // nobody in the original network has used them
  if (p.length === 1 && !positive(p[0])) return false; // the deliberate "warned" ones
  return p.some((o) => o === "great") && positive(outcome); // only reinforce vouches
};

// ---- fetch real providers ----
const fetched = await Promise.all(Object.entries(TRADES).map(async ([trade, t]) => {
  try { return [trade, await listings(t.category)]; } catch (e) { console.log("FAIL", trade, e.message); return [trade, []]; }
}));
const toRow = (trade, i) => ({
  id: i.place_id, name: i.title, trade, phone: (i.phone ?? "").replace(/[^\d+]/g, "") || null, website: i.url ?? null,
  address: i.address ?? null, rating: i.rating?.value ?? null, reviews: i.rating?.votes_count ?? null, lat: i.latitude ?? null, lng: i.longitude ?? null,
});
const pool = {};
const fresh = [];
for (const [trade, items] of fetched) {
  const rows = [...new Map(items.map((i) => [i.place_id, toRow(trade, i)])).values()];
  pool[trade] = rows;
  fresh.push(...rows.filter((r) => !existingProviders.has(r.id)));
  console.log(trade, rows.length, "listings,", rows.filter((r) => !existingProviders.has(r.id)).length, "new");
}

// ---- plan reviews ----
let n = 0;
const nextGuy = () => NEW_IDS[n++ % NEW_IDS.length];
const day = (k) => new Date(Date.now() - (6 + ((k * 97) % 530)) * 86400000).toISOString().slice(0, 10);
const reviews = [];
const R = (p, outcome, quote, price, rating) => {
  if (!allowed(p.id, outcome)) throw new Error(`refusing ${outcome} on ${p.name}`);
  reviews.push({ guy_id: nextGuy(), provider_id: p.id, outcome, quote, price: price ?? null, date: day(reviews.length + 1), rating });
};
const plan = {};
const warnTrades = new Set(Object.entries(TRADES).filter(([, t]) => t.warn).map(([k]) => k));
for (const [trade, t] of Object.entries(TRADES)) {
  // Only review providers that will show up in THIS trade's deck (the app matches trade by prefix).
  const rows = pool[trade].filter((r) => r.rating != null && (!existingTrade.has(r.id) || existingTrade.get(r.id).startsWith(trade.toLowerCase().slice(0, 4))));
  const used = new Set();
  const take = (pred, sort) => { const p = rows.filter((r) => !used.has(r.id) && pred(r)).sort(sort)[0]; if (p) used.add(p.id); return p; };
  const untouched = (r) => !prior[r.id];
  const byVotes = (a, b) => (b.reviews ?? 0) - (a.reviews ?? 0);
  const p = (plan[trade] = {});
  if (t.more) {
    // Plumber/roofer: reinforce the existing vouched pros, add one new gem. Nothing negative.
    const vouched = pool[trade].filter((r) => prior[r.id]?.filter((o) => o === "great").length >= 2 && prior[r.id].every(positive));
    vouched.forEach((v, i) => t.more[i] && R(v, "great", t.more[i][0], t.more[i][1], 5));
    p.reinforced = vouched.map((v) => v.name);
    rows.forEach((r) => prior[r.id] && used.add(r.id));
  } else {
    if (warnTrades.has(trade)) p.warned = take((r) => untouched(r) && r.rating >= 4.8, byVotes);
    p.vouch3 = take((r) => untouched(r) && r.rating < 4.9, byVotes) ?? take(untouched, byVotes);
    p.dropped = take((r) => untouched(r) && r.rating >= 4.5, byVotes);
  }
  p.vouch2 = take((r) => untouched(r) && (r.reviews ?? 0) >= 5, (a, b) => (a.reviews ?? 0) - (b.reviews ?? 0));
  p.ok = take(untouched, byVotes);
  if (p.warned) R(p.warned, t.warn[0], t.warn[1], t.warn[2], 1);
  if (p.vouch3) t.vouch3.forEach(([q, price], i) => R(p.vouch3, "great", q, price, i === 1 ? 4 : 5));
  if (p.vouch2) t.vouch2.forEach(([q, price]) => R(p.vouch2, "great", q, price, 5));
  if (p.ok) R(p.ok, "ok", t.ok[0], t.ok[1], 3);
  if (p.dropped) t.dropped.forEach(([o, q, price]) => R(p.dropped, o, q, price, o === "bad" ? 2 : 1));
}


const upserts = fresh; // every real, not-yet-known provider widens its trade's deck
console.log(`plan: ${GUYS.length} guys, ${upserts.length} new providers, ${reviews.length} reviews`);
if (DRY) { console.log(JSON.stringify(Object.fromEntries(Object.entries(plan).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([r, p]) => [r, p?.name ?? p]))])), null, 1)); process.exit(0); }

// ---- write ----
await sb("POST", "guys", GUYS.map(([id, name, la, ln]) => ({ id, name, lat: la, lng: ln })), "resolution=merge-duplicates,return=minimal");
if (upserts.length) await sb("POST", "providers", upserts, "resolution=merge-duplicates,return=minimal");
await sb("DELETE", `reviews?guy_id=in.(${NEW_IDS.join(",")})`);
await sb("POST", "reviews", reviews);

// ---- summary ----
const all = await sb("GET", "reviews?select=provider_id,outcome");
const provs = await sb("GET", "providers?select=id,name,trade,rating,reviews");
const net = {};
for (const r of all) { const s = (net[r.provider_id] ??= { v: 0, w: 0 }); positive(r.outcome) ? s.v++ : s.w++; }
const byTrade = {};
for (const p of provs) (byTrade[p.trade.toLowerCase().slice(0, 4)] ??= []).push(p);
console.log("\nreviews in network:", all.length, "| outcomes (new):", reviews.reduce((m, r) => ((m[r.outcome] = (m[r.outcome] ?? 0) + 1), m), {}));
for (const trade of Object.keys(TRADES)) {
  const list = byTrade[trade.toLowerCase().slice(0, 4)] ?? [];
  console.log(`\n${trade}: ${list.length} providers`);
  list.filter((p) => net[p.id]).sort((a, b) => net[b.id].v - net[a.id].v || net[a.id].w - net[b.id].w)
    .forEach((p) => console.log(`  ${p.name} (${p.rating}*, ${p.reviews}) vouches ${net[p.id].v} warnings ${net[p.id].w}${net[p.id].w >= 2 ? " -> dropped" : ""}`));
}
