// Catalog access: upsert, lookup, cached merged search across sources.
import { type Food, dedupeKey, dupKeys, matchesQuery } from "./model";
import { foodReady, foodSql } from "./db";
import { isChainFood } from "./chains";
import { searchUsda, searchUsdaBasic, usdaByBarcode, UpstreamError } from "./usda";
import { generalize, isPrepared } from "./generic";
import { searchOff, offByBarcode } from "./off";

const TTL_MS = 24 * 3600 * 1000;
const g = globalThis as unknown as { __lbFoodMem?: { items: Map<string, Food>; cache: Map<string, { at: number; ids: string[]; total: number }> } };
const mem = (g.__lbFoodMem ??= { items: new Map(), cache: new Map() });

export const normQuery = (q: string) => q.toLowerCase().replace(/\s+/g, " ").trim();

interface Row {
  id: string; source: Food["source"]; source_id: string; name: string; brand: string | null; category: string | null;
  barcode: string | null; base: "g" | "ml"; kcal: number; protein: number; carbs: number; fat: number;
  nutrients: Record<string, number>; servings: Food["servings"]; quality: Food["quality"]; quality_note: string | null;
  source_url: string | null; updated_at: string | Date;
}
const fromRow = (r: Row): Food => ({
  id: r.id, source: r.source, sourceId: r.source_id, name: r.name, brand: r.brand, category: r.category, barcode: r.barcode,
  base: r.base, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, nutrients: r.nutrients || {},
  servings: r.servings || [], quality: r.quality, qualityNote: r.quality_note, sourceUrl: r.source_url,
  updatedAt: new Date(r.updated_at).toISOString(),
});

export async function upsertFoods(foods: Food[], owner: string | null = null): Promise<void> {
  if (!foods.length) return;
  if (!foodSql) { for (const f of foods) mem.items.set(f.id, f); return; }
  await foodReady();
  await Promise.all(foods.map(f => foodSql!`INSERT INTO lb_food_items
    (id, source, source_id, dedupe_key, name, brand, category, barcode, base, kcal, protein, carbs, fat, nutrients, servings, quality, quality_note, source_url, owner, updated_at)
    VALUES (${f.id}, ${f.source}, ${f.sourceId}, ${dedupeKey(f)}, ${f.name}, ${f.brand}, ${f.category}, ${f.barcode}, ${f.base}, ${f.kcal}, ${f.protein}, ${f.carbs}, ${f.fat},
      ${JSON.stringify(f.nutrients)}::jsonb, ${JSON.stringify(f.servings)}::jsonb, ${f.quality}, ${f.qualityNote}, ${f.sourceUrl}, ${owner}, now())
    ON CONFLICT (source, source_id) DO UPDATE SET name=EXCLUDED.name, brand=EXCLUDED.brand, category=EXCLUDED.category, barcode=EXCLUDED.barcode,
      base=EXCLUDED.base, kcal=EXCLUDED.kcal, protein=EXCLUDED.protein, carbs=EXCLUDED.carbs, fat=EXCLUDED.fat, nutrients=EXCLUDED.nutrients,
      servings=EXCLUDED.servings, quality=EXCLUDED.quality, quality_note=EXCLUDED.quality_note, source_url=EXCLUDED.source_url, updated_at=now()
    WHERE lb_food_items.owner IS NOT DISTINCT FROM EXCLUDED.owner`));
}

