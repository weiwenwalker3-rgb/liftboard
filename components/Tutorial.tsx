"use client";

import { CSSProperties, FormEvent, ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/* First-run tutorial: a guided spotlight over the real app. The app script
 * (public/liftboard.js) exposes `window.lbTour` so this component can switch
 * tabs, read settings and save the profile without duplicating its logic. */

interface Info {
  signedIn: boolean; name: string; unit: "lb" | "kg"; sex: "m" | "f"; bw: number; cm: number; age: number; tag: string;
  hasSample: boolean; realLifts: number; done: boolean;
}
interface Bridge {
  info(): Info; setTab(t: string): void; setProfile(p: Partial<Info>): void;
  openClaim(): void; closeClaim(): void; loadSample(): void; clearSample(): void; finish(): void;
}
interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
declare global { interface Window { lbTour?: Bridge; __lbReady?: boolean; __lbTourBusy?: boolean } }

const STORE = "liftboard.tour";
const MOBILE_W = 700;

type Platform = { installed: boolean; ios: boolean; android: boolean; mobile: boolean; iosBrowser: "safari" | "other"; samsung: boolean };

function platform(): Platform {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const mm = (q: string) => window.matchMedia(q).matches;
  const installed = mm("(display-mode: standalone)") || mm("(display-mode: fullscreen)") || mm("(display-mode: minimal-ui)")
    || (navigator as Navigator & { standalone?: boolean }).standalone === true || document.referrer.startsWith("android-app://");
  return {
    installed, ios, android, mobile: ios || android || /Mobi/i.test(ua),
    iosBrowser: /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? "other" : "safari",
    samsung: /SamsungBrowser/i.test(ua),
  };
}

const activeSteps = (p: Platform) => STEPS.filter(s => !s.skip?.(p));

function readStore(): { step?: string; done?: boolean } {
  try { return JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch { return {}; }
}
function writeStore(v: { step?: string; done?: boolean }) {
  try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* private mode */ }
}

const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const card = (sel: string) => { const el = $(sel); return el ? (el.closest(".card") as HTMLElement | null) || el : null; };
const visible = (el: HTMLElement | null) => !!el && !el.hidden && el.getClientRects().length > 0;

interface Ctx {
  info: Info; plat: Platform; bridge: Bridge;
  next(): void; canInstall: boolean; install(): void;
}
interface Step {
  id: string;
  tab?: string;
  target?: () => (HTMLElement | null)[];
  skip?: (p: Platform) => boolean;
  enter?: (b: Bridge) => void;
  leave?: (b: Bridge) => void;
  kicker: string;
  title: (c: Ctx) => string;
  body: (c: Ctx) => ReactNode;
  cta?: (c: Ctx) => string;
  custom?: boolean;
}

function Icon({ d }: { d: string }) {
  return <svg className="tour-ico" viewBox="0 0 24 24" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
const SHARE = "M12 3v12M8 7l4-4 4 4M5 11v8a2 2 0 002 2h10a2 2 0 002-2v-8";
const DOTS = "M12 5h.01M12 12h.01M12 19h.01";
const PLUS = "M4 4h16v16H4zM12 8v8M8 12h8";

function IosSteps({ plat }: { plat: Platform }) {
  return (
    <ol className="tour-ol">
      {plat.iosBrowser === "other"
        ? <li>Tap <b>Share</b> <Icon d={SHARE} /> in the address bar. If you don&apos;t see it, open this page in <b>Safari</b>.</li>
        : <li>In Safari, tap <b>Share</b> <Icon d={SHARE} />. On newer iPhones it&apos;s inside the <b>•••</b> menu next to the address bar.</li>}
      <li>Scroll down and tap <b>Add to Home Screen</b> <Icon d={PLUS} />.</li>
      <li>Tap <b>Add</b>. Liftboard now opens full screen from its own icon.</li>
    </ol>
  );
}
function AndroidSteps({ plat }: { plat: Platform }) {
  return plat.samsung ? (
    <ol className="tour-ol">
      <li>Tap the <b>☰ menu</b> at the bottom of Samsung Internet.</li>
      <li>Tap <b>Add page to</b>, then <b>Home screen</b>.</li>
      <li>Tap <b>Add</b>. Liftboard now opens from its own icon.</li>
    </ol>
  ) : (
    <ol className="tour-ol">
      <li>In Chrome, tap the <b>menu</b> <Icon d={DOTS} /> at the top right.</li>
      <li>Tap <b>Add to Home screen</b> or <b>Install app</b>.</li>
      <li>Tap <b>Install</b>. Liftboard now opens full screen from its own icon.</li>
    </ol>
  );
}

const STEPS: Step[] = [
  {
    id: "welcome", kicker: "New lifter",
    title: () => "Welcome to Liftboard",
    body: () => <>
      <p>Log your sets, watch your strength climb, rank up every muscle and fight for the podium.</p>
      <p>This quick tour shows you around. It takes about two minutes and you can skip it whenever you like.</p>
    </>,
    cta: () => "Let's go",
  },
  {
    id: "account", tab: "profile", target: () => [card("#acct")], kicker: "Step 1 · Sign in",
    title: c => c.info.signedIn ? "You're signed in" : "Create your account",
    body: c => c.info.signedIn ? <>
      <p>You&apos;re signed in as <b>{c.info.name}</b>. Your log syncs across your devices and your PRs post to the shared leaderboard.</p>
      <p>You can sign out from this card on the Profile tab.</p>
    </> : <>
      <p>New here? Tap <b>Create account</b>, pick a username (3 to 20 characters) and a password (8 or more). Already have one? Tap <b>Sign in</b>.</p>
      <p>An account syncs your log across devices and puts your PRs on the shared leaderboard. After you sign in the page reloads and the tour picks up here.</p>
      <p className="tour-dim">Or skip it for now and try things out in this browser.</p>
    </>,
    cta: c => c.info.signedIn ? "Next" : "Skip for now",
  },
  {
    id: "profile", tab: "profile", target: () => window.innerWidth <= MOBILE_W ? [] : [card("#profForm")], kicker: "Step 2 · Your stats", custom: true,
    title: () => "Set up your profile",
    body: () => null,
  },
  {
    id: "chart", tab: "train", target: () => [$("#p-train .screen")], kicker: "Step 3 · Your progress",
    title: () => "This is what your log turns into",
    body: c => c.info.hasSample ? <>
      <p>Right now it&apos;s showing <b>sample data</b>: six months of a made-up lifter, so you can see where you&apos;re headed.</p>
      <p>Every set you log becomes a point on this chart. Switch between <b>Est. 1RM</b>, <b>Top set</b> and <b>Volume</b>, and pick a time range.</p>
    </> : <>
      <p>Every set you log becomes a point on this chart. Switch between <b>Est. 1RM</b>, <b>Top set</b> and <b>Volume</b>, and pick a time range.</p>
      <p>Your sample data is off. Load it for the tour to see a full chart; you&apos;ll get to turn it off again at the end.</p>
      <button type="button" className="btn sm" onClick={() => c.bridge.loadSample()}>Load sample data</button>
    </>,
  },
  {
    id: "watch", tab: "train", target: () => [card("#watch")], kicker: "Step 3 · Your progress",
    title: () => "Your lifts",
    body: () => <p>Each lift you train shows up here with its trend. Tap one to chart it. You can drag them to change the order.</p>,
  },
  {
    id: "body", tab: "train", target: () => [$("#bodyRank")], kicker: "Step 3 · Your progress",
    title: () => "Rank up every muscle",
    body: () => <>
      <p>Each muscle gets a rank, Bronze to Elite, from the lifts that train it. Tap a muscle to see what&apos;s holding it back.</p>
      <p>Open <b>Lift ranks</b> below it to see the rank for each of 60+ lifts.</p>
    </>,
  },
  {
    id: "log", tab: "train", target: () => [card("#liftForm")], kicker: "Step 4 · Log a set",
    title: () => "Log your sets",
    body: () => <>
      <p>After a set, pick the <b>lift</b>, enter the <b>weight</b>, <b>reps</b> and <b>sets</b>, then tap <b>Log set</b>. Each set earns XP.</p>
      <p>A heavier set or more reps raises your estimated 1RM, which is what ranks the lift. Try one now if you like. Sets you log are yours and stay when the sample data goes.</p>
    </>,
  },
  {
    id: "recent", tab: "train", target: () => [card("#recent")], kicker: "Step 4 · Log a set",
    title: () => "Fix a mistake",
    body: () => <p>Your latest sets land here. Logged the wrong number? Delete the set with <b>×</b> and log it again.</p>,
  },
  {
    id: "pr", tab: "arena", target: () => [$("#claim")], enter: b => b.openClaim(), leave: b => b.closeClaim(), kicker: "Step 5 · Set a PR",
    title: () => "Submit a PR",
    body: c => <>
      <p>Hit a new one-rep max on squat, bench or deadlift? Tap <b>Submit a PR</b> on the Arena tab, choose the lift, enter the weight and your bodyweight, then <b>Lock it in</b>.</p>
      <p>Elite-level lifts need a <b>video link</b> as proof.{c.info.signedIn ? "" : " Sign in to post PRs to the shared board; signed out they stay on your practice board."}</p>
    </>,
  },
  {
    id: "board", tab: "arena", target: () => [$("#p-arena .board-head"), $("#podiums")], kicker: "Step 5 · Set a PR",
    title: () => "Climb the leaderboard",
    body: () => <p>PRs go on the podiums. <b>Total strength</b> ranks the heaviest lifts and <b>Pound for pound</b> ranks strength for your bodyweight. Take first place to wear the crown.</p>,
  },
  {
    id: "macros", tab: "fuel", target: () => [$("#todayTitle"), $("#bars")], kicker: "Step 6 · Fuel",
    title: () => "Fuel your gains",
    body: () => <>
      <p>The <b>Fuel</b> tab tracks what you eat. These bars fill up as you log food and show how close you are to today&apos;s calorie, protein, carb and fat targets.</p>
      <p>Each day you finish scores out of 100 for how close you land.</p>
    </>,
  },
  {
    id: "food", tab: "fuel", target: () => [$("#foodSlot")], kicker: "Step 6 · Fuel",
    title: () => "Log your food",
    body: () => <>
      <p>Search a food like <b>chicken breast</b> or <b>white rice</b>, pick how much you had, and add it to today. The macros are filled in for you.</p>
      <p>Tick the box to include packaged and brand-name products, or use the <b>Restaurants</b> tab. Foods you log often show up under <b>Recent</b> and <b>Favorites</b>.</p>
    </>,
  },
  {
    id: "calc", tab: "fuel", target: () => [card("#calcForm")], kicker: "Step 6 · Fuel",
    title: () => "Set your targets",
    body: () => <p>Not sure what to eat? The <b>macro calculator</b> uses the stats you entered to estimate your calories. Pick <b>Cut</b>, <b>Maintain</b> or <b>Lean bulk</b>, then tap <b>Use these as my targets</b>.</p>,
  },
  {
    id: "install", kicker: "Step 7 · Get the app", skip: p => p.installed || !p.mobile,
    title: () => "Put Liftboard on your home screen",
    body: c => {
      if (c.plat.ios) return <><p>Add it to your home screen and it works like an app: full screen, its own icon, one tap from the gym floor.</p><IosSteps plat={c.plat} /></>;
      if (c.plat.android) return <>
        <p>Install it on your home screen and it works like an app: full screen, its own icon, one tap from the gym floor.</p>
        {c.canInstall ? <button type="button" className="btn go tour-install" onClick={c.install}>Install Liftboard</button> : null}
        {c.canInstall ? <p className="tour-dim">Or do it from the menu:</p> : null}
        <AndroidSteps plat={c.plat} />
      </>;
      return <><p>Add it to your home screen from your browser&apos;s menu and it works like an app with its own icon.</p></>;
    },
  },
  {
    id: "sample", target: () => [visible($("#sampleBanner")) ? $("#sampleBanner") : null], kicker: "Step 8 · Clear the decks",
    title: c => c.info.hasSample ? "Turn off the sample data" : "Sample data is off",
    body: c => c.info.hasSample ? <>
      <p>The sample lifter has done their job. Remove their sets and meals so everything you see is yours.</p>
      <p>Only sample entries are removed. Anything you logged yourself stays. You can bring the samples back any time from <b>Profile › Data</b>.</p>
      <button type="button" className="btn go" onClick={() => c.bridge.clearSample()}>Remove sample data</button>
    </> : <>
      <p>Your log only shows your own sets and meals now.</p>
      <p className="tour-dim">Want the samples back later? Use <b>Profile › Data › Reload sample training data</b>.</p>
    </>,
    cta: c => c.info.hasSample ? "Keep it for now" : "Next",
  },
  {
    id: "done", kicker: "Tutorial complete",
    title: () => "You're ready to begin",
    body: () => <>
      <p>Log your first set, chase your first rank-up and come back every day to build your streak.</p>
      <p className="tour-dim">You can replay this tour any time from the Profile tab.</p>
    </>,
    cta: () => "Start lifting",
  },
];

function ProfileForm({ info, onDone }: { info: Info; onDone: (p: Partial<Info>) => void }) {
  const [u, setU] = useState(info.unit);
  const [sex, setSex] = useState(info.sex);
  const [bw, setBw] = useState(String(info.bw || ""));
  const [ft, setFt] = useState(String(Math.floor(info.cm / 2.54 / 12)));
  const [inch, setInch] = useState(String(Math.round((info.cm / 2.54) % 12)));
  const [cm, setCm] = useState(String(info.cm));
  const [age, setAge] = useState(String(info.age));
  const [tag, setTag] = useState(info.tag);

  function switchUnit(next: "lb" | "kg") {
    if (next === u) return;
    const n = parseFloat(bw);
    if (n > 0) setBw(String(Math.round((next === "kg" ? n / 2.20462 : n * 2.20462) * 10) / 10));
    if (next === "kg") setCm(String(Math.round(((parseFloat(ft) || 0) * 12 + (parseFloat(inch) || 0)) * 2.54)));
    else { const t = (parseFloat(cm) || 0) / 2.54; setFt(String(Math.floor(t / 12))); setInch(String(Math.round(t % 12))); }
    setU(next);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    const height = u === "kg" ? parseFloat(cm) : ((parseFloat(ft) || 0) * 12 + (parseFloat(inch) || 0)) * 2.54;
    onDone({ unit: u, sex, bw: parseFloat(bw), cm: height, age: parseFloat(age), tag });
  }
  const seg = <T extends string>(val: T, set: (v: T) => void, opts: [T, string][]) => (
    <div className="seg">{opts.map(([v, l]) => <button key={v} type="button" aria-pressed={val === v} onClick={() => set(v)}>{l}</button>)}</div>
  );
  return (
    <form className="tour-form" onSubmit={submit}>
      <p>Your bodyweight sets your ranks, and height, age and sex power the macro calculator. Change any of it later on the Profile tab.</p>
      <div className="tour-grid">
        <div className="tour-fld span"><span>Units</span>{seg(u, switchUnit, [["lb", "Pounds (lb)"], ["kg", "Kilograms (kg)"]])}</div>
        <div className="tour-fld span"><span>Sex</span>{seg(sex, setSex, [["m", "Male"], ["f", "Female"]])}</div>
        <label className="tour-fld"><span>Bodyweight ({u})</span><input type="number" inputMode="decimal" min={u === "kg" ? 30 : 66} max={u === "kg" ? 300 : 660} step="any" required value={bw} onChange={e => setBw(e.target.value)} /></label>
        {u === "kg"
          ? <label className="tour-fld"><span>Height (cm)</span><input type="number" inputMode="decimal" min={100} max={250} step="any" required value={cm} onChange={e => setCm(e.target.value)} /></label>
          : <div className="tour-fld"><span>Height (ft, in)</span><div className="tour-pair">
              <input aria-label="Feet" type="number" inputMode="numeric" min={3} max={8} required value={ft} onChange={e => setFt(e.target.value)} />
              <input aria-label="Inches" type="number" inputMode="decimal" min={0} max={11.9} step="any" required value={inch} onChange={e => setInch(e.target.value)} />
            </div></div>}
        <label className="tour-fld"><span>Age</span><input type="number" inputMode="numeric" min={13} max={99} required value={age} onChange={e => setAge(e.target.value)} /></label>
        <label className="tour-fld"><span>Gamer tag</span><input type="text" maxLength={20} placeholder="On the leaderboard" value={tag} onChange={e => setTag(e.target.value)} /></label>
      </div>
      <button className="btn go tour-save" type="submit">Save and continue</button>
    </form>
  );
}

type Rect = { x: number; y: number; w: number; h: number };

export default function Tutorial() {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [info, setInfo] = useState<Info | null>(null);
  const [hole, setHole] = useState<Rect | null>(null);
  const [cardPos, setCardPos] = useState<CSSProperties>({});
  const [paused, setPaused] = useState(false);
  const [mini, setMini] = useState(false);
  const [plat, setPlat] = useState<Platform | null>(null);
  const [installEvt, setInstallEvt] = useState<InstallPrompt | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const bridge = typeof window !== "undefined" ? window.lbTour : undefined;
  const steps = plat ? activeSteps(plat) : STEPS;
  const step = steps[Math.min(idx, steps.length - 1)];

  const refresh = useCallback(() => { if (window.lbTour) setInfo(window.lbTour.info()); }, []);

  // Catch the browser's install prompt early (Android Chrome), before the tour reaches that step.
  useEffect(() => {
    setPlat(platform());
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvt(e as InstallPrompt); };
    const onInstalled = () => { setInstallEvt(null); setPlat(platform()); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  const begin = useCallback((at = 0) => { window.__lbTourBusy = true; refresh(); setIdx(at); setOpen(true); }, [refresh]);

  // Auto-start on a lifter's first visit, or resume after the sign-in reload.
  useEffect(() => {
    let cancelled = false;
    // Hold the daily-bonus popup until we know whether the tour runs.
    if (!readStore().done) window.__lbTourBusy = true;
    function decide() {
      if (cancelled || !window.lbTour) return;
      window.__lbTourBusy = false;
      const saved = readStore();
      if (saved.done) return;
      const i = window.lbTour.info();
      if (saved.step) {
        const at = activeSteps(platform()).findIndex(s => s.id === saved.step);
        if (at >= 0) { begin(at); return; }
      }
      if (i.done || i.realLifts > 0) { writeStore({ done: true }); return; }
      begin(0);
    }
    const start = () => setTimeout(decide, 400);
    if (window.__lbReady) start(); else window.addEventListener("lb:ready", start, { once: true });
    const replay = (e: Event) => { if ((e.target as HTMLElement)?.closest?.("#replayTour")) { writeStore({ step: "welcome" }); begin(0); } };
    document.addEventListener("click", replay);
    return () => { cancelled = true; window.removeEventListener("lb:ready", start); document.removeEventListener("click", replay); };
  }, [begin]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("lb:render", refresh);
    return () => window.removeEventListener("lb:render", refresh);
  }, [open, refresh]);

  // Enter a step: switch tab, run its hook, scroll the target into view.
  useEffect(() => {
    if (!open || !step || !window.lbTour) return;
    const b = window.lbTour;
    writeStore({ step: step.id });
    setMini(false);
    if (step.tab) b.setTab(step.tab);
    step.enter?.(b);
    refresh();
    const t = setTimeout(() => {
      const els = (step.target?.() || []).filter(visible) as HTMLElement[];
      if (!els.length) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      const top = Math.min(...els.map(e => e.getBoundingClientRect().top)) + window.scrollY;
      const bottom = Math.max(...els.map(e => e.getBoundingClientRect().bottom)) + window.scrollY;
      const head = ($("header.top")?.getBoundingClientRect().height || 0) + 12;
      const mobile = window.innerWidth <= MOBILE_W;
      const room = window.innerHeight - head - (mobile ? (cardRef.current?.offsetHeight || 260) + 24 : 0);
      const y = mobile || bottom - top > room ? top - head : top - head - Math.max(0, (room - (bottom - top)) / 2);
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }, 60);
    return () => { clearTimeout(t); step.leave?.(b); };
  }, [open, step, refresh]);

  // Follow the target every frame (scrolling, layout shifts, animations).
  useLayoutEffect(() => {
    if (!open) return;
    let raf = 0;
    const tick = () => {
      const blocked = visible($("#daily")) || visible($("#rankup"));
      setPaused(p => (p === blocked ? p : blocked));
      const els = (step?.target?.() || []).filter(visible) as HTMLElement[];
      const vw = window.innerWidth, vh = window.innerHeight, mobile = vw <= MOBILE_W;
      const c = cardRef.current, ch = c?.offsetHeight || 0, cw = c?.offsetWidth || 0;
      let r: Rect | null = null;
      if (els.length) {
        const rs = els.map(e => e.getBoundingClientRect());
        const pad = 8;
        const x1 = Math.min(...rs.map(q => q.left)) - pad, y1 = Math.min(...rs.map(q => q.top)) - pad;
        const x2 = Math.max(...rs.map(q => q.right)) + pad, y2 = Math.max(...rs.map(q => q.bottom)) + pad;
        const head = $("header.top")?.getBoundingClientRect().bottom || 0;
        const floor = mobile ? vh - ch - 16 : vh;
        const top = Math.max(y1, head + 4), bot = Math.min(y2, floor - 4);
        r = bot - top > 24 ? { x: Math.max(4, x1), y: top, w: Math.min(vw - 4, x2) - Math.max(4, x1), h: bot - top } : null;
      }
      setHole(h => (h && r && Math.abs(h.x - r.x) + Math.abs(h.y - r.y) + Math.abs(h.w - r.w) + Math.abs(h.h - r.h) < 0.5) || (!h && !r) ? h : r);

      let pos: CSSProperties;
      if (mobile) pos = { left: 10, right: 10, bottom: "calc(10px + env(safe-area-inset-bottom, 0px))" };
      else if (!r) pos = { left: Math.max(16, (vw - cw) / 2), top: Math.max(16, (vh - ch) / 2) };
      else {
        const gap = 16;
        const clampY = (y: number) => Math.min(Math.max(16, y), vh - ch - 16);
        const clampX = (x: number) => Math.min(Math.max(16, x), vw - cw - 16);
        if (r.x + r.w + gap + cw < vw - 16) pos = { left: r.x + r.w + gap, top: clampY(r.y) };
        else if (r.x - gap - cw > 16) pos = { left: r.x - gap - cw, top: clampY(r.y) };
        else if (r.y + r.h + gap + ch < vh - 16) pos = { left: clampX(r.x + r.w / 2 - cw / 2), top: r.y + r.h + gap };
        else if (r.y - gap - ch > 16) pos = { left: clampX(r.x + r.w / 2 - cw / 2), top: r.y - gap - ch };
        else pos = { right: 16, bottom: 16 };
      }
      setCardPos(p => (JSON.stringify(p) === JSON.stringify(pos) ? p : pos));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, step]);

  const close = useCallback((finished: boolean) => {
    window.lbTour?.finish();
    writeStore({ done: true });
    window.__lbTourBusy = false;
    setOpen(false);
    if (finished) { window.lbTour?.setTab("train"); window.scrollTo({ top: 0 }); }
  }, []);

  const next = useCallback(() => {
    if (idx >= steps.length - 1) close(true); else setIdx(idx + 1);
  }, [idx, steps.length, close]);
  const back = () => setIdx(Math.max(0, idx - 1));

  // Keyboard: Escape skips, arrows move.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.matches?.("input, select, textarea");
      if (e.key === "Escape") close(false);
      else if (!typing && e.key === "ArrowRight" && !step?.custom) next();
      else if (!typing && e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open || !step || !info || !plat || !bridge) return null;

  const install = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    const r = await installEvt.userChoice.catch(() => ({ outcome: "dismissed" }));
    setInstallEvt(null);
    if (r.outcome === "accepted") next();
  };
  const ctx: Ctx = { info, plat, bridge, next, canInstall: !!installEvt, install };
  const last = idx === steps.length - 1;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1000, vh = typeof window !== "undefined" ? window.innerHeight : 800;

  return (
    <div className={"tour" + (paused ? " paused" : "") + (mini ? " mini" : "") + (hole ? "" : " center") + (last ? " finale" : "")} role="dialog" aria-modal="true" aria-labelledby="tourTitle">
      {hole ? <>
        <div className="tour-hole" style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }} />
        {/* Click blockers around the hole; the highlighted area stays usable. */}
        <div className="tour-block" style={{ left: 0, top: 0, width: vw, height: hole.y }} />
        <div className="tour-block" style={{ left: 0, top: hole.y + hole.h, width: vw, height: Math.max(0, vh - hole.y - hole.h) }} />
        <div className="tour-block" style={{ left: 0, top: hole.y, width: hole.x, height: hole.h }} />
        <div className="tour-block" style={{ left: hole.x + hole.w, top: hole.y, width: Math.max(0, vw - hole.x - hole.w), height: hole.h }} />
      </> : <div className="tour-shade" />}

      <div className="tour-card" ref={cardRef} style={cardPos} key={step.id}>
        {last ? <div className="tour-burst" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}</div> : null}
        <div className="tour-top">
          <span className="tour-kick">{step.kicker}</span>
          <span>
            {hole ? <button type="button" className="tour-min" aria-expanded={!mini} onClick={() => setMini(!mini)}>{mini ? "Show tip" : "Hide tip"}</button> : null}
            <button type="button" className="tour-skip" onClick={() => close(false)}>{last ? "Close" : "Skip tutorial"}</button>
          </span>
        </div>
        <div className="tour-xp" aria-hidden="true"><i style={{ width: `${((idx + 1) / steps.length) * 100}%` }} /></div>
        <h2 id="tourTitle">{step.title(ctx)}</h2>
        <div className="tour-body">
          {step.custom
            ? <ProfileForm info={info} onDone={p => { bridge.setProfile(p); next(); }} />
            : step.body(ctx)}
        </div>
        <div className="tour-nav">
          <span className="tour-count">{idx + 1} / {steps.length}</span>
          <div>
            {idx > 0 && !last ? <button type="button" className="btn sm" onClick={back}>Back</button> : null}
            {step.custom
              ? <button type="button" className="btn sm" onClick={next}>Skip</button>
              : <button type="button" className={"btn " + (last ? "go" : "go sm")} onClick={next}>{step.cta?.(ctx) || "Next"}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
