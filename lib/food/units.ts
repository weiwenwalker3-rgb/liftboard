// Unit conversion and nutrient scaling. Pure functions, no I/O.

export type Unit = "g" | "oz" | "lb" | "kg" | "ml" | "floz" | "cup" | "tbsp" | "tsp" | "serving";

// Weight units to grams; volume units to millilitres.
const WEIGHT: Record<string, number> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };
const VOLUME: Record<string, number> = { ml: 1, floz: 29.5735, cup: 236.588, tbsp: 14.7868, tsp: 4.92892 };

export const isWeight = (u: string) => u in WEIGHT;
export const isVolume = (u: string) => u in VOLUME;

export interface Conv {
  amount: number;
  unit: Unit;
  base: "g" | "ml";
  serving?: { grams: number }; // used for unit "serving"
  density?: number; // g per ml, when known; allows weight<->volume
}

export interface Grams {
  value: number; // amount in the food's base unit (g or ml)
  estimated: boolean; // true when a weight/volume crossing used the water-density guess
}

// Convert a user quantity to the food's base unit (g for solids, ml for liquids).
export function toBase(c: Conv): Grams {
  const { amount, unit, base } = c;
  if (!(amount >= 0) || !isFinite(amount)) throw new Error("amount must be a non-negative number");
  if (unit === "serving") {
    if (!c.serving) throw new Error("no serving size for this food");
    return { value: amount * c.serving.grams, estimated: false };
  }
  if (base === "g") {
    if (isWeight(unit)) return { value: amount * WEIGHT[unit], estimated: false };
    if (isVolume(unit)) return { value: amount * VOLUME[unit] * (c.density ?? 1), estimated: c.density == null };
  } else {
    if (isVolume(unit)) return { value: amount * VOLUME[unit], estimated: false };
    if (isWeight(unit)) return { value: (amount * WEIGHT[unit]) / (c.density ?? 1), estimated: c.density == null };
  }
  throw new Error("unknown unit: " + unit);
}

export interface Per100 { kcal: number; protein: number; carbs: number; fat: number; nutrients?: Record<string, number> }
export interface Scaled { kcal: number; protein: number; carbs: number; fat: number; nutrients: Record<string, number> }

const r1 = (n: number) => Math.round(n * 10) / 10;

export function scale(per100: Per100, baseAmount: number): Scaled {
  const k = baseAmount / 100;
  const nutrients: Record<string, number> = {};
  for (const [key, v] of Object.entries(per100.nutrients || {})) nutrients[key] = r1(v * k);
  return { kcal: Math.round(per100.kcal * k), protein: r1(per100.protein * k), carbs: r1(per100.carbs * k), fat: r1(per100.fat * k), nutrients };
}

// Atwater check: calories implied by macros vs stated calories. Used to flag suspect data.
export function macroKcal(p: number, c: number, f: number) { return p * 4 + c * 4 + f * 9; }
export function kcalConsistent(per100: Per100, tol = 0.25): boolean {
  const implied = macroKcal(per100.protein, per100.carbs, per100.fat);
  if (per100.kcal <= 0 && implied <= 5) return true;
  return Math.abs(implied - per100.kcal) <= Math.max(15, per100.kcal * tol);
}
