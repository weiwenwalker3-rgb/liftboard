// Small shared helpers for the /api/foods routes.
import { NextResponse } from "next/server";

const hits = new Map<string, number[]>();
/** Best-effort per-instance limiter: `max` calls per minute per client. */
export function limited(req: Request, bucket: string, max = 60): boolean {
  const ip = (req.headers.get("x-forwarded-for") || "anon").split(",")[0].trim();
  const k = bucket + ":" + ip;
  const now = Date.now();
  const arr = (hits.get(k) || []).filter(t => now - t < 60_000);
  arr.push(now);
  hits.set(k, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}
export const tooMany = () => NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