export async function getFood(id: string): Promise<Food | null> {
  if (!foodSql) return mem.items.get(id) || null;
  await foodReady();
  const rows = (await foodSql`SELECT * FROM lb_food_items WHERE id = ${id}`) as Row[];
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function getFoods(ids: string[]): Promise<Food[]> {
  if (!ids.length) return [];
  let out: Food[];
  if (!foodSql) out = ids.map(i => mem.items.get(i)).filter((x): x is Food => !!x);
  else {
    await foodReady();
    const rows = (await foodSql`SELECT * FROM lb_food_items WHERE id = ANY(${ids})`) as Row[];
    const by = new Map(rows.map(r => [r.id, fromRow(r)]));
    out = ids.map(i => by.get(i)).filter((x): x is Food => !!x);
  }
  return out;
}

/** Interleave sources, drop repeats (same barcode, same brand+name, or same name with the same macros). */
export function mergeResults(lists: Food[][]): Food[] {
  const seen = new Set<string>();
  const out: Food[] = [];
  const max = Math.max(0, ...lists.map(l => l.length));
  for (let i = 0; i < max; i++) {
    for (const l of lists) {
      const f = l[i];
      if (!f) continue;
      const ks = dupKeys(f);
      if (ks.some(k => seen.has(k))) continue;
      ks.forEach(k => seen.add(k));
      out.push(f);
    }
  }
  return out;
}

export type SourcePick = "all" | "usda" | "off" | "restaurant";
export interface SearchResult { foods: Food[]; total: number; page: number; notices: string[]; cached: boolean }

async function readCache(key: string): Promise<{ ids: string[]; total: number } | null> {
  if (!foodSql) {
    const c = mem.cache.get(key);
    return c && Date.now() - c.at < TTL_MS ? c : null;
  }
  await foodReady();
  const rows = (await foodSql`SELECT ids, total FROM lb_food_cache WHERE cache_key = ${key} AND fetched_at > now() - interval '24 hours'`) as { ids: string[]; total: number }[];
  return rows[0] || null;
}
async function writeCache(key: string, ids: string[], total: number) {
  if (!foodSql) { mem.cache.set(key, { at: Date.now(), ids, total }); return; }
  await foodSql`INSERT INTO lb_food_cache (cache_key, ids, total, fetched_at) VALUES (${key}, ${JSON.stringify(ids)}::jsonb, ${total}, now())
    ON CONFLICT (cache_key) DO UPDATE SET ids=EXCLUDED.ids, total=EXCLUDED.total, fetched_at=now()`;
}

type Searcher = (q: string, page: number, size: number) => Promise<{ foods: Food[]; total: number }>;
export const adapters: { searchUsda: Searcher; searchOff: Searcher; searchUsdaBasic: (q: string) => Promise<{ foods: Food[]; total: number }> } = { searchUsda, searchOff, searchUsdaBasic };

async function searchRestaurants(q: string, limit: number): Promise<Food[]> {
  const words = q.split(" ").filter(w => w.length > 1).slice(0, 5);
  if (!words.length) return [];
  if (!foodSql) return [...mem.items.values()].filter(f => f.source === "restaurant" && words.every(w => `${f.name} ${f.brand || ""}`.toLowerCase().includes(w))).slice(0, limit);
  await foodReady();
  const pats = words.map(w => "%" + w.replace(/[\\%_]/g, m => "\\" + m) + "%");
  const rows = (await foodSql`SELECT * FROM lb_food_items WHERE source='restaurant' AND (name || ' ' || coalesce(brand,'')) ILIKE ALL(${pats}) ORDER BY name LIMIT ${limit}`) as Row[];
  return rows.map(fromRow);
}

/**
 * Search tab: generic ingredients only ("Lettuce, raw"), no blends or prepared dishes, no brands, no restaurants.
 * Packaged products are added when asked for (`packaged`) or when no generic ingredient matches.
 * Restaurants tab: chain items only.
 */
export async function searchFoods(q: string, source: SourcePick, page: number, pageSize = 20, packaged = false): Promise<SearchResult> {
  const nq = normQuery(q);
  const restaurantTab = source === "restaurant";
  const key = `${nq}|${source}|${page}|${pageSize}|${packaged ? "p" : "g"}`;
  const hit = await readCache(key).catch(() => null);
  if (hit) {
    const foods = await getFoods(hit.ids);
    if (foods.length === hit.ids.length) return { foods, total: hit.total, page, notices: [], cached: true };
  }
  const notices: string[] = [];
  const note = (name: string, e: unknown) => notices.push(`${name} is unavailable${(e as UpstreamError)?.status === 429 ? " (rate limited)" : ""}; showing results from the other sources.`);
  const local = restaurantTab && page === 1 ? await searchRestaurants(nq, pageSize).catch(() => []) : [];

  // Plain ingredients (first page only).
  let generic: Food[] = [];
  let basicRaw: Food[] = [];
  let answered = 0, asked = 0;
  if (page === 1 && source !== "off") {
    asked++;
    try { basicRaw = (await adapters.searchUsdaBasic(nq)).foods; answered++; } catch (e) { note("USDA FoodData Central", e); }
    const rel = basicRaw.filter(f => matchesQuery(f, nq));
    generic = restaurantTab ? [] : generalize(rel.filter(f => !isChainFood(f)), nq);
  }

  // Packaged and branded products: on request, when nothing generic matched, or in the Restaurants tab.
  let extra: Food[] = [];
  let total = generic.length;
  if (restaurantTab || packaged || (generic.length === 0 && source !== "usda") || (generic.length === 0 && page > 1)) {
    const jobs: [string, Promise<{ foods: Food[]; total: number }>][] = [];
    if (source !== "off") jobs.push(["USDA FoodData Central", adapters.searchUsda(nq, page, pageSize)]);
    if (source !== "usda") jobs.push(["Open Food Facts", adapters.searchOff(nq, page, pageSize)]);
    asked += jobs.length;
    const settled = await Promise.allSettled(jobs.map(j => j[1]));
    const lists: Food[][] = [];
    settled.forEach((s, i) => {
      if (s.status === "fulfilled") { answered++; lists.push(s.value.foods); total += s.value.total; } else note(jobs[i][0], s.reason);
    });
    if (restaurantTab) lists.push(basicRaw);
    const keep = (f: Food) => matchesQuery(f, nq) && (restaurantTab ? isChainFood(f) : !isChainFood(f) && !isPrepared(f.name, nq));
    extra = mergeResults(lists.map(l => l.filter(keep)));
  }
  if (asked && !answered) throw new UpstreamError("all", "All food sources are unavailable");

  const foods = mergeResults([[...local, ...generic, ...extra]]);
  await upsertFoods(foods.filter(f => f.source !== "restaurant")).catch(() => {});
  // Only cache when every requested source answered, so a transient failure is not pinned for 24 h.
  if (!notices.length) await writeCache(key, foods.map(f => f.id), total).catch(() => {});
  return { foods, total, page, notices, cached: false };
}

export async function lookupBarcode(code: string): Promise<{ food: Food | null; notices: string[] }> {
  const digits = code.replace(/\D/g, "");
  const notices: string[] = [];
  if (foodSql) {
    await foodReady();
    const rows = (await foodSql`SELECT * FROM lb_food_items WHERE barcode = ${digits} AND source <> 'user' LIMIT 1`) as Row[];
    if (rows[0]) return { food: fromRow(rows[0]), notices };
  } else {
    for (const f of mem.items.values()) if (f.barcode === digits && f.source !== "user") return { food: f, notices };
  }
  let food: Food | null = null;
  try { food = await offByBarcode(digits); } catch { notices.push("Open Food Facts is unavailable."); }
  if (!food) { try { food = await usdaByBarcode(digits); } catch { notices.push("USDA FoodData Central is unavailable."); } }
  if (food) await upsertFoods([food]).catch(() => {});
  return { food, notices };
}

// In-memory helpers (no DATABASE_URL): used by user-food listing and deletion.
export function searchLocalUser(uid: string): Food[] {
  return [...mem.items.values()].filter(f => f.source === "user" && f.sourceId.startsWith(uid + ":"));
}
export function dropLocal(id: string) { mem.items.delete(id); }
