import test from "node:test";
import assert from "node:assert/strict";
import { buildUserFood, cleanMealItems, createUserFood, listUserFoods, deleteUserFood, setFavorite, listFavorites, touchRecent, listRecents, saveMeal, listMeals, deleteMeal } from "../lib/food/user";
import { scale } from "../lib/food/units";

test("user food converts per-serving values to per-100", () => {
  const f = buildUserFood("u1", { name: "Protein shake", servingGrams: 250, servingLabel: "1 bottle", kcal: 160, protein: 30, carbs: 5, fat: 2.5, base: "ml" });
  assert.equal(f.base, "ml");
  assert.equal(f.protein, 12);
  assert.equal(scale(f, f.servings[0].grams).protein, 30);
  assert.equal(f.servings[0].label, "1 bottle (250 ml)");
  assert.equal(f.quality, "complete");
});
test("user food derives kcal and flags mismatch", () => {
  assert.equal(buildUserFood("u1", { name: "x", protein: 10, carbs: 10, fat: 10 }).kcal, 170);
  assert.equal(buildUserFood("u1", { name: "x", protein: 10, carbs: 10, fat: 10, kcal: 900 }).quality, "estimated");
});
test("user food rejects bad input", () => {
  assert.throws(() => buildUserFood("u1", { name: "", protein: 1, carbs: 1, fat: 1 }));
  assert.throws(() => buildUserFood("u1", { name: "x", protein: -1, carbs: 1, fat: 1 }));
  assert.throws(() => buildUserFood("u1", { name: "x", protein: "abc", carbs: 1, fat: 1 }));
});
test("user foods are owner-scoped", async () => {
  const f = await createUserFood("alice", { name: "Mine", protein: 1, carbs: 1, fat: 1 });
  assert.equal((await listUserFoods("alice")).length, 1);
  assert.equal((await listUserFoods("bob")).length, 0);
  await deleteUserFood("bob", f.id);
  assert.equal((await listUserFoods("alice")).length, 1);
  await deleteUserFood("alice", f.id);
  assert.equal((await listUserFoods("alice")).length, 0);
});
test("favorites and recents are per user and recents are capped", async () => {
  const f = await createUserFood("carol", { name: "Fav", protein: 1, carbs: 1, fat: 1 });
  await setFavorite("carol", f.id, true);
  assert.equal((await listFavorites("carol")).length, 1);
  assert.equal((await listFavorites("dave")).length, 0);
  await setFavorite("carol", f.id, false);
  assert.equal((await listFavorites("carol")).length, 0);
  await touchRecent("carol", f.id);
  assert.equal((await listRecents("carol")).length, 1);
  for (let i = 0; i < 35; i++) await touchRecent("erin", `user:erin:${i}`);
  // ids are not in the catalog so the listing is empty, but the cap must not throw
  assert.equal((await listRecents("erin")).length, 0);
});
test("meals validate and are owner-scoped", async () => {
  assert.throws(() => cleanMealItems([]));
  assert.throws(() => cleanMealItems([{ foodId: "a", grams: -1, kcal: 1, p: 1, c: 1, f: 1 }]));
  const m = await saveMeal("frank", "Chicken rice", [{ foodId: "usda:1", name: "Chicken", label: "150 g", grams: 150, kcal: 250, p: 46, c: 0, f: 5 }]);
  assert.equal((await listMeals("frank")).length, 1);
  assert.equal((await listMeals("gina")).length, 0);
  await deleteMeal("gina", m.id);
  assert.equal((await listMeals("frank")).length, 1);
  await deleteMeal("frank", m.id);
  assert.equal((await listMeals("frank")).length, 0);
  await assert.rejects(saveMeal("frank", " ", [{ foodId: "a", grams: 1, kcal: 1, p: 1, c: 1, f: 1 }]));
});
