import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import * as store from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 100);
    const names = await store.namesFor(ids);
    const out: Record<string, { name: string }> = {};
    for (const id of ids) if (names[id]) out[id] = { name: names[id] };
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
