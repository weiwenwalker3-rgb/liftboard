// Restaurant catalog: import a chain's own published nutrition table (CSV) into the food catalog.
// Every item keeps the page it came from and the date that page was published.
import { type Food, foodId } from "./model";
import { kcalConsistent } from "./units";

export interface RestaurantMeta { restaurant: string; sourceUrl: string; publishedAt: string }

/** Minimal RFC-4180 style CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some(c => c.trim())) rows.push(row); row = []; }
    else cell += ch;
  }
  row.push(cell); if (row.some(c => c.trim())) rows.push(row);
  return rows;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Columns: item, calories, protein, carbs, fat (per item). Optional: serving_g, category, fiber, sugar, sodium_mg. */
export function importRestaurantCsv(text: string, meta: RestaurantMeta): { foods: Food[]; skipped: string[] } {
  if (!/^https:\/\//.test(meta.sourceUrl)) throw new Error("sourceUrl must be the https page the nutrition data was published on");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.publishedAt)) throw new Error("publishedAt must be YYYY-MM-DD");
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV has no data rows");
  const head = rows[0].map(h => h.trim().toLowerCase());
  const col = (n: string) => head.indexOf(n);
  for (const need of ["item", "calories", "protein", "carbs", "fat"]) if (col(need) < 0) throw new Error(`CSV is missing the "${need}" column`);
  const foods: Food[] = [], skipped: string[] = [], seen = new Set<string>();
  const n = (r: string[], k: string) => { const i = col(k); if (i < 0 || r[i] == null || r[i].trim() === "") return null; const v = parseFloat(r[i]); return isFinite(v) && v >= 0 ? v : NaN; };
  rows.slice(1).forEach((r, idx) => {
    const name = (r[col("item")] || "").trim();
    const kcal = n(r, "calories"), p = n(r, "protein"), c = n(r, "carbs"), f = n(r, "fat");
    if (!name || [kcal, p, c, f].some(v => v == null || Number.isNaN(v))) { skipped.push(`row ${idx + 2}: ${name || "(no name)"}: missing or invalid numbers`); return; }
    const sid = `${slug(meta.restaurant)}:${slug(name)}`;
    if (seen.has(sid)) { skipped.push(`row ${idx + 2}: ${name}: duplicate item`); return; }
    seen.add(sid);
    const g = n(r, "serving_g");
    const grams = g && g > 0 ? g : 100;
    const k = 100 / grams, r2 = (v: number) => Math.round(v * 100) / 100;
    const per = { kcal: r2(kcal! * k), protein: r2(p! * k), carbs: r2(c! * k), fat: r2(f! * k) };
    const nutrients: Record<string, number> = {};
    for (const [key, outKey] of [["fiber", "fiber"], ["sugar", "sugar"], ["sodium_mg", "sodium"]] as const) { const v = n(r, key); if (v != null && !Number.isNaN(v)) nutrients[outKey] = r2(v * k); }
    let quality: Food["quality"] = "complete", note: string | null = null;
    if (!(g && g > 0)) { quality = "estimated"; note = "Chain publishes per-item values only; use servings, not grams or ounces"; }
    else if (!kcalConsistent(per)) { quality = "incomplete"; note = "Published calories do not match published macros"; }
    foods.push({
      id: foodId("restaurant", sid), source: "restaurant", sourceId: sid, name, brand: meta.restaurant,
      category: (r[col("category")] || "").trim() || "Restaurant", barcode: null, base: "g", ...per, nutrients,
      servings: [{ label: g && g > 0 ? `1 item (${r2(grams)} g)` : "1 item", grams, isDefault: true }],
      quality, qualityNote: note ? `${note}. Published ${meta.publishedAt}` : `Published ${meta.publishedAt}`,
      sourceUrl: meta.sourceUrl, updatedAt: new Date(meta.publishedAt + "T00:00:00Z").toISOString(),
    });
  });
  return { foods, skipped };
}
