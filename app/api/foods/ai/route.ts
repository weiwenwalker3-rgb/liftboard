import { NextResponse } from "next/server";
import { aiLookup } from "@/lib/food/ai";
import { limited, tooMany } from "@/lib/food/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (limited(req, "ai", 20)) return tooMany();
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 100);
  try {
    return NextResponse.json(await aiLookup(q));
  } catch {
    // The quick answer is optional; database results still show.
    return NextResponse.json({ food: null, cached: false });
  }
}
