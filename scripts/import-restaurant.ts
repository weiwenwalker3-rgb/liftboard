// Usage: DATABASE_URL=... npx tsx scripts/import-restaurant.ts --restaurant "Name" --url https://... --published 2026-01-31 menu.csv
// Imports a restaurant's own published nutrition table. Re-running updates the same items (no duplicates).
import { readFileSync } from "node:fs";
import { importRestaurantCsv } from "../lib/food/restaurant";
import { upsertFoods } from "../lib/food/catalog";

const a = process.argv.slice(2);
const opt = (k: string) => { const i = a.indexOf("--" + k); return i >= 0 ? a[i + 1] : ""; };
const file = a.filter((x, i) => !x.startsWith("--") && !a[i - 1]?.startsWith("--"))[0];
if (!file || !opt("restaurant") || !opt("url") || !opt("published")) {
  console.error("Usage: import-restaurant.ts --restaurant NAME --url HTTPS_URL --published YYYY-MM-DD file.csv");
  process.exit(1);
}
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) { console.error("Set DATABASE_URL first."); process.exit(1); }
const { foods, skipped } = importRestaurantCsv(readFileSync(file, "utf8"), { restaurant: opt("restaurant"), sourceUrl: opt("url"), publishedAt: opt("published") });
await upsertFoods(foods);
console.log(`Imported ${foods.length} items from ${opt("restaurant")}.`);
skipped.forEach(s => console.warn("skipped", s));
