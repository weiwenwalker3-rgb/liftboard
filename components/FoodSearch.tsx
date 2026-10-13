"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Food } from "@/lib/food/model";
import type { Meal, MealItem } from "@/lib/food/user";
import { scale, toBase, type Unit } from "@/lib/food/units";
import { dupKeys } from "@/lib/food/model";
import { cookInfo, ownStateGrams, type CookState } from "@/lib/food/yield";

type Tab = "search" | "restaurants" | "favorites" | "recents" | "foods" | "meals";
const TABS: [Tab, string][] = [["search", "Search"], ["restaurants", "Restaurants"], ["favorites", "Favorites"], ["recents", "Recent"], ["foods", "My foods"], ["meals", "Meals"]];

async function api(body: Record<string, unknown>) {
  const r = await fetch("/api/foods/me", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Request failed");
  return j;
}

type Resp = { foods: Food[]; total: number; page: number; notices: string[]; error?: string };
const SRC: Record<string, string> = { usda: "USDA", off: "Open Food Facts", restaurant: "Restaurant", user: "Mine" };

const UNITS_G: { v: Unit; l: string }[] = [{ v: "g", l: "g" }, { v: "oz", l: "oz" }, { v: "cup", l: "cup" }, { v: "tbsp", l: "tbsp" }, { v: "tsp", l: "tsp" }];
const UNITS_ML: { v: Unit; l: string }[] = [{ v: "ml", l: "ml" }, { v: "floz", l: "fl oz" }, { v: "cup", l: "cup" }, { v: "tbsp", l: "tbsp" }, { v: "tsp", l: "tsp" }];

function defaultServing(f: Food) { return f.servings.find(s => s.isDefault) || f.servings[0]; }

export function previewOf(f: Food) {
  const s = defaultServing(f);
  const amt = s ? s.grams : 100;
  const m = scale(f, amt);
  return { label: s ? s.label : `100 ${f.base}`, ...m };
}

export default function FoodSearch() {
  const [tab, setTab] = useState<Tab>("search");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [q, setQ] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [notices, setNotices] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<Food | null>(null);
  const [code, setCode] = useState("");
  const [draft, setDraft] = useState<MealItem[]>([]);
  const [mealName, setMealName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(j => setSignedIn(!!j.user)).catch(() => setSignedIn(false));
    const on = () => fetch("/api/me").then(r => r.json()).then(j => setSignedIn(!!j.user)).catch(() => {});
    window.addEventListener("focus", on);
    return () => window.removeEventListener("focus", on);
  }, []);

  const run = useCallback(async (query: string, pg: number, append: boolean, source = "") => {
    ctl.current?.abort();
    const c = (ctl.current = new AbortController());
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/foods/search?q=${encodeURIComponent(query)}&page=${pg}${source ? "&source=" + source : ""}`, { signal: c.signal });
      const j: Resp = await r.json();
      if (!r.ok) throw new Error(j.error || "Search failed");
      setFoods(prev => {
        if (!append) return j.foods;
        const seen = new Set(prev.flatMap(dupKeys));
        return [...prev, ...j.foods.filter(f => !dupKeys(f).some(k => seen.has(k)))];
      });
      setTotal(j.total); setPage(pg); setNotices(j.notices || []);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setErr((e as Error).message || "Search failed"); if (!append) setFoods([]);
    }
    setBusy(false);
  }, []);

  useEffect(() => {
    if (tab !== "search" && tab !== "restaurants") return;
    const t = q.trim();
    if (t.length < 2) { ctl.current?.abort(); setFoods([]); setNotices([]); setErr(""); setBusy(false); return; }
    const id = setTimeout(() => run(t, 1, false, tab === "restaurants" ? "restaurant" : ""), 300);
    return () => clearTimeout(id);
  }, [q, run, tab]);

  const loadList = useCallback(async (t: Tab) => {
    setErr(""); setNotices([]); setBusy(true);
    try {
      const key = t === "foods" ? "foods" : t;
      const r = await fetch(`/api/foods/me?list=${key}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not load");
      if (t === "meals") setMeals(j.meals || []); else setFoods(j.foods || []);
      setTotal((j.foods || j.meals || []).length);
    } catch (e) { setErr((e as Error).message); if (t === "meals") setMeals([]); else setFoods([]); }
    setBusy(false);
  }, []);

  useEffect(() => {
    if (tab === "search" || tab === "restaurants") return;
    setSel(null);
    if (signedIn) loadList(tab);
  }, [tab, signedIn, loadList]);

  useEffect(() => {
    if (!signedIn) { setFavs(new Set()); return; }
    fetch("/api/foods/me?list=favorites").then(r => r.json()).then(j => setFavs(new Set((j.foods || []).map((f: Food) => f.id)))).catch(() => {});
  }, [signedIn]);

  async function scan() {
    setErr(""); setBusy(true);
    try {
      const r = await fetch(`/api/foods/barcode/${encodeURIComponent(code.trim())}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Lookup failed");
      setTab("search"); setSel(j.food as Food); setNotices(j.notices || []);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  async function toggleFav(f: Food) {
    const on = !favs.has(f.id);
    setFavs(prev => { const n = new Set(prev); on ? n.add(f.id) : n.delete(f.id); return n; });
    try { await api({ op: on ? "fav" : "unfav", foodId: f.id }); } catch (e) { setErr((e as Error).message); }
  }

  function logMealNow(name: string, items: MealItem[]) {
    const sum = items.reduce((a, i) => ({ p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, g: a.g + i.grams }), { p: 0, c: 0, f: 0, g: 0 });
    const r1 = (n: number) => Math.round(n * 10) / 10;
    window.dispatchEvent(new CustomEvent("lb:addfood", { detail: { name, p: r1(sum.p), c: r1(sum.c), f: r1(sum.f), meta: { src: "meal", qty: items.length, unit: items.length === 1 ? "item" : "items", grams: Math.round(sum.g), q: "complete" } } }));
  }

  async function saveDraft() {
    try {
      const j = await api({ op: "saveMeal", name: mealName, items: draft });
      setMeals(m => [j.meal as Meal, ...m]); setDraft([]); setMealName(""); setErr(""); setTab("meals");
    } catch (e) { setErr((e as Error).message); }
  }

  async function createFood(form: HTMLFormElement) {
    const d = Object.fromEntries(new FormData(form).entries());
    try {
      const j = await api({ op: "createFood", ...d });
      setFoods(f => [j.food as Food, ...f]); setShowNew(false); setErr(""); form.reset();
    } catch (e) { setErr((e as Error).message); }
  }

  const isSearch = tab === "search" || tab === "restaurants";
  const needsSignIn = !isSearch && signedIn === false;

  return (
    <div className="fs">
      <div className="fs-tabs" role="tablist">
        {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setSel(null); setErr(""); setNotices([]); if (k === "search" || k === "restaurants") setFoods([]); }}>{l}</button>)}
      </div>
      {isSearch ? (
        <div className="fs-row">
          <input className="fs-q" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={tab === "restaurants" ? "Search restaurant items or chains" : "Search foods or brands (chicken breast, Greek yogurt…)"} aria-label="Search foods" autoComplete="off" spellCheck={false} />
          <input className="fs-code" inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && code.trim()) scan(); }} placeholder="Barcode" aria-label="Barcode" />
          <button type="button" className="btn" onClick={scan} disabled={code.replace(/\D/g, "").length < 8 || busy}>Look up</button>
        </div>
      ) : null}
      {notices.map(n => <p key={n} className="hint fs-note">{n}</p>)}
      {err ? <p className="hint fs-err" role="alert">{err}</p> : null}
      {needsSignIn ? <p className="hint">Sign in on the Profile tab to keep favorites, recent foods, your own foods and saved meals.</p> : null}

      {draft.length ? (
        <div className="fs-draft">
          <b>Meal builder</b>
          <ul>{draft.map((i, n) => <li key={n}>{i.name} · {i.label} · {Math.round(i.kcal)} kcal <button type="button" className="x" aria-label="Remove" onClick={() => setDraft(d => d.filter((_, k) => k !== n))}>✕</button></li>)}</ul>
          <div className="fs-row">
            <input value={mealName} onChange={e => setMealName(e.target.value)} placeholder="Meal name" maxLength={60} aria-label="Meal name" />
            <button type="button" className="btn go" onClick={() => { logMealNow(mealName.trim() || "Meal", draft); setDraft([]); setMealName(""); }}>Log meal</button>
            {signedIn ? <button type="button" className="btn" onClick={saveDraft} disabled={!mealName.trim()}>Save meal</button> : null}
            <button type="button" className="btn" onClick={() => setDraft([])}>Clear</button>
          </div>
        </div>
      ) : null}

      {sel ? (
        <Detail food={sel} fav={favs.has(sel.id)} signedIn={!!signedIn} onFav={() => toggleFav(sel)} onClose={() => setSel(null)}
          onLogged={() => { if (signedIn) api({ op: "recent", foodId: sel.id }).catch(() => {}); }}
          onMeal={it => { setDraft(d => [...d, it]); setSel(null); }} />
      ) : tab === "meals" ? (
        needsSignIn ? null : (
          <ul className="fs-list">
            {meals.map(m => {
              const t = m.items.reduce((a, i) => ({ k: a.k + i.kcal, p: a.p + i.p, c: a.c + i.c, f: a.f + i.f }), { k: 0, p: 0, c: 0, f: 0 });
              return (
                <li key={m.id} className="fs-meal">
                  <span className="fs-name">{m.name}</span>
                  <span className="fs-meta">{m.items.length} items · {Math.round(t.k)} kcal · P {Math.round(t.p)} C {Math.round(t.c)} F {Math.round(t.f)}</span>
                  <span className="fs-actions">
                    <button type="button" className="btn go" onClick={() => logMealNow(m.name, m.items)}>Log</button>
                    <button type="button" className="btn" onClick={() => setDraft(m.items)}>Edit as draft</button>
                    <button type="button" className="btn" onClick={async () => { try { await api({ op: "deleteMeal", mealId: m.id }); setMeals(l => l.filter(x => x.id !== m.id)); } catch (e) { setErr((e as Error).message); } }}>Delete</button>
                  </span>
                </li>
              );
            })}
            {!busy && !meals.length && !err ? <p className="hint">No saved meals yet. Add foods to the meal builder from any food, then save it.</p> : null}
          </ul>
        )
      ) : (
        <>
          {tab === "foods" && signedIn ? (
            showNew ? (
              <form className="fs-new" onSubmit={e => { e.preventDefault(); createFood(e.currentTarget); }}>
                <input name="name" placeholder="Food name" required maxLength={80} aria-label="Food name" />
                <input name="brand" placeholder="Brand (optional)" maxLength={60} aria-label="Brand" />
                <input name="servingLabel" placeholder="Serving (1 bar)" maxLength={40} aria-label="Serving label" />
                <input name="servingGrams" type="number" min="1" step="any" placeholder="Serving size (g)" aria-label="Serving grams" />
                <input name="kcal" type="number" min="0" step="any" placeholder="kcal (optional)" aria-label="Calories" />
                <input name="protein" type="number" min="0" step="any" placeholder="Protein g" required aria-label="Protein" />
                <input name="carbs" type="number" min="0" step="any" placeholder="Carbs g" required aria-label="Carbs" />
                <input name="fat" type="number" min="0" step="any" placeholder="Fat g" required aria-label="Fat" />
                <button type="submit" className="btn go">Save food</button>
                <button type="button" className="btn" onClick={() => setShowNew(false)}>Cancel</button>
              </form>
            ) : <button type="button" className="btn" onClick={() => setShowNew(true)}>+ New food</button>
          ) : null}
          <ul className="fs-list">
            {foods.map(f => {
              const p = previewOf(f);
              return (
                <li key={f.id}>
                  <button type="button" onClick={() => setSel(f)}>
                    <span className="fs-name">{favs.has(f.id) ? "★ " : ""}{f.name}{f.brand ? <em> · {f.brand}</em> : null}</span>
                    <span className="fs-meta">{p.label} · {p.kcal} kcal · P {p.protein} C {p.carbs} F {p.fat}</span>
                    <span className="fs-badges"><b>{SRC[f.source]}</b>{f.quality !== "complete" ? <b className="warn">{f.quality}</b> : null}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {busy ? <p className="hint">{isSearch ? "Searching…" : "Loading…"}</p> : null}
          {isSearch && !busy && q.trim().length >= 2 && !foods.length && !err ? <p className="hint">{tab === "restaurants" ? "No restaurant items imported for that search yet." : "No matches. Try fewer words, or add a custom food below."}</p> : null}
          {!isSearch && !busy && signedIn && !foods.length && !err ? <p className="hint">Nothing here yet.</p> : null}
          {tab === "search" && foods.length && foods.length < total && !busy ? <button type="button" className="btn" onClick={() => run(q.trim(), page + 1, true)}>Load more</button> : null}
        </>
      )}
    </div>
  );
}

function Detail({ food, fav, signedIn, onFav, onClose, onLogged, onMeal }: { food: Food; fav: boolean; signedIn: boolean; onFav: () => void; onClose: () => void; onLogged: () => void; onMeal: (i: MealItem) => void }) {
  const units = food.base === "ml" ? UNITS_ML : UNITS_G;
  const cook = useMemo(() => cookInfo(food), [food]);
  const first = defaultServing(food);
  // Simple ingredients default to grams so the raw/cooked switch is available straight away.
  const startInGrams = !first || (!!cook && food.base === "g");
  const [amount, setAmount] = useState(startInGrams ? "100" : "1");
  const [unit, setUnit] = useState<string>(!startInGrams ? "s0" : food.base === "ml" ? "ml" : "g");
  const [weighed, setWeighed] = useState<CookState>(cook?.state ?? "raw");
  const byWeight = unit === "g" || unit === "oz";

  const calc = useMemo(() => {
    const a = parseFloat(amount);
    if (!(a >= 0)) return null;
    try {
      const idx = unit.startsWith("s") ? parseInt(unit.slice(1), 10) : -1;
      const base = toBase(idx >= 0
        ? { amount: a, unit: "serving", base: food.base, serving: { grams: food.servings[idx].grams } }
        : { amount: a, unit: unit as Unit, base: food.base });
      if (cook && byWeight && weighed !== cook.state && food.base === "g") {
        const o = ownStateGrams(base.value, weighed, cook);
        return { m: scale(food, o.grams), est: true, grams: base.value, converted: true };
      }
      return { m: scale(food, base.value), est: base.estimated, grams: base.value, converted: false };
    } catch { return null; }
  }, [amount, unit, food, cook, weighed, byWeight]);

  function add() {
    if (!calc) return;
    const idx = unit.startsWith("s") ? parseInt(unit.slice(1), 10) : -1;
    const label = idx >= 0 ? food.servings[idx].label : cook && byWeight ? `${unit} ${weighed === "raw" ? "raw" : "cooked"}` : unit;
    window.dispatchEvent(new CustomEvent("lb:addfood", {
      detail: {
        name: food.brand ? `${food.name} (${food.brand})` : food.name,
        p: calc.m.protein, c: calc.m.carbs, f: calc.m.fat,
        meta: { src: food.source, fid: food.id, qty: parseFloat(amount), unit: label, grams: Math.round(calc.grams), q: calc.est && food.quality === "complete" ? "estimated" : food.quality },
      },
    }));
    onLogged();
    onClose();
  }

  function addToMeal() {
    if (!calc) return;
    const idx = unit.startsWith("s") ? parseInt(unit.slice(1), 10) : -1;
    const label = `${amount} × ${idx >= 0 ? food.servings[idx].label : cook && byWeight ? `${unit} ${weighed === "raw" ? "raw" : "cooked"}` : unit}`;
    onMeal({ foodId: food.id, name: food.name, label, grams: Math.round(calc.grams * 10) / 10, kcal: calc.m.kcal, p: calc.m.protein, c: calc.m.carbs, f: calc.m.fat });
  }

  return (
    <div className="fs-det">
      <button type="button" className="btn" onClick={onClose}>← Back</button>
      <h4>{food.name}{food.brand ? <em> · {food.brand}</em> : null}{signedIn ? <button type="button" className="fs-star" aria-pressed={fav} aria-label={fav ? "Remove favorite" : "Add favorite"} onClick={onFav}>{fav ? "★" : "☆"}</button> : null}</h4>
      <div className="fs-row">
        <input type="number" min="0" step="any" value={amount} onChange={e => setAmount(e.target.value)} aria-label="Quantity" />
        <select value={unit} onChange={e => setUnit(e.target.value)} aria-label="Unit">
          {food.servings.map((s, i) => <option key={i} value={"s" + i}>{s.label}</option>)}
          {units.map(u => <option key={u.v} value={u.v}>{u.l}</option>)}
        </select>
      </div>
      {cook ? (
        <div className="fs-row fs-cook" role="group" aria-label="Weigh as">
          <span className="hint">Weigh it</span>
          <button type="button" aria-pressed={weighed === "raw"} disabled={!byWeight} onClick={() => setWeighed("raw")}>Raw / dry</button>
          <button type="button" aria-pressed={weighed === "cooked"} disabled={!byWeight} onClick={() => setWeighed("cooked")}>Cooked</button>
          {!byWeight ? <span className="hint">Pick g or oz to switch</span> : null}
        </div>
      ) : null}
      {calc ? (
        <p className="fs-macros"><b>{calc.m.kcal}</b> kcal · P {calc.m.protein} g · C {calc.m.carbs} g · F {calc.m.fat} g
          {Object.entries(calc.m.nutrients).length ? <span className="hint"> · {Object.entries(calc.m.nutrients).map(([k, v]) => `${k} ${v}`).join(", ")}</span> : null}
        </p>
      ) : <p className="hint">Enter a quantity.</p>}
      {calc?.converted && cook ? <p className="hint fs-note">Estimated: converted from {weighed} to {cook.state} weight with a typical yield (cooked is about ×{cook.yield} of raw).</p> : calc?.est ? <p className="hint fs-note">Estimated: converting between weight and volume assumes water density.</p> : null}
      {food.quality !== "complete" ? <p className="hint fs-note">{food.quality === "incomplete" ? "Incomplete data" : "Estimated data"}{food.qualityNote ? `: ${food.qualityNote}` : ""}. Check the label.</p> : null}
      <p className="hint">Source: {SRC[food.source]}{food.sourceUrl ? <> · <a href={food.sourceUrl} target="_blank" rel="noreferrer noopener">view record</a></> : null} · updated {food.updatedAt.slice(0, 10)}</p>
      <div className="fs-row">
        <button type="button" className="btn go" onClick={add} disabled={!calc || calc.m.kcal + calc.m.protein + calc.m.carbs + calc.m.fat === 0}>Add to today</button>
        <button type="button" className="btn" onClick={addToMeal} disabled={!calc}>Add to meal</button>
      </div>
    </div>
  );
}
