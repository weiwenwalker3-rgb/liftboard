// Per-account food data: favorites, recents, own foods, saved meals.
import { randomBytes } from "node:crypto";
import { type Food, foodId } from "./model";
import { foodReady, foodSql } from "./db";
import { getFoods, upsertFoods, searchLocalUser, dropLocal } from "./catalog";
import { kcalConsistent } from "./units";

export interface MealItem { foodId: string; name: string; label: string; grams: number; kcal: number; p: number; c: number; f: number }
export interface Meal { id: string; name: string; items: MealItem[]; createdAt: string }

const g = globalThis as unknown as { __lbFoodUser?: { fav: Map<string, Set<string>>; rec: Map<string, Map<string, number>>; meals: Map<string, Meal[]> } };
const mem = (g.__lbFoodUser ??= { fav: new Map(), rec: new Map(), meals: new Map() });
const RECENT_MAX = 30, FAV_MAX = 500, MEAL_MAX = 100;

export async function listFavorites(uid: string): Promise<Food[]> {
  let ids: string[];
  if (!foodSql) ids = [...(mem.fav.get(uid) || [])];
  else { await foodReady(); ids = ((await foodSql`SELECT food_id FROM lb_food_favorites WHERE user_id=${uid} ORDER BY created_at DESC LIMIT ${FAV_MAX}`) as { food_id: string }[]).map(r => r.food_id); }
  return getFoods(ids);
}
export async function setFavorite(uid: string, id: string, on: boolean): Promise<void> {
  if (!foodSql) { const s = mem.fav.get(uid) || new Set(); on ? s.add(id) : s.delete(id); mem.fav.set(uid, s); return; }
  await foodReady();
  if (on) await foodSql`INSERT INTO lb_food_favorites (user_id, food_id) VALUES (${uid}, ${id}) ON CONFLICT DO NOTHING`;
  else await foodSql`DELETE FROM lb_food_favorites WHERE user_id=${uid} AND food_id=${id}`;
}

