// Restaurant chain detection. Chain items only appear in search once the whole chain name is typed.

const CHAINS = [
  "mcdonalds", "burger king", "wendys", "chick fil a", "taco bell", "subway", "chipotle", "kfc", "popeyes", "starbucks",
  "dunkin", "dominos", "pizza hut", "papa johns", "panera", "five guys", "in n out", "shake shack", "sonic", "arbys",
  "jack in the box", "whataburger", "panda express", "dairy queen", "little caesars", "culvers", "wingstop", "jimmy johns",
  "jersey mikes", "olive garden", "applebees", "chilis", "outback", "ihop", "dennys", "cracker barrel", "buffalo wild wings",
  "red lobster", "texas roadhouse", "cheesecake factory", "qdoba", "moes southwest", "del taco", "carls jr", "hardees",
  "zaxbys", "raising canes", "tim hortons", "krispy kreme", "baskin robbins", "cold stone", "sweetgreen", "cava",
  "noodles and company", "firehouse subs", "potbelly", "mcalisters", "bojangles", "el pollo loco", "jamba", "smoothie king",
  "tropical smoothie", "longhorn steakhouse", "red robin", "p f changs", "denny s", "ruby tuesday", "bob evans", "golden corral",
];

const spaced = (s: string) => " " + s.toLowerCase().replace(/'/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim() + " ";

/** Chain names fully present in the text, as whole words (also accepts the run-together form, e.g. "chickfila"). */
export function chainsIn(text: string, extra: string[] = []): string[] {
  const t = spaced(text);
  const words = new Set(t.trim().split(" "));
  return [...CHAINS, ...extra.map(e => spaced(e).trim())].filter(c => t.includes(" " + c + " ") || words.has(c.replace(/ /g, "")));
}

/** True when a food belongs to a restaurant chain: chain name in its name or brand, or USDA's "Fast Foods" category. */
export function isChainFood(f: { name: string; brand: string | null; category: string | null }): boolean {
  return f.category === "Fast Foods" || chainsIn(`${f.name} ${f.brand || ""}`).length > 0;
}
