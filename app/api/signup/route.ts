import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { hashPassword, sessionCookie, type User } from "@/lib/auth";
import * as store from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim(), pw = String(b.password ?? "");
  if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) return NextResponse.json({ error: "Username must be 3 to 20 letters, numbers or underscores." }, { status: 400 });
  if (pw.length < 8 || pw.length > 200) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  try {
    const id = randomBytes(9).toString("base64url");
    if (!(await store.setnx(`n:${name.toLowerCase()}`, id))) return NextResponse.json({ error: "That username is taken." }, { status: 409 });
    const user: User = { id, name, ...hashPassword(pw) };
    await store.set(`u:${id}`, JSON.stringify(user));
    await store.hset("names", id, name);
    const res = NextResponse.json({ user: { id, name } });
    res.cookies.set(sessionCookie(id));
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
