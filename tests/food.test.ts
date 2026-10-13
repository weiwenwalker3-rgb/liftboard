import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeUsda, type UsdaFood } from "../lib/food/usda";
import { normalizeOff, type OffProduct } from "../lib/food/off";
import { mergeResults, searchFoods, adapters, lookupBarcode, upsertFoods } from "../lib/food/catalog";
import { scale, toBase } from "../lib/food/units";

const fx = (n: string) => JSON.parse(readFileSync(new URL("./fixtures/" + n, import.meta.url), "utf8"));
const usda = fx("usda.json").foods.map((f: UsdaFood) => normalizeUsda(f));
const off = fx("off.json").products.map((p: OffProduct) => normalizeOff(p));

test("USDA normalization: basic ingredient", () => {
  const c = usda[0];
  assert.equal(c.id, "usda:171077");
  assert.equal(c.kcal, 165);
  assert.equal(c.quality, "complete");
  assert.equal(c.servings[0].grams, 172);
  assert.equal(c.nutrients.sodium, 74);
});
test("USDA branded: title-case, serving, barcode", () => {
  const y = usda[1];
  assert.equal(y.name, "Greek Yogurt");
  assert.equal(y.brand, "Fage Usa");
  assert.equal(y.servings[0].grams, 170);
  assert.match(y.servings[0].label, /3\/4 cup/);
});
test("USDA incomplete record is flagged", () => {
  assert.equal(usda[2].quality, "incomplete");
  assert.match(usda[2].qualityNote, /Missing protein, carbs, fat/);
});
test("OFF normalization converts sodium and kJ", () => {
  assert.equal(off[0].nutrients.sodium, 36);
  assert.equal(off[0].brand, "Fage");
  const n = off[1];
  assert.equal(n.kcal, 538);
  assert.equal(n.quality, "incomplete");
});
test("merge dedupes same barcode across sources, interleaves", () => {
  const m = mergeResults([[usda[0], usda[1]], [off[0], off[1]]]);
  assert.equal(m.filter(f => f.barcode === "0689544080064").length, 1);
  assert.equal(m.length, 3);
});
test("serving change recalculates macros", () => {
  const y = usda[1];
  const one = scale(y, toBase({ amount: 1, unit: "serving", base: "g", serving: { grams: y.servings[0].grams } }).value);
  const two = scale(y, toBase({ amount: 2, unit: "serving", base: "g", serving: { grams: y.servings[0].grams } }).value);
  assert.equal(one.protein, 17.5);
  assert.equal(two.protein, 35);
  assert.equal(two.kcal, 201);
});
test("search: caches, partial failure notice, total failure throws", async () => {
  let basicCalls = 0;
  adapters.searchUsdaBasic = async () => { basicCalls++; return { foods: [usda[0]], total: 1 }; };
  adapters.searchUsda = async () => ({ foods: [], total: 0 });
  adapters.searchOff = async () => ({ foods: [{ ...off[1], id: "off:x", name: "Chicken breast strips" }], total: 1 });
  const a = await searchFoods("Chicken  Breast", "all", 1);
  assert.equal(a.foods.length, 1); // generic ingredients only by default
  assert.equal(a.cached, false);
  const b = await searchFoods("chicken breast", "all", 1);
  assert.equal(b.cached, true);
  assert.equal(basicCalls, 1);
  assert.equal((await searchFoods("chicken breast", "all", 1, 20, true)).foods.length, 2); // packaged on request

  adapters.searchOff = async () => { throw new Error("down"); };
  const c = await searchFoods("chicken roasted", "all", 1, 20, true);
  assert.equal(c.foods.length, 1);
  assert.equal(c.notices.length, 1);
  assert.equal((await searchFoods("chicken roasted", "all", 1, 20, true)).cached, false); // partial results not cached

  adapters.searchUsdaBasic = async () => { throw new Error("down"); };
  adapters.searchUsda = async () => { throw new Error("down"); };
  await assert.rejects(searchFoods("beans", "all", 1));
});
test("barcode lookup serves from catalog after first fetch", async () => {
  await upsertFoods([usda[1]]);
  const r = await lookupBarcode("0689544080064");
  assert.ok(r.food); // found in catalog via earlier upserts
});

