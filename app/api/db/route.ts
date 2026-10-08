import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { cleanPr, cleanSocial, MAX_STATE_BYTES } from "@/lib/rules";
import * as store from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTIONS = new Set(["prs", "social"]);
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/** GET ?col=prs|social -> { docs: { id: data } }   GET ?doc=state -> { exists, data } */
export async function GET(req: NextRequest) {
  try {
    const u = await currentUser();
    if (!u) return fail("Sign in first.", 401);
    const col = req.nextUrl.searchParams.get("col");
    if (col) {
      if (!COLLECTIONS.has(col)) return fail("Unknown collection.", 404);
      const raw = await store.hgetall(`col:${col}`);
      const docs: Record<string, unknown> = {};
      for (const [id, v] of Object.entries(raw)) docs[id] = JSON.parse(v);
      return NextResponse.json({ docs });
    }
    if (req.nextUrl.searchParams.get("doc") === "state") {
      const raw = await store.get(`state:${u.id}`);
      return NextResponse.json({ exists: raw !== null, data: raw ? JSON.parse(raw) : null });
    }
    return fail("Bad request.", 400);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

/** PUT { path, data }. You can only write your own documents. */
export async function PUT(req: NextRequest) {
  try {
    const u = await currentUser();
    if (!u) return fail("Sign in first.", 401);
    const b = await req.json().catch(() => null);
    const path = String(b?.path ?? "");
    if (path === `prs/${u.id}`) {
      const doc = cleanPr(b.data);
      if (!doc) return NextResponse.json({ error: "invalid_argument" }, { status: 400 });
      await store.hset("col:prs", u.id, JSON.stringify(doc));
    } else if (path === `social/${u.id}`) {
      const doc = cleanSocial(b.data);
      if (!doc) return NextResponse.json({ error: "invalid_argument" }, { status: 400 });
      await store.hset("col:social", u.id, JSON.stringify(doc));
    } else if (path === `data/users/${u.id}/state`) {
      const s = JSON.stringify(b.data ?? null);
      if (!b.data || typeof b.data !== "object") return fail("invalid_argument", 400);
      if (s.length > MAX_STATE_BYTES) return NextResponse.json({ error: "quota_exceeded" }, { status: 413 });
      await store.set(`state:${u.id}`, s);
    } else {
      return fail("You can only write your own documents.", 403);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
