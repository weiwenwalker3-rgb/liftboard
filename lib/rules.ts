// Server-side validation for what a signed-in user may write. Mirrors the rules
// the prototype ran under: you can only write your own documents.

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function cleanPr(d: unknown): Record<string, unknown> | null {
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, any>;
  const bw = num(o.bw);
  if (!(bw > 20 && bw < 400)) return null;
  const lifts: Record<string, { kg: number; date: string; proof: string }> = {};
  for (const [name, e] of Object.entries(o.lifts && typeof o.lifts === "object" ? o.lifts : {}).slice(0, 8)) {
    const kg = num((e as any)?.kg);
    if (kg > 0 && kg < 700) {
      const proof = str((e as any).proof, 500);
      lifts[str(name, 40)] = { kg, date: str((e as any).date, 10), proof: /^https:\/\/\S+$/.test(proof) ? proof : "" };
    }
  }
  const history = (Array.isArray(o.history) ? o.history : []).slice(0, 10).map((h: any) => ({
    lift: str(h?.lift, 40), kg: num(h?.kg), at: str(h?.at, 10),
  }));
  return { tag: str(o.tag, 20), bw, lifts, history, updatedAt: num(o.updatedAt) };
}

export function cleanSocial(d: unknown): Record<string, unknown> | null {
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, any>;
  const friends = (Array.isArray(o.friends) ? o.friends : []).slice(0, 200).map((f: unknown) => str(f, 64)).filter(Boolean);
  return { tag: str(o.tag, 20), code: str(o.code, 8), friends, ref: str(o.ref, 8), streak: Math.max(0, Math.floor(num(o.streak))) };
}

export const MAX_STATE_BYTES = 900_000;
