import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import * as store from "./store";

export const COOKIE = "lb_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set (use 16+ random characters).");
  return "liftboard-dev-secret-not-for-production";
}
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function makeSession(id: string): string {
  const payload = `${id}.${Math.floor(Date.now() / 1000) + MAX_AGE}`;
  return `${payload}.${sign(payload)}`;
}
export function readSession(token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i), mac = token.slice(i + 1);
  const want = sign(payload);
  if (mac.length !== want.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  const [id, exp] = payload.split(".");
  if (!id || !(Number(exp) > Date.now() / 1000)) return null;
  return id;
}
export const sessionCookie = (id: string) => ({
  name: COOKIE, value: makeSession(id), httpOnly: true, sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE,
});

export interface User { id: string; name: string; salt: string; hash: string }

export function hashPassword(pw: string, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: scryptSync(pw, salt, 64).toString("hex") };
}
export function checkPassword(pw: string, u: User): boolean {
  const a = Buffer.from(hashPassword(pw, u.salt).hash, "hex"), b = Buffer.from(u.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function getUser(id: string): Promise<User | null> {
  const raw = await store.get(`u:${id}`);
  return raw ? (JSON.parse(raw) as User) : null;
}
export async function findByName(name: string): Promise<User | null> {
  const id = await store.get(`n:${name.toLowerCase()}`);
  return id ? getUser(id) : null;
}
/** The signed-in user for this request, or null. */
export async function currentUser(): Promise<User | null> {
  const id = readSession(cookies().get(COOKIE)?.value);
  return id ? getUser(id) : null;
}
