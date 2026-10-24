import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { persistent } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const u = await currentUser();
    return NextResponse.json({ user: u ? { id: u.id, name: u.name } : null, persistent });
  } catch (e) {
    return NextResponse.json({ user: null, persistent, error: (e as Error).message }, { status: 500 });
  }
}
