// Storage layer.
//   Neon Postgres  -> accounts, PRs, social docs (small, queried together)
//   Vercel Blob    -> each user's private training log (large JSON document)
// With no DATABASE_URL the app falls back to in-memory maps (local dev only).
// With no BLOB_READ_WRITE_TOKEN the training log is kept in Postgres instead.
import { neon } from "@neondatabase/serverless";
import { get as blobGet, put as blobPut } from "@vercel/blob";

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
export const persistent = Boolean(DB_URL);
export const blobEnabled = BLOB;

export interface UserRow { id: string; name: string; salt: string; hash: string }
export type Col = "prs" | "social";

const g = globalThis as unknown as {
  __lb?: { users: Map<string, UserRow>; docs: Map<string, string>; states: Map<string, string> };
  __lbReady?: Promise<void>;
};
const mem = (g.__lb ??= { users: new Map(), docs: new Map(), states: new Map() });

const sql = DB_URL ? neon(DB_URL) : null;

function ready(): Promise<void> {
  if (!sql) return Promise.resolve();
  return (g.__lbReady ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS lb_users (
      id text PRIMARY KEY, name text NOT NULL, name_lower text NOT NULL UNIQUE,
      salt text NOT NULL, hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS lb_docs (
      col text NOT NULL, id text NOT NULL, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (col, id))`;
    await sql`CREATE TABLE IF NOT EXISTS lb_states (
      id text PRIMARY KEY, data text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
  })().catch(e => { g.__lbReady = undefined; throw e; }));
}

/** Returns false when the username is already taken. */
export async function createUser(u: UserRow): Promise<boolean> {
  await ready();
  const lower = u.name.toLowerCase();
  if (!sql) {
    for (const x of mem.users.values()) if (x.name.toLowerCase() === lower) return false;
    mem.users.set(u.id, u); return true;
  }
  const r = await sql`INSERT INTO lb_users (id, name, name_lower, salt, hash)
    VALUES (${u.id}, ${u.name}, ${lower}, ${u.salt}, ${u.hash}) ON CONFLICT (name_lower) DO NOTHING RETURNING id`;
  return r.length === 1;
}
export async function getUser(id: string): Promise<UserRow | null> {
  await ready();
  if (!sql) return mem.users.get(id) ?? null;
  const r = await sql`SELECT id, name, salt, hash FROM lb_users WHERE id = ${id}`;
  return (r[0] as UserRow | undefined) ?? null;
}
export async function findUserByName(name: string): Promise<UserRow | null> {
  await ready();
  const lower = name.toLowerCase();
  if (!sql) { for (const x of mem.users.values()) if (x.name.toLowerCase() === lower) return x; return null; }
  const r = await sql`SELECT id, name, salt, hash FROM lb_users WHERE name_lower = ${lower}`;
  return (r[0] as UserRow | undefined) ?? null;
}
export async function namesFor(ids: string[]): Promise<Record<string, string>> {
  await ready();
  if (!ids.length) return {};
  const out: Record<string, string> = {};
  if (!sql) { for (const id of ids) { const u = mem.users.get(id); if (u) out[id] = u.name; } return out; }
  const r = await sql`SELECT id, name FROM lb_users WHERE id = ANY(${ids})`;
  for (const row of r as { id: string; name: string }[]) out[row.id] = row.name;
  return out;
}

export async function setDoc(col: Col, id: string, data: unknown): Promise<void> {
  await ready();
  if (!sql) { mem.docs.set(`${col}/${id}`, JSON.stringify(data)); return; }
  await sql`INSERT INTO lb_docs (col, id, data) VALUES (${col}, ${id}, ${JSON.stringify(data)}::jsonb)
    ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
}
export async function allDocs(col: Col): Promise<Record<string, unknown>> {
  await ready();
  const out: Record<string, unknown> = {};
  if (!sql) {
    for (const [k, v] of mem.docs) if (k.startsWith(col + "/")) out[k.slice(col.length + 1)] = JSON.parse(v);
    return out;
  }
  const r = await sql`SELECT id, data FROM lb_docs WHERE col = ${col}`;
  for (const row of r as { id: string; data: unknown }[]) out[row.id] = row.data;
  return out;
}

const statePath = (id: string) => `liftboard/state/${id}.json`;

export async function getState(id: string): Promise<string | null> {
  if (BLOB) {
    const r = await blobGet(statePath(id), { access: "private", useCache: false });
    if (!r || r.statusCode !== 200) return null;
    return await new Response(r.stream).text();
  }
  await ready();
  if (!sql) return mem.states.get(id) ?? null;
  const r = await sql`SELECT data FROM lb_states WHERE id = ${id}`;
  return r[0] ? (r[0] as { data: string }).data : null;
}
export async function setState(id: string, json: string): Promise<void> {
  if (BLOB) {
    await blobPut(statePath(id), json, {
      access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true,
    });
    return;
  }
  await ready();
  if (!sql) { mem.states.set(id, json); return; }
  await sql`INSERT INTO lb_states (id, data) VALUES (${id}, ${json})
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
}
