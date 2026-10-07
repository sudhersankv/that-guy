// Tiny Supabase REST (PostgREST) client. Server only: uses the service key.

const base = () => `${process.env.SUPABASE_URL}/rest/v1`;
const headers = () => ({
  apikey: process.env.SUPABASE_SERVICE_KEY!,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
});

async function req<T>(method: string, path: string, body?: unknown, prefer?: string): Promise<T> {
  const res = await fetch(`${base()}/${path}`, {
    method,
    headers: { ...headers(), ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const select = <T>(table: string, query = "") => req<T[]>("GET", `${table}?${query}`);
export const insert = <T>(table: string, rows: T | T[]) => req<T[]>("POST", table, rows, "return=representation");
export const upsert = <T>(table: string, rows: T | T[]) =>
  req<T[]>("POST", table, rows, "resolution=merge-duplicates,return=representation");
export const update = <T>(table: string, query: string, patch: Partial<T>) =>
  req<T[]>("PATCH", `${table}?${query}`, patch, "return=representation");
export const inList = (ids: string[]) => `in.(${ids.map((i) => `"${i.replace(/"/g, "")}"`).join(",")})`;
