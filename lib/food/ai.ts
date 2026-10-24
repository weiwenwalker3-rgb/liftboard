// ChatGPT-style macro answers: Claude Haiku estimates one food's macros for a typed query.
// Every answer (including "not a food") is cached in Neon, so each query costs one model call ever.
import Anthropic from "@anthropic-ai/sdk";
import { type Food, foodId } from "./model";
import { foodReady, foodSql } from "./db";
import { getFood, upsertFoods } from "./catalog";

export const AI_MODEL = "claude-haiku-5-5";
const DAILY_LIMIT = Math.max(0, parseInt(process.env.AI_FOOD_DAILY_LIMIT || "300", 10) || 0);

/** What the model returns. Macros are for one serving. */
export interface AiAnswer {
  is_food: boolean;
  name: string;
  brand: string;
  liquid: boolean;
  serving_label: string;
  serving_grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  note: string;
}

const SCHEMA = {
  type: "object",
  properties: {
    is_food: { type: "boolean" },
    name: { type: "string" },
    brand: { type: "string" },
    liquid: { type: "boolean" },
    serving_label: { type: "string" },
    serving_grams: { type: "number" },
    kcal: { type: "number" },
    protein: { type: "number" },
    carbs: { type: "number" },
    fat: { type: "number" },
    fiber: { type: "number" },
    sugar: { type: "number" },
    note: { type: "string" },
  },
  required: ["is_food", "name", "brand", "liquid", "serving_label", "serving_grams", "kcal", "protein", "carbs", "fat", "fiber", "sugar", "note"],
  additionalProperties: false,
};

const SYSTEM = `You give nutrition facts for one food, like a knowledgeable nutrition assistant would in chat.
The user typed a search into a macro-tracking app. Answer with typical values for the most likely food they mean.

Rules:
- name: short, clean, generic name in plain words, e.g. "White rice, cooked", "Chicken breast, cooked", "Banana", "Whole milk". For a branded or restaurant item use its common product name, e.g. "Rice Krispies Treat, M&M's Mega", and put the brand in brand (else "").
- Default to the form people usually eat and weigh: grains, pasta and legumes cooked; meat and fish cooked (skinless, boneless unless stated); fruit and vegetables raw. Say the state in the name when it matters (cooked, raw, dry).
- serving_label: one common serving, e.g. "1 cup cooked (158 g)", "1 medium (118 g)", "1 bar (38 g)", "1 cup (244 ml)". serving_grams is its weight in grams (ml for liquids, and set liquid true).
- kcal, protein, carbs, fat, fiber, sugar are for that one serving, in grams (kcal for energy), rounded to 1 decimal. Use typical USDA-style or label values. kcal should be close to 4*protein + 4*carbs + 9*fat.
- note: one short tip only when it helps tracking, e.g. "Track rice as dry or cooked weight to match how you weigh it." or "Values vary by brand; check the label." Otherwise "".
- If the text is not a food or drink, is gibberish, or is too incomplete to guess (like "chi" or "whi"), set is_food false and leave the other fields empty or 0.`;

/** Normalized cache key: lowercase words only, so "White Rice!" and "white  rice" share one answer. */
export const aiKey = (q: string) => q.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9%]+/g, " ").trim().slice(0, 80);

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const r1 = (n: number) => Math.round(n * 10) / 10;
const num = (n: unknown) => (typeof n === "number" && isFinite(n) && n > 0 ? n : 0);

/** Turn a model answer into the shared per-100 food model. Returns null when unusable. */
export function answerToFood(a: AiAnswer): Food | null {
  const grams = num(a.serving_grams);
  const name = (a.name || "").trim().slice(0, 100);
  if (!a.is_food || !name || !grams || grams > 5000) return null;
  const per = (v: unknown) => r1((num(v) / grams) * 100);
  const protein = per(a.protein), carbs = per(a.carbs), fat = per(a.fat);
  const kcal = per(a.kcal) || Math.round(protein * 4 + carbs * 4 + fat * 9);
  if (kcal > 950 || protein + carbs + fat > 105) return null; // impossible per 100 g
  const brand = (a.brand || "").trim().slice(0, 60) || null;
  const nutrients: Record<string, number> = {};
  if (num(a.fiber)) nutrients.fiber = per(a.fiber);
  if (num(a.sugar)) nutrients.sugar = per(a.sugar);
  const sid = slug(`${brand || ""} ${name}`);
  return {
    id: foodId("ai", sid), source: "ai", sourceId: sid, name, brand, category: null, barcode: null,
    base: a.liquid ? "ml" : "g", kcal, protein, carbs, fat, nutrients,
    servings: [{ label: (a.serving_label || "").trim().slice(0, 60) || `${Math.round(grams)} ${a.liquid ? "ml" : "g"}`, grams: r1(grams), isDefault: true }],
    quality: "estimated", qualityNote: (a.note || "").trim().slice(0, 200) || null, sourceUrl: null,
    updatedAt: new Date().toISOString(),
  };
}

