// Food catalog tables (Neon). Created lazily, one statement per query (Neon HTTP driver limit).
import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
export const foodSql = DB_URL ? neon(DB_URL) : null;

const g = globalThis as unknown as { __lbFoodReady?: Promise<void> };

export function foodReady(): Promise<void> {
  const sql = foodSql;
  if (!sql) return Promise.resolve();
  return (g.__lbFoodReady ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS lb_food_items (
      id text PRIMARY KEY, source text NOT NULL, source_id text NOT NULL, dedupe_key text NOT NULL,
      name text NOT NULL, brand text, category text, barcode text, base text NOT NULL DEFAULT 'g',
      kcal real NOT NULL, protein real NOT NULL, carbs real NOT NULL, fat real NOT NULL,
      nutrients jsonb NOT NULL DEFAULT '{}', servings jsonb NOT NULL DEFAULT '[]',
      quality text NOT NULL DEFAULT 'complete', quality_note text, source_url text,
      owner text, updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (source, source_id))`;
    await sql`CREATE INDEX IF NOT EXISTS lb_food_dedupe ON lb_food_items (dedupe_key)`;
    await sql`CREATE INDEX IF NOT EXISTS lb_food_barcode ON lb_food_items (barcode)`;
    await sql`CREATE TABLE IF NOT EXISTS lb_food_cache (
      cache_key text PRIMARY KEY, ids jsonb NOT NULL, total int NOT NULL DEFAULT 0,
      fetched_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS lb_food_favorites (
      user_id text NOT NULL, food_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, food_id))`;
    await sql`CREATE TABLE IF NOT EXISTS lb_food_recents (
      user_id text NOT NULL, food_id text NOT NULL, last_used timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, food_id))`;
    await sql`CREATE TABLE IF NOT EXISTS lb_meals (
      id text PRIMARY KEY, user_id text NOT NULL, name text NOT NULL,
      items jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS lb_restaurants (
      id text PRIMARY KEY, name text NOT NULL, source_url text NOT NULL, published_at date)`;
  })().catch(e => { g.__lbFoodReady = undefined; throw e; }));
}
