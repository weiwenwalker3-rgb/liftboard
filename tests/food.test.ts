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
  let usdaCalls = 0;
  adapters.searchUsda = async () => { usdaCalls++; return { foods: [usda[0]], total: 1 }; };
  adapters.searchOff = async () => ({ foods: [off[1]], total: 1 });
  const a = await searchFoods("Chicken  Breast", "all", 1);
  assert.equal(a.foods.length, 2);
  assert.equal(a.cached, false);
  const b = await searchFoods("chicken breast", "all", 1);
  assert.equal(b.cached, true);
  assert.equal(usdaCalls, 1);

  adapters.searchOff = async () => { throw new Error("down"); };
  const c = await searchFoods("rice", "all", 1);
  assert.equal(c.foods.length, 1);
  assert.equal(c.notices.length, 1);
  assert.equal((await searchFoods("rice", "all", 1)).cached, false); // partial results not cached

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
test("restaurant items are found by name or chain and not hit upstream when source=restaurant", async () => {
  const { foods } = importRestaurantCsv("item,calories,protein,carbs,fat\nChicken Sandwich,440,28,40,19", META);
  await upsertFoods(foods);
  const r = await searchFoods("test diner sandwich", "restaurant", 1);
  assert.equal(r.foods.length, 1);
  assert.equal((await searchFoods("chicken", "restaurant", 1)).foods.length, 1);
  assert.equal((await searchFoods("pizza", "restaurant", 1)).foods.length, 0);
});