type Ask = (q: string) => Promise<AiAnswer | null>;

async function askClaude(q: string): Promise<AiAnswer | null> {
  const client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
  const res = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 400,
    thinking: { type: "disabled" },
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: q }],
  });
  if (res.stop_reason !== "end_turn") return null;
  const text = res.content.find(b => b.type === "text");
  if (!text || text.type !== "text") return null;
  try { return JSON.parse(text.text) as AiAnswer; } catch { return null; }
}

/** Swappable for tests. */
export const aiAdapters: { ask: Ask; enabled: () => boolean } = {
  ask: askClaude,
  enabled: () => !!process.env.ANTHROPIC_API_KEY,
};

// Cache: query key -> food id (null = "not a food"). Memory fallback when there is no database.
const g = globalThis as unknown as { __lbAiMem?: { answers: Map<string, string | null>; day: string; calls: number }; __lbAiReady?: Promise<void> };
const mem = (g.__lbAiMem ??= { answers: new Map(), day: "", calls: 0 });

function aiReady(): Promise<void> {
  const sql = foodSql;
  if (!sql) return Promise.resolve();
  return (g.__lbAiReady ??= (async () => {
    await foodReady();
    await sql`CREATE TABLE IF NOT EXISTS lb_food_ai (
      query_key text PRIMARY KEY, food_id text, model text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS lb_food_ai_usage (day date PRIMARY KEY, calls int NOT NULL DEFAULT 0)`;
  })().catch(e => { g.__lbAiReady = undefined; throw e; }));
}

async function cached(key: string): Promise<{ hit: boolean; id: string | null }> {
  if (!foodSql) return mem.answers.has(key) ? { hit: true, id: mem.answers.get(key) ?? null } : { hit: false, id: null };
  const rows = (await foodSql`SELECT food_id FROM lb_food_ai WHERE query_key = ${key}`) as { food_id: string | null }[];
  return rows[0] ? { hit: true, id: rows[0].food_id } : { hit: false, id: null };
}

async function remember(key: string, id: string | null) {
  if (!foodSql) { mem.answers.set(key, id); return; }
  await foodSql`INSERT INTO lb_food_ai (query_key, food_id, model) VALUES (${key}, ${id}, ${AI_MODEL})
    ON CONFLICT (query_key) DO UPDATE SET food_id = EXCLUDED.food_id, model = EXCLUDED.model, created_at = now()`;
}

/** Counts one model call against today's cap. False when the cap is reached. */
async function takeCall(): Promise<boolean> {
  if (!DAILY_LIMIT) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (!foodSql) {
    if (mem.day !== today) { mem.day = today; mem.calls = 0; }
    return ++mem.calls <= DAILY_LIMIT;
  }
  const rows = (await foodSql`INSERT INTO lb_food_ai_usage (day, calls) VALUES (${today}, 1)
    ON CONFLICT (day) DO UPDATE SET calls = lb_food_ai_usage.calls + 1 RETURNING calls`) as { calls: number }[];
  return (rows[0]?.calls ?? 0) <= DAILY_LIMIT;
}

export interface AiResult { food: Food | null; cached: boolean; notice?: string }

/** One AI answer for a search. Cached forever per normalized query. */
export async function aiLookup(q: string): Promise<AiResult> {
  const key = aiKey(q);
  if (key.replace(/[^a-z]/g, "").length < 3) return { food: null, cached: false };
  await aiReady();
  const c = await cached(key);
  if (c.hit) return { food: c.id ? await getFood(c.id) : null, cached: true };
  if (!aiAdapters.enabled()) return { food: null, cached: false };
  if (!(await takeCall())) return { food: null, cached: false, notice: "Quick answers are paused for today. Database results are below." };
  const ans = await aiAdapters.ask(key);
  const food = ans ? answerToFood(ans) : null;
  if (food) await upsertFoods([food]);
  // A failed call (null answer from refusal/parse error) is cached as "no answer" too, so it is not retried on every keystroke.
  await remember(key, food ? food.id : null);
  return { food, cached: false };
}

export function resetAiMem() { mem.answers.clear(); mem.calls = 0; mem.day = ""; }
