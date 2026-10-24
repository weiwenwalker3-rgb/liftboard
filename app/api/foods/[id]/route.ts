import { NextResponse } from "next/server";
import { getFood } from "@/lib/food/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const food = await getFood(decodeURIComponent(params.id));
  return food ? NextResponse.json({ food }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