import { importRestaurantCsv, parseCsv } from "../lib/food/restaurant";
const META = { restaurant: "Test Diner", sourceUrl: "https://example.com/nutrition", publishedAt: "2026-01-15" };
test("restaurant CSV import: parsing, per-100 math, flags, source kept", () => {
  const csv = 'item,calories,protein,carbs,fat,serving_g,category\r\n"Burger, double",600,35,40,32,250,Burgers\r\nFries,300,4,40,14,\r\nBroken,abc,1,1,1,\r\nBurger  double,1,1,1,1,\r\n"Burger, double",1,1,1,1,\r\n';
  const { foods, skipped } = importRestaurantCsv(csv, META);
  assert.equal(foods.length, 2); // burger, fries; the other two burger rows slug to the same item
  const b = foods.find(f => f.name === "Burger, double")!;
  assert.equal(b.protein, 14);
  assert.equal(scale(b, b.servings[0].grams).protein, 35);
  assert.equal(b.sourceUrl, META.sourceUrl);
  assert.match(b.qualityNote!, /Published 2026-01-15/);
  const fries = foods.find(f => f.name === "Fries")!;
  assert.equal(fries.quality, "estimated");
  assert.ok(skipped.some(s => /Broken/.test(s)));
  assert.ok(skipped.some(s => /duplicate/.test(s)));
});
test("restaurant import rejects missing source or columns", () => {
  assert.throws(() => importRestaurantCsv("item,calories\nx,1", META));
  assert.throws(() => importRestaurantCsv("item,calories,protein,carbs,fat\nx,1,1,1,1", { ...META, sourceUrl: "http://x" }));
  assert.equal(parseCsv('a,"b ""q"" c"\n1,2').length, 2);
});
test("restaurant tab finds imported items by name or chain", async () => {
  const { foods } = importRestaurantCsv("item,calories,protein,carbs,fat\nChicken Sandwich,440,28,40,19", META);
  await upsertFoods(foods);
  adapters.searchUsdaBasic = async () => ({ foods: [], total: 0 });
  adapters.searchUsda = async () => ({ foods: [], total: 0 });
  adapters.searchOff = async () => ({ foods: [], total: 0 });
  const r = await searchFoods("test diner sandwich", "restaurant", 1);
  assert.equal(r.foods.length, 1);
  assert.equal((await searchFoods("chicken", "restaurant", 1)).foods.length, 1);
  assert.equal((await searchFoods("pizza", "restaurant", 1)).foods.length, 0);
});

import { cookInfo, ownStateGrams } from "../lib/food/yield";
import { matchesQuery, dupKeys } from "../lib/food/model";
import { cleanLabel } from "../lib/food/usda";
const mk = (name: string, source: "usda" | "off" = "usda") => ({ name, source, category: null, nutrients: {} });
test("cookInfo detects state and skips prepared foods", () => {
  assert.equal(cookInfo(mk("Rice, white, long-grain, cooked"))!.state, "cooked");
  assert.equal(cookInfo(mk("Rice, white, long-grain, raw"))!.state, "raw");
  assert.equal(cookInfo(mk("Organic Jasmine Rice"))!.state, "raw");
  assert.equal(cookInfo(mk("Beef, ground, 93% lean meat / 7% fat, raw"))!.state, "raw");
  assert.equal(cookInfo(mk("Chicken, broilers or fryers, breast, meat only, cooked, roasted"))!.state, "cooked");
  assert.equal(cookInfo(mk("Chicken breast tenders, breaded, uncooked")), null);
  assert.equal(cookInfo(mk("Chicken Breast")), null); // state unknown for meat
  assert.equal(cookInfo(mk("Chicken fried rice, cooked")), null);
});
test("raw/cooked weight conversion", () => {
  const rice = cookInfo(mk("Rice, white, raw"))!;
  assert.equal(ownStateGrams(100, "raw", rice).grams, 100);
  assert.ok(Math.abs(ownStateGrams(280, "cooked", rice).grams - 100) < 1e-9); // 280 g cooked = 100 g dry
  const chicken = cookInfo(mk("Chicken breast, cooked, roasted"))!;
  assert.equal(ownStateGrams(100, "raw", chicken).grams, 75); // 100 g raw = 75 g cooked
});
test("query relevance filters unrelated words and handles plurals", () => {
  assert.ok(!matchesQuery({ name: "Chick Peas", brand: "Goya", category: null }, "chick fil a"));
  assert.ok(matchesQuery({ name: "Chicken Sandwich", brand: "Chick-fil-A", category: null }, "chick fil a"));
  assert.ok(matchesQuery({ name: "Egg, whole, raw", brand: null, category: null }, "eggs"));
  assert.ok(matchesQuery({ name: "Beef, ground, 93% lean meat / 7% fat, raw", brand: null, category: null }, "93/7 ground beef"));
});
test("repeats across brands with same macros collapse", () => {
  const base = { source: "usda" as const, barcode: null, name: "Chick Peas", kcal: 120, protein: 7, carbs: 20, fat: 2 };
  const a = { ...base, brand: "A" }, b = { ...base, brand: "B" };
  assert.equal(mergeResults([[a, b] as never[]]).length, 1);
  assert.ok(dupKeys(a).some(k => dupKeys(b).includes(k)));
});
test("USDA labels are cleaned", () => {
  assert.equal(cleanLabel("2 ONZ"), "2 oz");
  assert.equal(cleanLabel("1 CHICKEN BREAST"), "1 chicken breast");
  assert.equal(cleanLabel("3/4 cup"), "3/4 cup");
});

