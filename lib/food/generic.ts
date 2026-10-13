// Turn USDA's long list of variants into a short list of generic ingredients.
// "Lettuce, cos or romaine, raw", "Lettuce, butterhead, raw", ... become one "Lettuce, raw" entry (average of the variants).
import { type Food, foodId, matchesQuery } from "./model";

const PREPARED = /\b(medley|blend|blends|assorted|variety|combo|kit|trio|duo|mix|mixed|breaded|battered|nuggets?|patties|patty|tenders?|deli|luncheon|prepackaged|dinner|entree|snack|salad|soup|sauce|with|taco|tacos|burrito|sandwich|pizza|burger|wrap|stuffed|casserole|sliced|flavor|flavored|mesquite|glazed|seasoned|dried|dehydrated|powder|juice|concentrate|chips|crisps|leaves|flour|candied|babyfood|infant)\b/i;
const RAW = /\b(raw|uncooked)\b/i;
const COOKED = /\b(cooked|roasted|boiled|grilled|baked|broiled|steamed|pan[- ]?(fried|broiled|browned)|braised|stewed|simmered|fried)\b/i;

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean);
const stem = (w: string) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);

/** True for blends, medleys, kits and prepared dishes, unless the person typed that word. */
export function isPrepared(name: string, q: string): boolean {
  const qw = new Set(words(q).map(stem));
  const m = name.replace(/\bwith(out)?\s+(skin|bone|salt|added|fat|seeds?|peel|shell|liquids?|solids?)\b/gi, "").match(PREPARED);
  return !!m && !qw.has(stem(m[1].toLowerCase()));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const round = (n: number) => Math.round(n * 100) / 100;

const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** One generic entry from several USDA records (their average). A single record is returned as is, renamed. */
function makeGeneric(m: Food[], name: string, q: string): Food {
  const slug = slugOf(name);
  const avg = (k: "kcal" | "protein" | "carbs" | "fat") => round(m.reduce((a, x) => a + x[k], 0) / m.length);
  const nutrients: Record<string, number> = {};
  new Set(m.flatMap(x => Object.keys(x.nutrients))).forEach(k => { const vs = m.filter(x => k in x.nutrients).map(x => x.nutrients[k]); nutrients[k] = round(vs.reduce((a, b) => a + b, 0) / vs.length); });
  return {
    ...m[0], id: foodId("usda", "generic-" + slug), sourceId: "generic-" + slug, name, brand: null, category: "Generic", barcode: null, base: "g",
    kcal: avg("kcal"), protein: avg("protein"), carbs: avg("carbs"), fat: avg("fat"), nutrients, servings: [], quality: "complete",
    qualityNote: m.length > 1 ? `Average of ${m.length} USDA entries` : null,
    sourceUrl: m.length === 1 ? m[0].sourceUrl : `https://fdc.nal.usda.gov/food-search?query=${encodeURIComponent(q)}`, updatedAt: new Date().toISOString(),
  };
}

interface Opt { label: string; re: RegExp }
const o = (label: string, re: RegExp): Opt => ({ label, re });
// The common choices for broad searches. Each option averages the USDA entries whose name matches.
// Raw is listed for meats (the Raw/Cooked switch converts); prepared forms are listed for eggs, bacon and oats.
const COMMON: Record<string, Opt[]> = {
  egg: [o("Egg, whole, raw", /^egg, whole, raw/), o("Egg white, raw", /^egg, white, raw/), o("Egg yolk, raw", /^egg, yolk, raw/), o("Egg, hard-boiled", /^egg, whole, cooked, hard-boiled/), o("Egg, scrambled", /^egg, whole, cooked, scrambled/), o("Egg, fried", /^egg, whole, cooked, fried/)],
  milk: [o("Milk, whole", /^milk, whole/), o("Milk, 2%", /^milk, reduced fat/), o("Milk, 1%", /^milk, (lowfat|low fat)/), o("Milk, skim", /^milk, (nonfat|skim)/), o("Almond milk, unsweetened", /almond milk, unsweetened/), o("Soy milk, unsweetened", /soy ?milk.*unsweetened/)],
  cheese: [o("Cheddar", /^cheese, cheddar/), o("Mozzarella", /^cheese, mozzarella/), o("Swiss", /^cheese, swiss/), o("Parmesan", /^cheese, parmesan/), o("American", /^cheese, pasteurized process, american/), o("Feta", /^cheese, feta/), o("Cream cheese", /^cheese, cream/), o("Cottage cheese", /^cheese, cottage/)],
  bread: [o("White bread", /^bread, white, commercially/), o("Whole wheat bread", /^bread, whole-wheat, commercially/), o("Rye bread", /^bread, rye/), o("Multigrain bread", /^bread, multi-?grain/), o("Pita, white", /^bread, pita, white/)],
  yogurt: [o("Greek yogurt, plain, nonfat", /yogurt, greek, plain, nonfat/), o("Greek yogurt, plain, whole milk", /yogurt, greek, plain, whole milk/), o("Yogurt, plain, nonfat", /yogurt, plain, skim milk/), o("Yogurt, plain, lowfat", /yogurt, plain, low fat/), o("Yogurt, plain, whole milk", /yogurt, plain, whole milk/)],
  chicken: [o("Chicken breast, raw", /^chicken,.*\bbreast,.*meat only.*\braw\b/), o("Chicken thigh, raw", /^chicken,.*\bthighs?,.*meat only.*\braw\b/), o("Chicken drumstick, raw", /^chicken,.*drumstick.*meat only.*\braw\b/), o("Chicken wing, raw", /^chicken,.*wing.*\braw\b/), o("Ground chicken, raw", /^chicken, ground.*\braw\b/)],
  turkey: [o("Turkey breast, raw", /^turkey.*breast.*meat only.*\braw\b/), o("Ground turkey, raw", /^turkey, ground.*\braw\b/), o("Turkey thigh, raw", /^turkey.*thigh.*\braw\b/)],
  pork: [o("Pork loin chop, raw", /^pork, fresh, loin.*(center loin|top loin).*separable lean only.*\braw\b/), o("Pork tenderloin, raw", /^pork, fresh, loin, tenderloin.*\braw\b/), o("Ground pork, raw", /^pork, (fresh, )?ground.*\braw\b/), o("Bacon, cooked", /^pork, cured, bacon.*cooked/), o("Ham, sliced", /^pork, cured, ham.*(sliced|boneless|regular)/), o("Pork spareribs, raw", /spareribs.*\braw\b/)],
  bacon: [o("Bacon, cooked", /^pork, cured, bacon.*cooked/), o("Bacon, raw", /^pork, cured, bacon, (raw|unprepared)/)],
  potato: [o("Russet potato, raw", /^potatoes, russet.*\braw\b/), o("Red potato, raw", /^potatoes, red.*\braw\b/), o("White potato, raw", /^potatoes, white.*\braw\b/), o("Sweet potato, raw", /^sweet potato, raw/)],
  oat: [o("Rolled oats, dry", /^cereals, oats, regular and quick.*\bdry\b/), o("Oatmeal, cooked with water", /^cereals, oats, regular and quick.*cooked with water/)],
  tuna: [o("Tuna, canned in water", /^fish, tuna, light, canned in water/), o("Tuna, canned in oil", /^fish, tuna, light, canned in oil/), o("Tuna, fresh, raw", /^fish, tuna, fresh.*\braw\b/)],
};
COMMON.oatmeal = COMMON.oat;

const BEEF_CUTS: Opt[] = [o("Sirloin steak, raw", /^beef, top sirloin.*separable lean only.*\braw\b/), o("Ribeye steak, raw", /rib eye.*separable lean only.*\braw\b/), o("Strip steak, raw", /top loin.*separable lean only.*\braw\b/), o("Tenderloin, raw", /tenderloin.*separable lean only.*\braw\b/), o("Flank steak, raw", /flank.*separable lean only.*\braw\b/), o("Chuck roast, raw", /chuck.*separable lean only.*\braw\b/)];

function curated(foods: Food[], qw: string[], q: string): Food[] | null {
  const key = qw.join(" ");
  const opts = key === "beef" ? BEEF_CUTS : COMMON[key];
  if (!opts) return null;
  const pool = foods.filter(f => f.source === "usda" && !f.brand && !isPrepared(f.name, q));
  const out = opts.map(opt => ({ opt, m: pool.filter(f => opt.re.test(f.name.toLowerCase())) })).filter(x => x.m.length).map(x => makeGeneric(x.m, x.opt.label, q));
  const lead = key === "beef" ? (groundBeef(foods, ["beef", "ground"]) || []).filter(f => /80\/20|90\/10|93\/7/.test(f.name)) : [];
  const all = [...lead, ...out];
  return all.length ? all.slice(0, 8) : null;
}

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
    out.push(makeGeneric(m, `Ground beef ${lean}/${fat}, raw`, "ground beef"));
  }
  return out.length ? out : null;
}

export function generalize(foods: Food[], q: string, max = 8): Food[] {
  const qw = words(q).map(stem).filter(w => w.length > 1);
  const beef = groundBeef(foods, qw);
  if (beef) return beef;
  const common = curated(foods, qw, q);
  if (common) return common;
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
