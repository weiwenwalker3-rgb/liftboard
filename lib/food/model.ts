// Normalized food model shared by every source (USDA, Open Food Facts, restaurants, user foods).
// Nutrient values are stored per 100 g (solids) or per 100 ml (liquids): see `base`.

export type FoodSource = "usda" | "off" | "restaurant" | "user";
export type DataQuality = "complete" | "incomplete" | "estimated";

export interface Serving {
  label: string; // "1 cup", "1 slice (28 g)"
  grams: number; // weight of one serving in the food's base unit (g, or ml for liquids)
  isDefault?: boolean;
}

export interface Food {
  id: string; // internal id: `${source}:${sourceId}`
  source: FoodSource;
  sourceId: string;
  name: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  base: "g" | "ml";
  kcal: number; // per 100 base units
  protein: number;
  carbs: number;
  fat: number;
  nutrients: Record<string, number>; // extra per-100 values: fiber, sugar, sodium (mg), satFat ...
  servings: Serving[];
  quality: DataQuality;
  qualityNote: string | null;
  sourceUrl: string | null;
  updatedAt: string; // ISO
}

export const foodId = (source: FoodSource, sourceId: string) => `${source}:${sourceId}`;

// Key used to avoid duplicate rows: barcode when present, else normalized brand+name.
export function dedupeKey(f: Pick<Food, "barcode" | "brand" | "name" | "source">): string {
  if (f.barcode) return "bc:" + f.barcode.replace(/\D/g, "").replace(/^0+/, "");
  const n = (s: string | null) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `nm:${n(f.brand)}|${n(f.name)}`;
}