test("OFF records with impossible per-100 values are dropped and values are rounded", () => {
  assert.equal(normalizeOff({ code: "1", product_name: "Pack", nutriments: { "energy-kcal_100g": 3166, proteins_100g: 333, carbohydrates_100g: 133, fat_100g: 141 } }), null);
  assert.equal(normalizeOff({ code: "2", product_name: "Sauce", nutriments: { "energy-kcal_100g": 33.82663847, proteins_100g: 0, carbohydrates_100g: 1.4799154, fat_100g: 2.9598 } })!.kcal, 33.8);
});

import { chainsIn, isChainFood } from "../lib/food/chains";
test("chain detection needs the whole name", () => {
  assert.ok(chainsIn("chick fil a").length);
  assert.ok(chainsIn("chickfila").length);
  assert.ok(chainsIn("mcdonald's fries").length);
  assert.equal(chainsIn("chick").length, 0);
  assert.equal(chainsIn("chick fil").length, 0);
  assert.equal(chainsIn("cavatappi pasta").length, 0); // "cava" must not match inside a word
  assert.ok(isChainFood({ name: "CHICK-FIL-A, chicken sandwich", brand: null, category: "Fast Foods" }));
  assert.ok(isChainFood({ name: "Fries", brand: "McDonald's", category: null }));
  assert.ok(!isChainFood({ name: "Potatoes, russet, raw", brand: null, category: "Vegetables" }));
});
test("search shows generic ingredients; chains and packaged items stay out unless asked", async () => {
  const whole = { ...usda[0], id: "usda:w", name: "Chicken, breast, roasted", brand: null, category: "Poultry Products" };
  const chainItem = { ...usda[1], id: "usda:c", name: "CHICK-FIL-A, chicken sandwich", brand: null, category: "Fast Foods", barcode: null, kcal: 249, protein: 16, carbs: 21, fat: 11 };
  const branded = { ...usda[1], id: "usda:b", name: "Chicken breast strips", brand: "Tyson", barcode: null, kcal: 150, protein: 20, carbs: 5, fat: 5 };
  const offChain = { ...off[1], id: "off:cfa", name: "Chicken sandwich", brand: "Chick-fil-A", kcal: 300, protein: 20, carbs: 30, fat: 10 };
  adapters.searchUsdaBasic = async () => ({ foods: [chainItem, whole], total: 2 });
  adapters.searchUsda = async () => ({ foods: [branded], total: 1 });
  adapters.searchOff = async () => ({ foods: [offChain], total: 1 });
  const ids = (r: { foods: { id: string }[] }) => r.foods.map(f => f.id);
  assert.deepEqual(ids(await searchFoods("chicken", "all", 1)), ["usda:w"]);
  assert.deepEqual(ids(await searchFoods("chicken", "all", 1, 20, true)), ["usda:w", "usda:b"]);
  assert.equal((await searchFoods("chick fil a chicken", "all", 1)).foods.length, 0);
  const tab = new Set(ids(await searchFoods("chick fil a chicken", "restaurant", 1)));
  assert.ok(tab.has("usda:c") && tab.has("off:cfa"));
  const tabPlain = new Set(ids(await searchFoods("chicken", "restaurant", 1)));
  assert.ok(!tabPlain.has("usda:w") && !tabPlain.has("usda:b"));
});
test("no generic match falls back to packaged products", async () => {
  const bar = { ...usda[1], id: "usda:bar", name: "Peanut Butter Bar", brand: "Kind", barcode: null };
  adapters.searchUsdaBasic = async () => ({ foods: [], total: 0 });
  adapters.searchUsda = async () => ({ foods: [bar], total: 1 });
  adapters.searchOff = async () => ({ foods: [], total: 0 });
  assert.deepEqual((await searchFoods("peanut butter bar", "all", 1)).foods.map(f => f.id), ["usda:bar"]);
});
test("imported restaurant items only appear in the Restaurants tab", async () => {
  const { foods } = importRestaurantCsv("item,calories,protein,carbs,fat\nSpecial Wrap,500,30,50,20", { ...META, restaurant: "Zeta Grill" });
  await upsertFoods(foods);
  adapters.searchUsdaBasic = async () => ({ foods: [], total: 0 });
  adapters.searchUsda = async () => ({ foods: [], total: 0 });
  adapters.searchOff = async () => ({ foods: [], total: 0 });
  assert.equal((await searchFoods("special wrap", "all", 1)).foods.length, 0);
  assert.equal((await searchFoods("zeta grill special wrap", "all", 1)).foods.length, 0);
  assert.equal((await searchFoods("special wrap", "restaurant", 1)).foods.length, 1);
});

