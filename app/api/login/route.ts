import { NextRequest, NextResponse } from "next/server";
import { checkPassword, findByName, sessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim(), pw = String(b.password ?? "");
  try {
    const u = /^[A-Za-z0-9_]{3,20}$/.test(name) ? await findByName(name) : null;
    if (!u || !checkPassword(pw, u)) return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
    const res = NextResponse.json({ user: { id: u.id, name: u.name } });
    res.cookies.set(sessionCookie(u.id));
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
