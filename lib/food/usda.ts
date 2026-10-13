// USDA FoodData Central adapter. Server-only: the key comes from USDA_API_KEY.
import { type Food, foodId } from "./model";
import { kcalConsistent } from "./units";

const BASE = "https://api.nal.usda.gov/fdc/v1";

interface UsdaNutrient { nutrientNumber?: string; nutrientId?: number; value?: number }
export interface UsdaFood {
  fdcId: number; description: string; dataType?: string; brandOwner?: string; brandName?: string;
  gtinUpc?: string; foodCategory?: string; servingSize?: number; servingSizeUnit?: string;
  householdServingFullText?: string; foodNutrients?: UsdaNutrient[];
  foodPortions?: { gramWeight?: number; amount?: number; modifier?: string; portionDescription?: string; measureUnit?: { name?: string } }[];
}

const num = (ns: UsdaNutrient[], n: string) => {
  const hit = ns.find(x => x.nutrientNumber === n);
  return typeof hit?.value === "number" ? hit.value : null;
};

// USDA household labels are shouty and use odd unit codes ("2 ONZ", "1 CHICKEN BREAST").
export function cleanLabel(s: string): string {
  let t = s.replace(/\bONZ\b/gi, "oz").replace(/\b(GRM|GM)\b/gi, "g").replace(/\bMLT\b/gi, "ml");
  if (t === t.toUpperCase()) t = t.toLowerCase();
  return t.replace(/\s+/g, " ").trim();
}

const title = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()) : s);

export function normalizeUsda(u: UsdaFood): Food | null {
  const ns = u.foodNutrients || [];
  const kcal = num(ns, "208"), p = num(ns, "203"), c = num(ns, "205"), f = num(ns, "204");
  if (!u.description || kcal == null) return null;
  const liquid = (u.servingSizeUnit || "").toLowerCase() === "ml";
  const nutrients: Record<string, number> = {};
  const extra: [string, string][] = [["fiber", "291"], ["sugar", "269"], ["sodium", "307"], ["satFat", "606"], ["cholesterol", "601"]];
  for (const [k, n] of extra) { const v = num(ns, n); if (v != null) nutrients[k] = v; }

  const servings: Food["servings"] = [];
  if (u.servingSize && u.servingSize > 0) {
    const label = u.householdServingFullText ? `${cleanLabel(u.householdServingFullText)} (${u.servingSize} ${liquid ? "ml" : "g"})` : `1 serving (${u.servingSize} ${liquid ? "ml" : "g"})`;
    servings.push({ label, grams: u.servingSize, isDefault: true });
  }
  for (const pt of u.foodPortions || []) {
    if (!pt.gramWeight) continue;
    const amt = pt.amount && pt.amount !== 1 ? `${pt.amount} ` : "1 ";
    const what = pt.portionDescription || [pt.measureUnit?.name, pt.modifier].filter(x => x && x !== "undetermined").join(" ");
    if (what) servings.push({ label: `${cleanLabel(amt + what)} (${Math.round(pt.gramWeight)} g)`, grams: pt.gramWeight, isDefault: servings.length === 0 });
  }

  const missing = [p == null && "protein", c == null && "carbs", f == null && "fat"].filter(Boolean) as string[];
  const per = { kcal, protein: p ?? 0, carbs: c ?? 0, fat: f ?? 0 };
  let quality: Food["quality"] = "complete";
  let note: string | null = null;
  if (missing.length) { quality = "incomplete"; note = `Missing ${missing.join(", ")} in USDA record`; }
  else if (!kcalConsistent(per)) { quality = "incomplete"; note = "Calories do not match macros; check the label"; }

  return {
    id: foodId("usda", String(u.fdcId)), source: "usda", sourceId: String(u.fdcId),
    name: title(u.description), brand: u.brandName || u.brandOwner ? title(u.brandName || u.brandOwner || "") : null,
    category: u.foodCategory || null, barcode: u.gtinUpc || null, base: liquid ? "ml" : "g",
    ...per, nutrients, servings, quality, qualityNote: note,
    sourceUrl: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${u.fdcId}/nutrients`,
    updatedAt: new Date().toISOString(),
  };
}

export class UpstreamError extends Error {
  constructor(public source: string, msg: string, public status?: number) { super(msg); }
}

export async function fetchJson(source: string, url: string, init: RequestInit = {}): Promise<unknown> {
  let last: unknown;
  for (let i = 0; i < 2; i++) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(url, { ...init, signal: ctl.signal, headers: { "User-Agent": "Liftboard/1.0 (food search)", ...(init.headers || {}) } });
      clearTimeout(t);
      if (r.status === 429) throw new UpstreamError(source, "rate limited", 429);
      if (!r.ok) throw new UpstreamError(source, "HTTP " + r.status, r.status);
      return await r.json();
    } catch (e) {
      last = e;
      if (e instanceof UpstreamError && e.status && e.status < 500) break;
    }
  }
  throw last instanceof UpstreamError ? last : new UpstreamError(source, "request failed");
}

const SHORT = 8; // slots on page 1 reserved for basic ingredients

async function usdaPage(q: string, types: string, page: number, pageSize: number) {
  const key = process.env.USDA_API_KEY || "DEMO_KEY";
  const url = `${BASE}/foods/search?query=${encodeURIComponent(q)}&pageNumber=${page}&pageSize=${pageSize}&requireAllWords=true` +
    `&dataType=${encodeURIComponent(types)}&api_key=${encodeURIComponent(key)}`;
  const j = (await fetchJson("usda", url)) as { totalHits?: number; foods?: UsdaFood[] };
  return { foods: (j.foods || []).map(normalizeUsda).filter((x): x is Food => !!x), total: j.totalHits || 0 };
}

/** Page 1 leads with basic ingredients (Foundation, SR Legacy), then branded products. Later pages are branded only. */
export async function searchUsda(q: string, page: number, pageSize: number): Promise<{ foods: Food[]; total: number }> {
  if (page > 1) return usdaPage(q, "Branded", page, pageSize);
  const [basic, branded] = await Promise.allSettled([usdaPage(q, "Foundation,SR Legacy", 1, SHORT), usdaPage(q, "Branded", 1, pageSize - SHORT)]);
  if (branded.status === "rejected" && basic.status === "rejected") throw branded.reason;
  const b = basic.status === "fulfilled" ? basic.value : { foods: [], total: 0 };
  const r = branded.status === "fulfilled" ? branded.value : { foods: [], total: 0 };
  return { foods: [...b.foods, ...r.foods], total: b.total + r.total };
}

export async function usdaByBarcode(code: string): Promise<Food | null> {
  const r = await searchUsda(code, 1, 5);
  return r.foods.find(f => f.barcode && f.barcode.replace(/^0+/, "") === code.replace(/^0+/, "")) || null;
}