import { generalize, isPrepared } from "../lib/food/generic";
import type { Food } from "../lib/food/model";
const sr = (name: string, kcal: number, extra: Partial<Food> = {}): Food => ({ ...usda[0], id: "usda:" + name, name, brand: null, kcal, protein: 1, carbs: 3, fat: 0.2, servings: [], nutrients: {}, ...extra });
test("generalize: lettuce variants become one entry, medleys dropped", () => {
  const list = [
    sr("Lettuce, cos or romaine, raw", 17), sr("Lettuce, butterhead (includes boston and bibb types), raw", 13),
    sr("Lettuce, iceberg (includes crisphead types), raw", 14), sr("Lettuce, green leaf, raw", 15),
    sr("Butter Lettuce & Red Leaf Lettuce Blend, Butter Lettuce", 15), sr("Romaine Lettuce, Green & Red Leaf Lettuce Medley", 15),
    sr("Lettuce, raw, shredded kit", 15),
  ];
  const g = generalize(list, "lettuce");
  assert.equal(g.length, 1);
  assert.equal(g[0].name, "Lettuce, raw");
  assert.equal(g[0].kcal, 14.75);
  assert.match(g[0].qualityNote!, /Average of 4/);
});
test("generalize: keeps meaningful subtypes and states apart", () => {
  const list = [
    sr("Chicken, broilers or fryers, breast, meat only, raw", 120), sr("Chicken, roasting, breast, meat only, raw", 110),
    sr("Chicken, broilers or fryers, breast, meat only, cooked, roasted", 165), sr("Chicken, broilers or fryers, thigh, meat only, raw", 121),
  ];
  const g = generalize(list, "chicken breast");
  const names = g.map(f => f.name);
  assert.ok(names.includes("Chicken, breast, raw"));
  assert.ok(names.some(n => /roasted|cooked/.test(n)));
  assert.ok(!names.some(n => /thigh/.test(n)));
});
test("isPrepared respects what was typed", () => {
  assert.ok(isPrepared("Lettuce Medley", "lettuce"));
  assert.ok(!isPrepared("Lettuce Medley", "lettuce medley"));
  assert.ok(isPrepared("Chicken breast tenders, breaded", "chicken breast"));
});
