import test from "node:test";
import assert from "node:assert/strict";
import { toBase, scale, kcalConsistent } from "../lib/food/units";
import { dedupeKey } from "../lib/food/model";

test("weight units convert to grams", () => {
  assert.equal(toBase({ amount: 2, unit: "kg", base: "g" }).value, 2000);
  assert.ok(Math.abs(toBase({ amount: 4, unit: "oz", base: "g" }).value - 113.398) < 0.01);
  assert.equal(toBase({ amount: 100, unit: "g", base: "g" }).estimated, false);
});
test("volume on a solid is flagged estimated unless density known", () => {
  const a = toBase({ amount: 1, unit: "cup", base: "g" });
  assert.ok(a.estimated);
  const b = toBase({ amount: 1, unit: "cup", base: "g", density: 0.5 });
  assert.equal(b.estimated, false);
  assert.ok(Math.abs(b.value - 118.294) < 0.01);
});
test("liquids use ml", () => {
  assert.ok(Math.abs(toBase({ amount: 1, unit: "floz", base: "ml" }).value - 29.5735) < 1e-6);
  assert.ok(toBase({ amount: 100, unit: "g", base: "ml" }).estimated);
});
test("serving unit uses serving grams", () => {
  assert.equal(toBase({ amount: 1.5, unit: "serving", base: "g", serving: { grams: 28 } }).value, 42);
  assert.throws(() => toBase({ amount: 1, unit: "serving", base: "g" }));
});
test("rejects bad amounts", () => {
  assert.throws(() => toBase({ amount: -1, unit: "g", base: "g" }));
  assert.throws(() => toBase({ amount: NaN, unit: "g", base: "g" }));
});
test("scale recalculates per 100", () => {
  const s = scale({ kcal: 200, protein: 10, carbs: 20, fat: 8, nutrients: { fiber: 4 } }, 150);
  assert.deepEqual(s, { kcal: 300, protein: 15, carbs: 30, fat: 12, nutrients: { fiber: 6 } });
  assert.equal(scale({ kcal: 200, protein: 10, carbs: 20, fat: 8 }, 0).kcal, 0);
});
test("kcal consistency flags bad data", () => {
  assert.ok(kcalConsistent({ kcal: 152, protein: 10, carbs: 20, fat: 3.5 }));
  assert.ok(!kcalConsistent({ kcal: 900, protein: 1, carbs: 1, fat: 1 }));
});
test("dedupe key prefers barcode and normalizes names", () => {
  assert.equal(dedupeKey({ barcode: "0012345", brand: null, name: "x", source: "off" }), "bc:12345");
  assert.equal(
    dedupeKey({ barcode: null, brand: "Kraft ", name: "Mac & Cheese!", source: "usda" }),
    dedupeKey({ barcode: null, brand: "kraft", name: "mac cheese", source: "off" })
  );
});
