// monid HTTP API: discover / inspect / run, then poll the run.

const API = "https://api.monid.ai";

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.MONID_API_KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`monid ${path}: ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return data as T;
}

export const discover = (query: string, limit = 8) => call<unknown>("POST", "/v1/discover", { query, limit });
export const inspect = (provider: string, endpoint: string) => call<unknown>("POST", "/v1/inspect", { provider, endpoint });

interface Run {
  runId: string;
  status: string;
  providerResponse?: { data?: unknown; error?: unknown };
  output?: unknown;
}

/** Run an endpoint and wait for it (up to timeoutMs). Returns the provider data. */
export async function run(provider: string, endpoint: string, body: unknown, timeoutMs = 90_000): Promise<unknown> {
  let r = await call<Run>("POST", "/v1/run", { provider, endpoint, input: { body } });
  const end = Date.now() + timeoutMs;
  while (!["COMPLETED", "FAILED", "BLOCKED", "STOPPED", "TIME_OUT"].includes(r.status)) {
    if (Date.now() > end) throw new Error(`monid run ${r.runId} timed out`);
    await new Promise((s) => setTimeout(s, 2500));
    r = await call<Run>("GET", `/v1/runs/${encodeURIComponent(r.runId)}`);
  }
  if (r.status !== "COMPLETED") throw new Error(`monid run ${r.runId} ${r.status}`);
  return r.providerResponse?.data ?? r.output;
}

export interface Place {
  id: string;
  name: string;
  category?: string;
  phone?: string;
  website?: string;
  address?: string;
  rating?: number;
  reviews?: number;
  lat?: number;
  lng?: number;
}

// Pinned after `discover` (see scripts/monid-discover.mjs). Overridable via env.
const PLACES_PROVIDER = () => process.env.MONID_PLACES_PROVIDER || "apify";
const PLACES_ENDPOINT = () => process.env.MONID_PLACES_ENDPOINT || "/compass/crawler-google-places";

type Raw = Record<string, unknown>;
const num = (x: unknown) => (typeof x === "number" ? x : typeof x === "string" && x ? Number(x) : undefined);
const str = (x: unknown) => (typeof x === "string" && x ? x : undefined);

function toPlace(r: Raw): Place | null {
  const loc = (r.location ?? r.gps_coordinates ?? r.coordinates ?? {}) as Raw;
  const id = str(r.placeId) ?? str(r.place_id) ?? str(r.id) ?? str(r.cid);
  const name = str(r.title) ?? str(r.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    category: str(r.categoryName) ?? str(r.category) ?? str(r.type),
    phone: str(r.phoneUnformatted) ?? str(r.phone),
    website: str(r.website),
    address: str(r.address),
    rating: num(r.totalScore) ?? num(r.rating),
    reviews: num(r.reviewsCount) ?? num(r.reviews) ?? num(r.user_ratings_total),
    lat: num(loc.lat) ?? num(loc.latitude),
    lng: num(loc.lng) ?? num(loc.longitude),
  };
}

function itemsOf(data: unknown): Raw[] {
  if (Array.isArray(data)) return data as Raw[];
  const d = data as Raw;
  for (const k of ["items", "results", "places", "local_results", "data"]) if (Array.isArray(d?.[k])) return d[k] as Raw[];
  return [];
}

/** Google Maps businesses for a search near a point. Businesses only. */
export async function placesNear(search: string, lat: number, lng: number, max = 8): Promise<Place[]> {
  const data = await run(PLACES_PROVIDER(), PLACES_ENDPOINT(), {
    searchStringsArray: [search],
    customGeolocation: { type: "Point", coordinates: [lng, lat], radiusKm: 8 },
    maxCrawledPlacesPerSearch: max,
    language: "en",
    skipClosedPlaces: true,
  });
  return itemsOf(data)
    .map(toPlace)
    .filter((p): p is Place => !!p)
    .slice(0, max);
}