export async function listRecents(uid: string): Promise<Food[]> {
  let ids: string[];
  if (!foodSql) ids = [...(mem.rec.get(uid) || new Map()).entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
  else { await foodReady(); ids = ((await foodSql`SELECT food_id FROM lb_food_recents WHERE user_id=${uid} ORDER BY last_used DESC LIMIT ${RECENT_MAX}`) as { food_id: string }[]).map(r => r.food_id); }
  return getFoods(ids);
}
export async function touchRecent(uid: string, id: string): Promise<void> {
  if (!foodSql) {
    const m = mem.rec.get(uid) || new Map<string, number>();
    m.set(id, Date.now());
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(RECENT_MAX).forEach(([k]) => m.delete(k));
    mem.rec.set(uid, m); return;
  }
  await foodReady();
  await foodSql`INSERT INTO lb_food_recents (user_id, food_id, last_used) VALUES (${uid}, ${id}, now()) ON CONFLICT (user_id, food_id) DO UPDATE SET last_used = now()`;
  await foodSql`DELETE FROM lb_food_recents WHERE user_id=${uid} AND food_id NOT IN (SELECT food_id FROM lb_food_recents WHERE user_id=${uid} ORDER BY last_used DESC LIMIT ${RECENT_MAX})`;
}

const num = (v: unknown, max: number) => { const n = typeof v === "number" ? v : parseFloat(String(v)); return isFinite(n) && n >= 0 && n <= max ? n : null; };
const text = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Build a user food from per-serving values. Throws a user-facing Error on bad input. */
export function buildUserFood(uid: string, input: Record<string, unknown>): Food {
  const name = text(input.name, 80);
  if (!name) throw new Error("Give the food a name.");
  const grams = num(input.servingGrams, 5000) || 100;
  const kcalIn = num(input.kcal, 20000), p = num(input.protein, 2000), c = num(input.carbs, 2000), f = num(input.fat, 2000);
  if (p == null || c == null || f == null) throw new Error("Protein, carbs and fat must be numbers 0 or higher.");
  const k = 100 / grams;
  const kcal = kcalIn == null ? p * 4 + c * 4 + f * 9 : kcalIn;
  const per = { kcal: kcal * k, protein: p * k, carbs: c * k, fat: f * k };
  const base = input.base === "ml" ? "ml" : "g";
  const id = randomBytes(6).toString("hex");
  const r1 = (n: number) => Math.round(n * 100) / 100;
  const consistent = kcalConsistent(per);
  return {
    id: foodId("user", `${uid}:${id}`), source: "user", sourceId: `${uid}:${id}`, name, brand: text(input.brand, 60) || null,
    category: null, barcode: null, base, kcal: r1(per.kcal), protein: r1(per.protein), carbs: r1(per.carbs), fat: r1(per.fat),
    nutrients: {}, servings: [{ label: `${text(input.servingLabel, 40) || "1 serving"} (${r1(grams)} ${base})`, grams: r1(grams), isDefault: true }],
    quality: consistent ? "complete" : "estimated", qualityNote: consistent ? null : "Calories do not match the macros you entered",
    sourceUrl: null, updatedAt: new Date().toISOString(),
  };
}

export async function createUserFood(uid: string, input: Record<string, unknown>): Promise<Food> {
  const f = buildUserFood(uid, input);
  await upsertFoods([f], uid);
  return f;
}
export async function listUserFoods(uid: string): Promise<Food[]> {
  if (!foodSql) return searchLocalUser(uid);
  await foodReady();
  const rows = (await foodSql`SELECT id FROM lb_food_items WHERE source='user' AND owner=${uid} ORDER BY updated_at DESC LIMIT 200`) as { id: string }[];
  return getFoods(rows.map(r => r.id));
}
export async function deleteUserFood(uid: string, id: string): Promise<void> {
  if (!id.startsWith(`user:${uid}:`)) return;
  if (!foodSql) { dropLocal(id); return; }
  await foodReady();
  await foodSql`DELETE FROM lb_food_items WHERE id=${id} AND owner=${uid}`;
  await foodSql`DELETE FROM lb_food_favorites WHERE food_id=${id}`;
  await foodSql`DELETE FROM lb_food_recents WHERE food_id=${id}`;
}

export function cleanMealItems(raw: unknown): MealItem[] {
  if (!Array.isArray(raw) || !raw.length) throw new Error("Add at least one food to the meal.");
  if (raw.length > 40) throw new Error("A meal can have at most 40 items.");
  return raw.map(r => {
    const o = (r || {}) as Record<string, unknown>;
    const grams = num(o.grams, 20000), kcal = num(o.kcal, 50000), p = num(o.p, 5000), c = num(o.c, 5000), f = num(o.f, 5000);
    if (grams == null || kcal == null || p == null || c == null || f == null) throw new Error("A meal item has invalid numbers.");
    return { foodId: text(o.foodId, 120), name: text(o.name, 80) || "Food", label: text(o.label, 60), grams, kcal, p, c, f };
  });
}

export async function listMeals(uid: string): Promise<Meal[]> {
  if (!foodSql) return mem.meals.get(uid) || [];
  await foodReady();
  const rows = (await foodSql`SELECT id, name, items, created_at FROM lb_meals WHERE user_id=${uid} ORDER BY created_at DESC LIMIT ${MEAL_MAX}`) as { id: string; name: string; items: MealItem[]; created_at: string }[];
  return rows.map(r => ({ id: r.id, name: r.name, items: r.items, createdAt: new Date(r.created_at).toISOString() }));
}
export async function saveMeal(uid: string, name: string, rawItems: unknown): Promise<Meal> {
  const nm = text(name, 60);
  if (!nm) throw new Error("Give the meal a name.");
  const items = cleanMealItems(rawItems);
  const meal: Meal = { id: randomBytes(6).toString("hex"), name: nm, items, createdAt: new Date().toISOString() };
  if (!foodSql) { const l = mem.meals.get(uid) || []; l.unshift(meal); mem.meals.set(uid, l.slice(0, MEAL_MAX)); return meal; }
  await foodReady();
  await foodSql`INSERT INTO lb_meals (id, user_id, name, items) VALUES (${meal.id}, ${uid}, ${nm}, ${JSON.stringify(items)}::jsonb)`;
  return meal;
}
export async function deleteMeal(uid: string, id: string): Promise<void> {
  if (!foodSql) { mem.meals.set(uid, (mem.meals.get(uid) || ([] as Meal[])).filter((m: Meal) => m.id !== id)); return; }
  await foodReady();
  await foodSql`DELETE FROM lb_meals WHERE id=${id} AND user_id=${uid}`;
}
