import test from "node:test";
import assert from "node:assert/strict";
import { aiKey, answerToFood, aiLookup, aiAdapters, resetAiMem, type AiAnswer } from "../lib/food/ai";
import { cookInfo } from "../lib/food/yield";

const rice: AiAnswer = {
  is_food: true, name: "White rice, cooked", brand: "", liquid: false, serving_label: "1 cup cooked (158 g)", serving_grams: 158,
  kcal: 205, protein: 4.3, carbs: 44.5, fat: 0.4, fiber: 0.6, sugar: 0.1, note: "Track rice as dry or cooked weight to match how you weigh it.",
};

test("aiKey normalizes case, punctuation and &", () => {
  assert.equal(aiKey("  White RICE!! "), "white rice");
  assert.equal(aiKey("Mega M&M rice crispy"), "mega m and m rice crispy");
});

test("answerToFood converts one serving to per-100 g", () => {
  const f = answerToFood(rice)!;
  assert.equal(f.id, "ai:white-rice-cooked");
  assert.equal(f.source, "ai");
  assert.equal(f.kcal, 129.7);
  assert.equal(f.carbs, 28.2);
  assert.equal(f.servings[0].grams, 158);
  assert.equal(f.quality, "estimated");
  assert.match(f.qualityNote!, /dry or cooked/);
  assert.deepEqual(cookInfo(f), { state: "cooked", yield: 2.8 });
});

test("answerToFood rejects non-food and impossible values", () => {
  assert.equal(answerToFood({ ...rice, is_food: false }), null);
  assert.equal(answerToFood({ ...rice, serving_grams: 0 }), null);
  assert.equal(answerToFood({ ...rice, serving_grams: 10, fat: 50 }), null);
});

test("aiLookup asks once per query, then serves the cache", async () => {
  resetAiMem();
  const asked: string[] = [];
  const prev = { ...aiAdapters };
  aiAdapters.enabled = () => true;
  aiAdapters.ask = async q => { asked.push(q); return q.includes("rice") ? rice : { ...rice, is_food: false }; };
  try {
    const a = await aiLookup("White rice");
    assert.equal(a.food?.name, "White rice, cooked");
    assert.equal(a.cached, false);
    const b = await aiLookup("white  rice!");
    assert.equal(b.cached, true);
    assert.equal(b.food?.id, "ai:white-rice-cooked");
    const c = await aiLookup("asdfgh");
    assert.equal(c.food, null);
    await aiLookup("asdfgh");
    assert.deepEqual(asked, ["white rice", "asdfgh"]);
    assert.equal((await aiLookup("ch")).food, null); // too short, no call
    assert.equal(asked.length, 2);
  } finally { Object.assign(aiAdapters, prev); }
});

test("aiLookup stays quiet without an API key", async () => {
  resetAiMem();
  const prev = { ...aiAdapters };
  aiAdapters.enabled = () => false;
  aiAdapters.ask = async () => { throw new Error("should not be called"); };
  try { assert.deepEqual(await aiLookup("banana"), { food: null, cached: false }); }
  finally { Object.assign(aiAdapters, prev); }
});
