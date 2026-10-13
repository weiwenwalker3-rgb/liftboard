// Open Food Facts adapter (no key). Crowd-sourced data: incomplete records are flagged, not hidden.
import { type Food, foodId } from "./model";
import { kcalConsistent } from "./units";
import { fetchJson } from "./usda";

export interface OffProduct {
  code?: string; product_name?: string; brands?: string | string[]; categories?: string | string[];
  nutriments?: Record<string, number | string>; serving_size?: string; serving_quantity?: number | string;
  quantity?: string;
}

const n = (o: Record<string, number | string>, k: string) => {
  const v = o[k];
  const x = typeof v === "string" ? parseFloat(v) : v;
  return typeof x === "number" && isFinite(x) ? x : null;
};

export function normalizeOff(p: OffProduct): Food | null {
  const nu = p.nutriments || {};
  const name = (p.product_name || "").trim();
  if (!p.code || !name) return null;
  let kcal = n(nu, "energy-kcal_100g");
  if (kcal == null) { const kj = n(nu, "energy_100g"); if (kj != null) kcal = Math.round(kj / 4.184); }
  const pr = n(nu, "proteins_100g"), c = n(nu, "carbohydrates_100g"), f = n(nu, "fat_100g");
  const missing = [kcal == null && "calories", pr == null && "protein", c == null && "carbs", f == null && "fat"].filter(Boolean) as string[];
  if (kcal == null && pr == null && c == null && f == null) return null;

  const per = { kcal: kcal ?? 0, protein: pr ?? 0, carbs: c ?? 0, fat: f ?? 0 };
  let quality: Food["quality"] = "complete";
  let note: string | null = null;
  if (missing.length) { quality = "incomplete"; note = `Missing ${missing.join(", ")} (community-entered data)`; }
  else if (!kcalConsistent(per)) { quality = "incomplete"; note = "Calories do not match macros (community-entered data)"; }

  const nutrients: Record<string, number> = {};
  const fiber = n(nu, "fiber_100g"), sugar = n(nu, "sugars_100g"), sod = n(nu, "sodium_100g"), sat = n(nu, "saturated-fat_100g");
  if (fiber != null) nutrients.fiber = fiber;
  if (sugar != null) nutrients.sugar = sugar;
  if (sod != null) nutrients.sodium = Math.round(sod * 1000); // g -> mg
  if (sat != null) nutrients.satFat = sat;

  const servings: Food["servings"] = [];
  const sq = typeof p.serving_quantity === "string" ? parseFloat(p.serving_quantity) : p.serving_quantity;
  if (sq && sq > 0) servings.push({ label: p.serving_size ? `1 serving (${p.serving_size})` : `1 serving (${sq} g)`, grams: sq, isDefault: true });

  return {
    id: foodId("off", p.code), source: "off", sourceId: p.code, name,
    brand: (Array.isArray(p.brands) ? p.brands[0] : (p.brands || "").split(",")[0] || "").trim() || null,
    category: (Array.isArray(p.categories) ? p.categories.slice(-1)[0] : (p.categories || "").split(",").pop() || "")?.trim() || null, barcode: p.code, base: "g",
    ...per, nutrients, servings, quality, qualityNote: note,
    sourceUrl: `https://world.openfoodfacts.org/product/${p.code}`, updatedAt: new Date().toISOString(),
  };
}

const FIELDS = "code,product_name,brands,categories,nutriments,serving_size,serving_quantity";

export async function searchOff(q: string, page: number, pageSize: number): Promise<{ foods: Food[]; total: number }> {
  // The newer search service is faster and more reliable than the legacy CGI endpoint; fall back to it on failure.
  try {
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page=${page}&page_size=${pageSize}&fields=${FIELDS}`;
    const j = (await fetchJson("off", url)) as { count?: number; hits?: OffProduct[] };
    const foods = (j.hits || []).map(normalizeOff).filter((x): x is Food => !!x);
    return { foods, total: j.count || foods.length };
  } catch {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page=${page}&page_size=${pageSize}&fields=${FIELDS}`;
    const j = (await fetchJson("off", url)) as { count?: number; products?: OffProduct[] };
    const foods = (j.products || []).map(normalizeOff).filter((x): x is Food => !!x);
    return { foods, total: j.count || foods.length };
  }
}

export async function offByBarcode(code: string): Promise<Food | null> {
  const j = (await fetchJson("off", `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`)) as { status?: number; product?: OffProduct };
  return j.status === 1 && j.product ? normalizeOff({ ...j.product, code: j.product.code || code }) : null;
}
