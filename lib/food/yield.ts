// Raw/dry vs cooked weight for simple ingredients.
// Cooked weight / raw weight, typical values (water absorbed by grains, water lost by meat). Always shown as estimated.

import type { Food } from "./model";

export type CookState = "raw" | "cooked";

const YIELDS: { re: RegExp; y: number; dry?: boolean }[] = [
  { re: /\b(rice)\b/, y: 2.8, dry: true },
  { re: /\b(pasta|spaghetti|macaroni|penne|noodles?|fusilli|linguine)\b/, y: 2.2, dry: true },
  { re: /\b(quinoa|couscous)\b/, y: 2.9, dry: true },
  { re: /\b(oats|oatmeal)\b/, y: 2.5, dry: true },
  { re: /\b(lentils?)\b/, y: 2.4, dry: true },
  { re: /\b(ground (beef|turkey|pork|chicken)|beef, ground|mince)\b/, y: 0.75 },
  { re: /\b(chicken|turkey)\b/, y: 0.75 },
  { re: /\b(beef|steak|pork|lamb|sirloin|ribeye)\b/, y: 0.72 },
  { re: /\b(salmon|tilapia|cod|fish|shrimp)\b/, y: 0.8 },
];

const COOKED = /\b(cooked|roasted|boiled|grilled|baked|broiled|steamed|pan[- ]?(fried|browned)|braised|stewed|simmered)\b/;
const RAW = /\b(raw|uncooked|dry|dried)\b/;

export interface Cook { state: CookState; yield: number }

/** Returns the food's own state and cooked/raw yield, or null when the food is not a simple ingredient we can convert. */
export function cookInfo(f: Pick<Food, "name" | "source" | "category" | "nutrients">): Cook | null {
  if (f.source !== "usda" && f.source !== "off") return null;
  const n = f.name.toLowerCase();
  if (/(soup|sauce|salad|sandwich|burrito|bowl|pizza|nugget|tender|breaded|fried rice|casserole|bar\b|cereal|chips?|cracker|snack|dinner|meal|stuffed|seasoned|flavored|microwave)/.test(n)) return null;
  const hit = YIELDS.find(y => y.re.test(n));
  if (!hit) return null;
  if (COOKED.test(n)) return { state: "cooked", yield: hit.y };
  if (RAW.test(n)) return { state: "raw", yield: hit.y };
  // No state in the name: packaged grains and pasta are dry; meat is ambiguous, so skip it.
  return hit.dry ? { state: "raw", yield: hit.y } : null;
}

/**
 * Nutrient basis for a quantity weighed in `weighed` state.
 * Returns the grams of the food's own state that the nutrients should be scaled from.
 */
export function ownStateGrams(grams: number, weighed: CookState, c: Cook): { grams: number; converted: boolean } {
  if (weighed === c.state) return { grams, converted: false };
  // food is raw, weighed cooked: cooked g / yield = raw g.  food is cooked, weighed raw: raw g * yield = cooked g.
  return { grams: c.state === "raw" ? grams / c.yield : grams * c.yield, converted: true };
}
