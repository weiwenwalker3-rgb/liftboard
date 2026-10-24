import { NextResponse } from "next/server";
import { searchFoods, type SourcePick } from "@/lib/food/catalog";
import { limited, tooMany } from "@/lib/food/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  if (limited(req, "search", 60)) return tooMany();
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") || "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ foods: [], total: 0, page: 1, notices: [], cached: false });
  const src = u.searchParams.get("source");
  const source: SourcePick = src === "usda" || src === "off" ? src : "all";
  const page = Math.min(50, Math.max(1, parseInt(u.searchParams.get("page") || "1", 10) || 1));
  try {
    return NextResponse.json(await searchFoods(q, source, page, 20, u.searchParams.get("packaged") === "1"));
  } catch {
    return NextResponse.json({ error: "Food search is temporarily unavailable. Try again shortly." }, { status: 502 });
  }
}
