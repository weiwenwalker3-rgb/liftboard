import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import * as U from "@/lib/food/user";
import { getFood } from "@/lib/food/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return bad("Sign in to use favorites, recents, your foods and meals.", 401);
  const list = new URL(req.url).searchParams.get("list");
  if (list === "favorites") return NextResponse.json({ foods: await U.listFavorites(me.id) });
  if (list === "recents") return NextResponse.json({ foods: await U.listRecents(me.id) });
  if (list === "foods") return NextResponse.json({ foods: await U.listUserFoods(me.id) });
  if (list === "meals") return NextResponse.json({ meals: await U.listMeals(me.id) });
  return bad("Unknown list");
}

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return bad("Sign in first.", 401);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return bad("Bad request"); }
  const id = String(b.foodId || "").slice(0, 120);
  try {
    switch (b.op) {
      case "fav": case "unfav":
        if (b.op === "fav" && !(await getFood(id))) return bad("Food not found", 404);
        await U.setFavorite(me.id, id, b.op === "fav"); return NextResponse.json({ ok: true });
      case "recent":
        if (!(await getFood(id))) return bad("Food not found", 404);
        await U.touchRecent(me.id, id); return NextResponse.json({ ok: true });
      case "createFood": return NextResponse.json({ food: await U.createUserFood(me.id, b) });
      case "deleteFood": await U.deleteUserFood(me.id, id); return NextResponse.json({ ok: true });
      case "saveMeal": return NextResponse.json({ meal: await U.saveMeal(me.id, String(b.name || ""), b.items) });
      case "deleteMeal": await U.deleteMeal(me.id, String(b.mealId || "")); return NextResponse.json({ ok: true });
      default: return bad("Unknown operation");
    }
  } catch (e) { return bad((e as Error).message || "Could not save"); }
}
