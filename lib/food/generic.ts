// Turn USDA's long list of variants into a short list of generic ingredients.
// "Lettuce, cos or romaine, raw", "Lettuce, butterhead, raw", ... become one "Lettuce, raw" entry (average of the variants).
import { type Food, foodId, matchesQuery } from "./model";

const PREPARED = /\b(medley|blend|blends|assorted|variety|combo|kit|trio|duo|mix|mixed|breaded|battered|nuggets?|patties|patty|tenders?|deli|luncheon|prepackaged|dinner|entree|snack|salad|soup|sauce|with|taco|tacos|burrito|sandwich|pizza|burger|wrap|stuffed|casserole|sliced|flavor|flavored|mesquite|glazed|seasoned)\b/i;
const RAW = /\b(raw|uncooked)\b/i;
const COOKED = /\b(cooked|roasted|boiled|grilled|baked|broiled|steamed|pan[- ]?(fried|broiled|browned)|braised|stewed|simmered|fried)\b/i;

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean);
const stem = (w: string) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);

/** True for blends, medleys, kits and prepared dishes, unless the person typed that word. */
export function isPrepared(name: string, q: string): boolean {
  const qw = new Set(words(q).map(stem));
  const m = name.match(PREPARED);
  return !!m && !qw.has(stem(m[1].toLowerCase()));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const round = (n: number) => Math.round(n * 100) / 100;

const RATIOS = [70, 80, 90, 93, 97];
const LEAN = /(\d{2})%\s*lean meat\s*\/\s*(\d{1,2})%\s*fat/i;

/** "ground beef": the five common lean ratios, raw. A typed ratio ("93/7") narrows the list. */
function groundBeef(foods: Food[], qw: string[]): Food[] | null {
  if (!(qw.includes("beef") && (qw.includes("ground") || qw.includes("mince"))) && !qw.includes("hamburger")) return null;
  const typed = RATIOS.filter(r => qw.includes(String(r)));
  const out: Food[] = [];
  for (const lean of typed.length ? typed : RATIOS) {
    const m = foods.filter(f => f.source === "usda" && !f.brand && /^beef,\s*ground/i.test(f.name) && RAW.test(f.name) && LEAN.exec(f.name)?.[1] === String(lean));
    if (!m.length) continue;
    const fat = 100 - lean;
    const avg = (k: "kcal" | "protein" | "carbs" | "fat") => round(m.reduce((a, x) => a + x[k], 0) / m.length);
    const nutrients: Record<string, number> = {};
    new Set(m.flatMap(x => Object.keys(x.nutrients))).forEach(k => { const vs = m.filter(x => k in x.nutrients).map(x => x.nutrients[k]); nutrients[k] = round(vs.reduce((a, b) => a + b, 0) / vs.length); });
    out.push({
      ...m[0], id: foodId("usda", `generic-ground-beef-${lean}-${fat}-raw`), sourceId: `generic-ground-beef-${lean}-${fat}-raw`,
      name: `Ground beef ${lean}/${fat}, raw`, category: "Generic", kcal: avg("kcal"), protein: avg("protein"), carbs: avg("carbs"), fat: avg("fat"),
      nutrients, servings: [], quality: "complete", qualityNote: m.length > 1 ? `Average of ${m.length} USDA entries` : null,
      sourceUrl: m[0].sourceUrl, updatedAt: new Date().toISOString(),
    });
  }
  return out.length ? out : null;
}

export function generalize(foods: Food[], q: string, max = 8): Food[] {
  const qw = words(q).map(stem).filter(w => w.length > 1);
  const beef = groundBeef(foods, qw);
  if (beef) return beef;
  const groups = new Map<string, { head: string; segs: string[]; state: string; members: Food[] }>();
  for (const f of foods) {
    if (f.source !== "usda" || f.brand || isPrepared(f.name, q) || !matchesQuery(f, q)) continue;
    const segs = f.name.split(",").map(s => s.trim()).filter(Boolean);
    if (!segs.length) continue;
    const head = segs[0].toLowerCase();
    const headWords = new Set(words(head).map(stem));
    // Segments (after the head) that contain a word the person typed are meaningful: "breast", "ground", "93% lean".
    const sub = segs.slice(1).filter(s => !RAW.test(s) && !COOKED.test(s) && words(s).some(w => qw.includes(stem(w)) && !headWords.has(stem(w))));
    const state = RAW.test(f.name) ? "raw" : COOKED.test(f.name) ? "cooked" : "";
    const key = [head, ...sub.map(s => s.toLowerCase()), state].join("|");
    const g = groups.get(key) || { head: segs[0], segs: sub, state, members: [] };
    g.members.push(f);
    groups.set(key, g);
  }
  const out = [...groups.values()].map(g => {
    const m = g.members;
    if (m.length === 1) return { f: m[0], n: 1, exact: words(g.head).map(stem).every(w => qw.includes(w)) };
    const avg = (k: "kcal" | "protein" | "carbs" | "fat") => round(m.reduce((a, x) => a + x[k], 0) / m.length);
    const nutrients: Record<string, number> = {};
    const keys = new Set(m.flatMap(x => Object.keys(x.nutrients)));
    keys.forEach(k => { const vs = m.filter(x => k in x.nutrients).map(x => x.nutrients[k]); nutrients[k] = round(vs.reduce((a, b) => a + b, 0) / vs.length); });
    const name = [cap(g.head), ...g.segs, ...(g.state ? [g.state] : [])].join(", ");
    const slug = [g.head, ...g.segs, g.state].join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const f: Food = {
      id: foodId("usda", "generic-" + slug), source: "usda", sourceId: "generic-" + slug, name, brand: null,
      category: "Generic", barcode: null, base: "g", kcal: avg("kcal"), protein: avg("protein"), carbs: avg("carbs"), fat: avg("fat"),
      nutrients, servings: [], quality: "complete", qualityNote: `Average of ${m.length} USDA entries`,
      sourceUrl: `https://fdc.nal.usda.gov/food-search?query=${encodeURIComponent(q)}`, updatedAt: new Date().toISOString(),
    };
    return { f, n: m.length, exact: words(g.head).map(stem).every(w => qw.includes(w)) };
  });
  // Raw before cooked, then the most common variants, then the shortest (simplest) names.
  const rank = (f: Food) => (RAW.test(f.name) ? 0 : COOKED.test(f.name) ? 1 : 2);
  // When some entries are the thing itself ("Rice, ..."), drop look-alikes ("Rice flour", "Snacks, rice cakes").
  let pool = out.some(x => x.exact) ? out.filter(x => x.exact) : out;
  // A group with no raw/cooked label is redundant once raw and cooked entries exist.
  if (pool.some(x => RAW.test(x.f.name) || COOKED.test(x.f.name))) pool = pool.filter(x => RAW.test(x.f.name) || COOKED.test(x.f.name));
  pool.sort((a, b) => Number(b.exact) - Number(a.exact) || rank(a.f) - rank(b.f) || b.n - a.n || a.f.name.length - b.f.name.length);
  // Entries with the same state and the same macros are the same food for tracking: keep one.
  const seen = new Set<string>();
  const merged = pool.filter(x => {
    const k = [RAW.test(x.f.name) ? "r" : COOKED.test(x.f.name) ? "c" : "", Math.round(x.f.kcal), Math.round(x.f.protein), Math.round(x.f.carbs), Math.round(x.f.fat)].join("|");
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
  return merged.slice(0, max).map(x => x.f);
}
