// Clear demo problems and "me" reviews (keeps providers + neighbor reviews).
// Usage: node --env-file=.env scripts/reset.mjs
const E = (k) => (process.env[k] ?? "").trim();
const H = { apikey: E("SUPABASE_SERVICE_KEY"), Authorization: `Bearer ${E("SUPABASE_SERVICE_KEY")}` };
for (const q of ["problems?id=neq.x", "reviews?guy_id=eq.me"]) {
  const r = await fetch(`${E("SUPABASE_URL")}/rest/v1/${q}`, { method: "DELETE", headers: H });
  console.log(q, r.status);
}
