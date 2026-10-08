// Tiny key-value layer. Uses Upstash Redis over REST when configured (works on
// Vercel serverless), otherwise an in-memory map that is only fit for local dev.

type Hash = Map<string, string>;
const g = globalThis as unknown as { __lb?: { kv: Map<string, string>; h: Map<string, Hash> } };
const mem = (g.__lb ??= { kv: new Map(), h: new Map() });

const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
export const persistent = Boolean(URL && TOKEN);

async function cmd<T = unknown>(args: (string | number)[]): Promise<T> {
  const res = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const j = (await res.json()) as { result?: T; error?: string };
  if (!res.ok || j.error) throw new Error(j.error || `store error ${res.status}`);
  return j.result as T;
}

export async function get(key: string): Promise<string | null> {
  if (!persistent) return mem.kv.get(key) ?? null;
  return cmd<string | null>(["GET", key]);
}
export async function set(key: string, val: string): Promise<void> {
  if (!persistent) { mem.kv.set(key, val); return; }
  await cmd(["SET", key, val]);
}
/** Set only if the key does not exist. Returns true when it was set. */
export async function setnx(key: string, val: string): Promise<boolean> {
  if (!persistent) { if (mem.kv.has(key)) return false; mem.kv.set(key, val); return true; }
  return (await cmd<number>(["SETNX", key, val])) === 1;
}
export async function hset(key: string, field: string, val: string): Promise<void> {
  if (!persistent) { let h = mem.h.get(key); if (!h) mem.h.set(key, (h = new Map())); h.set(field, val); return; }
  await cmd(["HSET", key, field, val]);
}
export async function hgetall(key: string): Promise<Record<string, string>> {
  if (!persistent) return Object.fromEntries(mem.h.get(key) ?? []);
  const flat = await cmd<string[] | null>(["HGETALL", key]);
  const out: Record<string, string> = {};
  for (let i = 0; flat && i + 1 < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
}
export async function hmget(key: string, fields: string[]): Promise<(string | null)[]> {
  if (!fields.length) return [];
  if (!persistent) { const h = mem.h.get(key); return fields.map(f => h?.get(f) ?? null); }
  return cmd<(string | null)[]>(["HMGET", key, ...fields]);
}
