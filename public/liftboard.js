(function(){
"use strict";
const DAY = 864e5, KEY = "liftboard.v2", LB = 2.20462;
const STREAK_XP = [20,25,30,40,50,60,150], MILES = [[7,"On fire",200],[30,"Unbreakable",500],[100,"Iron will",1500]], REF_XP = 250;
const LIFTS = [{name:"Squat",sym:"SQ",icon:"i-squat"},{name:"Bench Press",sym:"BP",icon:"i-bench"},{name:"Deadlift",sym:"DL",icon:"i-dead"},{name:"Overhead Press",sym:"OHP",icon:"i-bench"}];
const ARENA = LIFTS.slice(0,3);
const THEMES = {neon:{name:"Neon green",c:"#39ff14"},ice:{name:"Ice blue",c:"#20e3ff"},magenta:{name:"Magenta",c:"#ff3fd8"},amber:{name:"Amber",c:"#ffb21e"},mono:{name:"Monochrome",c:"#e9efeb"}};
// every lift has its own rank, from its best single divided by bodyweight; each rank has tiers 1, 2, 3
const RANKS = [
  {name:"Bronze",  c1:"#f0b07a", c2:"#7c3f19", fx:"embers"},
  {name:"Silver",  c1:"#f4f7fb", c2:"#6f7a8a", fx:"shine"},
  {name:"Gold",    c1:"#ffe28a", c2:"#b97a00", fx:"coins"},
  {name:"Platinum",c1:"#c8fff3", c2:"#2c9585", fx:"rings"},
  {name:"Diamond", c1:"#dcefff", c2:"#3f6fd0", fx:"shards"},
  {name:"Elite",   c1:"#ff8a80", c2:"#a8001c", fx:"flames"}
];
// × bodyweight where each rank starts: Bronze, Silver, Gold, Platinum, Diamond, Elite
const RANK_MIN = {"Squat":[0,1,1.5,1.9,2.25,2.5], "Bench Press":[0,.75,1,1.3,1.55,1.75], "Deadlift":[0,1.25,1.75,2.25,2.65,3]};
// every common lift gets a rank from its best set: weight × reps → estimated 1RM (Epley), divided by bodyweight.
// [name, group, short code, × bodyweight where Bronze..Elite start, options]
// bw: share of bodyweight you move on a bodyweight move (the logged weight is added weight); db: weight is per dumbbell
const CAT = [
  ["Squat","Legs","SQ"], ["Front Squat","Legs","FSQ",[0,.8,1.15,1.5,1.8,2.05]], ["Deadlift","Legs","DL"],
  ["Sumo Deadlift","Legs","SDL",[0,1.25,1.75,2.25,2.65,3]], ["Romanian Deadlift","Legs","RDL",[0,.9,1.3,1.7,2.05,2.4]],
  ["Trap Bar Deadlift","Legs","TBD",[0,1.3,1.85,2.35,2.8,3.15]], ["Hip Thrust","Legs","HT",[0,1,1.6,2.2,2.8,3.3]],
  ["Hip Abduction","Legs","HAB",[0,.5,.8,1.1,1.4,1.75]], ["Cable Hip Abduction","Legs","CHA",[0,.1,.17,.25,.33,.42]],
  ["Hip Adduction","Legs","HAD",[0,.5,.8,1.1,1.4,1.75]], ["Cable Hip Adduction","Legs","CHD",[0,.1,.17,.25,.33,.42]],
  ["Leg Press","Legs","LP",[0,1.6,2.5,3.4,4.3,5]], ["Hack Squat","Legs","HSQ",[0,1,1.5,2,2.5,3]],
  ["Bulgarian Split Squat","Legs","BSS",[0,.4,.7,1,1.3,1.6]], ["Walking Lunge","Legs","LNG",[0,.5,.8,1.1,1.4,1.7]],
  ["Goblet Squat","Legs","GSQ",[0,.3,.5,.7,.9,1.05],{db:1}], ["Leg Extension","Legs","LE",[0,.6,.9,1.2,1.5,1.8]],
  ["Leg Curl","Legs","LC",[0,.45,.7,.95,1.2,1.45]], ["Calf Raise","Legs","CR",[0,1,1.6,2.2,2.8,3.4]],
  ["Pistol Squat","Legs","PIS",[0,1.03,1.2,1.4,1.6,1.8],{bw:.95}],
  ["Bench Press","Push","BP"], ["Incline Bench Press","Push","IBP",[0,.65,.9,1.15,1.4,1.6]],
  ["Close-Grip Bench Press","Push","CGB",[0,.65,.9,1.15,1.4,1.6]], ["Dumbbell Bench Press","Push","DBP",[0,.3,.45,.6,.75,.9],{db:1}],
  ["Incline Dumbbell Press","Push","IDP",[0,.25,.4,.55,.68,.8],{db:1}], ["Overhead Press","Push","OHP",[0,.45,.65,.85,1.05,1.2]],
  ["Push Press","Push","PP",[0,.6,.85,1.1,1.3,1.5]], ["Dumbbell Shoulder Press","Push","DSP",[0,.2,.3,.42,.53,.65],{db:1}],
  ["Arnold Press","Push","ARN",[0,.17,.27,.37,.47,.57],{db:1}], ["Machine Chest Press","Push","MCP",[0,.6,.9,1.2,1.5,1.8]],
  ["Chest Fly","Push","FLY",[0,.12,.2,.28,.36,.45],{db:1}], ["Lateral Raise","Push","LR",[0,.08,.13,.18,.24,.3],{db:1}],
  ["Dips","Push","DIP",[0,1.1,1.4,1.75,2.1,2.4],{bw:1}], ["Push-ups","Push","PU",[0,.87,1.19,1.52,1.84,2.17],{bw:.65}],
  ["Pull-ups","Pull","PLU",[0,1.1,1.33,1.6,1.83,2.07],{bw:1}], ["Chin-ups","Pull","CHU",[0,1.13,1.37,1.65,1.9,2.13],{bw:1}],
  ["Muscle-ups","Pull","MU",[0,1.03,1.17,1.33,1.5,1.67],{bw:1}], ["Inverted Row","Pull","IR",[0,.8,1,1.2,1.4,1.6],{bw:.6}],
  ["Barbell Row","Pull","BR",[0,.65,.95,1.2,1.5,1.75]], ["Pendlay Row","Pull","PR",[0,.6,.9,1.15,1.4,1.65]],
  ["T-Bar Row","Pull","TBR",[0,.7,1,1.3,1.6,1.9]], ["Dumbbell Row","Pull","DBR",[0,.3,.5,.7,.9,1.05],{db:1}],
  ["Lat Pulldown","Pull","LPD",[0,.6,.9,1.15,1.4,1.65]], ["Seated Cable Row","Pull","SCR",[0,.6,.9,1.2,1.5,1.75]],
  ["Face Pull","Pull","FP",[0,.25,.4,.55,.7,.85]], ["Shrug","Pull","SHR",[0,1,1.5,2,2.5,3]],
  ["Barbell Curl","Arms","BC",[0,.35,.55,.75,.95,1.1]], ["EZ Bar Curl","Arms","EZC",[0,.33,.52,.72,.9,1.05]],
  ["Dumbbell Curl","Arms","DC",[0,.15,.25,.37,.48,.6],{db:1}], ["Hammer Curl","Arms","HC",[0,.17,.28,.4,.52,.63],{db:1}],
  ["Preacher Curl","Arms","PC",[0,.3,.48,.65,.82,1]], ["Concentration Curl","Arms","CC",[0,.12,.2,.3,.4,.5],{db:1}],
  ["Cable Curl","Arms","CBC",[0,.3,.5,.7,.9,1.05]], ["Tricep Pushdown","Arms","TPD",[0,.3,.5,.7,.9,1.1]],
  ["Skull Crusher","Arms","SK",[0,.25,.4,.55,.7,.85]], ["Overhead Tricep Extension","Arms","OTE",[0,.2,.33,.47,.6,.75],{db:1}],
  ["Wrist Curl","Arms","WC",[0,.25,.4,.55,.7,.85]],
  ["Hanging Leg Raise","Core","HLR",[0,.4,.49,.58,.7,.82],{bw:.35}], ["Ab Wheel Rollout","Core","ABW",[0,.38,.47,.58,.7,.82],{bw:.33}],
  ["Weighted Sit-up","Core","SU",[0,.33,.42,.52,.63,.75],{bw:.3}], ["Cable Crunch","Core","CCR",[0,.5,.8,1.1,1.4,1.7]],
  ["Power Clean","Olympic","PCL",[0,.65,.95,1.2,1.45,1.65]], ["Hang Clean","Olympic","HCL",[0,.6,.9,1.15,1.4,1.6]],
  ["Clean and Jerk","Olympic","CJ",[0,.65,.95,1.25,1.5,1.75]], ["Snatch","Olympic","SN",[0,.5,.75,1,1.2,1.4]]
];
const EX = {};
const GROUPS = ["Legs","Push","Pull","Arms","Core","Olympic"];
// a single lift at or above these multiples of bodyweight is elite and needs a video to count
const ELITE = {"Squat":2.5, "Bench Press":1.75, "Deadlift":3};
// practice rivals, in lb: tag, bodyweight, squat, bench, deadlift
CAT.forEach(([n, g, sym, m, o]) => { if (m && !RANK_MIN[n]) RANK_MIN[n] = m; EX[n] = {n, g, sym, f:(o && o.bw) || 0, db:!!(o && o.db)}; });
const BOTS = [["plate_tectonics",198,525,355,615],["hexbar_hana",132,285,165,355],["benchwarrant",221,505,405,560],["chalkbucket",176,425,285,505],
  ["squatch",242,600,385,650],["atlas.rx",165,405,275,485],["gainz_gwen",145,295,175,365],["deadlift_dev",189,415,275,585]];

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const z = n => String(n).padStart(2,"0");
const ymd = d => d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate());
const parse = s => { const [y,m,d] = String(s).split("-").map(Number); return new Date(y,(m||1)-1,d||1).getTime(); };
const today = () => ymd(new Date());
const daysAgo = n => ymd(new Date(parse(today()) - n*DAY));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = n => Math.round(n).toLocaleString();
const e1rm = (w,r) => r <= 1 ? w : w * (1 + r/30);
const uid8 = () => Math.random().toString(36).slice(2,10);
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const shortDate = t => { const d = new Date(t); return MON[d.getMonth()]+" "+d.getDate(); };
const num = (v, d=0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
function hexRgb(h){ const n = parseInt(h.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function rgba(h,a){ const [r,g,b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
function mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function hue(s){ let h = 0; for (const c of String(s)) h = (h*31 + c.charCodeAt(0)) >>> 0; return `hsl(${h%360} 55% 45%)`; }

/* units: everything is stored in kg */
const unit = () => state.settings.unit;
const toU = kg => unit() === "kg" ? kg : kg*LB;
const fromU = v => unit() === "kg" ? v : v/LB;
const W = kg => { const v = toU(kg); return (unit()==="kg" ? (Math.round(v*2)/2).toLocaleString() : fmt(v)); };
const WU = kg => W(kg) + " " + unit();

/* ---------- sample training data ---------- */
function seed(){
  const rnd = mulberry(20261007), lifts = [], foods = [];
  const cfg = {"Squat":[305,60],"Bench Press":[200,32],"Deadlift":[375,65],"Overhead Press":[120,18]};
  LIFTS.forEach((L,i) => {
    const [start,gain] = cfg[L.name];
    let d = 200 - i;
    while (d >= 1){
      let base = start + gain*(200-d)/200 + (rnd()-.5)*start*.07;
      if (rnd() < .1) base *= .9;
      const reps = [1,3,3,5,5,5,8][Math.floor(rnd()*7)];
      const lb = Math.round(base/(1+(reps<=1?0:reps/30))/5)*5;
      lifts.push({id:uid8(), date:daysAgo(d), ex:L.name, kg:lb/LB, reps, sets:reps===1?1:3, sample:true});
      d -= 3 + Math.floor(rnd()*4);
    }
  });
  const goals = {k:2650,p:190,c:290,f:80};
  const meals = [["Oats, whey, banana",.24],["Chicken burrito bowl",.3],["Salmon, rice, broccoli",.34],["Greek yogurt and berries",.12]];
  for (let d = 34; d >= 0; d--){
    if (d > 0 && rnd() < .08) continue;
    const bias = 1 + (rnd()-.5)*.22;
    (d === 0 ? meals.slice(0,2) : meals).forEach(([name,share]) => {
      const j = () => bias*(0.88 + rnd()*.24);
      foods.push({id:uid8(), date:daysAgo(d), name, p:Math.round(goals.p*share*j()*1.02), c:Math.round(goals.c*share*j()), f:Math.round(goals.f*share*j()), sample:true});
    });
  }
  return {version:2, profile:{tag:"", bw:183/LB}, goals, lifts, foods, prCount:0, localPr:null, settings:{unit:"lb", mode:"system", graph:"neon"}};
}
function loadLocal(){ try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.version === 2) return s; } catch(e){} return seed(); }
let state = loadLocal();
function ensureSeen(){ if (!state.seen || !state.seen.lifts) state.seen = {lifts:{}, lvl:(state.seen && state.seen.lvl) || xpInfo().lvl}; }
function syncSeen(doc){ ensureSeen(); const p = {bw:num(doc.bw), lifts:cleanLifts(doc.lifts), bot:false}; ARENA.forEach(A => { const rk = liftRank(p, A.name); if (rk && rk.score > (state.seen.lifts[A.name] ?? -1)) state.seen.lifts[A.name] = rk.score; }); }
ensureSeen();
let submitting = false;
const ui = {muscle:"", rkGroup:"All", rkEx:"", scope:"all", pendingRef:"", froze:0, lost:0, tab:"arena", ex:"Squat", metric:"e1rm", range:180, board:"total", claimLift:"Squat", ladderLift:"Squat", bots:null};
try { const b = localStorage.getItem(KEY+".bots"); if (b) ui.bots = b === "on"; } catch(e){}

/* ---------- accounts + shared board (db + user capabilities) ---------- */
let db = null, user = null, myId = null, cloud = false, canPost = true, me = null;
let remote = {};            // shared PR docs: id -> data
var social = {};            // shared social docs: id -> {tag, code, friends, ref}
let socialSent = "";
let people = {};            // id -> profile
let writing = Promise.resolve();
function save(){
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){}
  if (!cloud) return;
  pushSocial();
  const body = JSON.parse(JSON.stringify(state));
  writing = writing.then(() => db.doc("data/users/"+myId+"/state").set(body)).catch(e => {
    if (e && e.code === "quota_exceeded") toast("Storage is full. Delete some old entries to keep syncing.");
  });
}
(async function connect(){
  if (!window.claude || !window.claude.use) return;
  const [d,u] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
  user = u;
  if (u){ me = await u.me(); renderChrome(); }
  if (!d || !u) return;
  myId = await u.id();
  if (!myId) return;
  db = d; cloud = true;
  if (await u.can("data.write") === false) canPost = false;
  db.doc("data/users/"+myId+"/state").onSnapshot(s => {
    if (!s.exists || s.metadata.hasPendingWrites) return;
    const data = s.data();
    if (data && data.version === 2){ state = JSON.parse(JSON.stringify(data)); ensureSeen(); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){} if (checkStreak()) save(); applyTheme(); renderAll(); }
  }, () => {});
  db.collection("social").onSnapshot(q => {
    const next = {}; q.docs.forEach(doc => { next[doc.id] = doc.data(); });
    social = next;
    pushSocial();
    renderAll(); checkProgress();
  }, () => {});
  db.collection("prs").onSnapshot(q => {
    const next = {}; q.docs.forEach(doc => { next[doc.id] = doc.data(); });
    remote = next;
    const mineDoc = remote[myId];
    if (mineDoc && !submitting) syncSeen(mineDoc);
    renderAll();
  }, () => {});
  renderAll();
})();

function myPr(){ return cloud ? remote[myId] || null : state.localPr; }
function cleanLifts(l){ const out = {}; ARENA.forEach(A => { const e = l && l[A.name]; if (e && num(e.kg) > 0 && num(e.kg) < 700) out[A.name] = {kg:num(e.kg), date:String(e.date||""), proof:/^https:\/\/\S+$/.test(e.proof||"") ? e.proof : ""}; }); return out; }
function players(){
  const list = [];
  const real = cloud ? remote : (state.localPr ? {local:state.localPr} : {});
  Object.entries(real).forEach(([id,d]) => {
    if (!d || !(num(d.bw) > 20)) return;
    list.push({id, me: cloud ? id === myId : true, bot:false, tag:String(d.tag||"").slice(0,20), bw:num(d.bw), lifts:cleanLifts(d.lifts), history:Array.isArray(d.history) ? d.history.slice(0,10) : []});
  });
  const realCount = list.length;
  const showBots = ui.bots === null ? realCount < 4 : ui.bots;
  if (showBots) BOTS.forEach(([tag,bw,sq,bp,dl],i) => list.push({id:"bot-"+tag, bot:true, tag, bw:bw/LB,
    lifts:{"Squat":{kg:sq/LB,date:daysAgo(3+i*4)},"Bench Press":{kg:bp/LB,date:daysAgo(5+i*3)},"Deadlift":{kg:dl/LB,date:daysAgo(1+i*5)}},
    history:[{lift:"Deadlift",kg:dl/LB,at:daysAgo(1+i*5)},{lift:"Squat",kg:sq/LB,at:daysAgo(3+i*4)},{lift:"Bench Press",kg:bp/LB,at:daysAgo(5+i*3)}]}));
  return {list, realCount, showBots};
}
function nameOf(p){
  if (p.bot) return p.tag;
  if (p.tag) return p.tag;
  const pr = people[p.id];
  if (pr && pr.name) return pr.name;
  if (p.me) return (me && me.name) || "You";
  return "Lifter";
}
function avatar(p){
  const pr = !p.bot && people[p.id];
  if (pr && pr.avatarUrl && !pr.avatarUrl.startsWith("data:")) return `<img alt="" src="${esc(pr.avatarUrl)}">`;
  if (p.me && me && me.avatarUrl && !me.avatarUrl.startsWith("data:")) return `<img alt="" src="${esc(me.avatarUrl)}">`;
  return esc(nameOf(p).replace(/[^A-Za-z0-9]/g,"").slice(0,1).toUpperCase() || "?");
}
const avaBg = p => `background:${p.bot ? "#5b5873" : hue(p.id)}`;
async function resolvePeople(list){
  if (!user) return;
  const ids = list.filter(p => !p.bot && p.id !== "local").map(p => p.id);
  if (!ids.length) return;
  try { people = Object.assign(people, await user.profiles(ids)); } catch(e){}
}

/* ---------- derived stats ---------- */
function series(ex, metric){
  const byDay = {};
  state.lifts.filter(l => l.ex === ex).forEach(l => {
    const v = metric === "e1rm" ? e1rm(load(l),l.reps) : metric === "top" ? l.kg : l.kg*l.reps*l.sets;
    const cur = byDay[l.date];
    if (metric === "vol"){ if (cur){ cur.v += v; cur.n++; } else byDay[l.date] = {t:parse(l.date), v, set:l, n:1}; }
    else if (!cur || v > cur.v) byDay[l.date] = {t:parse(l.date), v, set:l};
  });
  return Object.values(byDay).sort((a,b) => a.t - b.t);
}
const inRange = (pts, days) => days ? pts.filter(p => p.t >= parse(today()) - days*DAY) : pts;
const load = (l, bw) => EX[l.ex] && EX[l.ex].f ? EX[l.ex].f*(bw || state.profile.bw) + l.kg : l.kg;
const best = ex => state.lifts.reduce((b,l) => l.ex === ex ? Math.max(b, e1rm(load(l),l.reps)) : b, 0);
const setTxt = l => EX[l.ex] && EX[l.ex].f ? (l.kg > 0 ? "BW+" + W(l.kg) : "BW") : W(l.kg);
function bestSet(ex){ let b = null, v = 0; state.lifts.forEach(l => { if (l.ex === ex){ const e = e1rm(load(l), l.reps); if (e > v){ v = e; b = l; } } }); return b ? {set:b, e1:v} : null; }
function logRank(ex){ const b = bestSet(ex); if (!b || !RANK_MIN[ex]) return null; const rk = rankFor(ex, b.e1, state.profile.bw); return rk && Object.assign(rk, {set:b.set, e1:b.e1}); }
// what it takes to reach ratio r (× bodyweight) on lift ex at bodyweight bw
function needFor(ex, r, bw, reps){
  const f = EX[ex] && EX[ex].f, tgt = r*bw;
  if (f){ if (reps === "bw") return Math.max(1, Math.ceil(30*(tgt/(f*bw) - 1))); return Math.max(0, tgt/(1 + (reps - 1 ? reps/30 : 0)) - f*bw); }
  return reps <= 1 ? tgt : tgt/(1 + reps/30);
}
const bestSingle = ex => state.lifts.reduce((b,l) => l.ex === ex && l.reps === 1 ? Math.max(b, l.kg) : b, 0);
const change = pts => pts.length < 2 ? null : {abs:pts[pts.length-1].v - pts[0].v, pct:pts[0].v ? (pts[pts.length-1].v - pts[0].v)/pts[0].v*100 : 0};
function dayTotals(date){ const t = {p:0,c:0,f:0,n:0}; state.foods.forEach(f => { if (f.date === date){ t.p+=f.p; t.c+=f.c; t.f+=f.f; t.n++; } }); t.k = t.p*4+t.c*4+t.f*9; return t; }
function dayScore(date){
  const t = dayTotals(date), g = state.goals; if (!t.n) return null;
  const dev = (a,b) => b ? (a-b)/b : 0, dp = dev(t.p,g.p);
  const pen = .4*Math.abs(dev(t.k,g.k)) + .3*(dp < 0 ? -dp : Math.max(0,dp-.1)*.5) + .15*Math.abs(dev(t.c,g.c)) + .15*Math.abs(dev(t.f,g.f));
  return Math.max(0, Math.round(100*(1 - pen*1.5)));
}
function adherence(days){ let sum = 0, logged = 0, protein = 0; for (let i = 1; i <= days; i++){ const d = daysAgo(i), s = dayScore(d); if (s !== null){ sum += s; logged++; if (dayTotals(d).p >= state.goals.p*.95) protein++; } } return {score:Math.round(sum/days), logged, protein}; }
const grade = s => s>=95?"A+":s>=90?"A":s>=85?"B+":s>=80?"B":s>=75?"C+":s>=70?"C":s>=60?"D":"F";
function totalOf(p){ return ARENA.every(A => counts(p, A.name)) ? ARENA.reduce((s,A) => s + p.lifts[A.name].kg, 0) : 0; }
function rankBand(lift, i){ const m = RANK_MIN[lift]; return [m[i], i < 5 ? m[i+1] : m[5] + (m[5] - m[4])]; }
function rankFor(lift, kg, bw){
  if (!(kg > 0 && bw > 0)) return null;
  const r = kg/bw; let i = 0; RANK_MIN[lift].forEach((m,k) => { if (r >= m) i = k; });
  const [lo, hi] = rankBand(lift, i), tier = Math.min(3, 1 + Math.floor((r - lo) / ((hi - lo)/3)));
  return {i, tier, name:RANKS[i].name, label:RANKS[i].name + " " + tier, ratio:r, score:i*3 + tier - 1, lift};
}
const liftRank = (p, lift) => p && counts(p, lift) ? rankFor(lift, p.lifts[lift].kg, p.bw) : null;
const rankFromScore = (score, lift) => ({i:Math.floor(score/3), tier:score%3 + 1, name:RANKS[Math.floor(score/3)].name, label:RANKS[Math.floor(score/3)].name + " " + (score%3 + 1), score, lift, ratio:0});
function nextTier(rk){
  if (rk.i === 5 && rk.tier === 3) return null;
  const [lo, hi] = rankBand(rk.lift, rk.i), band = (hi - lo)/3;
  return rk.tier < 3 ? {ratio:lo + band*rk.tier, label:RANKS[rk.i].name + " " + (rk.tier + 1)} : {ratio:hi, label:RANKS[rk.i+1].name + " 1"};
}
function nextRankNote(p){
  let bestN = null;
  ARENA.forEach(A => { const rk = liftRank(p, A.name), nt = rk && nextTier(rk); if (nt){ const need = nt.ratio*p.bw - p.lifts[A.name].kg; if (!bestN || need < bestN.need) bestN = {need, lift:A.name, label:nt.label}; } });
  if (!bestN) return "Every lift you've entered is Elite 3. Defend your podium spots.";
  return `${WU(Math.max(0.5/LB, bestN.need))} more on your ${shortLift(bestN.lift)} reaches ${bestN.label}.`;
}
const shortLift = n => n === "Bench Press" ? "bench" : n.toLowerCase();
const isElite = (lift, kg, bw) => bw > 0 && kg/bw >= RANK_MIN[lift][5];
const counts = (p, lift) => { const e = p.lifts[lift]; return !!e && (p.bot || !isElite(lift, e.kg, p.bw) || !!e.proof); };
function star(cx, cy, ro, ri, n){ let d = ""; for (let k = 0; k < n*2; k++){ const r = k%2 ? ri : ro, a = Math.PI*k/n - Math.PI/2; d += (k ? "L" : "M") + (cx + r*Math.cos(a)).toFixed(1) + " " + (cy + r*Math.sin(a)).toFixed(1); } return d + "Z"; }
// scalloped medallion: n lobes around (cx, cy)
function rosette(cx, cy, r, n){
  const pt = k => { const a = Math.PI*2*k/n - Math.PI/2; return [(cx + r*Math.cos(a)).toFixed(1), (cy + r*Math.sin(a)).toFixed(1)]; };
  const rr = (r*Math.sin(Math.PI/n)*1.12).toFixed(1);
  let d = "M" + pt(0).join(" ");
  for (let k = 1; k <= n; k++) d += `A${rr} ${rr} 0 0 1 ${pt(k).join(" ")}`;
  return d + "Z";
}
const SHAPES = {
  coin:"M50 9A46 46 0 1 1 49.9 9Z",
  rosette:rosette(50, 55, 45, 14),
  shield:"M50 4L92 18V55C92 80 72 97 50 106C28 97 8 80 8 55V18Z",
  crest:"M50 4L62 12L76 5L92 18V55C92 80 72 97 50 106C28 97 8 80 8 55V18L24 5L38 12Z",
  hex:"M50 3L94 28V82L50 107L6 82V28Z",
  gem:"M28 6H72L96 34L50 107L4 34Z",
  burst:star(50,55,52,40,10)
};
// tier frame: a thin arc bracket each side from tier 2, a second outer arc at tier 3
const FRAME = ["M12 10A56 56 0 0 0 12 100", "M3 2A68 68 0 0 0 3 108"];
/* Badge anatomy. Rank sets the shape and ornaments: Bronze a coin, Silver a shield, Gold a scalloped medallion with a star,
   Platinum a hex with gems, Diamond a cut gem with sparkles, Elite a burst with a crown and flames.
   Tier sets the prestige: chevrons (1-3), an arc frame from tier 2, double frame + crown + aura at tier 3. */
// gradient ids are numbered per render pass, so a badge never borrows a gradient from a hidden or collapsed copy
let embP = "x", embN = 0;
function emblem(i, size, locked, tier){
  const R = RANKS[i], t = tier || 0, k = `${embP}${embN++}`;
  const shape = SHAPES[["coin","shield","rosette","hex","gem","burst"][i]];
  const anim = size >= 40 && !locked && !reduceMotion(), big = size >= 30;
  const scaled = sc => `transform="translate(50 55) scale(${sc}) translate(-50 -55)"`;
  const aura = t >= 2 && big ? `<circle cx="50" cy="55" r="${t === 3 ? 70 : 58}" fill="url(#a${k})" opacity="${t === 3 ? .9 : .45}">${anim && t === 3 ? `<animate attributeName="opacity" values=".5;.95;.5" dur="3s" repeatCount="indefinite"/>` : ""}</circle>` : "";
  const flames = i === 5 ? `<path d="M50 -12C57 2 70 6 68 24C76 16 79 8 78 0C90 16 92 40 82 58H18C8 40 10 16 22 0C21 8 24 16 32 24C30 6 43 2 50 -12Z" fill="url(#f${k})" opacity=".9">${anim ? `<animate attributeName="opacity" values=".7;.95;.6;.9;.7" dur="1.4s" repeatCount="indefinite"/>` : ""}</path>` : "";
  const wings = t >= 2 ? [0,1].map(side => `<g${side ? ' transform="translate(100 0) scale(-1 1)"' : ""}>`
    + FRAME.slice(0, t === 3 ? 2 : 1).map((d, n) => `<path d="${d}" fill="none" stroke="rgba(0,0,0,.5)" stroke-width="${n ? 2.4 : 3.6}"/><path d="${d}" fill="none" stroke="url(#w${k})" stroke-width="${n ? 1.2 : 2.2}" opacity="${n ? .75 : 1}"/>`).join("")
    + `<path d="M12 4l3.2 6-3.2 6-3.2-6zM12 94l3.2 6-3.2 6-3.2-6z" fill="url(#p${k})" stroke="rgba(0,0,0,.45)" stroke-width=".6"/><path d="M-12 51l2.6 4-2.6 4-2.6-4z" fill="${R.c1}"/></g>`).join("") : "";
  const facets = i === 4 ? `<path d="M28 6L40 34L50 6L60 34L72 6M4 34H96M40 34L50 107L60 34" fill="none" stroke="rgba(255,255,255,.4)" stroke-width=".9"/>` : "";
  const rim = `<path d="${shape}" fill="none" stroke="${i ? R.c1 : "rgba(255,235,210,.55)"}" stroke-width="${i ? 1.4 : 1}" opacity=".85" ${scaled(.88)}/>`;
  // three tier slots, lit up to the current tier, so tiers read at a glance
  const chevrons = t ? [0,1,2].map(n => `<path d="M39 ${75 + n*6.5}L50 ${80.5 + n*6.5}L61 ${75 + n*6.5}" fill="none" stroke="${n < t ? R.c1 : "rgba(255,255,255,.14)"}" stroke-width="2.3" stroke-linecap="butt" stroke-linejoin="miter"/>`).join("") : "";
  const crown = i === 5 || t === 3;
  const gems = i === 3 ? [30,70].map(x => `<path d="M${x} 1l3.5 5-3.5 5-3.5-5z" fill="#fff" stroke="${R.c2}" stroke-width=".8"/>`).join("") : "";
  const crownSvg = crown ? `<path d="M35 3L37 -7L43.5 -1L50 -11L56.5 -1L63 -7L65 3Z" fill="url(#w${k})" stroke="rgba(0,0,0,.55)" stroke-width="1" stroke-linejoin="miter"/><path d="M35 3H65" stroke="${i === 5 ? "#ffd36b" : R.c1}" stroke-width="1.6"/><path d="M50 -5l2 2.6-2 2.6-2-2.6z" fill="${i === 5 ? "#ffd36b" : "#fff"}"/>` : "";
  const shimmer = anim && i >= 2 ? `<g clip-path="url(#c${k})"><rect x="-80" y="-10" width="26" height="130" fill="url(#s${k})" transform="skewX(-18)"><animate attributeName="x" values="-80;190" dur="${i >= 4 ? 2.6 : 3.6}s" repeatCount="indefinite"/></rect></g>` : "";
  const sparkles = anim && i >= 4 ? [[12,18,0],[90,28,.8],[84,94,1.6]].map(([x,y,d]) => `<path d="${star(x,y,6,1.1,4)}" fill="#fff" opacity="0"><animate attributeName="opacity" values="0;1;0" dur="2.6s" begin="${d}s" repeatCount="indefinite"/></path>`).join("") : "";
  const W = Math.round(size*1.52), H = Math.round(size*1.36), VB = 'viewBox="-26 -16 152 136" aria-hidden="true"';
  const defs = `<defs>
      <linearGradient id="g${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${R.c1}"/><stop offset=".38" stop-color="${R.c2}"/><stop offset=".52" stop-color="${R.c1}"/><stop offset=".7" stop-color="${R.c2}"/><stop offset="1" stop-color="${R.c2}"/></linearGradient>
      <linearGradient id="w${k}" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${R.c1}"/><stop offset=".55" stop-color="${R.c2}"/><stop offset="1" stop-color="${R.c1}" stop-opacity=".7"/></linearGradient>
      <radialGradient id="a${k}"><stop offset="0" stop-color="${R.c1}" stop-opacity=".55"/><stop offset="1" stop-color="${R.c1}" stop-opacity="0"/></radialGradient>
      <radialGradient id="d${k}" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="${R.c2}" stop-opacity=".35"/><stop offset="1" stop-color="#05030c" stop-opacity=".82"/></radialGradient>
      <linearGradient id="h${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="p${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="${R.c1}"/><stop offset="1" stop-color="${R.c2}"/></linearGradient>
      <linearGradient id="s${k}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="f${k}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff1f3d"/><stop offset=".6" stop-color="#ff5a36" stop-opacity=".8"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></linearGradient>
      <clipPath id="c${k}"><path d="${shape}"/></clipPath>
      <linearGradient id="bv${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient>
      <linearGradient id="iv${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></linearGradient>
      <linearGradient id="e${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${R.c2}"/><stop offset="1" stop-color="#0b0612"/></linearGradient>
    </defs>`;
  const back = `${aura}${big ? `<ellipse cx="50" cy="113" rx="36" ry="5" fill="#000" opacity=".28"/>` : ""}${flames}${wings}`, edge = `<path d="${shape}" fill="url(#e${k})" stroke="rgba(0,0,0,.6)" stroke-width="1.2" transform="translate(0 4.5)"/>`;
  const face = `    <path d="${shape}" fill="url(#g${k})" stroke="rgba(0,0,0,.55)" stroke-width="1.6" stroke-linejoin="miter"/>
    <path d="${shape}" fill="url(#h${k})"/>
    <path d="${shape}" fill="none" stroke="url(#bv${k})" stroke-width="3.2" ${scaled(.95)}/>
    ${facets}${rim}
    <path d="${shape}" fill="url(#d${k})" stroke="rgba(0,0,0,.4)" stroke-width="1" ${scaled(.74)}/>
    <path d="${shape}" fill="none" stroke="url(#iv${k})" stroke-width="2.4" ${scaled(.75)}/>`;
  const relief = `    <g fill="#000" opacity=".45" transform="translate(.6 1.6)"><rect x="29" y="51" width="42" height="3.2" rx=".8"/><rect x="26" y="42" width="6" height="21" rx="1"/><rect x="68" y="42" width="6" height="21" rx="1"/><rect x="20.5" y="46" width="5" height="13" rx="1"/><rect x="74.5" y="46" width="5" height="13" rx="1"/></g>
    <g fill="url(#p${k})" stroke="rgba(0,0,0,.35)" stroke-width=".6"><rect x="29" y="51" width="42" height="3.2" rx=".8"/><rect x="26" y="42" width="6" height="21" rx="1"/><rect x="68" y="42" width="6" height="21" rx="1"/><rect x="20.5" y="46" width="5" height="13" rx="1"/><rect x="74.5" y="46" width="5" height="13" rx="1"/></g>
    ${i >= 2 ? `<path d="${star(50,30,6,2.4,5)}" fill="url(#p${k})" stroke="rgba(0,0,0,.3)" stroke-width=".5"/>` : ""}
    ${chevrons}${gems}`;
  const top = `    ${crownSvg}
    <ellipse cx="32" cy="22" rx="15" ry="4.5" fill="#fff" opacity=".22" transform="rotate(-32 32 22)" clip-path="url(#c${k})"/>
    ${shimmer}${sparkles}`;
  if (size < 40 || locked) return `<svg class="emb${locked ? " locked" : ""}" width="${W}" height="${H}" ${VB}>${defs}${back}${edge}${face}${relief}${top}</svg>`;
  // big badges are real 3D: separate layers at different depths plus stacked slices for a solid edge
  const L = (z, inner) => `<svg class="emb" width="${W}" height="${H}" ${VB} style="transform:translateZ(${(z*size/50).toFixed(2)}px)">${inner}</svg>`;
  const slices = Array.from({length:7}, (_,n) => L(-(n + 1)*.85, `<path d="${shape}" fill="url(#e${k})" stroke="rgba(0,0,0,.5)" stroke-width="1"/>`)).join("");
  return `<span class="e3d" style="width:${W}px;height:${H}px;--i3:${(i*.9 + t*.4).toFixed(1)}s"><span class="e3i">${L(-9, defs + back)}${slices}${L(0, face)}${L(4.5, relief)}${L(9, top)}</span></span>`;
}
const crownSvg = (cls, w) => { const c = "cg-" + cls; return `<svg class="${cls}" viewBox="-2 -4 104 80" aria-hidden="true"${w ? ` width="${w}" height="${Math.round(w*.77)}"` : ""}><defs>
  <linearGradient id="${c}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b8"/><stop offset=".5" stop-color="#ffc531"/><stop offset="1" stop-color="#a06800"/></linearGradient>
  <linearGradient id="${c}x" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
  <linearGradient id="${c}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6cf"/><stop offset=".3" stop-color="#ffd257"/><stop offset=".7" stop-color="#c88a00"/><stop offset="1" stop-color="#7a4c00"/></linearGradient>
  <radialGradient id="${c}r" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ff8a9a"/><stop offset=".5" stop-color="#d0102e"/><stop offset="1" stop-color="#5a0010"/></radialGradient>
  <radialGradient id="${c}u" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#b8f2ff"/><stop offset=".5" stop-color="#1f8fd0"/><stop offset="1" stop-color="#062a55"/></radialGradient>
  <radialGradient id="${c}p" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#ffe9a8"/><stop offset="1" stop-color="#b98a2a"/></radialGradient></defs>
  <ellipse cx="50" cy="72" rx="44" ry="3.5" fill="#000" opacity=".3"/>
  <path d="M10 44Q50 32 90 44V60H10Z" fill="#6b4300"/><path d="M14 46Q50 36 86 46" stroke="#3d2600" stroke-width="2" fill="none" opacity=".7"/>
  <path d="M8 62L2 14L30 36L50 4L70 36L98 14L92 62Z" fill="#6b4300" transform="translate(0 3)"/>
  <path d="M8 62L2 14L30 36L50 4L70 36L98 14L92 62Z" fill="url(#${c})" stroke="#5c3900" stroke-width="1.4" stroke-linejoin="miter"/>
  <path d="M8 62L2 14L30 36L50 4L70 36L98 14L92 62Z" fill="url(#${c}x)"/>
  <path d="M5 18L28 38M50 8L50 34M95 18L72 38" stroke="#fff3b8" stroke-width=".8" opacity=".5"/>
  <rect x="7" y="61" width="86" height="12" rx="1.5" fill="#6b4300"/>
  <rect x="7" y="57" width="86" height="12" rx="1.5" fill="url(#${c}b)" stroke="#5c3900" stroke-width="1.4"/>
  <path d="M9 59.5H91" stroke="#fff6cf" stroke-width=".9" opacity=".8"/>
  <circle cx="27" cy="63" r="3.3" fill="url(#${c}u)" stroke="#5c3900" stroke-width=".7"/><circle cx="73" cy="63" r="3.3" fill="url(#${c}u)" stroke="#5c3900" stroke-width=".7"/><circle cx="50" cy="63" r="3.6" fill="url(#${c}r)" stroke="#5c3900" stroke-width=".7"/>
  <path d="M50 30l7.5 9-7.5 9.5-7.5-9.5z" fill="url(#${c}r)" stroke="#5c3900" stroke-width="1"/><path d="M50 30l7.5 9H42.5z" fill="#fff" opacity=".28"/><path d="M50 39v9.5" stroke="#5a0010" stroke-width=".6" opacity=".6"/>
  <circle cx="2" cy="14" r="3.2" fill="url(#${c}p)" stroke="#7a4c00" stroke-width=".6"/><circle cx="50" cy="4" r="3.8" fill="url(#${c}p)" stroke="#7a4c00" stroke-width=".6"/><circle cx="98" cy="14" r="3.2" fill="url(#${c}p)" stroke="#7a4c00" stroke-width=".6"/>
  <circle cx="26" cy="62" r=".9" fill="#fff"/><circle cx="72" cy="62" r=".9" fill="#fff"/><circle cx="49" cy="62" r="1" fill="#fff"/><circle cx="48" cy="34" r="1.1" fill="#fff"/></svg>`; };
const MEDAL = [null, ["#ffe28a","#b97a00"], ["#f4f7fb","#6f7a8a"], ["#f0b07a","#7c3f19"], ["#ffd36b","#9a5c00"]];
// achievement difficulty: 1 easy (bronze), 2 medium (silver), 3 hard (gold with rays), 4 legendary (gold star with red enamel)
const DIFF = [null, {name:"Easy", m:3, rib:["#13306b","#2a56b0"], stripe:null}, {name:"Medium", m:2, rib:["#0f4d36","#1f8a5f"], stripe:"#ffffff"},
  {name:"Hard", m:1, rib:["#5e0a1e","#a3122f"], stripe:"#ffe28a"}, {name:"Legendary", m:4, rib:["#140608","#3a0d16"], stripe:"#ff1f3d"}];
// struck medal: crossed ribbon, ring loop, knurled rim, recessed face with a laurel and an embossed numeral (or star)
// satin ribbon: two crossing straps with sheen, woven edge stripes, a centre stripe, cast shadow, a metal clasp and jump ring
function ribbon(k, ry, stripe, metal){
  const strap = (x0, x1, x2, x3) => `M${x0} ${ry}H${x1}L${x2} 30H${x3}Z`;
  const edge = (xa, xb) => `M${xa} ${ry}L${xb} 30`;
  const L = {o:[20,42,60,40], st:[[23,43],[39,57]], c:[31,50]}, Rt = {o:[80,58,40,60], st:[[77,57],[61,43]], c:[69,50]};
  const draw = (S, front) => `<path d="${strap(...S.o)}" fill="url(#r${k})"/><path d="${strap(...S.o)}" fill="url(#sa${k})"/>`
    + (stripe ? `<path d="${edge(...S.st[0])}M${S.st[1][0]} ${ry}L${S.st[1][1]} 30" stroke="${stripe}" stroke-width="1.3" opacity=".9"/><path d="${edge(S.c[0], S.c[1])}" stroke="${stripe}" stroke-width="3.2" opacity=".85"/>` : `<path d="${edge(...S.st[0])}M${S.st[1][0]} ${ry}L${S.st[1][1]} 30" stroke="rgba(255,255,255,.35)" stroke-width=".9"/>`)
    + `<path d="${strap(...S.o)}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".6"/>${front ? "" : `<path d="${strap(...S.o)}" fill="#000" opacity=".22"/>`}`;
  return `<defs><linearGradient id="sa${k}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".35" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity=".05"/><stop offset=".8" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
    <linearGradient id="cl${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="${metal}"/><stop offset="1" stop-color="#4a3410"/></linearGradient></defs>
    ${draw(Rt, false)}<path d="${strap(...L.o)}" fill="#000" opacity=".35" transform="translate(2 1.2)"/>${draw(L, true)}
    <path d="M38 28h24l-2 6H40z" fill="url(#cl${k})" stroke="rgba(0,0,0,.5)" stroke-width=".6"/><path d="M39.5 29.3h21" stroke="#fff" stroke-opacity=".7" stroke-width=".7"/>
    <circle cx="50" cy="35.6" r="3.2" fill="none" stroke="url(#cl${k})" stroke-width="1.8"/><circle cx="50" cy="35.6" r="3.2" fill="none" stroke="rgba(0,0,0,.4)" stroke-width=".4"/>`;
}
function medalArt(place, size, opts = {}){
  const D = opts.diff ? DIFF[opts.diff] : null; if (D) place = D.m;
  const [a, b] = MEDAL[place], k = `m${embP}${embN++}`, ry = opts.long ? -70 : 0, vb = opts.long ? "0 -70 100 172" : "-6 0 112 112";
  const tone = place === 1 || place === 4 ? "#fff6cf" : place === 2 ? "#ffffff" : "#ffd9b8";
  const legend = opts.diff === 4, plain = opts.diff === 1, rays = opts.diff >= 3;
  const outline = legend ? star(50,66,37,30,8) : "M50 34a32 32 0 1 1-.01 0Z";
  const knurl = Array.from({length:56}, (_,n) => { const t = n/56*Math.PI*2, c = Math.cos(t), s2 = Math.sin(t); return `M${(50+29.6*c).toFixed(2)} ${(66+29.6*s2).toFixed(2)}L${(50+32*c).toFixed(2)} ${(66+32*s2).toFixed(2)}`; }).join("");
  // laurel sprigs rising from the bottom up each side
  const leaves = [-1,1].map(side => Array.from({length:7}, (_,n) => { const th = (34 + n*17)*Math.PI/180, x = 50 + side*20.5*Math.sin(th), y = 66 + 20.5*Math.cos(th);
    const ang = Math.atan2(-Math.sin(th), side*Math.cos(th))*180/Math.PI - 90 + side*28; return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="1.7" ry="4" transform="rotate(${ang.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`; }).join("")).join("");
  const mark = opts.star && legend ? `<path d="${star(50,67,12,5,5)}" fill="#ffd36b" stroke="#5c3900" stroke-width=".8"/><path d="${star(50,67,12,5,5)}" fill="#fff" opacity=".25" transform="translate(-.6 -.8)"/>` : opts.star ? `<path d="${star(50,67,11,4.6,5)}" fill="url(#f${k})" stroke="rgba(0,0,0,.35)" stroke-width=".6"/>`
    : `<text x="50" y="76.6" text-anchor="middle" font-family="Russo One, sans-serif" font-size="26" fill="${tone}" opacity=".45">${place}</text><text x="50" y="75.6" text-anchor="middle" font-family="Russo One, sans-serif" font-size="26" fill="url(#n${k})">${place}</text>`;
  return `<svg class="medal" width="${size}" height="${Math.round(size*(opts.long ? 1.72 : 1))}" viewBox="${vb}" aria-hidden="true"><defs>
    <linearGradient id="g${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tone}"/><stop offset=".3" stop-color="${a}"/><stop offset=".62" stop-color="${b}"/><stop offset=".8" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <radialGradient id="f${k}" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="${tone}"/><stop offset=".45" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>
    <linearGradient id="n${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="#2a1a00" stop-opacity=".85"/></linearGradient>
    <linearGradient id="h${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="r${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${D ? D.rib[0] : "#5e0a1e"}"/><stop offset="1" stop-color="${D ? D.rib[1] : "#a3122f"}"/></linearGradient>
    <radialGradient id="re${k}" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ff7a8a"/><stop offset=".5" stop-color="#c8102e"/><stop offset="1" stop-color="#4a0010"/></radialGradient>
    <radialGradient id="ra${k}"><stop offset="0" stop-color="${legend ? "#ff1f3d" : a}" stop-opacity=".7"/><stop offset="1" stop-color="${legend ? "#ff1f3d" : a}" stop-opacity="0"/></radialGradient>
    <clipPath id="c${k}"><circle cx="50" cy="66" r="32"/></clipPath>
    <linearGradient id="bv${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
    <linearGradient id="iv${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></linearGradient>
    <linearGradient id="e${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="#140b02"/></linearGradient></defs>
    ${ribbon(k, ry, D ? D.stripe : a, a)}
    ${rays ? `<circle cx="50" cy="66" r="48" fill="url(#ra${k})"/><g fill="${legend ? "#ff5a5a" : a}" opacity=".55">${Array.from({length:16}, (_,n) => `<path d="M50 66L48.2 20H51.8Z" transform="rotate(${n*22.5} 50 66)"/>`).join("")}</g>` : ""}
    <path d="${outline}" fill="url(#e${k})" stroke="rgba(0,0,0,.6)" stroke-width=".8" transform="translate(0 4)"/>
    <path d="${outline}" fill="url(#g${k})" stroke="rgba(0,0,0,.5)" stroke-width=".8"/>
    <path d="${outline}" fill="none" stroke="url(#bv${k})" stroke-width="2.6" transform="translate(50 66) scale(.955) translate(-50 -66)"/>
    ${plain || legend ? "" : `<path d="${knurl}" stroke="rgba(0,0,0,.28)" stroke-width=".7"/>`}
    <circle cx="50" cy="66" r="${legend ? 22 : 26.5}" fill="url(#${legend ? "re" : "f"}${k})" stroke="rgba(0,0,0,.35)" stroke-width="1"/>
    <circle cx="50" cy="66" r="${legend ? 21.2 : 25.6}" fill="none" stroke="url(#iv${k})" stroke-width="2"/>
    <ellipse cx="38" cy="50" rx="13" ry="4" fill="#fff" opacity=".28" transform="rotate(-35 38 50)"/>
    ${plain || legend ? "" : `<g fill="${b}" stroke="rgba(0,0,0,.25)" stroke-width=".3" opacity=".75">${leaves}</g>`}
    ${mark}
    <path d="M18 66a32 32 0 0 1 64 0z" fill="url(#h${k})" clip-path="url(#c${k})"/>
    ${opts.long ? `<g clip-path="url(#c${k})"><rect class="glint" x="-40" y="20" width="22" height="90" fill="#fff" opacity=".7" transform="skewX(-20)"/></g>` : ""}
  </svg>`;
}
const medalSvg = (place, size) => medalArt(place, size, {long:true});
const BOARDN = {total:"Total strength", p4p:"Pound for pound"};
// every podium position I hold, keyed "board|lift"
function myPlaces(list){
  const out = {};
  ["total","p4p"].forEach(b => ARENA.forEach(A => { const i = ranked(A.name, b, list).findIndex(r => r.p.me); if (i >= 0) out[b+"|"+A.name] = {place:i+1, rows:ranked(A.name, b, list)}; }));
  return out;
}
// compare with what this person last saw; celebrate climbs, warn on drops
function trackPlaces(list, showBots){
  ensureSeen();
  const cur = myPlaces(list), tag = showBots ? "b" : "r";
  const now = {}; Object.entries(cur).forEach(([k,v]) => now[k] = v.place);
  const seen = state.seen.places;
  if (!seen || seen.tag !== tag){ state.seen.places = {tag, at:now}; save(); return; }
  const prev = seen.at, q = [], notes = [];
  ARENA.forEach(A => {
    const ups = [];
    ["total","p4p"].forEach(b => {
      const k = b+"|"+A.name, was = prev[k] ?? 99, is = now[k] ?? 99;
      if (is < was && is <= 3) ups.push({b, is, was, rows:cur[k].rows});
      if (was === 1 && is > 1){ const r = cur[k] && cur[k].rows[0]; notes.push(`${r ? nameOf(r.p) : "Someone"} took your ${shortLift(A.name)} crown on ${BOARDN[b].toLowerCase()}. Win it back.`); }
      else if (was <= 3 && is > 3) notes.push(`You got knocked off the ${shortLift(A.name)} podium on ${BOARDN[b].toLowerCase()}.`);
    });
    if (!ups.length) return;
    const crowns = ups.filter(u => u.is === 1);
    if (crowns.length){
      const dethroned = crowns.map(u => u.rows[1] && u.was !== 1 ? u.rows[1].p : null).find(Boolean);
      const meP = list.find(p => p.me);
      q.push({kind:"crown", lift:A.name, boards:crowns.map(u => u.b), from:dethroned ? nameOf(dethroned) : "", fromP:dethroned || null});
    } else {
      const best = ups.reduce((a,u) => u.is < a.is ? u : a);
      q.push({kind:"podium", lift:A.name, place:best.is, boards:ups.filter(u => u.is === best.is).map(u => u.b)});
    }
  });
  state.seen.places = {tag, at:now}; save();
  if (notes.length) toast(notes[0]);
  if (q.length) celebrate(q);
}
function xpInfo(){
  const days = new Set(state.foods.map(f => f.date)).size;
  let xp = state.lifts.length*10 + num(state.prCount)*100 + days*5 + num(state.bonusXp) + (state.refBy ? REF_XP : 0) + myReferrals().length*REF_XP, lvl = 1, need = 150;
  while (xp >= need){ xp -= need; lvl++; need = Math.round(need*1.2); }
  return {lvl, xp, need};
}

/* ---------- daily streak ---------- */
const flameSvg = (tone) => { const g = tone === 3 ? ["#e8f4ff","#7fb8ff","#2a62d8"] : tone === 2 ? ["#fff1a8","#ff7a1a","#c3130f"] : ["#fff4b8","#ffb02e","#e2520f"];
  const id = "fl" + (++embN) + embP;
  return `<svg class="flame" viewBox="0 0 60 66" aria-hidden="true"><defs><linearGradient id="${id}o" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${g[2]}"/><stop offset=".6" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[1]}" stop-opacity=".9"/></linearGradient><linearGradient id="${id}i" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[0]}"/></linearGradient></defs>
  <path class="fo" d="M30 2C33 14 47 20 49 36c2 15-8 27-19 27S9 52 11 38c1-9 7-12 8-21 4 5 5 9 5 12 4-8 9-15 6-27z" fill="url(#${id}o)"/>
  <path class="fi" d="M30 24c2 8 11 13 11 24 0 8-5 12-11 12s-11-4-11-11c0-6 4-8 5-13 2 3 3 5 3 7 3-5 5-11 3-19z" fill="url(#${id}i)"/></svg>`; };
const chestSvg = `<svg viewBox="0 0 28 26" aria-hidden="true"><path d="M3 11h22v12H3z" fill="#a8641c"/><path d="M3 11c0-6 4-8 11-8s11 2 11 8z" fill="#cf8a2e"/><path d="M3 11h22v3H3z" fill="#ffc531"/><path d="M12 12h4v6h-4z" fill="#ffe27a" stroke="#946400" stroke-width=".8"/><path d="M6 3.5v19M22 3.5v19" stroke="#ffc531" stroke-width="1.6" opacity=".8"/></svg>`;
const snowSvg = on => `<svg viewBox="0 0 16 16" class="${on ? "" : "off"}" aria-hidden="true"><path d="M8 1v14M2 4.5l12 7M2 11.5l12-7" stroke="#9fd3ff" stroke-width="1.8" stroke-linecap="round"/></svg>`;
function ensureStreak(){
  if (!state.streak) state.streak = {count:0, best:0, last:"", claimed:"", freezes:0};
  if (!Array.isArray(state.friends)) state.friends = [];
}
function checkStreak(){
  ensureStreak();
  const st = state.streak, t = today();
  if (st.last === t) return false;
  const gap = st.last ? Math.round((parse(t) - parse(st.last))/DAY) : 99;
  if (gap <= 0) return false;
  ui.froze = 0; ui.lost = 0;
  if (gap === 1) st.count++;
  else if (gap - 1 <= st.freezes){ ui.froze = gap - 1; st.freezes -= gap - 1; st.count++; }
  else { ui.lost = st.count > 1 ? st.count : 0; st.count = 1; }
  st.last = t; st.best = Math.max(st.best, st.count);
  if (st.count % 7 === 0 && st.freezes < 2) st.freezes++;
  return true;
}
const streakTone = n => n >= 30 ? 3 : n >= 7 ? 2 : 1;
const dayReward = n => STREAK_XP[(Math.max(1, n) - 1) % 7];
const mileBonus = n => (MILES.find(m => m[0] === n) || [0,"",0])[2];
function weekCells(n, claimedToday){
  const start = n - ((n - 1) % 7);
  return STREAK_XP.map((xp, k) => { const d = start + k, done = d < n || (d === n && claimedToday), now = d === n;
    return `<div class="day ${done ? "done" : ""} ${now ? "now" : ""} ${k === 6 ? "chest" : ""}" style="--k:${k}"><span class="dn"><span class="dw">DAY </span>${d}</span>${k === 6 ? chestSvg : ""}<span class="dx">+${xp}</span></div>`; }).join("");
}
function claimDaily(){
  ensureStreak();
  const st = state.streak, t = today();
  if (st.claimed === t || st.last !== t) return 0;
  const gain = dayReward(st.count) + mileBonus(st.count);
  state.bonusXp = num(state.bonusXp) + gain; st.claimed = t;
  save(); renderAll();
  return gain;
}
let dailyShown = false;
function showDaily(){
  ensureStreak();
  const st = state.streak, ov = $("daily");
  if (st.claimed === today() || dailyShown) return;
  dailyShown = true;
  const n = st.count, tone = streakTone(n), m = mileBonus(n);
  embP = "d"; embN = 0;
  const sub = ui.lost ? `Your ${ui.lost}-day streak ended. A new one starts today. Every 7 days you earn a freeze that saves a missed day.`
    : ui.froze ? `A streak freeze saved your streak. ${st.freezes} freeze${st.freezes === 1 ? "" : "s"} left.`
    : n === 1 ? "Come back every day. The rewards grow all week, and day 7 opens the chest."
    : (n % 7 === 0 ? "Chest day. " : "") + (m ? `${n} days straight unlocks a ${m} XP milestone bonus.` : `Come back tomorrow for +${dayReward(n+1)} XP.`);
  ov.className = "daily" + (tone === 3 ? " t3" : "");
  ov.innerHTML = `<div class="dl-in"><div class="kick">DAILY BONUS</div><div class="bigflame">${flameSvg(tone)}<b>${n}</b></div>
    <h2 id="dlH">${n === 1 ? "Day 1. Let's build it." : n + "-day streak"}</h2><p class="sub">${sub}</p>
    <div class="week">${weekCells(n, false)}</div>
    <button class="btn go" id="dlGo" type="button">Claim +${dayReward(n) + m} XP</button></div>`;
  ov.hidden = false;
  $("dlGo").onclick = () => {
    const b = $("dlGo");
    if (b.dataset.done){ ov.hidden = true; ov.innerHTML = ""; checkProgress(); return; }
    const gain = claimDaily(); b.dataset.done = 1; b.textContent = "Let's go";
    const cell = ov.querySelector(".day.now"); if (cell){ cell.classList.add("done","stamp"); }
    const inn = ov.querySelector(".dl-in"); inn.classList.add("boost");
    const g = document.createElement("div"); g.className = "gain"; g.textContent = "+" + gain + " XP"; inn.appendChild(g);
    if (!reduceMotion()) for (let i = 0; i < 18; i++){ const c = document.createElement("i"); c.className = "coin"; const a = Math.random()*Math.PI*2, r = 90 + Math.random()*120;
      c.style.setProperty("--x", Math.cos(a)*r + "px"); c.style.setProperty("--y", Math.sin(a)*r*.7 + "px"); c.style.animationDelay = Math.random()*.15 + "s"; inn.appendChild(c); }
  };
}

/* ---------- friends + referrals ---------- */
function codeOf(id){
  let h = 2166136261; for (const ch of String(id)){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let out = "";
  for (let i = 0; i < 6; i++){ h = Math.imul(h ^ (h >>> 15), 2246822519) ^ i*2654435761; out += A[(h >>> 7) % 32]; }
  return out;
}
function myCode(){ if (cloud && myId) return codeOf(myId); if (!state.localCode){ state.localCode = codeOf(uid8() + Date.now()); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){} } return state.localCode; }
function myReferrals(){ if (!social) return []; const c = myCode(); return Object.entries(social).filter(([id, d]) => id !== myId && d && d.ref === c).map(([id]) => id); }
function pushSocial(){
  if (!cloud || !db) return;
  ensureStreak();
  const body = {tag:String(state.profile.tag||"").slice(0,20), code:myCode(), friends:state.friends.filter(id => !id.startsWith("bot-")).slice(0,200), ref:state.refBy || "", streak:state.streak.count};
  const js = JSON.stringify(body), cur = social[myId];
  if (js === socialSent || (cur && JSON.stringify({tag:cur.tag, code:cur.code, friends:cur.friends, ref:cur.ref, streak:cur.streak}) === js)) { socialSent = js; return; }
  socialSent = js;
  db.doc("social/"+myId).set(body).catch(() => { socialSent = ""; });
}
function friendState(id){
  if (!id || id === myId || id === "local") return "me";
  const mine = (state.friends || []).includes(id);
  if (id.startsWith("bot-")) return mine ? "mutual" : "none";
  const theirs = !!(social[id] && Array.isArray(social[id].friends) && myId && social[id].friends.includes(myId));
  return mine && theirs ? "mutual" : mine ? "sent" : theirs ? "incoming" : "none";
}
const isFriend = id => friendState(id) === "mutual";
const frMark = p => !p.me && isFriend(p.id) ? `<span class="frmark" title="Friend"><svg><use href="#i-squad"/></svg></span>` : "";
function directory(){
  const map = {};
  const {list} = players();
  list.forEach(p => { if (!p.me) map[p.id] = p; });
  Object.entries(social).forEach(([id, d]) => { if (id !== myId && !map[id]) map[id] = {id, me:false, bot:false, tag:String((d && d.tag) || "").slice(0,20), bw:state.profile.bw, lifts:{}, history:[]}; });
  (state.friends || []).forEach(id => { if (!map[id] && id.startsWith("bot-")) map[id] = {id, me:false, bot:true, tag:id.slice(4), bw:state.profile.bw, lifts:{}, history:[]}; });
  return map;
}
function codeOwner(code){
  code = String(code||"").toUpperCase().trim();
  if (!code) return null;
  const hit = Object.entries(social).find(([id, d]) => id !== myId && d && d.code === code);
  if (hit) return hit[0];
  const bot = BOTS.find(b => codeOf("bot-"+b[0]) === code);
  return bot ? "bot-"+bot[0] : null;
}
const codeFor = id => id.startsWith("bot-") ? codeOf(id) : (social[id] && social[id].code) || "";
function setFriend(id, on){
  ensureStreak();
  state.friends = state.friends.filter(x => x !== id);
  if (on) state.friends.push(id);
  save(); renderAll(); checkProgress();
}
function redeem(code){
  code = String(code||"").toUpperCase().trim();
  if (state.refBy) return "You already used an invite code.";
  if (code === myCode()) return "That's your own code. Send it to a friend instead.";
  const who = codeOwner(code);
  if (!who) return "No lifter has that code yet. Check it and try again.";
  ensureStreak();
  state.refBy = code;
  if (!state.friends.includes(who)) state.friends.push(who);
  save(); renderAll(); checkProgress();
  return "";
}
function renderSquad(){
  ensureStreak();
  embP = "q"; embN = 0;
  const st = state.streak, n = st.count, tone = streakTone(n), claimed = st.claimed === today();
  const next = MILES.find(m => m[0] > n) || MILES[MILES.length-1];
  $("streakCard").className = "card streakhero" + (tone > 1 ? " t" + tone : "");
  setHTML($("streakCard"), `<div class="bigflame">${flameSvg(tone)}<b>${n}</b></div>
    <div style="min-width:0;width:100%">
      <div class="sh-top"><h2>${n}-day streak</h2><span class="label" style="color:rgba(255,255,255,.7)">Best ${st.best} days</span></div>
      <div class="sh-meta"><span>Streak freezes <span class="frz">${snowSvg(st.freezes > 0)}${snowSvg(st.freezes > 1)}</span></span><span>Earn a freeze every 7 days. It saves a missed day.</span></div>
      <div class="week">${weekCells(n, claimed)}</div>
      <div class="miles">${MILES.map(([d, name, xp]) => `<div class="mile ${st.best >= d ? "got" : ""}"><b>${name}</b> · ${d} days<br>+${xp} XP<div class="mbar"><i style="width:${Math.min(100, Math.round(Math.max(n, st.best >= d ? d : 0)/d*100))}%"></i></div></div>`).join("")}</div>
      <div class="claimrow">${claimed ? `<span>Today's bonus is claimed. Tomorrow is worth <b>+${dayReward(n+1) + mileBonus(n+1)} XP</b>.</span>` : `<button class="btn go" id="sqClaim" type="button">Claim +${dayReward(n) + mileBonus(n)} XP</button>`}<span class="hint" style="margin:0">Next milestone: ${next[1]} at ${next[0]} days.</span></div>
    </div>`);
  const sc = $("sqClaim"); if (sc) sc.onclick = () => { dailyShown = false; showDaily(); };

  const dir = directory(), ids = Object.keys(dir);
  resolvePeople(Object.values(dir));
  const row = (p, st2) => {
    const btn = st2 === "mutual" ? `<button class="btn sm" data-unf="${esc(p.id)}" type="button">Remove</button>`
      : st2 === "sent" ? `<button class="btn sm" data-unf="${esc(p.id)}" type="button">Cancel</button>`
      : st2 === "incoming" ? `<button class="btn sm go" data-addf="${esc(p.id)}" type="button">Add back</button>`
      : `<button class="btn sm" data-addf="${esc(p.id)}" type="button">Add</button>`;
    const lab = {mutual:`<span class="fstate mut">FRIENDS</span>`, sent:`<span class="fstate">REQUESTED</span>`, incoming:`<span class="fstate inc">WANTS TO ADD YOU</span>`, none:""}[st2];
    const sk = !p.bot && social[p.id] && num(social[p.id].streak) > 1 ? ` · ${num(social[p.id].streak)}-day streak` : "";
    const br = bestRank(p);
    return `<li><span class="pfm">${pfp(p)}</span><span class="nm">${esc(nameOf(p))}${p.bot ? '<span class="botmark">BOT</span>' : ""}<small>${br ? esc(br.label) : "Unranked"}${sk}${codeFor(p.id) ? ` · code <span class="mono">${codeFor(p.id)}</span>` : ""}</small></span>${lab}${btn}</li>`;
  };
  const order = {incoming:0, mutual:1, sent:2};
  const mineList = ids.map(id => [dir[id], friendState(id)]).filter(([, f]) => f !== "none" && f !== "me").sort((a,b) => order[a[1]] - order[b[1]]);
  setHTML($("friends"), mineList.length ? `<ul class="people">${mineList.map(([p, f]) => row(p, f)).join("")}</ul>`
    : `<p class="hint" style="margin:0">No friends yet. Add lifters from the board below, or swap codes. Friends get their own leaderboard view in the Arena.</p>`);
  const sug = ids.map(id => dir[id]).filter(p => friendState(p.id) === "none").slice(0, 8);
  setHTML($("suggest"), sug.length ? `<ul class="people">${sug.map(p => row(p, "none")).join("")}</ul>` : `<p class="hint" style="margin:0">You've added everyone on the board.</p>`);

  const refs = myReferrals(), link = location.origin + location.pathname + "#ref=" + myCode();
  const refName = state.refBy ? (() => { const o = codeOwner(state.refBy); return o && dir[o] ? nameOf(dir[o]) : "a friend"; })() : "";
  setHTML($("invite"), `<div class="codebox"><div><div class="label">Your code</div><div class="code">${myCode()}</div></div><button class="btn sm" id="copyCode" type="button">Copy code</button></div>
    <div class="linkbox"><input id="refLink" readonly value="${esc(link)}" aria-label="Invite link"><button class="btn sm" id="copyLink" type="button">Copy link</button></div>
    <div class="perks"><div><b>+${REF_XP} XP</b>for you each time a friend joins with your code</div><div><b>+${REF_XP} XP</b>for them, and you're added as friends</div></div>
    <p class="hint">${refs.length ? `${refs.length} lifter${refs.length === 1 ? "" : "s"} joined with your code: ${refs.map(id => esc(dir[id] ? nameOf(dir[id]) : "Lifter")).join(", ")}. That's +${refs.length*REF_XP} XP.` : "Nobody has used your code yet."}</p>
    <h3 style="margin-top:20px;font-size:16px">Got an invite code?</h3>
    ${state.refBy ? `<p class="hint">You joined with ${esc(refName)}'s code <span class="mono">${esc(state.refBy)}</span> and got +${REF_XP} XP.</p>`
      : `<form class="addrow" id="redeemForm" style="margin-top:6px"><div class="fld"><label for="rCode">Enter it once for +${REF_XP} XP</label><input id="rCode" maxlength="6" placeholder="e.g. K7Q2MX" autocomplete="off" spellcheck="false" value="${esc(ui.pendingRef || "")}"></div><button class="btn go" type="submit">Redeem</button></form>`}`);
  const cp = (txt, el) => { const done = () => toast("Copied"); try { navigator.clipboard.writeText(txt).then(done, () => { el && el.select(); toast("Press copy to copy it"); }); } catch(e){ el && el.select(); } };
  $("copyCode").onclick = () => cp(myCode());
  $("copyLink").onclick = () => cp(link, $("refLink"));
  const rf = $("redeemForm"); if (rf) rf.onsubmit = e => { e.preventDefault(); const err = redeem($("rCode").value); if (err) toast(err); else { ui.pendingRef = ""; toast(`Invite code redeemed. +${REF_XP} XP`); } };
}
function renderRefBanner(){
  const b = $("refBanner");
  if (!ui.pendingRef || state.refBy){ b.hidden = true; return; }
  const who = codeOwner(ui.pendingRef), dir = who ? directory() : {};
  b.hidden = false;
  b.innerHTML = `<span><strong>You were invited${who && dir[who] ? " by " + esc(nameOf(dir[who])) : ""}.</strong> Redeem code <span class="mono">${esc(ui.pendingRef)}</span> for +${REF_XP} XP.</span><button class="btn sm go" id="refGo" type="button">Redeem</button>`;
  $("refGo").onclick = () => { const err = redeem(ui.pendingRef); if (err) toast(err); else { ui.pendingRef = ""; toast(`Invite code redeemed. +${REF_XP} XP`); } };
}
function ranked(liftName, board, list){
  return list.filter(p => counts(p, liftName)).map(p => ({p, kg:p.lifts[liftName].kg, v: board === "total" ? p.lifts[liftName].kg : p.lifts[liftName].kg/p.bw}))
    .sort((a,b) => b.v - a.v);
}
const showV = (row, board) => board === "total" ? WU(row.kg) : row.v.toFixed(2) + "× BW";

/* ---------- theme ---------- */
const mq = matchMedia("(prefers-color-scheme: dark)");
function accent(){ return (THEMES[state.settings.graph] || THEMES.neon).c; }
function applyTheme(){
  const m = state.settings.mode, root = document.documentElement;
  if (m === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", m);
  root.style.setProperty("--accent", accent());
  root.style.setProperty("--accent-rgb", hexRgb(accent()).join(","));
}

/* ---------- chart engine (stock style) ---------- */
function niceNum(x){ const e = Math.floor(Math.log10(x)), f = x/Math.pow(10,e); return (f<1.5?1:f<3?2:f<7?5:10)*Math.pow(10,e); }
function niceTicks(lo,hi,n){ const step = niceNum((hi-lo)/(n-1)||1), out = []; for (let v = Math.floor(lo/step)*step; v <= Math.ceil(hi/step)*step + step*.001; v += step) out.push(+v.toFixed(6)); return out; }
function drawChart(cv, pts, o){
  const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return null;
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
  const ctx = cv.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
  const col = accent(), txt = "#7f948b", grid = rgba(col,.09), mono = "11px 'JetBrains Mono', ui-monospace, monospace";
  const pad = o.mini ? {l:3,r:7,t:5,b:5} : {l:50,r:18,t:14,b:30};
  if (!pts.length){ if (!o.mini){ ctx.fillStyle = txt; ctx.font = mono; ctx.textAlign = "center"; ctx.fillText("NO DATA IN THIS RANGE", w/2, h/2); } return null; }
  let lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v)), ticks = null;
  if (hi === lo){ hi += 5; lo -= 5; }
  if (o.mini){ const m = (hi-lo)*.12; lo -= m; hi += m; }
  else if (o.min !== undefined){ lo = o.min; hi = o.max; ticks = niceTicks(lo, hi, 5).filter(v => v >= lo && v <= hi); }
  else { ticks = niceTicks(lo-(hi-lo)*.06, hi+(hi-lo)*.06, 5); lo = ticks[0]; hi = ticks[ticks.length-1]; }
  const t0 = o.t0 ?? pts[0].t, t1 = Math.max(o.t1 ?? pts[pts.length-1].t, t0 + DAY);
  const X = t => pad.l + (t-t0)/(t1-t0)*(w-pad.l-pad.r), Y = v => pad.t + (1-(v-lo)/(hi-lo))*(h-pad.t-pad.b);
  if (!o.mini){
    ctx.lineWidth = 1; ctx.strokeStyle = grid;
    const cols = Math.max(6, Math.round((w-pad.l-pad.r)/56));
    for (let i = 0; i <= cols; i++){ const x = Math.round(pad.l + i*(w-pad.l-pad.r)/cols)+.5; ctx.beginPath(); ctx.moveTo(x,pad.t); ctx.lineTo(x,h-pad.b); ctx.stroke(); }
    ctx.fillStyle = txt; ctx.font = mono; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ticks.forEach(v => { const y = Math.round(Y(v))+.5; ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(w-pad.r,y); ctx.stroke(); ctx.fillText(fmt(v), pad.l-8, y); });
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    const span = (t1-t0)/DAY; let lastX = -99;
    if (span <= 45){ for (let t = t0; t <= t1; t += 7*DAY){ const x = X(t); if (x-lastX > 46){ ctx.fillText(shortDate(t), x, h-pad.b+9); lastX = x; } } }
    else { const d = new Date(t0); d.setDate(1); d.setMonth(d.getMonth()+1); const step = span > 400 ? 3 : span > 200 ? 2 : 1;
      while (d.getTime() <= t1){ const x = X(d.getTime()); if (x-lastX > 40){ ctx.fillText(MON[d.getMonth()] + (d.getMonth()===0 ? " "+String(d.getFullYear()).slice(2) : ""), x, h-pad.b+9); lastX = x; } d.setMonth(d.getMonth()+step); } }
  }
  const g = ctx.createLinearGradient(0,pad.t,0,h-pad.b); g.addColorStop(0, rgba(col, o.mini ? .25 : .32)); g.addColorStop(1, rgba(col,0));
  const path = () => { ctx.beginPath(); pts.forEach((p,i) => i ? ctx.lineTo(X(p.t),Y(p.v)) : ctx.moveTo(X(p.t),Y(p.v))); };
  path(); ctx.lineTo(X(pts[pts.length-1].t), h-pad.b); ctx.lineTo(X(pts[0].t), h-pad.b); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  ctx.lineJoin = "miter"; ctx.lineCap = "round";
  [o.mini?6:16, 0].forEach(blur => { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = blur; ctx.strokeStyle = col; ctx.lineWidth = o.mini ? 1.6 : 2.2; path(); ctx.stroke(); ctx.restore(); });
  const last = pts[pts.length-1], ex = X(last.t), ey = Y(last.v);
  if (!o.mini){ ctx.fillStyle = rgba(col,.18); ctx.beginPath(); ctx.arc(ex,ey,10,0,7); ctx.fill(); }
  ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ex,ey,o.mini?2.5:4.5,0,7); ctx.fill(); ctx.restore();
  return {X,Y,pts,pad,w,h,col};
}

/* ---------- chrome ---------- */
function renderChrome(){
  const x = xpInfo(), p = players().list.find(q => q.me) || {id:myId||"local", me:true, bot:false, tag:state.profile.tag, lifts:{}, bw:state.profile.bw};
  const sv = [embP, embN]; embP = "h"; embN = 0;
  $("meChip").innerHTML = `<span style="width:27px;height:29px;display:block;flex:none">${pfp(p)}</span><span class="nm">${esc(nameOf(p))}</span><span class="lv">LV ${x.lvl}</span>`;
  ensureStreak();
  const sk = state.streak, alive = sk.last === today(), sv2 = [embP, embN]; embP = "hc"; embN = 0;
  $("streakChip").className = "streakchip" + (alive ? "" : " cold") + (alive && sk.claimed !== today() ? " unclaimed" : "");
  $("streakChip").innerHTML = flameSvg(streakTone(sk.count)) + `<span>${sk.count}</span>`;
  $("streakChip").title = `${sk.count}-day login streak`;
  [embP, embN] = sv2;
  [embP, embN] = sv;
}

/* ---------- render helpers ---------- */
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function setHTML(el, html){ if (el._h === html) return false; el._h = html; el.innerHTML = html; return true; }
function countUp(root){
  if (reduceMotion()) return;
  root.querySelectorAll("[data-n]").forEach(el => {
    const n = num(el.dataset.n), d = num(el.dataset.d), t0 = performance.now();
    const f = t => { const k = Math.min(1, (t - t0)/900), e = 1 - Math.pow(1-k, 3);
      el.textContent = (n*e).toLocaleString(undefined, {minimumFractionDigits:d, maximumFractionDigits:d}); if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
}
const dispNum = kg => { const v = toU(kg); return unit() === "kg" ? Math.round(v*2)/2 : Math.round(v); };
const numB = (v, d) => `<b data-n="${v}" data-d="${d}">${v.toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d})}</b>`;

/* ---------- celebrations ---------- */
const celebQ = []; let showing = false;
function checkProgress(rankP, lift){
  ensureSeen();
  const q = [], x = xpInfo();
  if (rankP && lift){
    const rk = liftRank(rankP, lift), prevScore = state.seen.lifts[lift] ?? -1;
    if (rk && rk.score > prevScore){
      const prev = prevScore >= 0 ? rankFromScore(prevScore, lift) : null;
      const bestBefore = Math.max(-1, ...Object.entries(state.seen.lifts).map(([l, sc]) => rankFromScore(sc, l).i));
      const others = Object.entries(state.seen.lifts).filter(([l]) => l !== lift).map(([l, sc]) => rankFromScore(sc, l).i);
      const bestAfter = Math.max(rk.i, -1, ...others);
      q.push({kind: !prev ? "unlock" : rk.i > prev.i ? "rank" : "tier", rk, prev, lift, pfFrom:bestBefore, pfTo:bestAfter});
      state.seen.lifts[lift] = rk.score;
    }
  }
  if (x.lvl > state.seen.lvl) q.push({kind:"level", lvl:x.lvl});
  if (x.lvl !== state.seen.lvl) state.seen.lvl = x.lvl;
  if (q.length){ save(); celebrate(q); }
}
function celebrate(items){ celebQ.push(...items); if (!showing) nextCelebration(); }
function nextCelebration(){
  const c = celebQ.shift(), ov = $("rankup");
  if (!c){ showing = false; ov.hidden = true; ov.className = "rankup"; return; }
  showing = true;
  let colors, effect;
  $("ruPrev").innerHTML = ""; $("ruPips").innerHTML = ""; $("ruStage").innerHTML = ""; $("ruTop").innerHTML = ""; $("ruMe").innerHTML = "";
  const embSave = [embP, embN]; embP = "o"; embN = 0;
  if (c.kind === "crown" || c.kind === "podium"){
    const L = shortLift(c.lift).toUpperCase(), both = c.boards.length > 1, bn = both ? "both boards" : BOARDN[c.boards[0]];
    if (c.kind === "crown"){
      $("ruKick").textContent = L + " · NEW CHAMPION";
      const meP = players().list.find(p => p.me) || {id:myId||"local", me:true, bot:false, tag:state.profile.tag, lifts:{}, bw:state.profile.bw};
      const oldP = c.fromP || (c.from ? players().list.find(p => nameOf(p) === c.from) : null);
      $("ruEmb").innerHTML = crownSvg("bigcrown", 128);
      $("ruStage").innerHTML = `<div class="dust">${Array.from({length:18}, (_,n) => `<i style="--x:${(n*37)%100}%;--d:${(n%6)*.5}s;--s:${2 + n%3}px"></i>`).join("")}</div><i class="beam"></i><i class="floor"></i>
        <div class="ped"><div class="ptop"></div><div class="pface">1</div></div>
        ${oldP || c.from ? `<div class="oldchamp">${oldP ? `<div class="ocp">${pfp3(oldP, 116, "slow")}</div>` : ""}<span>${esc(c.from || nameOf(oldP))}</span></div>` : ""}
        <div class="throne"><i class="tglow"></i>${pfp3(meP, 116, "slow")}</div><div class="impact">${Array.from({length:14}, (_,n) => `<i style="--a:${n*25.7 - 90}deg;--r:${60 + (n%3)*22}px"></i>`).join("")}</div><div class="orbit">${Array.from({length:16}, (_,n) => `<i style="--a:${n*22.5}deg"></i>`).join("")}</div>`;
      $("ruTop").innerHTML = `<i class="shock"></i><i class="shock s2"></i>`;
      $("ruName").textContent = "#1 " + (both ? "on both boards" : BOARDN[c.boards[0]]);
      $("ruSub").textContent = (c.from ? `You took the crown from ${c.from}. ` : "") + `Your name now wears a crown on the ${shortLift(c.lift)} podium.`;
      ov.style.setProperty("--rc", "#ffc531"); colors = ["#ffc531","#fff3b8","#ff1f3d","#ffffff"]; effect = "coins";
    } else {
      $("ruKick").textContent = L + " · PODIUM FINISH";
      $("ruEmb").innerHTML = medalSvg(c.place, 160);
      $("ruStage").innerHTML = `<i class="spot l"></i><i class="spot r"></i>`;
      $("ruTop").innerHTML = `<i class="shock"></i>`;
      $("ruName").textContent = `#${c.place} on ${bn}`;
      $("ruSub").textContent = `You're on the ${shortLift(c.lift)} podium. ${c.place === 2 ? "One spot from the crown." : "Two spots from the crown."}`;
      ov.style.setProperty("--rc", MEDAL[c.place][0]); colors = [MEDAL[c.place][0], MEDAL[c.place][1], "#ffffff"]; effect = "confetti";
    }
  } else if (c.kind === "level"){
    $("ruKick").textContent = "LEVEL UP"; $("ruEmb").innerHTML = `<div class="lvbig">${c.lvl}</div>`;
    $("ruName").textContent = "Level " + c.lvl; $("ruSub").textContent = "Keep logging sets and PRs to earn XP.";
    ov.style.setProperty("--rc", "#ffc531"); colors = ["#ffc531","#ffffff","#a57cff"]; effect = "confetti";
  } else {
    const R = RANKS[c.rk.i], L = shortLift(c.lift).toUpperCase();
    ov.style.setProperty("--rc", R.c1); colors = [R.c1, R.c2, "#ffffff"];
    $("ruName").textContent = c.rk.label;
    if (c.kind === "tier"){
      $("ruKick").textContent = L + (c.rk.tier === 3 ? " · TIER MAXED" : " · TIER UP");
      $("ruPrev").innerHTML = emblem(c.prev.i, 130, false, c.prev.tier);
      $("ruEmb").innerHTML = emblem(c.rk.i, 130, false, c.rk.tier);
      $("ruPips").innerHTML = [1,2,3].map(t => `<i class="${t <= c.prev.tier ? "on" : t <= c.rk.tier ? "on new" : ""}"></i>`).join("");
      $("ruSub").textContent = `${c.prev.label} → ${c.rk.label}`;
      effect = c.rk.tier === 3 ? "sparks3" : "sparks";
    } else {
      $("ruKick").textContent = L + (c.kind === "unlock" ? " · RANK UNLOCKED" : " · RANK UP");
      if (c.kind === "rank") $("ruPrev").innerHTML = emblem(c.prev.i, 130, false, c.prev.tier);
      const from = c.pfFrom !== undefined ? c.pfFrom : c.prev ? c.prev.i : -1, to = c.pfTo !== undefined ? c.pfTo : c.rk.i;
      const meP = players().list.find(p => p.me) || {id:myId||"local", me:true, bot:false, tag:state.profile.tag, lifts:{}, bw:state.profile.bw};
      if (c.muscle) $("ruMe").innerHTML = `<div class="mmini">${muscleMini(c.muscle, c.rk.score)}</div>`;
      else if (to > from) $("ruMe").innerHTML = `<div class="pfmorph"><div class="pfa">${pfp(meP, {rankI:from})}</div><div class="pfb">${pfp(meP, {rankI:to})}</div></div><div class="pfcap">Your profile is now <b>${RANKS[to].name}</b></div>`;
      if (c.kind === "unlock"){
        $("ruPrev").innerHTML = emblem(c.rk.i, 150, true, c.rk.tier);
        $("ruStage").innerHTML = Array.from({length:8}, (_,n) => `<i class="crack" style="--a:${n*45 + 12}deg;--d:${.35 + n*.08}s"></i>`).join("");
        $("ruTop").innerHTML = `<svg class="lock" viewBox="0 0 60 70" width="64" height="74"><path class="shackle" d="M15 32V20a15 15 0 0 1 30 0v12" fill="none" stroke="#cfd6e4" stroke-width="7"/><g class="lbody"><rect x="6" y="30" width="48" height="38" rx="6" fill="#8d97a8" stroke="#1d2230" stroke-width="2"/><circle cx="30" cy="46" r="5" fill="#1d2230"/><rect x="28" y="48" width="4" height="10" fill="#1d2230"/></g></svg><i class="shock"></i><i class="shock s2"></i>`;
      }
      $("ruEmb").innerHTML = emblem(c.rk.i, 150, false, c.rk.tier);
      $("ruSub").textContent = c.note ? c.note : c.kind === "unlock" ? (c.rk.ratio ? `Your ${shortLift(c.lift)} is ${c.rk.ratio.toFixed(2)}× your bodyweight.` : `Your ${shortLift(c.lift)} rank is unlocked.`) : `${c.prev.label} → ${c.rk.label}`;
      effect = R.fx;
    }
  }
  [embP, embN] = embSave;
  ov.className = "rankup kind-" + (c.kind === "unlock" ? "rank unlock" : c.kind) + " fx-" + effect + (c.kind === "tier" && c.rk.tier === 3 ? " max" : "");
  ov.hidden = false; void ov.offsetWidth; ov.classList.add("play");
  $("ruOk").focus({preventScroll:true});
  if (!reduceMotion()) fx(effect === "shine" ? "confetti" : effect, colors, ({rank:1100, unlock:1250, tier:650, crown:2600, podium:1050})[c.kind] || 700);
}
function fx(type, colors, delay){
  const cv = $("confetti"), ctx = cv.getContext("2d"), w = cv.width = innerWidth, h = cv.height = innerHeight;
  const cx = w/2, cy = Math.max(160, h*.42), rnd = (a,b) => a + Math.random()*(b-a), pick = () => colors[Math.floor(Math.random()*colors.length)];
  let ps = [];
  const burst = (n, sp, kind) => { for (let k = 0; k < n; k++){ const a = rnd(0, Math.PI*2), v = rnd(sp[0], sp[1]); ps.push({x:cx, y:cy, vx:Math.cos(a)*v, vy:Math.sin(a)*v, s:rnd(3,8), r:rnd(0,6), vr:rnd(-.3,.3), c:pick(), kind, life:1}); } };
  if (type === "confetti") for (let k = 0; k < 150; k++) ps.push({x:cx, y:cy, vx:rnd(-8,8), vy:rnd(-18,-4), s:rnd(5,12), r:rnd(0,6), vr:rnd(-.35,.35), c:pick(), kind:"rect", g:.32, life:1});
  if (type === "sparks") burst(70, [3,10], "spark");
  if (type === "sparks3"){ burst(110, [4,13], "spark"); for (let k = 0; k < 90; k++) ps.push({x:cx, y:cy, vx:rnd(-7,7), vy:rnd(-15,-4), s:rnd(5,10), r:rnd(0,6), vr:rnd(-.3,.3), c:pick(), kind:"rect", g:.3, life:1}); }
  if (type === "shards") burst(70, [6,16], "shard");
  if (type === "rings"){ for (let k = 0; k < 80; k++) ps.push({x:cx, y:cy, vx:rnd(-7,7), vy:rnd(-14,-3), s:rnd(5,10), r:rnd(0,6), vr:rnd(-.3,.3), c:pick(), kind:"rect", g:.3, life:1}); [0,280,560].forEach(d => ps.push({kind:"ring", d, c:colors[0]})); }
  if (type === "coins") for (let k = 0; k < 80; k++) ps.push({x:rnd(0,w), y:rnd(-h, -20), vx:rnd(-.6,.6), vy:rnd(3,7), s:rnd(9,15), r:rnd(0,6), vr:rnd(.08,.2), kind:"coin", life:1});
  let start = null, lastSpawn = 0;
  (function f(t){
    if (start === null) start = t;
    const el = t - start - delay;
    ctx.clearRect(0,0,w,h);
    if (el >= 0){
      if ((type === "embers" || type === "flames") && el < 2600 && t - lastSpawn > 16){
        lastSpawn = t;
        const n = type === "flames" ? 6 : 3;
        for (let k = 0; k < n; k++){
          const around = type === "flames" && Math.random() < .5;
          ps.push({x: around ? cx + rnd(-90,90) : rnd(0,w), y: around ? cy + rnd(30,90) : h + 10, vx:rnd(-.6,.6), vy:rnd(-5,-1.5), s:rnd(type === "flames" ? 6 : 2, type === "flames" ? 16 : 5), c:pick(), kind:"ember", life:1, decay:rnd(.008,.02)});
        }
      }
      ps.forEach(p => {
        if (p.kind === "ring"){
          const k = (el - p.d)/1100; if (k < 0 || k > 1) return;
          ctx.save(); ctx.strokeStyle = p.c; ctx.globalAlpha = 1 - k; ctx.lineWidth = 6*(1 - k) + 1; ctx.shadowColor = p.c; ctx.shadowBlur = 20;
          ctx.beginPath(); ctx.arc(cx, cy, 40 + k*Math.max(w,h)*.6, 0, 7); ctx.stroke(); ctx.restore(); return;
        }
        if (p.life <= 0) return;
        if (p.kind === "rect"){ p.vy += p.g; p.vx *= .99; }
        if (p.kind === "spark"){ p.vx *= .94; p.vy *= .94; p.vy += .05; p.life -= .018; }
        if (p.kind === "shard"){ p.vx *= .96; p.vy *= .96; p.vy += .12; p.life -= .01; }
        if (p.kind === "ember"){ p.vx += rnd(-.15,.15); p.life -= p.decay; p.s *= .995; }
        p.x += p.vx; p.y += p.vy; p.r = (p.r || 0) + (p.vr || 0);
        ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        if (p.kind === "rect"){ ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s/2, -p.s/4, p.s, p.s/2); }
        else if (p.kind === "spark" || p.kind === "ember"){ ctx.fillStyle = p.c; ctx.shadowColor = p.c; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(0, 0, p.s/2, 0, 7); ctx.fill(); }
        else if (p.kind === "shard"){ ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.shadowColor = "#fff"; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(0, -p.s*1.4); ctx.lineTo(p.s*.7, p.s); ctx.lineTo(-p.s*.7, p.s*.6); ctx.closePath(); ctx.fill(); }
        else if (p.kind === "coin"){ const sx = Math.abs(Math.cos(p.r)) + .08; ctx.scale(sx, 1); ctx.fillStyle = "#ffcf3a"; ctx.strokeStyle = "#a86f00"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, p.s, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fff3b0"; ctx.beginPath(); ctx.arc(-p.s*.3, -p.s*.3, p.s*.3, 0, 7); ctx.fill(); }
        ctx.restore();
      });
    }
    if (el < 4200 && !$("rankup").hidden) requestAnimationFrame(f); else ctx.clearRect(0,0,w,h);
  })(performance.now());
}
$("ruOk").addEventListener("click", nextCelebration);
document.addEventListener("pointermove", e => {
  const el = e.target.closest && e.target.closest(".e3d"); if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--tx", (((e.clientX - r.left)/r.width - .5)*50).toFixed(1) + "deg");
  el.style.setProperty("--ty", (-((e.clientY - r.top)/r.height - .5)*36).toFixed(1) + "deg");
});
document.addEventListener("pointerout", e => { const el = e.target.closest && e.target.closest(".e3d"); if (el && !el.contains(e.relatedTarget)){ el.style.removeProperty("--tx"); el.style.removeProperty("--ty"); } });
$("rankup").addEventListener("click", e => { if (e.target === $("rankup")) nextCelebration(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && showing) nextCelebration(); });
let previewRank = 1;
function previewLabel(){ $("prevRank").textContent = "Preview rank-up to " + RANKS[previewRank].name; }
let previewTier = 2;
$("prevTier").addEventListener("click", () => { celebrate([{kind:"tier", lift:"Squat", prev:rankFromScore(6 + previewTier - 2, "Squat"), rk:rankFromScore(6 + previewTier - 1, "Squat")}]); previewTier = previewTier === 2 ? 3 : 2; $("prevTier").textContent = "Preview tier-up to tier " + previewTier; });
$("prevRank").addEventListener("click", () => { const i = previewRank; celebrate([{kind:"rank", lift:"Bench Press", prev:rankFromScore(i*3 - 1, "Bench Press"), rk:rankFromScore(i*3, "Bench Press")}]); previewRank = i % 5 + 1; previewLabel(); });
$("prevUnlock").addEventListener("click", () => celebrate([{kind:"unlock", lift:"Deadlift", rk:rankFromScore(0, "Deadlift")}]));
$("prevLevel").addEventListener("click", () => celebrate([{kind:"level", lvl:xpInfo().lvl + 1}]));
let previewPlace = 3;
$("prevMedal").addEventListener("click", () => { celebrate([{kind:"podium", lift:"Bench Press", place:previewPlace, boards:["total"]}]); previewPlace = previewPlace === 2 ? 3 : 2; });
$("prevCrown").addEventListener("click", () => celebrate([{kind:"crown", lift:"Squat", boards:["total","p4p"], from:"squatch", fromP:players().list.find(p => p.tag === "squatch") || null}]));
previewLabel(); $("prevTier").textContent = "Preview tier-up to tier 2";

/* ---------- arena ---------- */
function tierStrip(lift, rk, bw){
  const ci = rk ? rk.i : 0, [lo, hi] = rankBand(lift, ci), band = (hi - lo)/3, nm = RANKS[ci].name;
  return `<div class="tierstrip"><div class="label">${rk ? "Your" : "First"} rank's tiers · ${nm}</div><div class="ts-row">${[1,2,3].map(t => {
    const st = !rk ? "locked" : t < rk.tier ? "done" : t === rk.tier ? "cur" : "locked", need = (lo + band*(t-1))*bw;
    return `<div class="tcell ${st}">${st === "cur" ? `<span class="you">YOU</span>` : ""}${emblem(ci, 46, st === "locked", t)}<b>${nm} ${t}</b><small>${need > 0 ? WU(need) : "Any weight"}</small><small class="perk">${["Chevron","Arc frame","Double frame, crown and aura"][t-1]}</small></div>`; }).join("")}</div></div>`;
}
// what it takes to move up: the next person to pass, or the lead you're defending
function titlesHtml(list){
  const t = Object.entries(myPlaces(list)).filter(([k,v]) => v.place <= 3).map(([k,v]) => { const [b, lift] = k.split("|"); return {b, lift, place:v.place}; })
    .sort((a,b) => a.place - b.place);
  if (!t.length) return "";
  return `<div class="titles">${t.map(x => `<span class="ttlchip p${x.place}">${x.place === 1 ? crownSvg("cz") : ""}${x.place === 1 ? shortLift(x.lift).toUpperCase() + " CHAMPION" : "#" + x.place + " " + shortLift(x.lift).toUpperCase()} · ${x.b === "total" ? "TOTAL" : "P4P"}</span>`).join("")}</div>`;
}
// rising particles around a podium portrait: gold sparks for #1, silver and bronze glints, red embers for Elite
function podiumFx(i, elite){
  const n = [9, 6, 6][i], col = elite ? ["#ff3b3b","#ff8a3d","#ffb347"] : [["#ffe28a","#fff3b8"],["#ffffff","#c9d2de"],["#f0b07a","#ffcf9e"]][i];
  return `<span class="pps">${Array.from({length:n}, (_,k) => `<i style="--x:${(k*37 + i*13)%84 + 8}%;--d:${((k*.61 + i*.3)%2.6).toFixed(2)}s;--t:${(2.1 + (k%3)*.6).toFixed(1)}s;--dx:${(k*13)%28 - 14}px;--s:${(2.5 + (k%3)*.9).toFixed(1)}px;--pc:${col[k%col.length]}"></i>`).join("")}</span>`;
}
function chase(rows, myIdx, lift, mine){
  const bw = mine.bw || state.profile.bw, step = unit() === "kg" ? .5 : 1/LB, my = myIdx >= 0 ? rows[myIdx] : null;
  const kgFor = r => ui.board === "total" ? r.kg : r.v*bw;
  const cs = crownSvg("cz");
  if (my && myIdx === 0){
    const nx = rows[1];
    return `<div class="chase king">${cs}<span>You hold the crown.${nx ? ` <b>${ui.board === "total" ? WU(my.kg - nx.kg) : (my.v - nx.v).toFixed(2) + "× BW"}</b> ahead of ${esc(nameOf(nx.p))}.` : ""}</span></div>`;
  }
  if (my){
    const tgt = rows[myIdx-1], need = Math.max(0, kgFor(tgt) - my.kg) + step;
    return `<div class="chase"><span><b>${WU(need)}</b> more passes ${esc(nameOf(tgt.p))} for #${myIdx}.${myIdx > 1 ? ` <b>${WU(Math.max(0, kgFor(rows[0]) - my.kg) + step)}</b> takes the crown.` : ""}</span></div>`;
  }
  if (rows.length < 3) return `<div class="chase"><span>Open spot on the podium. Any ${shortLift(lift)} PR puts you on it.</span></div>`;
  return `<div class="chase"><span>Submit a ${shortLift(lift)} of <b>${WU(kgFor(rows[2]) + step)}</b> to make the podium.</span></div>`;
}
// everyone's picture is cut to the shape of their best rank across the three lifts (grey coin when unranked)
function bestRank(p){ return ARENA.map(A => liftRank(p, A.name)).filter(Boolean).sort((a,b) => b.score - a.score)[0] || null; }
function pfp(p, o = {}){
  const best = o.rankI !== undefined ? (o.rankI >= 0 ? {i:o.rankI} : null) : bestRank(p);
  const i = best ? best.i : -1, R = best ? RANKS[i] : {c1:"#c9c4dc", c2:"#55507a"}, k = `pf${embP}${embN++}`;
  const shape = i < 0 ? SHAPES.coin : SHAPES[["coin","shield","rosette","hex","gem","burst"][i]];
  const sc = v => `transform="translate(50 55) scale(${v}) translate(-50 -55)"`;
  const av = avatar(p), src = av.startsWith("<img") ? (av.match(/src="([^"]+)"/) || [])[1] : "";
  const bg = (avaBg(p).match(/background:(.*)$/) || [])[1] || "#5a2d96";
  const xp = o.xp != null ? `<path d="${shape}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="4" ${sc(1)}/><path class="xparc" d="${shape}" fill="none" stroke="#ffc531" stroke-width="4" stroke-linecap="round" pathLength="100" stroke-dasharray="${o.xp} 100" ${sc(1)}/>` : "";
  return `<svg class="pfp${i === 5 ? " elite" : ""}${o.cls ? " " + o.cls : ""}" viewBox="-8 -8 116 126" aria-hidden="true"><defs>
      <linearGradient id="g${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${R.c1}"/><stop offset=".4" stop-color="${R.c2}"/><stop offset=".55" stop-color="${R.c1}"/><stop offset="1" stop-color="${R.c2}"/></linearGradient>
      <clipPath id="c${k}"><path d="${shape}" ${sc(.8)}/></clipPath></defs>
    <path d="${shape}" fill="${R.c2}" stroke="rgba(0,0,0,.6)" stroke-width="1" transform="translate(0 4)"/><path d="${shape}" fill="#000" opacity=".45" transform="translate(0 4)"/>
    <path d="${shape}" fill="url(#g${k})" stroke="rgba(0,0,0,.5)" stroke-width="1.4"/>
    <path d="${shape}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" transform="translate(50 55) scale(.94) translate(-50 -55) translate(-.6 -.8)"/>${xp}
    <g clip-path="url(#c${k})"><rect x="-10" y="-10" width="120" height="130" fill="${bg}"/>${src ? `<image href="${src}" x="10" y="15" width="80" height="80" preserveAspectRatio="xMidYMid slice"/>` : `<text x="50" y="68" text-anchor="middle" font-family="Russo One, sans-serif" font-size="34" fill="#fff">${av}</text>`}</g>
    <path d="${shape}" fill="none" stroke="${R.c1}" stroke-width="1.4" opacity=".9" ${sc(.8)}/>
  </svg>`;
}
// 3D portrait for big moments: solid metal edge slices, frame, picture and rim on separate depths
function pfp3(p, size, cls){
  const best = bestRank(p), i = best ? best.i : -1, R = best ? RANKS[i] : {c1:"#c9c4dc", c2:"#55507a"}, k = `p3${embP}${embN++}`;
  const shape = i < 0 ? SHAPES.coin : SHAPES[["coin","shield","rosette","hex","gem","burst"][i]];
  const sc = v => `transform="translate(50 55) scale(${v}) translate(-50 -55)"`;
  const av = avatar(p), src = av.startsWith("<img") ? (av.match(/src="([^"]+)"/) || [])[1] : "";
  const bg = (avaBg(p).match(/background:(.*)$/) || [])[1] || "#5a2d96";
  const W = size, H = Math.round(size*126/116), VB = 'viewBox="-8 -8 116 126" aria-hidden="true"';
  const L = (z, inner) => `<svg width="${W}" height="${H}" ${VB} style="transform:translateZ(${(z*size/100).toFixed(2)}px)">${inner}</svg>`;
  const defs = `<defs><linearGradient id="g${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".15" stop-color="${R.c1}"/><stop offset=".45" stop-color="${R.c2}"/><stop offset=".6" stop-color="${R.c1}"/><stop offset="1" stop-color="${R.c2}"/></linearGradient>
    <linearGradient id="e${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${R.c2}"/><stop offset="1" stop-color="#0b0612"/></linearGradient>
    <linearGradient id="bv${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient>
    <radialGradient id="l${k}" cx=".3" cy=".2" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
    <clipPath id="c${k}"><path d="${shape}" ${sc(.8)}/></clipPath></defs>`;
  const slices = Array.from({length:8}, (_,n) => L(-(n + 1)*1.6, `<path d="${shape}" fill="url(#e${k})" stroke="rgba(0,0,0,.55)" stroke-width="1"/>`)).join("");
  return `<span class="e3d${cls ? " " + cls : ""}" style="width:${W}px;height:${H}px"><span class="e3i">${L(0, defs + `<path d="${shape}" fill="url(#g${k})" stroke="rgba(0,0,0,.55)" stroke-width="1.4"/><path d="${shape}" fill="none" stroke="url(#bv${k})" stroke-width="3" ${sc(.95)}/><path d="${shape}" fill="#05030c" opacity=".7" ${sc(.84)}/>`)}${slices}
    ${L(3, `<g clip-path="url(#c${k})"><rect x="-10" y="-10" width="120" height="130" fill="${bg}"/>${src ? `<image href="${src}" x="10" y="15" width="80" height="80" preserveAspectRatio="xMidYMid slice"/>` : `<text x="50" y="68" text-anchor="middle" font-family="Russo One, sans-serif" font-size="34" fill="#fff">${av}</text>`}<path d="${shape}" fill="url(#l${k})"/></g>`)}
    ${L(5, `<path d="${shape}" fill="none" stroke="${R.c1}" stroke-width="2" ${sc(.8)}/><path d="${shape}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".8" ${sc(.81)} transform-origin="50 55"/>`)}</span></span>`;
}
function portrait(p, x){
  const best = bestRank(p);
  return `<div class="ring pshape" title="${best ? esc(best.label) + " " + esc(shortLift(best.lift)) + ", your best rank" : "Unranked"}">${pfp(p, {xp:Math.round(x.xp/x.need*100)})}<span class="lvl">LV ${x.lvl}</span></div>`;
}
function rkChip(p, lift, bare){ const rk = liftRank(p, lift); if (!rk) return ""; return bare ? `<span class="prk" title="${rk.label}">${emblem(rk.i, 14, false, rk.tier)}</span>` : `<div class="prk">${emblem(rk.i, 14, false, rk.tier)}${rk.label}</div>`; }
$("ladder").addEventListener("click", e => { const b = e.target.closest("#ladderSeg button"); if (b){ ui.ladderLift = b.dataset.v; renderArena(); } });
async function renderArena(){
  const {list, realCount, showBots} = players();
  await resolvePeople(list);
  embP = "a"; embN = 0;
  const mine = list.find(p => p.me) || {id:myId||"local", me:true, bot:false, tag:state.profile.tag, bw:state.profile.bw, lifts:{}, history:[]};
  const x = xpInfo(), total = totalOf(mine), anyRank = ARENA.some(A => liftRank(mine, A.name));
  const pend = ARENA.filter(A => mine.lifts[A.name] && !counts(mine, A.name));
  const stat = A => !mine.lifts[A.name] ? "<b>—</b>" : numB(dispNum(mine.lifts[A.name].kg), unit()==="kg" && dispNum(mine.lifts[A.name].kg)%1 ? 1 : 0) + (counts(mine, A.name) ? "" : `<span class="pending">needs video</span>`);
  const note = !canPost ? "You can watch the boards. Ask the owner for Contributor access to compete."
    : pend.length ? `<span class="elite-note">Your ${pend.map(A => A.name === "Bench Press" ? "bench" : A.name.toLowerCase()).join(" and ")} is elite level, so it needs a video link to count.</span>`
    : anyRank ? nextRankNote(mine) : "Submit a squat, bench or deadlift PR to unlock that lift's rank.";
  const heroChanged = setHTML($("hero"), `
    ${portrait(mine, x)}
    <div>
      <h2>${esc(nameOf(mine))}</h2>
      <div class="ranks-row">${ARENA.map(A => { const rk = liftRank(mine, A.name); return `<span class="tier">${rk ? emblem(rk.i, 20, false, rk.tier) : `<i style="background:rgba(255,255,255,.4)"></i>`}${A.sym} · ${rk ? rk.label.toUpperCase() : "UNRANKED"}</span>`; }).join("")}</div>
      ${titlesHtml(list)}
      <div class="xp"><div class="t"><span>${x.xp} / ${x.need} XP</span><span>Level ${x.lvl+1}</span></div><div class="track"><b style="width:${Math.round(x.xp/x.need*100)}%"></b></div></div>
    </div>
    <div class="hstats">
      ${ARENA.map(A => `<div>${A.sym}${stat(A)}</div>`).join("")}
      <div>Total${total ? numB(dispNum(total), unit()==="kg" && dispNum(total)%1 ? 1 : 0) : "<b>—</b>"}</div>
      <div>× BW${total ? numB(+(total/mine.bw).toFixed(2), 2) : "<b>—</b>"}</div>
    </div>
    <div class="actions">
      ${canPost ? `<button class="btn go" type="button" id="openClaim">${$("claim").hidden ? "Submit a PR" : "Close"}</button>` : ""}
      <span class="note">${note}</span>
    </div>`);
  if (heroChanged) countUp($("hero"));
  const ob = $("openClaim"); if (ob) ob.onclick = () => { $("claim").hidden = !$("claim").hidden; if (!$("claim").hidden){ prefillClaim(); $("cW").focus(); } renderArena(); };

  const LL = ui.ladderLift, lrk = liftRank(mine, LL), lbw = mine.bw || state.profile.bw;
  const pct = lrk ? Math.round((lrk.score + 1)/18*100) : 0;
  setHTML($("ladder"), `<div class="lh"><h3>Ranks</h3><div class="seg" id="ladderSeg">${ARENA.map(A => `<button type="button" data-v="${A.name}" aria-pressed="${A.name === LL}">${A.name === "Bench Press" ? "Bench" : A.name}</button>`).join("")}</div></div>
    <p class="hint" style="margin:0">Each lift has its own rank from your best single divided by bodyweight. Every rank has tiers 1, 2 and 3. Weights shown are for your bodyweight of ${WU(lbw)}.</p>
    <div class="rungs-wrap"><div class="rungs">${RANKS.map((R,i) => {
      const st = !lrk || i > lrk.i ? "locked" : i === lrk.i ? "cur" : "done", m = RANK_MIN[LL][i];
      return `<div class="rung ${st}" style="--i:${i}">${st === "cur" ? `<span class="you">TIER ${lrk.tier} · YOU</span>` : ""}${emblem(i, 54, st === "locked", st === "cur" ? lrk.tier : st === "done" ? 3 : 0)}<b>${R.name}</b><small>${m ? m + "× BW" : "Any weight"}</small><small>${m ? WU(m*lbw) : "&nbsp;"}</small></div>`; }).join("")}</div>
    <div class="lprog"><b style="width:${pct}%"></b></div></div>
    ${tierStrip(LL, lrk, lbw)}
    <p class="hint">${lrk ? (nextTier(lrk) ? `Your ${shortLift(LL)} is ${lrk.label}. ${WU(Math.max(0.5/LB, nextTier(lrk).ratio*lbw - mine.lifts[LL].kg))} more reaches ${nextTier(lrk).label}.` : `Your ${shortLift(LL)} is Elite 3, the top of the ladder.`) : `Submit a ${shortLift(LL)} PR to get ranked.`}</p>`);

  document.querySelectorAll("#boardSeg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === ui.board));
  document.querySelectorAll("#scopeSeg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === ui.scope));
  const shown = ui.scope === "friends" ? list.filter(p => p.me || isFriend(p.id)) : list;
  renderRefBanner();
  $("boardTitle").textContent = ui.board === "total" ? "Total strength" : "Pound for pound";
  setHTML($("podiums"), ARENA.map((A, ai) => {
    const rows = ranked(A.name, ui.board, shown), myIdx = rows.findIndex(r => r.p.me);
    const step = (i) => { const r = rows[i], cls = "step s"+(i+1);
      if (!r) return `<div class="${cls} empty"><div class="ava">?</div><div class="pn muted">Open spot</div><div class="pv muted">—</div><div class="blk">${i+1}</div></div>`;
      const rk = liftRank(r.p, A.name), el = rk && rk.i === 5;
      return `<div class="${cls} ${r.p.me?"me":""}">${i === 0 ? crownSvg("crownf") : ""}<div class="ava pf" style="--fd:${(ai*3 + i)*.37}s">${i === 0 ? `<i class="halo"></i>` : ""}${podiumFx(i, el)}${pfp(r.p)}</div><div class="pn" title="${esc(nameOf(r.p))}">${frMark(r.p)}${esc(nameOf(r.p))}${r.p.bot?'<span class="botmark">BOT</span>':""}</div>${i === 0 ? `<div class="ttl">CHAMPION</div>` : ""}<div class="pv">${showV(r, ui.board)}</div>${rkChip(r.p, A.name)}<div class="blk">${i+1}</div></div>`; };
    const rest = rows.slice(3);
    return `<div class="pcard" style="--i:${ai}">
      <div class="ph"><h3><svg><use href="#${A.icon}"/></svg>${A.name === "Bench Press" ? "Bench" : A.name}</h3><span class="youpill">${myIdx >= 0 ? "You: #"+(myIdx+1)+" of "+rows.length : "Not entered"}</span></div>
      <div class="podium">${step(1)}${step(0)}${step(2)}</div>
      ${chase(rows, myIdx, A.name, mine)}
      ${rest.length ? `<details class="rest" ${myIdx >= 3 ? "open" : ""}><summary><span>Places 4 to ${rows.length}</span><span>Show</span></summary><ol>${rest.map((r,i) => {
        const pr = r.p.lifts[A.name];
        const erk = liftRank(r.p, A.name);
        return `<li class="${r.p.me?"me":""}${erk && erk.i === 5 ? " elite" : ""}"><span class="n">${i+4}</span><span><span class="pfmini">${pfp(r.p)}</span>${esc(nameOf(r.p))}${frMark(r.p)}${r.p.bot?'<span class="botmark">BOT</span>':""}${pr.proof ? `<a class="vid" href="${esc(pr.proof)}" target="_blank" rel="noopener noreferrer">video</a>` : ""}</span><span class="v">${rkChip(r.p, A.name, true)}${showV(r, ui.board)}</span></li>`; }).join("")}</ol></details>` : ""}
    </div>`;
  }).join(""));
  $("boardHint").textContent = (ui.scope === "friends" ? (shown.length < 2 ? "No friends on the board yet. Add some in the Squad tab. " : "Showing you and your friends only. ") : "") + (ui.board === "total" ? "Ranked by the heaviest single rep." : "Ranked by the lift divided by the lifter's bodyweight, so lighter lifters can beat heavier ones.")
    + " Holding #1 earns the crown and a Champion title on your player card, top 3 earns a podium title. Elite lifts (squat 2.5×, bench 1.75×, deadlift 3× bodyweight) only count with a video and glow red on the board."
    + (showBots ? ` ${realCount} real lifter${realCount===1?"":"s"} so far. Practice rivals (BOT) can be turned off in Profile.` : "");

  const feed = [];
  list.forEach(p => p.history.forEach(hh => { if (hh && hh.lift && num(hh.kg) > 0) feed.push({p, lift:String(hh.lift), kg:num(hh.kg), at:String(hh.at||"")}); }));
  feed.sort((a,b) => b.at.localeCompare(a.at));
  const champs = new Set(); ARENA.forEach(A => ["total","p4p"].forEach(b => { const r = ranked(A.name, b, list)[0]; if (r) champs.add(r.p.id); }));
  setHTML($("feed"), feed.slice(0,8).map((f,k) => `<li style="--i:${k}"><span class="ava pf">${pfp(f.p)}</span><span><b>${esc(nameOf(f.p))}</b>${champs.has(f.p.id) ? crownSvg("crownmini") : ""}${f.p.bot?'<span class="botmark">BOT</span>':""} hit a ${esc(f.lift === "Bench Press" ? "bench" : f.lift.toLowerCase())} PR<br><span class="muted" style="font-size:12.5px">${f.at ? shortDate(parse(f.at)) : ""}</span></span><span class="w">${WU(f.kg)}</span></li>`).join("")
    || `<li><span></span><span class="muted">No PRs yet. Be the first on the board.</span><span></span></li>`);

  trackPlaces(list, showBots);
  const a7 = adherence(7), onPodium = ARENA.some(A => ["total","p4p"].some(b => ranked(A.name,b,list).slice(0,3).some(r => r.p.me)));
  const L = mine.lifts, bw = mine.bw;
  const champ = Object.values(myPlaces(list)).some(v => v.place === 1), br = bestRank(mine);
  const BADGES = [
    ["First PR", "Submit your first PR", Object.keys(L).length > 0, 1],
    ["Iron habit", "Log 50 sets", state.lifts.length >= 50, 2],
    ["Clean week", "Macro rating of A over 7 days", a7.score >= 90, 2],
    ["Bodyweight bench", "Bench your bodyweight", L["Bench Press"] && L["Bench Press"].kg >= bw, 2],
    ["Podium finish", "Place top 3 on any podium", onPodium, 3],
    ["2× squat", "Squat twice your bodyweight", L["Squat"] && L["Squat"].kg >= bw*2, 3],
    ["2.5× deadlift", "Deadlift 2.5× bodyweight", L["Deadlift"] && L["Deadlift"].kg >= bw*2.5, 3],
    [unit()==="kg" ? "450 kg club" : "1000 lb club", unit()==="kg" ? "Total 450 kg or more" : "Total 1000 lb or more", total >= (unit()==="kg" ? 450 : 1000/LB), 3],
    ["Champion", "Hold #1 on any podium", champ, 4],
    ["Elite lifter", "Reach Elite rank on any lift", !!(br && br.i === 5), 4],
    ["Well rounded", "Rank 10 different lifts", CAT.filter(c => logRank(c[0])).length >= 10, 2],
    ["Gold standard", "Reach Gold in 5 different lifts", CAT.filter(c => { const r = logRank(c[0]); return r && r.i >= 2; }).length >= 5, 3],
    ["Squad up", "Have 3 friends", Object.keys(directory()).filter(isFriend).length >= 3, 1],
    ["Recruiter", "Get a friend to join with your code", myReferrals().length >= 1, 2],
    ["On fire", "Log in 7 days in a row", (state.streak && state.streak.best || 0) >= 7, 2],
    ["Unbreakable", "Log in 30 days in a row", (state.streak && state.streak.best || 0) >= 30, 3],
    ["Iron will", "Log in 100 days in a row", (state.streak && state.streak.best || 0) >= 100, 4]
  ];
  setHTML($("badges"), BADGES.map(([n,d,ok,df]) => `<div class="badge d${df} ${ok?"":"locked"}">${medalArt(1, 52, {star:true, diff:df})}<span class="dpill">${DIFF[df].name}</span>${esc(n)}<small>${esc(d)}</small></div>`).join(""));
  renderForecast();
}
function prefillClaim(){
  const mine = myPr();
  $("cB").value = Math.round(toU(mine && num(mine.bw) > 20 ? mine.bw : state.profile.bw)*10)/10;
  const cur = mine && mine.lifts && mine.lifts[ui.claimLift];
  const last = state.lastClaim && state.lastClaim.lifts && state.lastClaim.lifts[ui.claimLift];
  const s = bestSingle(ui.claimLift);
  if (state.lastClaim && num(state.lastClaim.bw) > 20) $("cB").value = Math.round(toU(state.lastClaim.bw)*10)/10;
  const w = last ? last.kg : cur ? cur.kg : s;
  $("cW").value = w ? Math.round(toU(w)*2)/2 : "";
  $("cV").value = last && last.proof ? last.proof : cur && cur.proof ? cur.proof : "";
  $("cD").value = today();
  $("cWl").textContent = `Weight lifted for 1 rep (${unit()})`; $("cBl").textContent = `Your bodyweight (${unit()})`;
  renderLiftPick(); renderForecast();
}
function renderLiftPick(){
  $("liftPick").innerHTML = ARENA.map(A => { const last = state.lastClaim && state.lastClaim.lifts && state.lastClaim.lifts[A.name];
    return `<button type="button" data-l="${A.name}" aria-pressed="${A.name===ui.claimLift}"><svg><use href="#${A.icon}"/></svg>${A.name === "Bench Press" ? "Bench" : A.name}<span class="last">${last ? "Last: " + WU(last.kg) : "No PR yet"}</span></button>`; }).join("");
}
function renderForecast(){
  if ($("claim").hidden) return;
  const kg = fromU(num($("cW").value)), bw = fromU(num($("cB").value));
  if (!(kg > 0) || !(bw > 20)){ $("forecast").innerHTML = "Enter the weight and your bodyweight to see where you'd place."; return; }
  const {list} = players();
  const others = list.filter(p => !p.me), mine = list.find(p => p.me);
  const meNew = {id:"me", me:true, bw, lifts:Object.assign({}, mine ? mine.lifts : {}, {[ui.claimLift]:{kg, proof:"preview"}})};
  const place = b => ranked(ui.claimLift, b, others.concat([meNew])).findIndex(r => r.p.me) + 1;
  const cur = mine && mine.lifts[ui.claimLift];
  const short = ui.claimLift === "Bench Press" ? "bench" : ui.claimLift.toLowerCase();
  const elite = isElite(ui.claimLift, kg, bw), hasVid = /^https:\/\/\S+$/.test($("cV").value.trim());
  $("cVl").textContent = elite ? "Video link (required: elite lift)" : "Video link (optional)";
  $("forecast").innerHTML = (elite ? `<span class="elite-note">This is an elite ${short} (${RANK_MIN[ui.claimLift][5]}× bodyweight or more), so it needs a video link to count.</span> ${hasVid ? "With your video, it" : "With a video, it"} puts you` : "This puts you")
    + ` <b>#${place("total")}</b> on the total strength ${short} podium and <b>#${place("p4p")}</b> on pound for pound. Rank: <b>${rankFor(ui.claimLift, kg, bw).label}</b>.`
    + (cur ? (kg > cur.kg ? ` That's <b>+${WU(kg-cur.kg)}</b> over your current PR.` : ` <span style="color:var(--warn)">That's lower than your current PR of ${WU(cur.kg)}, and it will replace it.</span>`) : "");
}
$("liftPick").addEventListener("click", e => { const b = e.target.closest("[data-l]"); if (b){ ui.claimLift = b.dataset.l; prefillClaim(); } });
["cW","cB","cV"].forEach(id => $(id).addEventListener("input", renderForecast));
$("claimForm").addEventListener("submit", async e => {
  e.preventDefault();
  const kg = fromU(num($("cW").value)), bw = fromU(num($("cB").value)), date = $("cD").value || today(), proof = $("cV").value.trim();
  if (!(kg > 0 && kg < 700)){ toast("That weight looks off. Check the number and the unit."); return; }
  if (proof && !/^https:\/\/\S+$/.test(proof)){ toast("Video links need to start with https://"); return; }
  if (isElite(ui.claimLift, kg, bw) && !proof){ toast("Elite lifts need a video link to count. Add one to lock it in."); $("cV").focus(); return; }
  const cur = myPr() || {};
  const doc = {tag:state.profile.tag || "", bw, lifts:Object.assign(cleanLifts(cur.lifts), {[ui.claimLift]:{kg, date, proof}}),
    history:[{lift:ui.claimLift, kg, at:date}].concat(Array.isArray(cur.history) ? cur.history : []).slice(0,10), updatedAt:Date.now()};
  submitting = true;
  if (cloud){
    try { await db.doc("prs/"+myId).set(doc); }
    catch(err){ submitting = false; if (err && err.code === "invalid_argument"){ canPost = false; toast("You can view the boards but can't post to them."); renderArena(); return; } toast("Couldn't save your PR. Try again in a moment."); return; }
  } else state.localPr = doc;
  state.prCount = num(state.prCount) + 1; state.profile.bw = bw;
  state.lastClaim = {lift:ui.claimLift, bw, lifts:Object.assign({}, state.lastClaim && state.lastClaim.lifts, {[ui.claimLift]:{kg, proof, date}})};
  save();
  $("claim").hidden = true;
  toast(`Locked in: ${ui.claimLift === "Bench Press" ? "bench" : ui.claimLift.toLowerCase()} ${WU(kg)}. +100 XP`);
  renderAll();
  checkProgress({bw, lifts:cleanLifts(doc.lifts), bot:false}, ui.claimLift);
  submitting = false;
});
$("boardSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ ui.board = b.dataset.v; renderArena(); } });
$("scopeSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ ui.scope = b.dataset.v; renderArena(); } });
$("streakChip").addEventListener("click", () => setTab("squad"));
document.addEventListener("click", e => {
  const a = e.target.closest("[data-addf]"), u = e.target.closest("[data-unf]");
  if (a){ setFriend(a.dataset.addf, true); toast(friendState(a.dataset.addf) === "mutual" ? "You're now friends" : "Friend request sent. They show as friends once they add you back."); }
  if (u) setFriend(u.dataset.unf, false);
});
$("addFriend").addEventListener("submit", e => { e.preventDefault(); const c = $("fCode").value.toUpperCase().trim(), who = codeOwner(c);
  if (c === myCode()) return toast("That's your own code.");
  if (!who) return toast("No lifter has that code yet.");
  $("fCode").value = ""; setFriend(who, true); toast(friendState(who) === "mutual" ? "You're now friends" : "Friend request sent"); });

/* ---------- training ---------- */
let mainGeo = null;
function renderTrain(){
  const watchL = [...LIFTS, ...CAT.filter(c => !LIFTS.some(L => L.name === c[0]) && state.lifts.some(l => l.ex === c[0])).map(c => ({name:c[0], sym:c[2]}))];
  $("watch").innerHTML = watchL.map(L => {
    const pts = inRange(series(L.name,"e1rm"),90), c = change(pts), last = pts.length ? pts[pts.length-1].v : 0;
    return `<button class="wrow" type="button" data-ex="${esc(L.name)}" aria-pressed="${L.name===ui.ex}"><span><span class="nm">${esc(L.name)}</span><br><span class="sub">Est. 1RM</span></span>
      <canvas data-spark="${esc(L.name)}"></canvas><span class="rt">${last ? W(last) : "—"}<br><span class="chg ${c && c.pct >= 0 ? "up" : "down"}">${c ? (c.pct>=0?"+":"")+c.pct.toFixed(1)+"%" : ""}</span></span></button>`;
  }).join("");
  const L = LIFTS.find(l => l.name === ui.ex) || {name:ui.ex, sym:(EX[ui.ex] && EX[ui.ex].sym) || "LIFT"};
  $("cSym").textContent = L.sym + " · " + {e1rm:"EST. 1RM", top:"TOP SET", vol:"SESSION VOLUME"}[ui.metric] + " · " + unit().toUpperCase();
  $("cName").textContent = L.name;
  const pts = inRange(series(ui.ex, ui.metric), ui.range), c = change(pts);
  $("cPrice").innerHTML = pts.length ? W(pts[pts.length-1].v) + `<small>${unit()}</small>` : "—";
  const dl = $("cDelta");
  if (c){ dl.className = "delta " + (c.abs >= 0 ? "up" : "down"); dl.textContent = (c.abs>=0?"▲ +":"▼ ") + WU(Math.abs(c.abs)) + " (" + (c.pct>=0?"+":"") + c.pct.toFixed(1) + "%) " + {30:"past month",90:"past 3 months",180:"past 6 months",365:"past year",0:"all time"}[ui.range]; }
  else { dl.className = "delta"; dl.textContent = "Log more sets to see a trend"; }
  document.querySelectorAll("#metricSeg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === ui.metric));
  document.querySelectorAll("#rangeSeg button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.v === ui.range));
  const sets = state.lifts.filter(l => l.ex === ui.ex);
  const bs = sets.reduce((b,l) => !b || e1rm(l.kg,l.reps) > e1rm(b.kg,b.reps) ? l : b, null);
  $("cFoot").innerHTML = bs ? `<span>Best est. 1RM <b>${WU(e1rm(load(bs),bs.reps))}</b> (${setTxt(bs)} × ${bs.reps}, ${shortDate(parse(bs.date))})</span><span>Ratio <b>${(best(ui.ex)/state.profile.bw).toFixed(2)}× BW</b></span><span>Sessions in range <b>${pts.length}</b></span>` : "<span>No sets yet for this lift.</span>";
  lfLabel();
  if (!$("lfW").value) $("lfW").value = unit() === "kg" ? 100 : 225;
  const rows = [...state.lifts].sort((a,b) => b.date.localeCompare(a.date)).slice(0,10);
  $("recent").innerHTML = rows.map(l => `<tr><td class="mono">${shortDate(parse(l.date))}</td><td>${esc(l.ex)}</td><td class="r mono">${setTxt(l)} × ${l.reps} × ${l.sets}</td><td class="r mono">${W(e1rm(load(l),l.reps))}</td><td class="r"><button class="x" type="button" data-del-lift="${esc(l.id)}" aria-label="Delete set">✕</button></td></tr>`).join("")
    || `<tr><td colspan="5" class="muted">No sets yet. Log your first one on the left.</td></tr>`;
  liftHint();
  renderLiftRanks();
  drawTrainCharts();
}

/* ---------- body rank ---------- */
const MUSCLES = [["chest","Chest"],["shoulders","Shoulders"],["traps","Traps"],["biceps","Biceps"],["triceps","Triceps"],["forearms","Forearms"],["abs","Abs"],["lats","Back"],["lowerback","Lower back"],["glutes","Glutes"],["abductors","Abductors"],["adductors","Adductors"],["quads","Quads"],["hamstrings","Hamstrings"],["calves","Calves"]];
const MNAME = Object.fromEntries(MUSCLES);
// how much each lift works each muscle (1 = main mover)
const HITS = {
  "Squat":{quads:1,glutes:.8,hamstrings:.4,lowerback:.4,abs:.3,abductors:.3,adductors:.3}, "Front Squat":{quads:1,glutes:.6,abs:.5,lowerback:.3,adductors:.2},
  "Deadlift":{hamstrings:.8,glutes:.9,lowerback:1,traps:.6,lats:.4,forearms:.5,quads:.4}, "Sumo Deadlift":{glutes:1,quads:.6,hamstrings:.6,lowerback:.7,traps:.5,forearms:.4,abductors:.6,adductors:.6},
  "Romanian Deadlift":{hamstrings:1,glutes:.8,lowerback:.6,forearms:.3}, "Trap Bar Deadlift":{quads:.8,glutes:.8,hamstrings:.6,traps:.6,lowerback:.6,forearms:.4},
  "Hip Abduction":{abductors:1,glutes:.4}, "Hip Adduction":{adductors:1}, "Cable Hip Adduction":{adductors:1}, "Cable Hip Abduction":{abductors:1,glutes:.3}, "Hip Thrust":{glutes:1,hamstrings:.4,abductors:.3}, "Leg Press":{quads:1,glutes:.5,adductors:.2}, "Hack Squat":{quads:1,glutes:.4,adductors:.2},
  "Bulgarian Split Squat":{quads:.9,glutes:.9,hamstrings:.3,abductors:.5,adductors:.3}, "Walking Lunge":{quads:.9,glutes:.8,hamstrings:.3,calves:.2,abductors:.4,adductors:.3}, "Goblet Squat":{quads:1,glutes:.5,abs:.4},
  "Leg Extension":{quads:1}, "Leg Curl":{hamstrings:1,calves:.2}, "Calf Raise":{calves:1}, "Pistol Squat":{quads:1,glutes:.7,abs:.3,abductors:.5,adductors:.3},
  "Bench Press":{chest:1,triceps:.6,shoulders:.5}, "Incline Bench Press":{chest:1,shoulders:.7,triceps:.5}, "Close-Grip Bench Press":{triceps:1,chest:.7,shoulders:.4},
  "Dumbbell Bench Press":{chest:1,triceps:.5,shoulders:.5}, "Incline Dumbbell Press":{chest:1,shoulders:.7,triceps:.4}, "Overhead Press":{shoulders:1,triceps:.6,traps:.4,abs:.3},
  "Push Press":{shoulders:1,triceps:.6,quads:.3,traps:.4}, "Dumbbell Shoulder Press":{shoulders:1,triceps:.5}, "Arnold Press":{shoulders:1,triceps:.4},
  "Machine Chest Press":{chest:1,triceps:.5,shoulders:.4}, "Chest Fly":{chest:1,shoulders:.3}, "Lateral Raise":{shoulders:1,traps:.3},
  "Dips":{triceps:1,chest:.8,shoulders:.5}, "Push-ups":{chest:1,triceps:.6,shoulders:.5,abs:.3},
  "Pull-ups":{lats:1,biceps:.6,forearms:.5,traps:.3,abs:.2}, "Chin-ups":{lats:1,biceps:.8,forearms:.5}, "Muscle-ups":{lats:1,triceps:.6,chest:.4,biceps:.5,forearms:.5,shoulders:.4},
  "Inverted Row":{lats:.8,traps:.7,biceps:.5}, "Barbell Row":{lats:1,traps:.7,biceps:.5,lowerback:.5,forearms:.4}, "Pendlay Row":{lats:1,traps:.7,biceps:.5,lowerback:.5,forearms:.4},
  "T-Bar Row":{lats:1,traps:.7,biceps:.5,lowerback:.4}, "Dumbbell Row":{lats:1,biceps:.5,traps:.5,forearms:.3}, "Lat Pulldown":{lats:1,biceps:.6},
  "Seated Cable Row":{lats:.9,traps:.8,biceps:.5}, "Face Pull":{shoulders:.8,traps:.9}, "Shrug":{traps:1,forearms:.5},
  "Barbell Curl":{biceps:1,forearms:.5}, "EZ Bar Curl":{biceps:1,forearms:.4}, "Dumbbell Curl":{biceps:1,forearms:.4}, "Hammer Curl":{biceps:.8,forearms:.9},
  "Preacher Curl":{biceps:1,forearms:.3}, "Concentration Curl":{biceps:1,forearms:.3}, "Cable Curl":{biceps:1,forearms:.3},
  "Tricep Pushdown":{triceps:1}, "Skull Crusher":{triceps:1}, "Overhead Tricep Extension":{triceps:1}, "Wrist Curl":{forearms:1},
  "Hanging Leg Raise":{abs:1,forearms:.3}, "Ab Wheel Rollout":{abs:1,lats:.3,shoulders:.2}, "Weighted Sit-up":{abs:1}, "Cable Crunch":{abs:1},
  "Power Clean":{traps:.8,hamstrings:.7,glutes:.7,quads:.6,shoulders:.4,lowerback:.6}, "Hang Clean":{traps:.9,hamstrings:.6,glutes:.6,forearms:.4,shoulders:.4},
  "Clean and Jerk":{quads:.8,glutes:.7,shoulders:.8,traps:.7,triceps:.5}, "Snatch":{shoulders:.8,traps:.8,quads:.7,glutes:.7,hamstrings:.5,lowerback:.5}
};
function bodyRanks(){
  const mine = players().list.find(p => p.me), lr = {};
  CAT.forEach(c => { let rk = logRank(c[0]); if (mine && ARENA.some(A => A.name === c[0])){ const a = liftRank(mine, c[0]); if (a && (!rk || a.score > rk.score)) rk = a; } if (rk) lr[c[0]] = rk; });
  const m = {};
  MUSCLES.forEach(([k, name]) => {
    let s = 0, sw = 0; const from = [], todo = [];
    Object.entries(HITS).forEach(([lift, h]) => { const w = h[k]; if (!w) return; const rk = lr[lift]; if (rk){ s += rk.score*w*w; sw += w*w; from.push({lift, rk, w}); } else if (w >= .8) todo.push(lift); });
    const score = sw ? Math.round(s/sw) : -1;
    m[k] = {k, name, score, rk: score >= 0 ? rankFromScore(score, name) : null, from: from.sort((a,b) => b.w - a.w || b.rk.score - a.rk.score), todo};
  });
  const rankedN = MUSCLES.filter(([k]) => m[k].score >= 0).length;
  const overall = rankedN ? Math.floor(MUSCLES.reduce((a,[k]) => a + Math.max(0, m[k].score), 0) / MUSCLES.length) : -1;
  return {m, overall, rk: overall >= 0 ? rankFromScore(overall, "Body") : null, rankedN, lr};
}
const BODY_PARTS = {
  front:[["traps", "M196,150C192.7,146.8 183.7,151.4 176,153.4C168.3,155.4 158.3,159.2 150,162C141.7,164.9 132.7,166.6 126,170.6C119.3,174.7 109.3,182.7 110,186.1C110.7,189.6 122,191 130,191.3C138,191.6 148.7,189.6 158,187.8C167.3,186.1 179.7,183.5 186,181C192.3,178.4 194.3,177.5 196,172.4C197.7,167.2 199.3,153.2 196,150ZM204,150C207.3,146.8 216.3,151.4 224,153.4C231.7,155.4 241.7,159.2 250,162C258.3,164.9 267.3,166.6 274,170.6C280.7,174.7 290.7,182.7 290,186.1C289.3,189.6 278,191 270,191.3C262,191.6 251.3,189.6 242,187.8C232.7,186.1 220.3,183.5 214,181C207.7,178.4 205.7,177.5 204,172.4C202.3,167.2 200.7,153.2 204,150Z", "M191.9,157.4C188.9,157.6 179.7,158.4 174,158.9C168.2,159.4 160.1,160.1 157.3,160.3M188.4,158.5C183.7,159.4 169.3,161.9 160.3,163.4C151.3,165 138.6,167.2 134.3,168M185.7,161C179.7,163 161.2,169.1 149.6,173C138,176.8 121.7,182.2 116.2,184.1M189.1,161.7C184.7,164 171.3,171.3 162.9,175.8C154.5,180.3 142.7,186.7 138.7,188.8M193.1,161.1C190.7,163.1 183.3,169.4 178.7,173.4C174.1,177.4 167.6,182.9 165.3,184.8M208.1,157.4C211.1,157.6 220.3,158.4 226,158.9C231.8,159.4 239.9,160.1 242.7,160.3M211.6,158.5C216.3,159.4 230.7,161.9 239.7,163.4C248.7,165 261.4,167.2 265.7,168M214.3,161C220.3,163 238.8,169.1 250.4,173C262,176.8 278.3,182.2 283.8,184.1M210.9,161.7C215.3,164 228.7,171.3 237.1,175.8C245.5,180.3 257.3,186.7 261.3,188.8M206.9,161.1C209.3,163.1 216.7,169.4 221.3,173.4C225.9,177.4 232.4,182.9 234.7,184.8"],
    ["chest", "M198,189.6C193.3,178.4 180,185 170,184.4C160,183.8 147.7,184.1 138,186.1C128.3,188.1 118.3,191.6 112,196.4C105.7,201.3 101,208.5 100,215.4C99,222.2 101.3,231.1 106,237.7C110.7,244.3 119.3,250.6 128,254.9C136.7,259.2 148.3,262.7 158,263.5C167.7,264.4 179.3,262.1 186,260.1C192.7,258.1 196,263.2 198,251.5C200,239.7 202.7,200.7 198,189.6ZM202,189.6C206.7,178.4 220,185 230,184.4C240,183.8 252.3,184.1 262,186.1C271.7,188.1 281.7,191.6 288,196.4C294.3,201.3 299,208.5 300,215.4C301,222.2 298.7,231.1 294,237.7C289.3,244.3 280.7,250.6 272,254.9C263.3,259.2 251.7,262.7 242,263.5C232.3,264.4 220.7,262.1 214,260.1C207.3,258.1 204,263.2 202,251.5C200,239.7 197.3,200.7 202,189.6Z", "M116.7,211.2C123,209.1 142.1,202.8 154,198.8C166,194.9 182.9,189.3 188.6,187.4M115.5,210.8C121.1,208.6 138.3,201.8 149.1,197.6C159.9,193.3 175.1,187.3 180.3,185.3M113.2,211C117.8,208.9 131.6,202.4 140.3,198.3C149,194.3 161.2,188.5 165.4,186.6M110.1,221.9C113.1,225 122.3,234.8 128.1,240.9C133.9,247.1 142,255.7 144.8,258.6M111.6,222.1C115.3,225.4 126.6,235.5 133.7,241.8C140.8,248.2 150.8,257.1 154.2,260.1M113.7,222C118.4,225.3 132.9,235.2 142,241.5C151.1,247.7 163.9,256.5 168.3,259.5M115.5,221.6C121.1,224.7 138.3,234.1 149.1,240C159.9,245.8 175.1,254.1 180.3,256.9M116.3,221.5C122.3,224.6 140.7,233.9 152.2,239.7C163.7,245.5 179.9,253.7 185.5,256.5M117,221.1C123.3,223.8 142.9,232.4 155.1,237.7C167.3,243.1 184.5,250.6 190.4,253.2M117.4,217.8C124,219 144.1,222.6 156.8,224.9C169.4,227.2 187.1,230.4 193.2,231.5M117.5,214.3C124.1,213.8 144.4,212.3 157.1,211.3C169.8,210.3 187.6,209 193.8,208.5M283.3,211.2C277,209.1 257.9,202.8 246,198.8C234,194.9 217.1,189.3 211.4,187.4M284.5,210.8C278.9,208.6 261.7,201.8 250.9,197.6C240.1,193.3 224.9,187.3 219.7,185.3M286.8,211C282.3,208.9 268.4,202.4 259.7,198.3C251,194.3 238.8,188.5 234.6,186.6M289.9,221.9C286.9,225 277.7,234.8 271.9,240.9C266.1,247.1 258,255.7 255.2,258.6M288.4,222.1C284.8,225.4 273.4,235.5 266.3,241.8C259.2,248.2 249.2,257.1 245.8,260.1M286.3,222C281.6,225.3 267.1,235.2 258,241.5C248.9,247.7 236.1,256.5 231.7,259.5M284.5,221.6C278.9,224.7 261.7,234.1 250.9,240C240.1,245.8 224.9,254.1 219.7,256.9M283.7,221.5C277.7,224.6 259.3,233.9 247.8,239.7C236.3,245.5 220.1,253.7 214.5,256.5M283,221.1C276.7,223.8 257.1,232.4 244.9,237.7C232.7,243.1 215.5,250.6 209.6,253.2M282.6,217.8C276,219 255.9,222.6 243.2,224.9C230.6,227.2 212.9,230.4 206.8,231.5M282.5,214.3C275.9,213.8 255.6,212.3 242.9,211.3C230.2,210.3 212.4,209 206.2,208.5"],
    ["abs", "M199,297.9C199,301.1 198.5,305.2 197.5,307.4C196.4,309.6 195.4,310.4 192.7,311.3C189.9,312.1 184.9,312.5 181,312.5C177.1,312.5 172.1,312.1 169.3,311.3C166.6,310.4 165.6,309.6 164.5,307.4C163.5,305.2 163,301.1 163,297.9C163,294.8 163.5,290.7 164.5,288.4C165.6,286.2 166.6,285.4 169.3,284.6C172.1,283.7 177.1,283.3 181,283.3C184.9,283.3 189.9,283.7 192.7,284.6C195.4,285.4 196.4,286.2 197.5,288.4C198.5,290.7 199,294.8 199,297.9ZM201,297.9C201,301.1 201.5,305.2 202.5,307.4C203.6,309.6 204.6,310.4 207.3,311.3C210.1,312.1 215.1,312.5 219,312.5C222.9,312.5 227.9,312.1 230.7,311.3C233.4,310.4 234.4,309.6 235.5,307.4C236.5,305.2 237,301.1 237,297.9C237,294.8 236.5,290.7 235.5,288.4C234.4,286.2 233.4,285.4 230.7,284.6C227.9,283.7 222.9,283.3 219,283.3C215.1,283.3 210.1,283.7 207.3,284.6C204.6,285.4 203.6,286.2 202.5,288.4C201.5,290.7 201,294.8 201,297.9ZM197,332.3C197,335.5 196.5,339.6 195.5,341.8C194.4,344 193.4,344.8 190.7,345.7C187.9,346.5 182.9,346.9 179,346.9C175.1,346.9 170.1,346.5 167.3,345.7C164.6,344.8 163.6,344 162.5,341.8C161.5,339.6 161,335.5 161,332.3C161,329.2 161.5,325.1 162.5,322.8C163.6,320.6 164.6,319.8 167.3,319C170.1,318.1 175.1,317.7 179,317.7C182.9,317.7 187.9,318.1 190.7,319C193.4,319.8 194.4,320.6 195.5,322.8C196.5,325.1 197,329.2 197,332.3ZM203,332.3C203,335.5 203.5,339.6 204.5,341.8C205.6,344 206.6,344.8 209.3,345.7C212.1,346.5 217.1,346.9 221,346.9C224.9,346.9 229.9,346.5 232.7,345.7C235.4,344.8 236.4,344 237.5,341.8C238.5,339.6 239,335.5 239,332.3C239,329.2 238.5,325.1 237.5,322.8C236.4,320.6 235.4,319.8 232.7,319C229.9,318.1 224.9,317.7 221,317.7C217.1,317.7 212.1,318.1 209.3,319C206.6,319.8 205.6,320.6 204.5,322.8C203.5,325.1 203,329.2 203,332.3ZM194,366.7C194,369.9 193.5,374 192.5,376.2C191.5,378.4 190.6,379.2 188,380.1C185.4,380.9 180.7,381.3 177,381.3C173.3,381.3 168.6,380.9 166,380.1C163.4,379.2 162.5,378.4 161.5,376.2C160.5,374 160,369.9 160,366.7C160,363.6 160.5,359.5 161.5,357.2C162.5,355 163.4,354.2 166,353.4C168.6,352.5 173.3,352.1 177,352.1C180.7,352.1 185.4,352.5 188,353.4C190.6,354.2 191.5,355 192.5,357.2C193.5,359.5 194,363.6 194,366.7ZM206,366.7C206,369.9 206.5,374 207.5,376.2C208.5,378.4 209.4,379.2 212,380.1C214.6,380.9 219.3,381.3 223,381.3C226.7,381.3 231.4,380.9 234,380.1C236.6,379.2 237.5,378.4 238.5,376.2C239.5,374 240,369.9 240,366.7C240,363.6 239.5,359.5 238.5,357.2C237.5,355 236.6,354.2 234,353.4C231.4,352.5 226.7,352.1 223,352.1C219.3,352.1 214.6,352.5 212,353.4C209.4,354.2 208.5,355 207.5,357.2C206.5,359.5 206,363.6 206,366.7ZM196,390.8C192.2,383.3 182,387.9 176,389.1C170,390.2 162.7,392.2 160,397.7C157.3,403.1 158.7,413.7 160,421.8C161.3,429.8 164.3,438.4 168,445.8C171.7,453.3 177,460.7 182,466.5C187,472.2 195.2,485.7 198,480.2C200.8,474.8 199.3,448.7 199,433.8C198.7,418.9 199.8,398.3 196,390.8ZM204,390.8C207.8,383.3 218,387.9 224,389.1C230,390.2 237.3,392.2 240,397.7C242.7,403.1 241.3,413.7 240,421.8C238.7,429.8 235.7,438.4 232,445.8C228.3,453.3 223,460.7 218,466.5C213,472.2 204.8,485.7 202,480.2C199.2,474.8 200.7,448.7 201,433.8C201.3,418.9 200.2,398.3 204,390.8ZM162,294.5C158.3,287 146.3,289.6 140,289.3C133.7,289 127.5,288.2 124,292.8C120.5,297.3 119,305.9 119,316.8C119,327.7 121.5,344.4 124,358.1C126.5,371.9 131,385.9 134,399.4C137,412.9 139,427.8 142,439C145,450.1 148.7,459.9 152,466.5C155.3,473.1 160.3,485.4 162,478.5C163.7,471.6 162.3,444.1 162,425.2C161.7,406.3 160,380.2 160,365C160,349.8 161.7,345.8 162,334C162.3,322.3 165.7,301.9 162,294.5ZM238,294.5C241.7,287 253.7,289.6 260,289.3C266.3,289 272.5,288.2 276,292.8C279.5,297.3 281,305.9 281,316.8C281,327.7 278.5,344.4 276,358.1C273.5,371.9 269,385.9 266,399.4C263,412.9 261,427.8 258,439C255,450.1 251.3,459.9 248,466.5C244.7,473.1 239.7,485.4 238,478.5C236.3,471.6 237.7,444.1 238,425.2C238.3,406.3 240,380.2 240,365C240,349.8 238.3,345.8 238,334C237.7,322.3 234.3,301.9 238,294.5ZM107.3,249.8C106.7,251.3 109.1,254.9 110.3,256.2C111.5,257.5 112.8,257.1 114.6,257.7C116.3,258.3 118.8,259.1 120.9,259.8C123,260.5 125.4,261.3 127.2,261.9C128.9,262.5 129.8,263.6 131.4,263.4C133.1,263.2 136.7,262.2 137.2,260.8C137.7,259.4 135.7,256.2 134.6,255C133.4,253.8 132.1,254 130.3,253.4C128.6,252.7 126.2,251.7 124.1,250.9C122.1,250.1 119.7,249.1 118,248.4C116.2,247.7 115.5,246.6 113.7,246.8C112,247 107.9,248.2 107.3,249.8ZM292.7,249.8C292.1,248.2 288,247 286.3,246.8C284.5,246.6 283.8,247.7 282,248.4C280.3,249.1 277.9,250.1 275.9,250.9C273.8,251.7 271.4,252.7 269.7,253.4C267.9,254 266.6,253.8 265.4,255C264.3,256.2 262.3,259.4 262.8,260.8C263.3,262.2 266.9,263.2 268.6,263.4C270.2,263.6 271.1,262.5 272.8,261.9C274.6,261.3 277,260.5 279.1,259.8C281.2,259.1 283.7,258.3 285.4,257.7C287.2,257.1 288.5,257.5 289.7,256.2C290.9,254.9 293.3,251.3 292.7,249.8ZM109.2,263.7C108.7,265.3 111.2,268.7 112.4,270C113.7,271.3 115,270.8 116.7,271.3C118.5,271.8 120.9,272.6 123,273.2C125.1,273.8 127.5,274.5 129.3,275.1C131.1,275.6 131.9,276.7 133.6,276.4C135.3,276.1 138.8,274.9 139.3,273.5C139.7,272.1 137.6,269 136.4,267.8C135.2,266.7 133.9,267 132.2,266.4C130.4,265.8 128,264.9 126,264.2C123.9,263.4 121.5,262.6 119.8,262C118.1,261.3 117.3,260.2 115.6,260.5C113.8,260.8 109.8,262.1 109.2,263.7ZM290.8,263.7C290.2,262.1 286.2,260.8 284.4,260.5C282.7,260.2 281.9,261.3 280.2,262C278.5,262.6 276.1,263.4 274,264.2C272,264.9 269.6,265.8 267.8,266.4C266.1,267 264.8,266.7 263.6,267.8C262.4,269 260.3,272.1 260.7,273.5C261.2,274.9 264.7,276.1 266.4,276.4C268.1,276.7 268.9,275.6 270.7,275.1C272.5,274.5 274.9,273.8 277,273.2C279.1,272.6 281.5,271.8 283.3,271.3C285,270.8 286.3,271.3 287.6,270C288.8,268.7 291.3,265.3 290.8,263.7ZM113.2,277.7C112.7,279.3 115.5,282.6 116.7,283.8C117.9,285 119,284.4 120.6,284.8C122.2,285.2 124.4,285.7 126.3,286.2C128.2,286.6 130.3,287.1 131.9,287.5C133.5,287.9 134.3,288.9 135.8,288.5C137.4,288.1 140.9,286.8 141.3,285.3C141.7,283.9 139.3,280.9 138.2,279.8C137,278.7 135.9,279.2 134.3,278.7C132.8,278.2 130.6,277.6 128.7,277C126.9,276.4 124.7,275.8 123.1,275.3C121.6,274.8 121,273.8 119.3,274.2C117.6,274.6 113.6,276.1 113.2,277.7ZM286.8,277.7C286.4,276.1 282.4,274.6 280.7,274.2C279,273.8 278.4,274.8 276.9,275.3C275.3,275.8 273.1,276.4 271.3,277C269.4,277.6 267.2,278.2 265.7,278.7C264.1,279.2 263,278.7 261.8,279.8C260.7,280.9 258.3,283.9 258.7,285.3C259.1,286.8 262.6,288.1 264.2,288.5C265.7,288.9 266.5,287.9 268.1,287.5C269.7,287.1 271.8,286.6 273.7,286.2C275.6,285.7 277.8,285.2 279.4,284.8C281,284.4 282.1,285 283.3,283.8C284.5,282.6 287.3,279.3 286.8,277.7Z", "M170,297.9C171.8,298.5 177.3,301.4 181,301.4C184.7,301.4 190.2,298.5 192,297.9M230,297.9C228.2,298.5 222.7,301.4 219,301.4C215.3,301.4 209.8,298.5 208,297.9M168,332.3C169.8,332.9 175.3,335.8 179,335.8C182.7,335.8 188.2,332.9 190,332.3M232,332.3C230.2,332.9 224.7,335.8 221,335.8C217.3,335.8 211.8,332.9 210,332.3M167,366.7C168.7,367.3 173.5,370.2 177,370.2C180.5,370.2 186.2,367.3 188,366.7M233,366.7C231.3,367.3 226.5,370.2 223,370.2C219.5,370.2 213.8,367.3 212,366.7M172,404.6C174,408 180.3,418 184,425.2C187.7,432.4 192.3,443.8 194,447.6M228,404.6C226,408 219.7,418 216,425.2C212.3,432.4 207.7,443.8 206,447.6M155.4,443.1C155.2,430.9 154.3,393.3 153.8,369.8C153.3,346.2 152.5,313.1 152.3,301.7M152.1,443.2C150.2,431 144.4,393.6 140.8,370.1C137.1,346.6 132,313.6 130.2,302.3M150.8,446.3C148.3,435.6 140.6,402.7 135.7,382.1C130.9,361.4 124,332.5 121.7,322.6M151.5,452.8C149.3,445.3 142.6,422.1 138.4,407.7C134.2,393.2 128.3,372.8 126.2,365.8M152.9,458.6C151.4,453.9 146.8,439.4 143.9,430.4C141,421.3 136.9,408.6 135.5,404.2M156.6,452.8C156.9,445.3 157.7,422.2 158.3,407.7C158.8,393.2 159.6,372.9 159.8,365.9M157,447.5C157.5,437.4 158.9,406.3 159.8,386.8C160.7,367.3 162,339.9 162.5,330.6M244.6,443.1C244.8,430.9 245.7,393.3 246.2,369.8C246.7,346.2 247.5,313.1 247.7,301.7M247.9,443.2C249.8,431 255.6,393.6 259.2,370.1C262.9,346.6 268,313.6 269.8,302.3M249.2,446.3C251.7,435.6 259.4,402.7 264.3,382.1C269.1,361.4 276,332.5 278.3,322.6M248.5,452.8C250.7,445.3 257.4,422.1 261.6,407.7C265.8,393.2 271.7,372.8 273.8,365.8M247.1,458.6C248.6,453.9 253.2,439.4 256.1,430.4C259,421.3 263.1,408.6 264.5,404.2M243.4,452.8C243.1,445.3 242.3,422.2 241.7,407.7C241.2,393.2 240.4,372.9 240.2,365.9M243,447.5C242.5,437.4 241.1,406.3 240.2,386.8C239.3,367.3 238,339.9 237.5,330.6M113.8,252.1C115.2,252.7 119.6,254.3 122.5,255.3C125.4,256.4 129.8,258 131.2,258.6M286.2,252.1C284.8,252.7 280.4,254.3 277.5,255.3C274.6,256.4 270.2,258 268.8,258.6M115.8,265.8C117.2,266.3 121.6,267.7 124.5,268.7C127.4,269.6 131.8,271.1 133.2,271.5M284.2,265.8C282.8,266.3 278.4,267.7 275.5,268.7C272.6,269.6 268.2,271.1 266.8,271.5M119.6,279.4C120.9,279.8 124.9,280.9 127.5,281.6C130.1,282.3 134.1,283.4 135.4,283.7M280.4,279.4C279.1,279.8 275.1,280.9 272.5,281.6C269.9,282.3 265.9,283.4 264.6,283.7"],
    ["abductors", "M134.1,421.4C128.3,420.1 116.4,431.6 112.5,434.8C108.5,438.1 111.4,438.2 110.4,440.9C109.5,443.6 107.9,447 106.7,450.9C105.4,454.8 103.9,459.3 102.9,464.1C102,468.9 100.9,474.2 101,479.8C101.1,485.5 102.2,491.6 103.6,497.8C105,504 107.6,510.9 109.6,517C111.6,523 114.2,529.4 115.8,534.3C117.4,539.1 116.9,542.9 119.1,546.2C121.2,549.5 126,554.5 129,554.1C131.9,553.8 135.5,548 136.9,544.2C138.4,540.5 137,536.8 137.4,531.7C137.8,526.6 138.7,519.8 139.4,513.6C140.1,507.5 141.1,500.4 141.7,494.9C142.3,489.4 142.7,484.7 143,480.6C143.3,476.6 143.2,473.9 143.5,470.5C143.8,467 144.1,463.4 144.6,460.2C145,456.9 145.5,453.6 146,450.7C146.5,447.9 149.5,448 147.5,443.1C145.5,438.2 140,422.8 134.1,421.4ZM265.9,421.4C260,422.8 254.5,438.2 252.5,443.1C250.5,448 253.5,447.9 254,450.7C254.5,453.6 255,456.9 255.4,460.2C255.9,463.4 256.2,467 256.5,470.5C256.8,473.9 256.7,476.6 257,480.6C257.3,484.7 257.7,489.4 258.3,494.9C258.9,500.4 259.9,507.5 260.6,513.6C261.3,519.8 262.2,526.6 262.6,531.7C263,536.8 261.6,540.5 263.1,544.2C264.5,548 268.1,553.8 271,554.1C274,554.5 278.8,549.5 280.9,546.2C283.1,542.9 282.6,539.1 284.2,534.3C285.8,529.4 288.4,523 290.4,517C292.4,510.9 295,504 296.4,497.8C297.8,491.6 298.9,485.5 299,479.8C299.1,474.2 298,468.9 297.1,464.1C296.1,459.3 294.6,454.8 293.3,450.9C292.1,447 290.5,443.6 289.6,440.9C288.6,438.2 291.5,438.1 287.5,434.8C283.6,431.6 271.7,420.1 265.9,421.4Z", "M137,444C136.5,446.2 134.8,452.5 133.9,457.6C133,462.7 132,468.2 131.5,474.5C131,480.9 131.1,487.5 131,495.7C130.9,503.9 131,515.7 131.1,523.9C131.3,532.1 131.8,541.3 131.9,544.8M131,442.4C130.4,444.7 128.6,450.8 127.5,456C126.4,461.2 124.9,467.2 124.4,473.9C123.9,480.6 124.1,487.8 124.5,496.2C124.9,504.6 126.1,516.3 126.8,524.4C127.5,532.6 128.5,541.7 128.9,545.1M124.4,440.7C123.7,443 121.7,448.9 120.4,454.3C119.1,459.7 117.1,466 116.6,473.1C116.1,480.2 116.5,488.1 117.4,496.7C118.3,505.4 120.7,516.9 122,525C123.4,533.1 124.9,542.1 125.5,545.5M278.4,440C279.1,442.3 281.3,448 282.7,453.5C284,459 286.2,465.6 286.7,472.8C287.2,480.1 286.8,488.2 285.7,497C284.6,505.7 281.6,517.1 280,525.2C278.4,533.3 276.6,542.2 275.9,545.6M272.4,441.5C273.1,443.8 275,449.8 276.2,455.1C277.4,460.4 279.1,466.6 279.6,473.5C280.1,480.4 279.9,487.9 279.2,496.5C278.5,505 276.7,516.6 275.7,524.7C274.6,532.8 273.3,541.9 272.9,545.3M265.8,443.2C266.4,445.5 268.1,451.7 269.1,456.8C270.1,462 271.4,467.7 271.8,474.2C272.3,480.7 272.2,487.6 272.1,495.9C271.9,504.3 271.3,516 270.9,524.1C270.5,532.3 269.7,541.5 269.5,544.9"],
    ["adductors", "M190.5,479.2C185.8,479.1 178.5,488.7 176,492.7C173.5,496.7 175.7,498.9 175.5,503.2C175.3,507.4 175,512.8 174.7,518.1C174.4,523.3 174.1,529.3 173.8,534.6C173.5,539.9 173.1,544.8 173,549.7C173,554.7 173.1,559.3 173.5,564.2C173.9,569.2 174.8,574.6 175.4,579.3C176,584.1 176.9,588.9 177.3,592.7C177.8,596.4 176.8,599.2 178,602C179.2,604.8 182.3,609.2 184.6,609.4C186.9,609.5 190.5,605.4 192,602.8C193.5,600.2 192.9,597.4 193.8,593.7C194.7,590 196.2,585.3 197.4,580.6C198.6,576 200,570.7 201,565.7C201.9,560.8 202.6,556.1 203,551.1C203.4,546.1 203.3,541 203.5,535.7C203.6,530.3 203.6,524.3 203.7,519C203.7,513.8 203.8,508.3 203.8,504C203.9,499.8 206.2,497.8 204,493.7C201.8,489.5 195.1,479.4 190.5,479.2ZM209.5,479.2C204.9,479.4 198.2,489.5 196,493.7C193.8,497.8 196.1,499.8 196.2,504C196.2,508.3 196.3,513.8 196.3,519C196.4,524.3 196.4,530.3 196.5,535.7C196.7,541 196.6,546.1 197,551.1C197.4,556.1 198.1,560.8 199,565.7C200,570.7 201.4,576 202.6,580.6C203.8,585.3 205.3,590 206.2,593.7C207.1,597.4 206.5,600.2 208,602.8C209.5,605.4 213.1,609.5 215.4,609.4C217.7,609.2 220.8,604.8 222,602C223.2,599.2 222.2,596.4 222.7,592.7C223.1,588.9 224,584.1 224.6,579.3C225.2,574.6 226.1,569.2 226.5,564.2C226.9,559.3 227,554.7 227,549.7C226.9,544.8 226.5,539.9 226.2,534.6C225.9,529.3 225.6,523.3 225.3,518.1C225,512.8 224.7,507.4 224.5,503.2C224.3,498.9 226.5,496.7 224,492.7C221.5,488.7 214.2,479.1 209.5,479.2Z", "M196,497.8C195.9,501.3 195.7,511.2 195.5,518.8C195.3,526.3 195.2,535.6 194.8,543.4C194.5,551.1 194,558 193.3,565.3C192.5,572.6 191,581 190.1,587.2C189.2,593.4 188.4,600 188.1,602.6M191.2,497.7C191.1,501.2 190.8,511 190.6,518.6C190.4,526.2 190.1,535.4 189.8,543.2C189.4,550.9 189.1,557.8 188.6,565.1C188.1,572.4 187.4,580.8 186.9,587C186.4,593.2 185.9,599.9 185.7,602.4M186,497.5C185.8,501 185.5,510.8 185.2,518.4C184.9,526 184.5,535.2 184.2,542.9C183.9,550.7 183.6,557.5 183.4,564.8C183.3,572.1 183.4,580.5 183.3,586.8C183.2,593 183.1,599.7 183.1,602.3M216.3,497.5C216.4,500.9 216.8,510.8 217.2,518.3C217.5,525.9 218,535.1 218.2,542.8C218.5,550.6 218.8,557.3 218.8,564.7C218.8,572 218.3,580.4 218.2,586.7C218.1,592.9 218.1,599.6 218.1,602.2M211.5,497.6C211.6,501.1 212,510.9 212.2,518.5C212.5,526.1 212.8,535.3 213.1,543C213.5,550.8 213.8,557.6 214.1,564.9C214.4,572.2 214.7,580.6 215,586.9C215.2,593.1 215.6,599.8 215.7,602.4M206.3,497.8C206.3,501.3 206.6,511.1 206.8,518.7C207,526.3 207.2,535.5 207.5,543.3C207.9,551 208.3,557.9 208.9,565.2C209.6,572.5 210.7,580.9 211.4,587.1C212.1,593.3 212.8,599.9 213.1,602.5"],
    ["quads", "M172.7,485C167.4,484.8 159.1,495.1 156,500.3C153,505.4 155.2,509.6 154.4,516C153.6,522.4 152.3,530.5 151.3,538.5C150.2,546.5 148.9,555.6 148.1,563.9C147.2,572.2 146.3,580.1 146,588.4C145.7,596.7 145.9,605 146.2,613.7C146.5,622.5 147.2,632.3 147.8,641C148.3,649.6 149.1,658.5 149.5,665.4C149.9,672.3 147.7,677.1 150,682.4C152.3,687.7 158.7,696.8 163.4,697C168.1,697.2 175.2,688.6 178,683.6C180.7,678.5 179,673.6 180,666.7C180.9,659.9 182.5,651 183.7,642.5C185,634 186.6,624.2 187.6,615.5C188.7,606.8 189.6,598.7 190,590.4C190.4,582.1 190.3,574.2 190.1,565.8C190,557.5 189.6,548.3 189.2,540.2C188.9,532.2 188.4,524 188.2,517.5C188,511.1 190.6,507.1 188,501.7C185.4,496.3 178.1,485.3 172.7,485ZM227.3,485C221.9,485.3 214.6,496.3 212,501.7C209.4,507.1 212,511.1 211.8,517.5C211.6,524 211.1,532.2 210.8,540.2C210.4,548.3 210,557.5 209.9,565.8C209.7,574.2 209.6,582.1 210,590.4C210.4,598.7 211.3,606.8 212.4,615.5C213.4,624.2 215,634 216.3,642.5C217.5,651 219.1,659.9 220,666.7C221,673.6 219.3,678.5 222,683.6C224.8,688.6 231.9,697.2 236.6,697C241.3,696.8 247.7,687.7 250,682.4C252.3,677.1 250.1,672.3 250.5,665.4C250.9,658.5 251.7,649.6 252.2,641C252.8,632.3 253.5,622.5 253.8,613.7C254.1,605 254.3,596.7 254,588.4C253.7,580.1 252.8,572.2 251.9,563.9C251.1,555.6 249.8,546.5 248.7,538.5C247.7,530.5 246.4,522.4 245.6,516C244.8,509.6 247,505.4 244,500.3C240.9,495.1 232.6,484.8 227.3,485ZM140.7,489.4C135.1,488.5 125,498.8 121.2,503.5C117.4,508.3 119.3,512 117.7,517.8C116.2,523.7 113.8,531.2 111.8,538.7C109.8,546.2 107.3,554.8 105.7,563C104.1,571.1 102.5,579.3 102.1,587.8C101.6,596.3 102.1,605 102.9,614C103.7,623 105.4,632.9 106.8,641.6C108.1,650.4 110,659.3 111,666.2C112,673.2 110.5,678.2 113,683.1C115.5,688.1 121.8,696 126.1,696C130.5,696 136.6,687.9 139,682.9C141.4,677.8 139.6,672.6 140.4,665.6C141.2,658.7 142.6,649.7 143.7,641.2C144.9,632.6 146.4,622.9 147.4,614.5C148.5,606.2 149.3,598.6 149.9,591C150.6,583.4 150.8,576.5 151.2,568.9C151.5,561.2 151.9,552.7 152.2,545.2C152.6,537.7 153,530 153.4,524C153.8,517.9 156.9,514.6 154.8,508.9C152.7,503.1 146.3,490.3 140.7,489.4ZM259.3,489.4C253.7,490.3 247.3,503.1 245.2,508.9C243.1,514.6 246.2,517.9 246.6,524C247,530 247.4,537.7 247.8,545.2C248.1,552.7 248.5,561.2 248.8,568.9C249.2,576.5 249.4,583.4 250.1,591C250.7,598.6 251.5,606.2 252.6,614.5C253.6,622.9 255.1,632.6 256.3,641.2C257.4,649.7 258.8,658.7 259.6,665.6C260.4,672.6 258.6,677.8 261,682.9C263.4,687.9 269.5,696 273.9,696C278.2,696 284.5,688.1 287,683.1C289.5,678.2 288,673.2 289,666.2C290,659.3 291.9,650.4 293.2,641.6C294.6,632.9 296.3,623 297.1,614C297.9,605 298.4,596.3 297.9,587.8C297.5,579.3 295.9,571.1 294.3,563C292.7,554.8 290.2,546.2 288.2,538.7C286.2,531.2 283.8,523.7 282.3,517.8C280.7,512 282.6,508.3 278.8,503.5C275,498.8 264.9,488.5 259.3,489.4ZM185.2,585.9C180.6,585.4 172.8,594.4 170.1,598.6C167.3,602.7 169.3,605.9 168.7,610.9C168.1,615.9 167.2,622.6 166.4,628.7C165.7,634.8 164.7,641.8 164,647.5C163.3,653.2 162.6,658.4 162.1,662.9C161.7,667.4 161.4,670.8 161.3,674.4C161.2,678.1 161.3,681.6 161.3,684.7C161.4,687.8 161.5,690.7 161.5,693.1C161.5,695.6 159.7,696.1 161.2,699.3C162.6,702.4 166.5,711.4 170.1,712C173.7,712.7 180.4,705.5 182.8,703.1C185.3,700.7 183.8,699.8 184.7,697.5C185.5,695.2 186.8,692.5 187.9,689.4C189,686.4 190.4,682.9 191.4,679.1C192.4,675.3 193.2,671.4 193.9,666.7C194.5,661.9 194.9,656.4 195.3,650.5C195.7,644.6 196,637.5 196.3,631.3C196.6,625.2 196.9,618.4 197.2,613.4C197.5,608.3 199.9,605.6 197.9,601C196,596.5 189.9,586.3 185.2,585.9ZM214.8,585.9C210.1,586.3 204,596.5 202.1,601C200.1,605.6 202.5,608.3 202.8,613.4C203.1,618.4 203.4,625.2 203.7,631.3C204,637.5 204.3,644.6 204.7,650.5C205.1,656.4 205.5,661.9 206.1,666.7C206.8,671.4 207.6,675.3 208.6,679.1C209.6,682.9 211,686.4 212.1,689.4C213.2,692.5 214.5,695.2 215.3,697.5C216.2,699.8 214.7,700.7 217.2,703.1C219.6,705.5 226.3,712.7 229.9,712C233.5,711.4 237.4,702.4 238.8,699.3C240.3,696.1 238.5,695.6 238.5,693.1C238.5,690.7 238.6,687.8 238.7,684.7C238.7,681.6 238.8,678.1 238.7,674.4C238.6,670.8 238.3,667.4 237.9,662.9C237.4,658.4 236.7,653.2 236,647.5C235.3,641.8 234.3,634.8 233.6,628.7C232.8,622.6 231.9,615.9 231.3,610.9C230.7,605.9 232.7,602.7 229.9,598.6C227.2,594.4 219.4,585.4 214.8,585.9Z", "M180,508.2C180,513.4 180,528.2 179.9,539.8C179.9,551.4 180,565.4 179.6,578C179.2,590.5 178.5,602.3 177.5,615.1C176.5,627.9 174.7,643.5 173.6,654.9C172.6,666.3 171.5,678.6 171.1,683.3M176.2,508C176.1,513.3 175.8,528 175.5,539.6C175.2,551.2 175,565.2 174.6,577.8C174.1,590.3 173.5,602 172.7,614.9C171.9,627.7 170.6,643.3 169.8,654.7C169,666.1 168.2,678.4 167.9,683.2M171.7,507.8C171.5,513 170.8,527.7 170.3,539.3C169.7,551 169.1,565 168.5,577.5C168,590 167.5,601.8 166.9,614.6C166.4,627.5 165.7,643.1 165.2,654.5C164.7,665.9 164.2,678.3 164,683M167.2,507.6C166.8,512.8 165.8,527.5 165,539.1C164.2,550.7 163.1,564.7 162.5,577.2C161.9,589.8 161.5,601.5 161.2,614.4C160.8,627.2 160.8,642.9 160.6,654.3C160.5,665.7 160.2,678.1 160.1,682.8M163.4,507.4C162.9,512.7 161.6,527.3 160.6,538.9C159.6,550.5 158.2,564.5 157.4,577C156.7,589.5 156.4,601.3 156.3,614.2C156.2,627 156.7,642.7 156.8,654.2C156.9,665.6 156.9,677.9 156.9,682.7M236.6,507.4C237.1,512.7 238.4,527.3 239.4,538.9C240.4,550.5 241.8,564.5 242.6,577C243.3,589.5 243.6,601.3 243.7,614.2C243.8,627 243.3,642.7 243.2,654.2C243.1,665.6 243.1,677.9 243.1,682.7M232.8,507.6C233.2,512.8 234.2,527.5 235,539.1C235.8,550.7 236.9,564.7 237.5,577.2C238.1,589.8 238.5,601.5 238.8,614.4C239.2,627.2 239.2,642.9 239.4,654.3C239.5,665.7 239.8,678.1 239.9,682.8M228.3,507.8C228.5,513 229.2,527.7 229.8,539.3C230.3,551 230.9,565 231.5,577.5C232,590 232.5,601.8 233.1,614.6C233.6,627.5 234.3,643.1 234.8,654.5C235.3,665.9 235.8,678.3 236,683M223.8,508C223.9,513.3 224.2,528 224.5,539.6C224.8,551.2 225,565.2 225.4,577.8C225.9,590.3 226.5,602 227.3,614.9C228.1,627.7 229.4,643.3 230.2,654.7C231,666.1 231.8,678.4 232.1,683.2M220,508.2C220,513.4 220,528.2 220.1,539.8C220.1,551.4 220,565.4 220.4,578C220.8,590.5 221.5,602.3 222.5,615.1C223.5,627.9 225.3,643.5 226.4,654.9C227.4,666.3 228.5,678.6 228.9,683.3M146.3,514.1C145.7,519 144.1,532.9 143,543.7C141.9,554.6 140.8,567.5 139.8,579.3C138.9,591 138.2,601.9 137.3,614.4C136.4,626.9 135.1,642.7 134.4,654.1C133.7,665.5 133.3,678.1 133.1,682.9M142.4,513.5C141.8,518.4 139.8,532.1 138.5,543C137.1,553.9 135.6,566.8 134.5,578.7C133.5,590.6 132.9,601.8 132.3,614.3C131.6,626.9 131.1,642.8 130.7,654.2C130.4,665.6 130.2,678.2 130.2,683M137.8,512.7C137,517.6 134.6,531.2 133,542.1C131.4,553 129.3,566 128.2,578.1C127,590.1 126.6,601.6 126.3,614.3C125.9,627 126.2,642.8 126.3,654.3C126.4,665.7 126.6,678.2 126.6,683M133,511.9C132,516.8 129.2,530.3 127.3,541.2C125.3,552.1 122.7,565.2 121.5,577.4C120.3,589.5 119.9,601.4 119.9,614.2C120,627 121.1,642.9 121.6,654.4C122.1,665.8 122.7,678.3 123,683M128.3,511.1C127.2,516 123.9,529.4 121.7,540.3C119.5,551.2 116.3,564.4 115,576.7C113.7,589 113.4,601.2 113.8,614.1C114.1,627.1 116.1,643 117.1,654.5C118,665.9 119,678.3 119.4,683.1M272.3,511C273.4,515.9 276.8,529.2 279,540.2C281.3,551.1 284.5,564.3 285.8,576.6C287.2,588.9 287.4,601.1 287,614.1C286.6,627.1 284.5,643 283.5,654.5C282.5,666 281.5,678.3 281.1,683.1M268.5,511.6C269.5,516.5 272.5,530 274.5,540.9C276.5,551.8 279.3,564.9 280.5,577.2C281.8,589.4 282.1,601.3 282,614.2C281.8,627.1 280.4,642.9 279.8,654.4C279.2,665.9 278.4,678.3 278.2,683M263.9,512.4C264.7,517.3 267.3,530.9 269,541.8C270.7,552.7 273,565.7 274.2,577.8C275.3,589.9 275.7,601.5 275.9,614.2C276.1,627 275.6,642.9 275.3,654.3C275.1,665.8 274.8,678.2 274.6,683M259,513.2C259.7,518.1 261.8,531.8 263.3,542.7C264.7,553.6 266.4,566.6 267.5,578.5C268.5,590.4 269.1,601.7 269.6,614.3C270.2,626.9 270.4,642.8 270.7,654.2C270.9,665.7 270.9,678.2 271,683M254.3,514C254.9,518.9 256.6,532.8 257.7,543.6C258.8,554.5 260,567.4 261,579.2C261.9,591 262.6,601.9 263.5,614.4C264.3,626.9 265.5,642.7 266.1,654.1C266.8,665.6 267.2,678.1 267.4,682.9M188.6,605.5C188.3,609.6 187.4,621.7 186.8,630.5C186.1,639.3 185.3,650.3 184.5,658.2C183.7,666 182.8,671.9 181.8,677.6C180.7,683.3 179.2,688.3 178.3,692.3C177.3,696.4 176.3,700.3 175.9,701.9M182.2,604.9C181.8,609.1 180.7,621.1 179.9,629.9C179.1,638.7 178.1,649.7 177.2,657.4C176.4,665.2 175.7,670.9 174.9,676.5C174.1,682.2 173.3,687.2 172.6,691.2C171.9,695.3 171.2,699.4 170.9,701M177.4,604.5C177,608.6 175.8,620.7 174.8,629.4C173.9,638.2 172.7,649.2 171.9,656.9C171,664.6 170.4,670.2 169.8,675.7C169.2,681.3 168.8,686.4 168.4,690.5C168,694.6 167.5,698.7 167.3,700.4M221.5,604.6C221.9,608.7 223.1,620.8 224,629.6C224.9,638.3 226.1,649.3 226.9,657C227.7,664.7 228.4,670.3 229.1,675.9C229.7,681.5 230.2,686.5 230.6,690.6C231.1,694.7 231.7,698.9 231.9,700.5M215.1,605.1C215.4,609.3 216.4,621.4 217.2,630.2C217.9,638.9 218.8,650 219.7,657.8C220.5,665.6 221.3,671.3 222.2,677C223.1,682.6 224.2,687.6 225,691.7C225.8,695.8 226.6,699.8 226.9,701.4M210.3,605.5C210.6,609.7 211.4,621.8 212.1,630.6C212.7,639.4 213.5,650.5 214.3,658.3C215.1,666.2 216,672.1 217.1,677.8C218.1,683.5 219.7,688.4 220.8,692.5C221.8,696.5 222.8,700.4 223.3,702"],
    ["calves", "M166.5,715.4C160.8,715.2 151.9,727.2 149,731.9C146.1,736.6 149,738.9 149.2,743.7C149.3,748.4 149.6,754.5 149.8,760.4C149.9,766.3 150.2,773.1 150.2,779.1C150.3,785.2 150,790.9 150,796.8C150,802.6 150,808.3 150.3,814.4C150.6,820.5 151.4,827.3 151.9,833.3C152.4,839.3 153.2,845.5 153.5,850.2C153.9,855 153,859 154,862C155,865 157.6,868.3 159.6,868.4C161.6,868.5 164.6,865.6 166,862.8C167.4,859.9 167,855.9 168,851.2C169,846.5 170.6,840.5 171.9,834.6C173.1,828.7 174.8,822 175.8,815.9C176.8,809.8 177.4,804 178,798C178.5,792.1 178.7,786.2 179.1,780.1C179.6,774 180.2,767.2 180.7,761.3C181.3,755.3 181.8,749.2 182.2,744.5C182.6,739.8 185.6,737.7 183,732.9C180.4,728 172.1,715.6 166.5,715.4ZM233.5,715.4C227.9,715.6 219.6,728 217,732.9C214.4,737.7 217.4,739.8 217.8,744.5C218.2,749.2 218.7,755.3 219.3,761.3C219.8,767.2 220.4,774 220.9,780.1C221.3,786.2 221.5,792.1 222,798C222.6,804 223.2,809.8 224.2,815.9C225.2,822 226.9,828.7 228.1,834.6C229.4,840.5 231,846.5 232,851.2C233,855.9 232.6,859.9 234,862.8C235.4,865.6 238.4,868.5 240.4,868.4C242.4,868.3 245,865 246,862C247,859 246.1,855 246.5,850.2C246.8,845.5 247.6,839.3 248.1,833.3C248.6,827.3 249.4,820.5 249.7,814.4C250,808.3 250,802.6 250,796.8C250,790.9 249.7,785.2 249.8,779.1C249.8,773.1 250.1,766.3 250.2,760.4C250.4,754.5 250.7,748.4 250.8,743.7C251,738.9 253.9,736.6 251,731.9C248.1,727.2 239.2,715.2 233.5,715.4ZM142.6,715.8C138,715.6 130.5,725.2 128,729.2C125.5,733.1 127.8,735.2 127.7,739.4C127.5,743.6 127.4,749.1 127.3,754.4C127.1,759.7 127,765.7 127,771.2C126.9,776.7 126.7,782 127,787.2C127.3,792.5 127.9,797.6 128.8,802.9C129.7,808.1 131.2,813.7 132.4,818.7C133.6,823.6 135.1,828.6 136.1,832.5C137,836.4 136.6,839.6 138,842.1C139.4,844.6 142.5,847.7 144.5,847.6C146.5,847.4 149,843.8 150,841.1C150.9,838.4 150,835.2 150.2,831.2C150.4,827.2 150.9,822 151.3,817.1C151.7,812.1 152.3,806.4 152.6,801.4C152.8,796.3 152.9,791.7 153,786.8C153.1,781.9 153.1,777.1 153.3,771.9C153.5,766.7 153.9,760.8 154.2,755.6C154.6,750.4 155,745.1 155.3,740.9C155.6,736.7 158.1,734.6 156,730.4C153.9,726.2 147.3,716 142.6,715.8ZM257.4,715.8C252.7,716 246.1,726.2 244,730.4C241.9,734.6 244.4,736.7 244.7,740.9C245,745.1 245.4,750.4 245.8,755.6C246.1,760.8 246.5,766.7 246.7,771.9C246.9,777.1 246.9,781.9 247,786.8C247.1,791.7 247.2,796.3 247.4,801.4C247.7,806.4 248.3,812.1 248.7,817.1C249.1,822 249.6,827.2 249.8,831.2C250,835.2 249.1,838.4 250,841.1C251,843.8 253.5,847.4 255.5,847.6C257.5,847.7 260.6,844.6 262,842.1C263.4,839.6 263,836.4 263.9,832.5C264.9,828.6 266.4,823.6 267.6,818.7C268.8,813.7 270.3,808.1 271.2,802.9C272.1,797.6 272.7,792.5 273,787.2C273.3,782 273.1,776.7 273,771.2C273,765.7 272.9,759.7 272.7,754.4C272.6,749.1 272.5,743.6 272.3,739.4C272.2,735.2 274.5,733.1 272,729.2C269.5,725.2 262,715.6 257.4,715.8Z", "M173.2,737.6C173,741.5 172.5,752.4 172,761C171.6,769.6 171.1,780 170.5,789.1C170,798.1 169.5,806.5 168.6,815.5C167.7,824.5 166,835.2 165,843C164,850.9 163,859.3 162.6,862.6M165.9,737.4C165.8,741.3 165.5,752.3 165.3,760.8C165,769.4 164.7,779.8 164.4,788.8C164,797.9 163.6,806.2 163,815.2C162.5,824.2 161.8,834.9 161.3,842.8C160.8,850.7 160.2,859.1 160,862.4M158.5,737.2C158.5,741.1 158.5,752.1 158.5,760.7C158.4,769.2 158.3,779.6 158.2,788.6C158,797.6 157.6,805.9 157.5,814.8C157.4,823.8 157.6,834.6 157.6,842.5C157.6,850.4 157.4,858.9 157.4,862.2M241.5,737.2C241.5,741.1 241.5,752.1 241.5,760.7C241.6,769.2 241.7,779.6 241.8,788.6C242,797.6 242.4,805.9 242.5,814.8C242.6,823.8 242.4,834.6 242.4,842.5C242.4,850.4 242.6,858.9 242.6,862.2M234.1,737.4C234.2,741.3 234.5,752.3 234.8,760.8C235,769.4 235.3,779.8 235.6,788.8C236,797.9 236.4,806.2 237,815.2C237.5,824.2 238.2,834.9 238.7,842.8C239.2,850.7 239.8,859.1 240,862.4M226.8,737.6C227,741.5 227.5,752.4 228,761C228.4,769.6 228.9,780 229.5,789.1C230,798.1 230.5,806.5 231.4,815.5C232.3,824.5 234,835.2 235,843C236,850.9 237,859.3 237.4,862.6M147.4,734.5C147.2,738 146.5,747.7 146.1,755.2C145.8,762.8 145.3,771.9 145.2,779.6C145.1,787.4 145.3,794.3 145.4,801.8C145.5,809.4 145.6,818.3 145.8,824.9C146,831.5 146.3,838.7 146.4,841.4M140.4,734.2C140.3,737.6 139.7,747.4 139.4,754.9C139.1,762.5 138.7,771.7 138.7,779.6C138.7,787.4 139,794.6 139.5,802.2C140,809.8 141.1,818.7 141.7,825.3C142.4,831.9 143.1,838.9 143.4,841.6M135.7,733.9C135.6,737.4 135.1,747.1 134.8,754.7C134.6,762.3 134.2,771.6 134.3,779.5C134.4,787.5 134.7,794.8 135.5,802.4C136.3,810.1 138,819 138.9,825.6C139.9,832.1 141,839.1 141.4,841.8M263.8,734C263.9,737.4 264.4,747.1 264.6,754.7C264.9,762.3 265.3,771.6 265.2,779.5C265.1,787.5 264.8,794.7 264.1,802.4C263.3,810.1 261.7,819 260.7,825.5C259.8,832.1 258.8,839.1 258.4,841.8M256.8,734.3C257,737.8 257.6,747.5 257.9,755C258.3,762.6 258.7,771.8 258.8,779.6C258.8,787.4 258.5,794.4 258.2,802C257.8,809.6 257.1,818.6 256.7,825.2C256.2,831.8 255.6,838.8 255.4,841.6M252.1,734.5C252.3,738 253,747.7 253.3,755.3C253.7,762.8 254.2,771.9 254.3,779.6C254.4,787.4 254.2,794.2 254.1,801.8C254.1,809.3 254,818.3 253.9,824.9C253.8,831.5 253.5,838.6 253.4,841.4"],
    ["biceps", "M101.3,245.3C95.7,244.2 85,255.3 81.3,258.7C77.6,262.2 80,263 78.9,266C77.8,268.9 76.2,272.7 74.8,276.4C73.3,280.1 71.6,284.4 70.4,288.4C69.1,292.3 67.9,296.2 67.3,300.3C66.7,304.4 66.6,308.5 66.7,312.9C66.7,317.2 67.3,322 67.7,326.2C68,330.3 68.7,334.7 68.9,338C69.2,341.3 66.9,341.9 69.1,346C71.3,350.2 77.1,362.2 82,362.9C87,363.5 95.7,353.4 98.9,350C102.1,346.5 100.1,345.3 101.1,342.1C102.2,339 103.9,335 105.3,331.1C106.8,327.2 108.5,322.8 109.8,318.9C111,315 112,311.5 112.7,307.7C113.4,303.9 113.5,300.3 113.7,296.4C114,292.5 113.9,288 114,284.1C114.1,280.2 114,276.2 114.1,273C114.2,269.9 116.8,269.9 114.7,265.3C112.5,260.6 106.8,246.4 101.3,245.3ZM298.7,245.3C293.2,246.4 287.5,260.6 285.3,265.3C283.2,269.9 285.8,269.9 285.9,273C286,276.2 285.9,280.2 286,284.1C286.1,288 286,292.5 286.3,296.4C286.5,300.3 286.6,303.9 287.3,307.7C288,311.5 289,315 290.2,318.9C291.5,322.8 293.2,327.2 294.7,331.1C296.1,335 297.8,339 298.9,342.1C299.9,345.3 297.9,346.5 301.1,350C304.3,353.4 313,363.5 318,362.9C322.9,362.2 328.7,350.2 330.9,346C333.1,341.9 330.8,341.3 331.1,338C331.3,334.7 332,330.3 332.3,326.2C332.7,322 333.3,317.2 333.3,312.9C333.4,308.5 333.3,304.4 332.7,300.3C332.1,296.2 330.9,292.3 329.6,288.4C328.4,284.4 326.7,280.1 325.2,276.4C323.8,272.7 322.2,268.9 321.1,266C320,263 322.4,262.2 318.7,258.7C315,255.3 304.3,244.2 298.7,245.3Z", "M106,266.9C105.7,269.5 105,276.6 104.4,282.2C103.8,287.8 103.2,294.5 102.4,300.4C101.5,306.2 100.5,311.5 99.2,317.4C97.9,323.3 95.9,330.5 94.6,335.8C93.3,341 92.1,346.8 91.6,349M100.6,265.9C100.2,268.4 99,275.4 98.1,281C97.2,286.5 96.2,293.2 95.2,299.1C94.2,305 93.3,310.5 92.3,316.5C91.3,322.5 89.9,329.7 89,335.1C88.1,340.4 87.2,346.2 86.8,348.4M94.2,264.6C93.6,267.1 91.9,274 90.6,279.5C89.4,285 87.8,291.7 86.7,297.6C85.6,303.6 84.8,309.2 84.1,315.3C83.4,321.4 82.9,328.8 82.4,334.2C81.9,339.6 81.4,345.4 81.2,347.6M88.7,263.5C88,266 85.9,272.8 84.4,278.3C82.8,283.8 80.7,290.3 79.5,296.4C78.3,302.4 77.7,308.2 77.2,314.3C76.8,320.5 77,328.1 76.9,333.5C76.7,338.9 76.5,344.7 76.4,347M311.3,263.5C312,266 314.1,272.8 315.6,278.3C317.2,283.8 319.3,290.3 320.5,296.4C321.7,302.4 322.3,308.2 322.8,314.3C323.2,320.5 323,328.1 323.1,333.5C323.3,338.9 323.5,344.7 323.6,347M305.8,264.6C306.4,267.1 308.1,274 309.4,279.5C310.6,285 312.2,291.7 313.3,297.6C314.4,303.6 315.2,309.2 315.9,315.3C316.6,321.4 317.1,328.8 317.6,334.2C318.1,339.6 318.6,345.4 318.8,347.6M299.4,265.9C299.8,268.4 301,275.4 301.9,281C302.8,286.5 303.8,293.2 304.8,299.1C305.8,305 306.7,310.5 307.7,316.5C308.7,322.5 310.1,329.7 311,335.1C311.9,340.4 312.8,346.2 313.2,348.4M294,266.9C294.3,269.5 295,276.6 295.6,282.2C296.2,287.8 296.8,294.5 297.6,300.4C298.5,306.2 299.5,311.5 300.8,317.4C302.1,323.3 304.1,330.5 305.4,335.8C306.7,341 307.9,346.8 308.4,349"],
    ["forearms", "M75.3,370.8C69.6,369 57,378.9 52.8,382.7C48.6,386.5 51,389.1 49.8,393.4C48.7,397.7 47.3,403.4 45.9,408.8C44.5,414.1 42.9,420.3 41.4,425.7C39.8,431.1 38.2,436 36.8,441C35.4,446 34.1,450.7 33,455.8C31.9,460.9 31,466.6 30.1,471.5C29.2,476.4 28.5,481.5 27.7,485.4C27,489.4 25,491.5 25.5,495C26.1,498.5 28.2,505.5 31,506.5C33.9,507.5 39.9,503.4 42.5,501C45.1,498.6 44.9,495.7 46.8,492.2C48.6,488.6 51.3,484.2 53.7,479.8C56.1,475.3 58.9,470.3 61.2,465.5C63.4,460.7 65.3,456 67.2,451C69.1,446 70.6,440.8 72.5,435.4C74.4,430.1 76.5,424 78.4,418.7C80.2,413.5 82.2,408 83.7,403.7C85.2,399.5 88.6,398.8 87.2,393.3C85.8,387.8 81,372.6 75.3,370.8ZM324.7,370.8C319,372.6 314.2,387.8 312.8,393.3C311.4,398.8 314.8,399.5 316.3,403.7C317.8,408 319.8,413.5 321.6,418.7C323.5,424 325.6,430.1 327.5,435.4C329.4,440.8 330.9,446 332.8,451C334.7,456 336.6,460.7 338.8,465.5C341.1,470.3 343.9,475.3 346.3,479.8C348.7,484.2 351.4,488.6 353.2,492.2C355.1,495.7 354.9,498.6 357.5,501C360.1,503.4 366.1,507.5 369,506.5C371.8,505.5 373.9,498.5 374.5,495C375,491.5 373,489.4 372.3,485.4C371.5,481.5 370.8,476.4 369.9,471.5C369,466.6 368.1,460.9 367,455.8C365.9,450.7 364.6,446 363.2,441C361.8,436 360.2,431.1 358.6,425.7C357.1,420.3 355.5,414.1 354.1,408.8C352.7,403.4 351.3,397.7 350.2,393.4C349,389.1 351.4,386.5 347.2,382.7C343,378.9 330.4,369 324.7,370.8Z", "M77.3,395.2C76.2,398.7 72.9,408.6 70.4,416.3C67.9,424 64.9,433.3 62.2,441.1C59.5,448.9 57.2,455.9 54.3,463.1C51.4,470.3 47.5,478.4 44.8,484.5C42.2,490.5 39.4,497 38.3,499.5M72.6,393.7C71.5,397.3 68.4,407.2 65.9,414.9C63.5,422.6 60.6,432 58,439.8C55.4,447.6 53.1,454.5 50.4,461.8C47.7,469 44.3,477.3 41.9,483.4C39.5,489.6 37,496.2 36,498.7M66.9,392C65.9,395.5 62.9,405.6 60.5,413.3C58.2,421 55.4,430.3 52.9,438.2C50.4,446 48.1,452.8 45.7,460.2C43.3,467.5 40.5,476 38.4,482.2C36.3,488.5 34,495.1 33.2,497.7M61.8,390.4C60.7,394 57.9,404 55.6,411.8C53.4,419.5 50.6,428.9 48.3,436.7C45.9,444.5 43.6,451.3 41.4,458.7C39.3,466.1 37,474.7 35.2,481.1C33.4,487.4 31.4,494.2 30.6,496.8M58.2,389.3C57.2,392.9 54.4,403 52.2,410.7C50,418.4 47.3,427.8 45,435.7C42.7,443.5 40.5,450.3 38.5,457.7C36.5,465.1 34.6,473.9 33,480.3C31.4,486.7 29.5,493.5 28.8,496.2M340.1,389.8C341.1,393.4 343.9,403.5 346.2,411.2C348.4,418.9 351.1,428.3 353.4,436.1C355.8,444 358,450.8 360.1,458.2C362.2,465.6 364.3,474.3 366,480.7C367.7,487.1 369.6,493.8 370.3,496.5M335.4,391.3C336.5,394.8 339.4,404.9 341.7,412.6C344,420.3 346.8,429.7 349.2,437.5C351.6,445.3 353.9,452.1 356.2,459.5C358.5,466.9 361.1,475.4 363,481.7C365,488 367.2,494.7 368,497.3M329.7,393C330.8,396.6 333.9,406.6 336.3,414.2C338.7,421.9 341.6,431.3 344.1,439.1C346.7,446.9 349,453.8 351.5,461.1C354.1,468.4 357.3,476.7 359.5,482.9C361.8,489.1 364.2,495.7 365.2,498.3M324.5,394.6C325.7,398.1 328.9,408.1 331.4,415.7C333.9,423.4 336.9,432.8 339.5,440.6C342.2,448.4 344.5,455.3 347.3,462.6C350.1,469.8 353.8,478 356.3,484.1C358.9,490.2 361.6,496.7 362.6,499.2M321,395.7C322.1,399.2 325.4,409.1 328,416.8C330.5,424.4 333.6,433.8 336.3,441.6C339,449.4 341.4,456.4 344.3,463.6C347.3,470.8 351.4,478.8 354.1,484.8C356.9,490.9 359.7,497.3 360.8,499.8"],
    ["shoulders", "M112.8,168.8C103.1,166.5 83.1,186.4 76.8,191.2C70.5,196 75.8,194.9 75.2,197.4C74.5,199.9 73.6,203.1 72.8,206.2C72,209.3 71,212.8 70.2,215.8C69.4,218.9 68.2,221.6 67.9,224.5C67.6,227.4 67.7,230.1 68.3,233.2C68.8,236.3 70.2,240 71.3,243.1C72.3,246.3 73.9,249.6 74.6,252.1C75.3,254.6 73.6,254 75.5,258.1C77.4,262.2 81.3,275.2 86.1,276.5C90.9,277.8 100.8,268.4 104.5,265.9C108.2,263.4 106.5,263.1 108.3,261.3C110.2,259.5 113.2,257.4 115.7,255.1C118.2,252.9 121.3,250.3 123.4,247.7C125.4,245.1 126.9,242.5 128.1,239.5C129.2,236.6 129.5,233.4 130.2,230.1C130.9,226.9 131.6,223.2 132.2,220C132.8,216.8 133.4,213.5 133.9,211C134.4,208.4 138.7,211.8 135.2,204.8C131.7,197.8 122.5,171 112.8,168.8ZM287.2,168.8C277.5,171 268.3,197.8 264.8,204.8C261.3,211.8 265.6,208.4 266.1,211C266.6,213.5 267.2,216.8 267.8,220C268.4,223.2 269.1,226.9 269.8,230.1C270.5,233.4 270.8,236.6 271.9,239.5C273.1,242.5 274.6,245.1 276.6,247.7C278.7,250.3 281.8,252.9 284.3,255.1C286.8,257.4 289.8,259.5 291.7,261.3C293.5,263.1 291.8,263.4 295.5,265.9C299.2,268.4 309.1,277.8 313.9,276.5C318.7,275.2 322.6,262.2 324.5,258.1C326.4,254 324.7,254.6 325.4,252.1C326.1,249.6 327.7,246.3 328.7,243.1C329.8,240 331.2,236.3 331.7,233.2C332.3,230.1 332.4,227.4 332.1,224.5C331.8,221.6 330.6,218.9 329.8,215.8C329,212.8 328,209.3 327.2,206.2C326.4,203.1 325.5,199.9 324.8,197.4C324.2,194.9 329.5,196 323.2,191.2C316.9,186.4 296.9,166.5 287.2,168.8Z", "M119.3,203.9C118.8,206 117.6,211.8 116.6,216.4C115.6,221 114.6,226.6 113.3,231.2C112,235.8 110.8,239.9 108.9,243.9C106.9,248 103.6,252.3 101.6,255.6C99.6,258.9 97.7,262.5 96.9,263.9M108.2,201.3C107.8,203.4 106.4,209.3 105.4,213.8C104.4,218.3 103.1,223.9 102,228.4C100.8,233 99.8,237 98.5,241.2C97.2,245.4 95.5,250.1 94.3,253.6C93.1,257.2 91.9,260.9 91.4,262.4M96,198.5C95.5,200.6 94.1,206.4 93,210.9C91.9,215.4 90.4,220.8 89.4,225.4C88.4,229.9 87.5,233.8 87,238.2C86.5,242.5 86.5,247.7 86.2,251.4C86,255.2 85.5,259.2 85.4,260.8M308.5,197.4C309,199.5 310.5,205.4 311.6,209.8C312.7,214.3 314.3,219.7 315.2,224.2C316.2,228.8 317,232.6 317.3,237C317.5,241.4 316.8,246.8 316.8,250.6C316.7,254.5 316.9,258.6 316.9,260.1M297.5,200C298,202.1 299.3,208 300.4,212.5C301.5,217 302.8,222.4 303.9,227C305,231.6 305.9,235.5 306.9,239.8C307.8,244 308.7,249 309.5,252.6C310.2,256.2 311.1,260.1 311.4,261.6M285.3,202.8C285.7,204.9 287,210.8 288,215.3C289,219.9 290.1,225.5 291.3,230C292.6,234.6 293.7,238.7 295.4,242.8C297.1,246.9 299.7,251.4 301.4,254.8C303.1,258.2 304.7,261.8 305.4,263.2"]],
  back:[["traps", "M200,146C196,118.8 184.7,147.3 176,150C167.3,152.7 156.7,158.3 148,162C139.3,165.8 130.7,168.1 124,172.4C117.3,176.7 107.7,181.2 108,187.8C108.3,194.4 117.7,203.6 126,211.9C134.3,220.2 148.3,226.5 158,237.7C167.7,248.9 177,266.4 184,279C191,291.6 197.3,335.6 200,313.4C202.7,291.2 204,173.2 200,146ZM200,146C204,118.8 215.3,147.3 224,150C232.7,152.7 243.3,158.3 252,162C260.7,165.8 269.3,168.1 276,172.4C282.7,176.7 292.3,181.2 292,187.8C291.7,194.4 282.3,203.6 274,211.9C265.7,220.2 251.7,226.5 242,237.7C232.3,248.9 223,266.4 216,279C209,291.6 202.7,335.6 200,313.4C197.3,291.2 196,173.2 200,146Z", "M193.3,164.7C190.1,164.3 180.1,163.2 173.9,162.5C167.6,161.8 158.8,160.8 155.8,160.4M190.9,165.7C186.5,165.8 172.9,166.1 164.4,166.3C155.9,166.5 143.9,166.8 139.8,166.9M188.9,166.7C183.4,167.4 166.7,169.3 156.3,170.5C145.8,171.7 131.1,173.3 126,173.9M187.2,168.2C181,169.5 161.8,173.5 149.7,176.1C137.7,178.6 120.8,182.1 115,183.4M188,170.2C182.1,172.5 164,179.6 152.7,184C141.4,188.5 125.5,194.7 120,196.9M190.3,172.5C185.5,176 171,186.6 161.8,193.2C152.7,199.9 139.8,209.2 135.5,212.4M192.6,174.2C189,178.5 177.9,191.6 171,199.8C164,208 154.3,219.6 151,223.5M195.4,177.4C193.2,183.2 186.4,201.1 182.1,212.3C177.8,223.5 171.8,239.2 169.8,244.6M197.8,181.4C196.7,189.1 193.3,213 191.2,227.9C189.1,242.9 186.1,263.9 185.1,271.1M199.5,186.7C199.2,197.1 198.4,228.9 197.9,248.9C197.4,268.9 196.7,296.9 196.5,306.5M200.3,179.6C200.4,186.5 200.9,207.6 201.1,220.9C201.4,234.1 201.8,252.8 201.9,259.1M206.7,164.7C209.9,164.3 219.9,163.2 226.1,162.5C232.4,161.8 241.2,160.8 244.2,160.4M209.1,165.7C213.5,165.8 227.1,166.1 235.6,166.3C244.1,166.5 256.1,166.8 260.2,166.9M211.1,166.7C216.6,167.4 233.3,169.3 243.7,170.5C254.2,171.7 268.9,173.3 274,173.9M212.8,168.2C219,169.5 238.2,173.5 250.3,176.1C262.3,178.6 279.2,182.1 285,183.4M212,170.2C217.9,172.5 236,179.6 247.3,184C258.6,188.5 274.5,194.7 280,196.9M209.7,172.5C214.5,176 229,186.6 238.2,193.2C247.3,199.9 260.2,209.2 264.5,212.4M207.4,174.2C211,178.5 222.1,191.6 229,199.8C236,208 245.7,219.6 249,223.5M204.6,177.4C206.8,183.2 213.6,201.1 217.9,212.3C222.2,223.5 228.2,239.2 230.2,244.6M202.2,181.4C203.3,189.1 206.7,213 208.8,227.9C210.9,242.9 213.9,263.9 214.9,271.1M200.5,186.7C200.8,197.1 201.6,228.9 202.1,248.9C202.6,268.9 203.3,296.9 203.5,306.5M199.7,179.6C199.6,186.5 199.1,207.6 198.9,220.9C198.6,234.1 198.2,252.8 198.1,259.1"],
    ["lats", "M196,306.5C192.7,285.9 184,285.9 176,277.3C168,268.7 157,259.8 148,254.9C139,250 129,247.5 122,248C115,248.6 107.7,251.2 106,258.4C104.3,265.5 108.3,279.6 112,291C115.7,302.5 121.7,315.1 128,327.2C134.3,339.2 142,352.1 150,363.3C158,374.5 168.3,387.9 176,394.2C183.7,400.5 192.7,415.7 196,401.1C199.3,386.5 199.3,327.2 196,306.5ZM204,306.5C207.3,285.9 216,285.9 224,277.3C232,268.7 243,259.8 252,254.9C261,250 271,247.5 278,248C285,248.6 292.3,251.2 294,258.4C295.7,265.5 291.7,279.6 288,291C284.3,302.5 278.3,315.1 272,327.2C265.7,339.2 258,352.1 250,363.3C242,374.5 231.7,387.9 224,394.2C216.3,400.5 207.3,415.7 204,401.1C200.7,386.5 200.7,327.2 204,306.5ZM120,213.6C123,208.8 133,205.3 140,205C147,204.8 158,207.3 162,211.9C166,216.5 167,227.4 164,232.6C161,237.7 151,242.6 144,242.9C137,243.2 126,239.2 122,234.3C118,229.4 117,218.5 120,213.6ZM280,213.6C277,208.8 267,205.3 260,205C253,204.8 242,207.3 238,211.9C234,216.5 233,227.4 236,232.6C239,237.7 249,242.6 256,242.9C263,243.2 274,239.2 278,234.3C282,229.4 283,218.5 280,213.6ZM105,250.3C105.2,252.6 110.5,255.7 112.5,256.7C114.5,257.8 115.2,256.6 117,256.5C118.9,256.5 121.4,256.4 123.6,256.4C125.8,256.3 128.3,256.3 130.1,256.2C132,256.1 132.7,257.5 134.6,256C136.6,254.6 142.2,250.1 142,247.4C141.8,244.8 135.6,241.2 133.4,240.1C131.2,238.9 130.7,240.3 128.9,240.6C127.1,240.8 124.6,241.1 122.4,241.4C120.2,241.7 117.7,242 115.9,242.3C114.1,242.5 113.3,241.4 111.5,242.8C109.6,244.1 104.8,248 105,250.3ZM295,250.3C295.2,248 290.4,244.1 288.5,242.8C286.7,241.4 285.9,242.5 284.1,242.3C282.3,242 279.8,241.7 277.6,241.4C275.4,241.1 272.9,240.8 271.1,240.6C269.3,240.3 268.8,238.9 266.6,240.1C264.4,241.2 258.2,244.8 258,247.4C257.8,250.1 263.4,254.6 265.4,256C267.3,257.5 268,256.1 269.9,256.2C271.7,256.3 274.2,256.3 276.4,256.4C278.6,256.4 281.1,256.5 283,256.5C284.8,256.6 285.5,257.8 287.5,256.7C289.5,255.7 294.8,252.6 295,250.3Z", "M192.3,373.3C192.4,367.3 192.8,348.9 193.1,337.3C193.3,325.8 193.7,309.5 193.8,303.9M190.3,371C189.5,363.8 187,341.9 185.4,328.1C183.8,314.3 181.6,295 180.9,288.3M188.5,369.3C186.8,361.3 181.6,336.7 178.4,321.3C175.1,306 170.5,284.3 168.9,276.9M185.8,367.3C182.8,358.4 173.6,331 167.8,313.7C162,296.5 153.9,272.3 151.1,264.1M183.9,366.6C180,357.3 167.8,328.7 160.2,310.7C152.6,292.8 141.9,267.6 138.3,259M181.7,366.4C176.7,357.1 161.3,328.3 151.6,310.2C141.9,292.2 128.3,266.8 123.6,258.1M180.1,367.4C174.3,358.5 156.6,331.1 145.4,313.9C134.2,296.7 118.6,272.5 113.2,264.3M180,369.1C174.1,361 156,336.2 144.7,320.6C133.4,305.1 117.5,283.2 112,275.7M180.8,372.4C175.3,365.9 158.5,346.1 148,333.6C137.5,321.2 122.7,303.7 117.6,297.7M181.8,374.9C176.8,369.6 161.5,353.5 151.8,343.4C142.2,333.3 128.7,319.1 124.1,314.3M183.5,378.3C179.3,374.7 166.6,363.7 158.6,356.8C150.6,349.9 139.4,340.2 135.5,336.9M207.7,373.3C207.6,367.3 207.2,348.9 206.9,337.3C206.7,325.8 206.3,309.5 206.2,303.9M209.7,371C210.5,363.8 213,341.9 214.6,328.1C216.2,314.3 218.4,295 219.1,288.3M211.5,369.3C213.2,361.3 218.4,336.7 221.6,321.3C224.9,306 229.5,284.3 231.1,276.9M214.2,367.3C217.2,358.4 226.4,331 232.2,313.7C238,296.5 246.1,272.3 248.9,264.1M216.1,366.6C220,357.3 232.2,328.7 239.8,310.7C247.4,292.8 258,267.6 261.7,259M218.3,366.4C223.3,357.1 238.7,328.3 248.4,310.2C258.1,292.2 271.7,266.8 276.4,258.1M219.9,367.4C225.7,358.5 243.4,331.1 254.6,313.9C265.8,296.7 281.4,272.5 286.8,264.3M220,369.1C225.9,361 244,336.2 255.3,320.6C266.6,305.1 282.5,283.2 288,275.7M219.2,372.4C224.7,365.9 241.5,346.1 252,333.6C262.5,321.2 277.3,303.7 282.4,297.7M218.2,374.9C223.2,369.6 238.5,353.5 248.2,343.4C257.8,333.3 271.3,319.1 275.9,314.3M216.5,378.3C220.7,374.7 233.4,363.7 241.4,356.8C249.4,349.9 260.6,340.2 264.5,336.9M122.8,221.3C124.2,220 128.4,216 131,213.6C133.6,211.1 137.3,207.6 138.6,206.4M125.5,222C128.2,221 136.5,218 141.7,216.2C146.9,214.3 154.2,211.7 156.7,210.8M126.4,224.2C129.5,224.4 139.1,224.8 145.1,225C151.2,225.3 159.6,225.7 162.5,225.8M125.5,225.9C128.1,226.8 136.3,229.6 141.5,231.4C146.6,233.2 153.8,235.7 156.3,236.5M122.8,226.6C124.2,227.9 128.5,231.8 131.1,234.3C133.8,236.7 137.5,240.2 138.8,241.4M277.2,221.3C275.8,220 271.6,216 269,213.6C266.4,211.1 262.7,207.6 261.4,206.4M274.5,222C271.8,221 263.5,218 258.3,216.2C253.1,214.3 245.8,211.7 243.3,210.8M273.6,224.2C270.5,224.4 260.9,224.8 254.9,225C248.8,225.3 240.4,225.7 237.5,225.8M274.5,225.9C271.9,226.8 263.7,229.6 258.5,231.4C253.4,233.2 246.2,235.7 243.7,236.5M277.2,226.6C275.8,227.9 271.5,231.8 268.9,234.3C266.2,236.7 262.5,240.2 261.2,241.4M113.8,249.6C115.4,249.5 119.9,249.1 123,248.9C126.1,248.7 130.6,248.3 132.2,248.2M286.2,249.6C284.6,249.5 280.1,249.1 277,248.9C273.9,248.7 269.4,248.3 267.8,248.2"],
    ["lowerback", "M184,294.5C180,294.5 174.1,302.7 172,306.6C169.9,310.4 171.7,313.1 171.3,317.5C170.9,321.9 170.2,327.6 169.6,333.1C169.1,338.6 168.4,344.9 167.9,350.5C167.5,356 167.1,361.2 167,366.4C166.9,371.7 167,376.6 167.1,382C167.2,387.3 167.4,393.1 167.5,398.3C167.7,403.4 167.9,408.6 167.9,412.8C168,416.9 165.8,418.8 168,422.9C170.3,427.1 176.8,437.3 181.5,437.5C186.1,437.6 193.4,427.9 196,424C198.6,420.1 196.4,418.1 196.9,414C197.3,409.9 197.9,404.6 198.5,399.5C199,394.3 199.7,388.4 200.1,383C200.5,377.6 201,372.4 201,367C201,361.6 200.8,356.2 200.4,350.5C200,344.9 199.2,338.6 198.6,333C198,327.5 197.3,321.8 196.8,317.3C196.4,312.9 198.1,310.3 196,306.5C193.9,302.7 188,294.5 184,294.5ZM216,294.5C212,294.5 206.1,302.7 204,306.5C201.9,310.3 203.6,312.9 203.2,317.3C202.7,321.8 202,327.5 201.4,333C200.8,338.6 200,344.9 199.6,350.5C199.2,356.2 199,361.6 199,367C199,372.4 199.5,377.6 199.9,383C200.3,388.4 201,394.3 201.5,399.5C202.1,404.6 202.7,409.9 203.1,414C203.6,418.1 201.4,420.1 204,424C206.6,427.9 213.9,437.6 218.5,437.5C223.2,437.3 229.7,427.1 232,422.9C234.2,418.8 232,416.9 232.1,412.8C232.1,408.6 232.3,403.4 232.5,398.3C232.6,393.1 232.8,387.3 232.9,382C233,376.6 233.1,371.7 233,366.4C232.9,361.2 232.5,356 232.1,350.5C231.6,344.9 230.9,338.6 230.4,333.1C229.8,327.6 229.1,321.9 228.7,317.5C228.3,313.1 230.1,310.4 228,306.6C225.9,302.7 220,294.5 216,294.5Z", "M188.4,311.2C188.6,314.8 189.1,325.1 189.3,333.1C189.6,341 190.1,350.7 190.1,359C190.2,367.3 189.9,374.7 189.5,382.7C189.2,390.6 188.5,399.9 188.1,406.7C187.7,413.6 187.2,420.8 187,423.7M184,311.2C184,314.8 184.1,325.1 184.1,333.1C184.1,341 184.2,350.7 184.1,358.9C184,367.2 183.8,374.6 183.6,382.5C183.4,390.4 183,399.7 182.7,406.5C182.4,413.3 182.1,420.7 182,423.5M179.6,311.2C179.5,314.9 179.2,325.1 178.9,333.1C178.6,341 178.3,350.7 178.1,358.9C177.8,367.1 177.8,374.4 177.6,382.3C177.5,390.2 177.4,399.5 177.3,406.3C177.2,413.1 177,420.5 177,423.3M220.4,311.2C220.5,314.9 220.8,325.1 221.1,333.1C221.4,341 221.7,350.7 221.9,358.9C222.2,367.1 222.2,374.4 222.4,382.3C222.5,390.2 222.6,399.5 222.7,406.3C222.8,413.1 223,420.5 223,423.3M216,311.2C216,314.8 215.9,325.1 215.9,333.1C215.9,341 215.8,350.7 215.9,358.9C216,367.2 216.2,374.6 216.4,382.5C216.6,390.4 217,399.7 217.3,406.5C217.6,413.3 217.9,420.7 218,423.5M211.6,311.2C211.4,314.8 210.9,325.1 210.7,333.1C210.4,341 209.9,350.7 209.9,359C209.8,367.3 210.1,374.7 210.5,382.7C210.8,390.6 211.5,399.9 211.9,406.7C212.3,413.6 212.8,420.8 213,423.7"],
    ["glutes", "M198,413.2C193,402.8 179.7,406.9 170,406.3C160.3,405.7 149.7,406 140,409.7C130.3,413.4 117.7,420.6 112,428.6C106.3,436.7 104.7,448.4 106,457.9C107.3,467.3 112,477.3 120,485.4C128,493.5 142.3,504 154,506.2C165.7,508.4 182.3,504.7 190,498.4C197.7,492.1 198.7,482.4 200,468.2C201.3,454 203,423.5 198,413.2ZM202,413.2C207,402.8 220.3,406.9 230,406.3C239.7,405.7 250.3,406 260,409.7C269.7,413.4 282.3,420.6 288,428.6C293.7,436.7 295.3,448.4 294,457.9C292.7,467.3 288,477.3 280,485.4C272,493.5 257.7,504 246,506.2C234.3,508.4 217.7,504.7 210,498.4C202.3,492.1 201.3,482.4 200,468.2C198.7,454 197,423.5 202,413.2Z", "M181.6,420.7C177.4,420.2 164.8,418.7 156.8,417.8C148.9,416.8 137.7,415.5 133.9,415M179.1,422.7C173.8,423.2 157.4,424.6 147.1,425.5C136.8,426.4 122.4,427.7 117.5,428.2M178.2,425.4C172.4,427.2 154.7,432.7 143.6,436.1C132.5,439.6 116.9,444.4 111.6,446.1M178.6,428.2C173,431.3 155.9,440.9 145.1,446.9C134.4,452.9 119.3,461.3 114.2,464.2M180.2,430.7C175.4,435 160.7,448.4 151.5,456.8C142.3,465.1 129.3,476.9 124.9,480.9M183.2,432.9C180,438.4 169.8,455.2 163.5,465.7C157.1,476.2 148.2,491 145.2,496M186.8,433.6C185.2,439.4 180.3,457.2 177.2,468.4C174.2,479.6 169.9,495.2 168.4,500.6M190,432.5C190,437.7 190,453.8 190,463.9C190,474 190,488.2 190,493M191.2,430C191.8,434.1 193.6,446.5 194.7,454.3C195.8,462.1 197.4,473 197.9,476.8M218.4,420.7C222.6,420.2 235.2,418.7 243.2,417.8C251.1,416.8 262.3,415.5 266.1,415M220.9,422.7C226.3,423.2 242.6,424.6 252.9,425.5C263.2,426.4 277.6,427.7 282.5,428.2M221.8,425.4C227.6,427.2 245.3,432.7 256.4,436.1C267.5,439.6 283.1,444.4 288.4,446.1M221.4,428.2C227,431.3 244.1,440.9 254.9,446.9C265.6,452.9 280.7,461.3 285.8,464.2M219.8,430.7C224.6,435 239.3,448.4 248.5,456.8C257.7,465.1 270.7,476.9 275.1,480.9M216.8,432.9C220,438.4 230.2,455.2 236.5,465.7C242.9,476.2 251.8,491 254.8,496M213.2,433.6C214.8,439.4 219.7,457.2 222.8,468.4C225.8,479.6 230.1,495.2 231.6,500.6M210,432.5C210,437.7 210,453.8 210,463.9C210,474 210,488.2 210,493M208.8,430C208.2,434.1 206.4,446.5 205.3,454.3C204.2,462.1 202.6,473 202.1,476.8"],
    ["abductors", "M160,399.4C155.7,396.2 140,398.3 132,401.1C124,404 115.7,411.2 112,416.6C108.3,422 106.7,432.1 110,433.8C113.3,435.5 124,429.2 132,426.9C140,424.6 153.3,424.6 158,420C162.7,415.5 164.3,402.6 160,399.4ZM240,399.4C244.3,396.2 260,398.3 268,401.1C276,404 284.3,411.2 288,416.6C291.7,422 293.3,432.1 290,433.8C286.7,435.5 276,429.2 268,426.9C260,424.6 246.7,424.6 242,420C237.3,415.5 235.7,402.6 240,399.4Z", "M153.8,405.8C151.7,405.6 145.4,404.9 141.5,404.4C137.5,404 132,403.3 130.1,403.1M151.3,408.2C148.1,409.1 138.1,411.9 131.8,413.6C125.5,415.4 116.7,417.9 113.7,418.7M151.6,410.2C148.5,412.1 138.9,417.9 132.8,421.6C126.8,425.2 118.3,430.3 115.4,432.1M155,409C153.5,410.4 149,414.5 146.1,417.1C143.3,419.7 139.3,423.3 137.9,424.6M246.2,405.8C248.3,405.6 254.6,404.9 258.5,404.4C262.5,404 268,403.3 269.9,403.1M248.7,408.2C251.9,409.1 261.9,411.9 268.2,413.6C274.5,415.4 283.3,417.9 286.3,418.7M248.4,410.2C251.5,412.1 261.1,417.9 267.2,421.6C273.2,425.2 281.7,430.3 284.6,432.1M245,409C246.5,410.4 251,414.5 253.9,417.1C256.7,419.7 260.7,423.3 262.1,424.6"],
    ["adductors", "M194.4,535.6C192.1,535.5 188.4,538.9 187,542.2C185.6,545.5 186.4,550.1 186,555.5C185.5,560.9 184.9,567.8 184.3,574.5C183.7,581.2 183,588.8 182.4,595.6C181.9,602.3 181.3,608.6 181,614.9C180.7,621.2 180.6,627 180.5,633.2C180.5,639.4 180.7,646.1 180.8,652C180.9,657.9 181.1,663.9 181.1,668.6C181.1,673.2 180.2,677.3 181,680.1C181.8,682.9 184,685.3 185.7,685.4C187.4,685.5 189.9,683.4 191,680.7C192.1,678 191.7,673.9 192.3,669.3C193,664.6 193.9,658.7 194.7,652.9C195.6,647 196.6,640.4 197.3,634.2C198,628.1 198.6,622.2 199,615.9C199.4,609.6 199.6,603.3 199.8,596.5C200,589.8 200.1,582.1 200.2,575.4C200.4,568.7 200.5,561.7 200.6,556.3C200.7,550.9 202,546.4 201,543C200,539.5 196.7,535.7 194.4,535.6ZM205.6,535.6C203.3,535.7 200,539.5 199,543C198,546.4 199.3,550.9 199.4,556.3C199.5,561.7 199.6,568.7 199.8,575.4C199.9,582.1 200,589.8 200.2,596.5C200.4,603.3 200.6,609.6 201,615.9C201.4,622.2 202,628.1 202.7,634.2C203.4,640.4 204.4,647 205.3,652.9C206.1,658.7 207,664.6 207.7,669.3C208.3,673.9 207.9,678 209,680.7C210.1,683.4 212.6,685.5 214.3,685.4C216,685.3 218.2,682.9 219,680.1C219.8,677.3 218.9,673.2 218.9,668.6C218.9,663.9 219.1,657.9 219.2,652C219.3,646.1 219.5,639.4 219.5,633.2C219.4,627 219.3,621.2 219,614.9C218.7,608.6 218.1,602.3 217.6,595.6C217,588.8 216.3,581.2 215.7,574.5C215.1,567.8 214.5,560.9 214,555.5C213.6,550.1 214.4,545.5 213,542.2C211.6,538.9 207.9,535.5 205.6,535.6Z", "M193.7,548.3C193.5,552.7 192.8,565.3 192.3,574.9C191.7,584.6 191.1,596.4 190.5,606.2C190,616 189.5,624.6 188.9,633.7C188.4,642.9 187.7,653.3 187.2,661.1C186.7,668.9 186.2,677.2 186,680.4M206.3,548.3C206.5,552.7 207.2,565.3 207.8,574.9C208.3,584.6 208.9,596.4 209.5,606.2C210,616 210.5,624.6 211.1,633.7C211.6,642.9 212.3,653.3 212.8,661.1C213.3,668.9 213.8,677.2 214,680.4"],
    ["hamstrings", "M137.6,504.9C131.9,504.4 122.5,515.5 119.1,520.2C115.6,525 118,527.9 117,533.3C116,538.6 114.5,545.4 113.3,552.3C112.1,559.2 110.7,567 109.8,574.4C108.9,581.9 107.9,589.2 108,596.9C108.1,604.6 108.9,612.5 110.1,620.7C111.3,628.8 113.4,637.9 115.2,645.8C116.9,653.7 119,661.9 120.4,668.2C121.7,674.5 120.6,679.3 123,683.6C125.4,687.9 131,694.2 134.6,694C138.3,693.8 143.1,687 145,682.4C146.8,677.8 145.2,672.9 145.7,666.5C146.3,660.1 147.3,651.7 148.1,643.9C148.9,636 150,626.9 150.7,619.2C151.3,611.5 151.8,604.5 152,597.5C152.2,590.5 152.1,584.2 152.1,577.3C152.1,570.4 152.1,562.7 152.2,556C152.2,549.3 152.2,542.4 152.4,536.9C152.5,531.5 155.4,528.7 152.9,523.4C150.5,518 143.2,505.4 137.6,504.9ZM262.4,504.9C256.8,505.4 249.5,518 247.1,523.4C244.6,528.7 247.5,531.5 247.6,536.9C247.8,542.4 247.8,549.3 247.8,556C247.9,562.7 247.9,570.4 247.9,577.3C247.9,584.2 247.8,590.5 248,597.5C248.2,604.5 248.7,611.5 249.3,619.2C250,626.9 251.1,636 251.9,643.9C252.7,651.7 253.7,660.1 254.3,666.5C254.8,672.9 253.2,677.8 255,682.4C256.9,687 261.7,693.8 265.4,694C269,694.2 274.6,687.9 277,683.6C279.4,679.3 278.3,674.5 279.6,668.2C281,661.9 283.1,653.7 284.8,645.8C286.6,637.9 288.7,628.8 289.9,620.7C291.1,612.5 291.9,604.6 292,596.9C292.1,589.2 291.1,581.9 290.2,574.4C289.3,567 287.9,559.2 286.7,552.3C285.5,545.4 284,538.6 283,533.3C282,527.9 284.4,525 280.9,520.2C277.5,515.5 268.1,504.4 262.4,504.9ZM176.8,504.2C171.8,504 163.9,513.8 161,518.4C158.2,523 160.4,526.5 159.8,532C159.2,537.6 158.4,544.6 157.6,551.6C156.9,558.6 156,566.6 155.4,574.1C154.8,581.6 154.2,588.8 154,596.6C153.9,604.3 154.1,612.3 154.6,620.8C155,629.2 156,638.9 156.8,647.3C157.5,655.7 158.5,664.6 159.1,671.3C159.6,678.1 158.2,683.5 160,688C161.8,692.5 166.5,698.1 169.8,698.2C173.1,698.3 178,692.8 180,688.4C182,684 180.8,678.5 181.6,671.7C182.4,665 183.7,656.2 184.7,647.8C185.8,639.5 187.2,629.9 188.1,621.6C188.9,613.2 189.6,605.5 190,597.8C190.4,590.2 190.4,583.2 190.5,575.8C190.6,568.4 190.6,560.4 190.6,553.4C190.6,546.4 190.6,539.4 190.7,533.8C190.7,528.2 193.3,524.9 191,520C188.7,515.1 181.8,504.5 176.8,504.2ZM223.2,504.2C218.2,504.5 211.3,515.1 209,520C206.7,524.9 209.3,528.2 209.3,533.8C209.4,539.4 209.4,546.4 209.4,553.4C209.4,560.4 209.4,568.4 209.5,575.8C209.6,583.2 209.6,590.2 210,597.8C210.4,605.5 211.1,613.2 211.9,621.6C212.8,629.9 214.2,639.5 215.3,647.8C216.3,656.2 217.6,665 218.4,671.7C219.2,678.5 218,684 220,688.4C222,692.8 226.9,698.3 230.2,698.2C233.5,698.1 238.2,692.5 240,688C241.8,683.5 240.4,678.1 240.9,671.3C241.5,664.6 242.5,655.7 243.2,647.3C244,638.9 245,629.2 245.4,620.8C245.9,612.3 246.1,604.3 246,596.6C245.8,588.8 245.2,581.6 244.6,574.1C244,566.6 243.1,558.6 242.4,551.6C241.6,544.6 240.8,537.6 240.2,532C239.6,526.5 241.8,523 239,518.4C236.1,513.8 228.2,504 223.2,504.2Z", "M143,528.3C142.7,532.7 141.8,545.1 141.2,554.9C140.7,564.8 140.2,576.4 139.8,587.2C139.5,598 139.5,608.1 139.3,619.6C139.1,631.1 138.8,645.7 138.7,656.3C138.6,666.8 138.8,678.3 138.8,682.7M137.9,527.8C137.5,532.2 136.3,544.6 135.6,554.4C134.8,564.3 133.8,576 133.5,586.9C133.1,597.8 133.2,608.2 133.3,619.8C133.5,631.4 134.1,646 134.4,656.5C134.8,667 135.4,678.5 135.6,682.9M131.5,527.1C130.9,531.6 129.2,543.8 128.2,553.7C127.2,563.6 125.6,575.5 125.2,586.5C124.8,597.6 125,608.4 125.6,620.1C126.3,631.8 128,646.4 129,656.9C129.9,667.4 131,678.8 131.4,683.1M126.7,526.7C126.1,531.1 124.1,543.3 122.8,553.2C121.6,563.1 119.7,575.1 119.2,586.3C118.7,597.5 119.1,608.5 120.1,620.3C121,632.1 123.6,646.6 125,657.1C126.4,667.6 127.8,678.9 128.4,683.3M272,526.8C272.6,531.2 274.5,543.4 275.7,553.3C276.9,563.3 278.8,575.2 279.2,586.3C279.7,597.5 279.3,608.5 278.5,620.3C277.6,632 275.2,646.5 274,657.1C272.7,667.6 271.3,678.9 270.8,683.3M267,527.3C267.5,531.7 269.1,544 270.1,553.9C271,563.8 272.4,575.6 272.8,586.6C273.2,597.7 273.1,608.3 272.5,620C272,631.7 270.6,646.3 269.7,656.8C268.9,667.3 267.9,678.7 267.6,683.1M260.5,527.9C260.9,532.4 262,544.7 262.7,554.6C263.4,564.4 264.2,576.1 264.6,587C264.9,597.9 264.9,608.2 264.9,619.8C264.8,631.3 264.5,645.9 264.3,656.4C264,667 263.6,678.5 263.4,682.9M255.8,528.4C256.1,532.9 256.9,545.3 257.3,555.1C257.8,564.9 258.3,576.5 258.6,587.2C258.9,598 259,608.1 259.3,619.6C259.6,631 260.1,645.7 260.3,656.2C260.5,666.7 260.4,678.3 260.4,682.7M182.3,525.5C182.1,530.1 181.7,542.7 181.3,552.9C181,563.1 180.7,575.2 180.2,586.6C179.8,598 179.3,609.1 178.6,621.3C177.9,633.6 176.7,649.1 176,660.3C175.3,671.4 174.6,683.6 174.4,688.3M175.7,525.1C175.4,529.7 174.7,542.3 174.1,552.5C173.6,562.7 172.9,574.9 172.4,586.3C172,597.7 171.6,608.9 171.3,621.2C171,633.5 170.7,649 170.5,660.2C170.3,671.3 170.1,683.5 170,688.2M169.1,524.8C168.7,529.3 167.7,541.9 166.9,552.1C166.2,562.3 165.1,574.5 164.6,586C164.1,597.4 163.9,608.6 164,621C164.1,633.3 164.8,648.9 165,660.1C165.3,671.3 165.5,683.4 165.6,688.1M230.9,524.8C231.3,529.3 232.3,541.9 233.1,552.1C233.8,562.3 234.9,574.5 235.4,586C235.9,597.4 236.1,608.6 236,621C235.9,633.3 235.2,648.9 235,660.1C234.7,671.3 234.5,683.4 234.4,688.1M224.3,525.1C224.6,529.7 225.3,542.3 225.9,552.5C226.4,562.7 227.1,574.9 227.6,586.3C228,597.7 228.4,608.9 228.7,621.2C229,633.5 229.3,649 229.5,660.2C229.7,671.3 229.9,683.5 230,688.2M217.7,525.5C217.9,530.1 218.3,542.7 218.7,552.9C219,563.1 219.3,575.2 219.8,586.6C220.2,598 220.7,609.1 221.4,621.3C222.1,633.6 223.3,649.1 224,660.3C224.7,671.4 225.4,683.6 225.6,688.3"],
    ["calves", "M172.6,697.2C166.9,697 158.2,709.3 155,713.6C151.9,717.9 154.4,719.2 153.8,722.9C153.1,726.7 152.1,731.4 151.3,736.1C150.4,740.8 149.3,746.1 148.6,750.9C147.9,755.7 147,760.1 147,764.9C147,769.7 147.6,774.4 148.6,779.5C149.6,784.6 151.5,790.5 152.9,795.6C154.4,800.7 156.3,806.1 157.3,810.2C158.3,814.3 157.7,817.3 159,820.3C160.4,823.2 163.1,827.6 165.5,827.8C167.8,828 171.2,824 173,821.3C174.8,818.6 174.6,815.6 176.2,811.7C177.9,807.8 180.6,802.8 182.8,797.9C185,793 187.8,787.5 189.5,782.4C191.2,777.3 192.4,772.4 193,767.5C193.5,762.5 193,757.7 192.7,752.7C192.4,747.7 191.8,742.3 191.2,737.5C190.7,732.7 190,727.8 189.6,724.1C189.2,720.3 191.8,719.3 189,714.8C186.2,710.3 178.3,697.4 172.6,697.2ZM227.4,697.2C221.7,697.4 213.8,710.3 211,714.8C208.2,719.3 210.8,720.3 210.4,724.1C210,727.8 209.3,732.7 208.8,737.5C208.2,742.3 207.6,747.7 207.3,752.7C207,757.7 206.5,762.5 207,767.5C207.6,772.4 208.8,777.3 210.5,782.4C212.2,787.5 215,793 217.2,797.9C219.4,802.8 222.1,807.8 223.8,811.7C225.4,815.6 225.2,818.6 227,821.3C228.8,824 232.2,828 234.5,827.8C236.9,827.6 239.6,823.2 241,820.3C242.3,817.3 241.7,814.3 242.7,810.2C243.7,806.1 245.6,800.7 247.1,795.6C248.5,790.5 250.4,784.6 251.4,779.5C252.4,774.4 253,769.7 253,764.9C253,760.1 252.1,755.7 251.4,750.9C250.7,746.1 249.6,740.8 248.7,736.1C247.9,731.4 246.9,726.7 246.2,722.9C245.6,719.2 248.1,717.9 245,713.6C241.8,709.3 233.1,697 227.4,697.2ZM140.1,698.2C134.8,698.2 126.8,709.9 124,714.1C121.2,718.3 123.6,719.5 123.1,723.3C122.7,727.1 121.9,732 121.3,736.8C120.6,741.6 119.9,747.1 119.5,752.1C119.1,757.2 118.6,762.1 119,767C119.4,771.9 120.5,776.8 122,781.7C123.6,786.7 126.1,792 128.1,796.6C130,801.3 132.5,806 134,809.7C135.5,813.4 135.3,816.2 137,818.8C138.8,821.4 142.3,825.4 144.6,825.2C146.9,825 149.7,820.5 151,817.6C152.3,814.8 151.5,811.9 152.3,808C153.2,804.1 154.7,799.1 155.9,794.3C157.2,789.4 158.7,783.9 159.6,779.1C160.4,774.3 160.9,769.9 161,765.4C161,760.8 160.4,756.6 159.9,751.8C159.5,747.1 158.8,741.8 158.2,737.1C157.7,732.4 157.1,727.6 156.7,723.8C156.3,720 158.8,718.6 156,714.3C153.2,710 145.4,698.2 140.1,698.2ZM259.9,698.2C254.6,698.2 246.8,710 244,714.3C241.2,718.6 243.7,720 243.3,723.8C242.9,727.6 242.3,732.4 241.8,737.1C241.2,741.8 240.5,747.1 240.1,751.8C239.6,756.6 239,760.8 239,765.4C239.1,769.9 239.6,774.3 240.4,779.1C241.3,783.9 242.8,789.4 244.1,794.3C245.3,799.1 246.8,804.1 247.7,808C248.5,811.9 247.7,814.8 249,817.6C250.3,820.5 253.1,825 255.4,825.2C257.7,825.4 261.2,821.4 263,818.8C264.7,816.2 264.5,813.4 266,809.7C267.5,806 270,801.3 271.9,796.6C273.9,792 276.4,786.7 278,781.7C279.5,776.8 280.6,771.9 281,767C281.4,762.1 280.9,757.2 280.5,752.1C280.1,747.1 279.4,741.6 278.7,736.8C278.1,732 277.3,727.1 276.9,723.3C276.4,719.5 278.8,718.3 276,714.1C273.2,709.9 265.2,698.2 259.9,698.2Z", "M179.4,718.4C179.5,721.6 179.8,730.2 180,737.1C180.1,744 180.6,752.3 180.3,759.7C180,767.1 179.3,774.1 178,781.6C176.7,789.1 174,798 172.6,804.6C171.1,811.2 169.6,818.3 169.1,821M171.9,718.2C171.8,721.3 171.5,729.9 171.3,736.8C171,743.6 170.7,751.9 170.4,759.2C170,766.6 169.6,773.4 169,780.9C168.5,788.4 167.8,797.6 167.3,804.2C166.8,810.9 166.2,818 166,820.8M164.3,717.9C164,721 163.2,729.7 162.5,736.5C161.9,743.3 160.8,751.4 160.4,758.7C160,766.1 159.8,772.8 160.1,780.3C160.4,787.8 161.6,797.1 162,803.8C162.5,810.5 162.8,817.8 162.9,820.6M235.7,717.9C236,721 236.8,729.7 237.5,736.5C238.1,743.3 239.2,751.4 239.6,758.7C240,766.1 240.2,772.8 239.9,780.3C239.6,787.8 238.4,797.1 238,803.8C237.5,810.5 237.2,817.8 237.1,820.6M228.1,718.2C228.2,721.3 228.5,729.9 228.8,736.8C229,743.6 229.3,751.9 229.6,759.2C230,766.6 230.4,773.4 231,780.9C231.5,788.4 232.2,797.6 232.7,804.2C233.2,810.9 233.8,818 234,820.8M220.6,718.4C220.5,721.6 220.2,730.2 220,737.1C219.9,744 219.4,752.3 219.7,759.7C220,767.1 220.7,774.1 222,781.6C223.3,789.1 226,798 227.4,804.6C228.9,811.2 230.4,818.3 230.9,821M145.8,718.3C145.9,721.4 146.2,730.2 146.4,737C146.7,743.8 147.1,752 147.3,759.2C147.5,766.4 147.7,772.8 147.6,779.9C147.5,787.1 146.9,795.8 146.7,802.1C146.5,808.5 146.5,815.3 146.5,818M138.4,718.2C138.3,721.3 138,730.1 137.9,736.9C137.8,743.8 137.6,752.1 137.8,759.4C138,766.7 138.4,773.3 139,780.5C139.6,787.8 140.8,796.3 141.5,802.6C142.2,808.9 143,815.6 143.3,818.3M132.9,718.1C132.7,721.3 132,730 131.7,736.9C131.3,743.8 130.6,752.2 130.7,759.5C130.9,766.9 131.4,773.8 132.6,781C133.8,788.2 136.2,796.7 137.6,802.9C139,809.2 140.4,815.9 140.9,818.5M265.9,718.2C266,721.3 266.6,730 266.9,736.9C267.2,743.8 267.8,752.2 267.7,759.5C267.5,766.8 267,773.7 265.9,780.9C264.9,788.1 262.7,796.6 261.5,802.9C260.2,809.1 259,815.8 258.5,818.4M258.4,718.2C258.4,721.4 258.5,730.1 258.4,737C258.4,743.8 258.3,752.1 258.2,759.3C258,766.5 257.7,773.1 257.4,780.3C257,787.5 256.6,796.1 256.3,802.4C255.9,808.7 255.5,815.5 255.3,818.1M252.9,718.3C252.8,721.4 252.5,730.2 252.2,737C251.9,743.8 251.3,752 251.1,759.2C250.9,766.3 250.8,772.7 251,779.8C251.2,787 252.1,795.7 252.4,802.1C252.7,808.4 252.9,815.3 252.9,817.9"],
    ["triceps", "M100,246.1C94.7,245.5 85.4,256.3 82.1,260C78.8,263.8 81,265.2 80.1,268.8C79.2,272.3 77.7,276.8 76.5,281.2C75.3,285.5 73.8,290.5 72.7,294.8C71.7,299.1 70.7,303.1 70.2,307C69.7,311 69.7,314.6 69.8,318.5C69.9,322.3 70.5,326.6 70.8,330.3C71.2,334 71.8,337.7 72,340.7C72.2,343.6 70.2,344 72.2,347.9C74.1,351.7 79.3,363.1 83.9,363.8C88.5,364.5 96.8,355.2 99.8,352.1C102.9,349 101.1,348.1 102.1,345.3C103.2,342.6 105,339.2 106.4,335.7C107.9,332.3 109.7,328.3 110.9,324.5C112.1,320.7 113.2,317 113.8,313C114.4,308.9 114.5,304.6 114.5,300.1C114.6,295.6 114.4,290.4 114.2,285.8C114.1,281.3 113.8,276.5 113.7,272.9C113.7,269.2 116.2,268.4 113.9,264C111.6,259.5 105.2,246.8 100,246.1ZM300,246.1C294.8,246.8 288.4,259.5 286.1,264C283.8,268.4 286.3,269.2 286.3,272.9C286.2,276.5 285.9,281.3 285.8,285.8C285.6,290.4 285.4,295.6 285.5,300.1C285.5,304.6 285.6,308.9 286.2,313C286.8,317 287.9,320.7 289.1,324.5C290.3,328.3 292.1,332.3 293.6,335.7C295,339.2 296.8,342.6 297.9,345.3C298.9,348.1 297.1,349 300.2,352.1C303.2,355.2 311.5,364.5 316.1,363.8C320.7,363.1 325.9,351.7 327.8,347.9C329.8,344 327.8,343.6 328,340.7C328.2,337.7 328.8,334 329.2,330.3C329.5,326.6 330.1,322.3 330.2,318.5C330.3,314.6 330.3,311 329.8,307C329.3,303.1 328.3,299.1 327.3,294.8C326.2,290.5 324.7,285.5 323.5,281.2C322.3,276.8 320.8,272.3 319.9,268.8C319,265.2 321.2,263.8 317.9,260C314.6,256.3 305.3,245.5 300,246.1ZM112.9,260C109.6,259.7 104.1,266.3 102,269.1C100,271.8 101.4,273.4 100.9,276.3C100.4,279.3 99.6,283.1 98.9,286.7C98.2,290.3 97.4,294.4 96.8,298C96.1,301.6 95.5,304.9 95.1,308.3C94.7,311.7 94.5,314.8 94.3,318.2C94.1,321.6 94,325.3 93.9,328.6C93.8,331.9 93.8,335.3 93.7,337.9C93.5,340.6 92,341.6 93.1,344.5C94.3,347.3 97.5,354.4 100.5,354.9C103.4,355.4 108.8,349.8 110.9,347.5C112.9,345.3 111.8,343.8 112.6,341.3C113.4,338.8 114.6,335.6 115.6,332.4C116.6,329.2 117.8,325.5 118.7,322.1C119.6,318.6 120.4,315.3 120.9,311.7C121.4,308.1 121.5,304.5 121.7,300.7C121.9,296.8 121.8,292.6 121.8,288.8C121.8,285.1 121.7,281.2 121.8,278.2C121.8,275.2 123.4,274 122,270.9C120.5,267.9 116.3,260.4 112.9,260ZM287.1,260C283.7,260.4 279.5,267.9 278,270.9C276.6,274 278.2,275.2 278.2,278.2C278.3,281.2 278.2,285.1 278.2,288.8C278.2,292.6 278.1,296.8 278.3,300.7C278.5,304.5 278.6,308.1 279.1,311.7C279.6,315.3 280.4,318.6 281.3,322.1C282.2,325.5 283.4,329.2 284.4,332.4C285.4,335.6 286.6,338.8 287.4,341.3C288.2,343.8 287.1,345.3 289.1,347.5C291.2,349.8 296.6,355.4 299.5,354.9C302.5,354.4 305.7,347.3 306.9,344.5C308,341.6 306.5,340.6 306.3,337.9C306.2,335.3 306.2,331.9 306.1,328.6C306,325.3 305.9,321.6 305.7,318.2C305.5,314.8 305.3,311.7 304.9,308.3C304.5,304.9 303.9,301.6 303.2,298C302.6,294.4 301.8,290.3 301.1,286.7C300.4,283.1 299.6,279.3 299.1,276.3C298.6,273.4 300,271.8 298,269.1C295.9,266.3 290.4,259.7 287.1,260Z", "M104.6,266.6C104.4,269.6 104,278.1 103.6,284.5C103.2,291 102.9,298.9 102.2,305.3C101.5,311.7 100.6,317.1 99.3,322.8C98.1,328.5 96.2,334.7 95,339.4C93.7,344.1 92.5,349 92.1,350.9M97.5,265.8C97.2,268.7 96.2,277.1 95.4,283.5C94.6,289.9 93.6,297.7 92.8,304.1C92,310.4 91.2,315.8 90.4,321.5C89.5,327.2 88.5,333.5 87.8,338.3C87.1,343 86.3,348 86,350M90.5,264.9C89.9,267.8 88.3,276.2 87.1,282.5C85.9,288.8 84.3,296.5 83.4,302.8C82.4,309.1 81.8,314.5 81.4,320.2C80.9,325.9 80.9,332.4 80.7,337.2C80.4,342 80.1,347.1 79.9,349.1M309.5,264.9C310.1,267.8 311.7,276.2 312.9,282.5C314.1,288.8 315.7,296.5 316.6,302.8C317.6,309.1 318.2,314.5 318.6,320.2C319.1,325.9 319.1,332.4 319.3,337.2C319.6,342 319.9,347.1 320.1,349.1M302.5,265.8C302.8,268.7 303.8,277.1 304.6,283.5C305.4,289.9 306.4,297.7 307.2,304.1C308,310.4 308.8,315.8 309.6,321.5C310.5,327.2 311.5,333.5 312.2,338.3C312.9,343 313.7,348 314,350M295.4,266.6C295.6,269.6 296,278.1 296.4,284.5C296.8,291 297.1,298.9 297.8,305.3C298.5,311.7 299.4,317.1 300.7,322.8C301.9,328.5 303.8,334.7 305,339.4C306.3,344.1 307.5,349 307.9,350.9M111.7,273.1C111.5,275.6 110.9,282.4 110.4,287.8C109.9,293.1 109.3,299.5 108.6,304.9C108,310.3 107.3,315.1 106.5,320.1C105.7,325.2 104.6,331 103.9,335.3C103.1,339.6 102.3,344.2 102,346M288.3,273.1C288.5,275.6 289.1,282.4 289.6,287.8C290.1,293.1 290.7,299.5 291.4,304.9C292,310.3 292.7,315.1 293.5,320.1C294.3,325.2 295.4,331 296.1,335.3C296.9,339.6 297.7,344.2 298,346"],
    ["forearms", "M75.3,370.8C69.6,369 57,378.9 52.8,382.7C48.6,386.5 51,389.1 49.8,393.4C48.7,397.7 47.3,403.4 45.9,408.8C44.5,414.1 42.9,420.3 41.4,425.7C39.8,431.1 38.2,436 36.8,441C35.4,446 34.1,450.7 33,455.8C31.9,460.9 31,466.6 30.1,471.5C29.2,476.4 28.5,481.5 27.7,485.4C27,489.4 25,491.5 25.5,495C26.1,498.5 28.2,505.5 31,506.5C33.9,507.5 39.9,503.4 42.5,501C45.1,498.6 44.9,495.7 46.8,492.2C48.6,488.6 51.3,484.2 53.7,479.8C56.1,475.3 58.9,470.3 61.2,465.5C63.4,460.7 65.3,456 67.2,451C69.1,446 70.6,440.8 72.5,435.4C74.4,430.1 76.5,424 78.4,418.7C80.2,413.5 82.2,408 83.7,403.7C85.2,399.5 88.6,398.8 87.2,393.3C85.8,387.8 81,372.6 75.3,370.8ZM324.7,370.8C319,372.6 314.2,387.8 312.8,393.3C311.4,398.8 314.8,399.5 316.3,403.7C317.8,408 319.8,413.5 321.6,418.7C323.5,424 325.6,430.1 327.5,435.4C329.4,440.8 330.9,446 332.8,451C334.7,456 336.6,460.7 338.8,465.5C341.1,470.3 343.9,475.3 346.3,479.8C348.7,484.2 351.4,488.6 353.2,492.2C355.1,495.7 354.9,498.6 357.5,501C360.1,503.4 366.1,507.5 369,506.5C371.8,505.5 373.9,498.5 374.5,495C375,491.5 373,489.4 372.3,485.4C371.5,481.5 370.8,476.4 369.9,471.5C369,466.6 368.1,460.9 367,455.8C365.9,450.7 364.6,446 363.2,441C361.8,436 360.2,431.1 358.6,425.7C357.1,420.3 355.5,414.1 354.1,408.8C352.7,403.4 351.3,397.7 350.2,393.4C349,389.1 351.4,386.5 347.2,382.7C343,378.9 330.4,369 324.7,370.8Z", "M77.3,395.2C76.2,398.7 72.9,408.6 70.4,416.3C67.9,424 64.9,433.3 62.2,441.1C59.5,448.9 57.2,455.9 54.3,463.1C51.4,470.3 47.5,478.4 44.8,484.5C42.2,490.5 39.4,497 38.3,499.5M72.6,393.7C71.5,397.3 68.4,407.2 65.9,414.9C63.5,422.6 60.6,432 58,439.8C55.4,447.6 53.1,454.5 50.4,461.8C47.7,469 44.3,477.3 41.9,483.4C39.5,489.6 37,496.2 36,498.7M66.9,392C65.9,395.5 62.9,405.6 60.5,413.3C58.2,421 55.4,430.3 52.9,438.2C50.4,446 48.1,452.8 45.7,460.2C43.3,467.5 40.5,476 38.4,482.2C36.3,488.5 34,495.1 33.2,497.7M61.8,390.4C60.7,394 57.9,404 55.6,411.8C53.4,419.5 50.6,428.9 48.3,436.7C45.9,444.5 43.6,451.3 41.4,458.7C39.3,466.1 37,474.7 35.2,481.1C33.4,487.4 31.4,494.2 30.6,496.8M58.2,389.3C57.2,392.9 54.4,403 52.2,410.7C50,418.4 47.3,427.8 45,435.7C42.7,443.5 40.5,450.3 38.5,457.7C36.5,465.1 34.6,473.9 33,480.3C31.4,486.7 29.5,493.5 28.8,496.2M340.1,389.8C341.1,393.4 343.9,403.5 346.2,411.2C348.4,418.9 351.1,428.3 353.4,436.1C355.8,444 358,450.8 360.1,458.2C362.2,465.6 364.3,474.3 366,480.7C367.7,487.1 369.6,493.8 370.3,496.5M335.4,391.3C336.5,394.8 339.4,404.9 341.7,412.6C344,420.3 346.8,429.7 349.2,437.5C351.6,445.3 353.9,452.1 356.2,459.5C358.5,466.9 361.1,475.4 363,481.7C365,488 367.2,494.7 368,497.3M329.7,393C330.8,396.6 333.9,406.6 336.3,414.2C338.7,421.9 341.6,431.3 344.1,439.1C346.7,446.9 349,453.8 351.5,461.1C354.1,468.4 357.3,476.7 359.5,482.9C361.8,489.1 364.2,495.7 365.2,498.3M324.5,394.6C325.7,398.1 328.9,408.1 331.4,415.7C333.9,423.4 336.9,432.8 339.5,440.6C342.2,448.4 344.5,455.3 347.3,462.6C350.1,469.8 353.8,478 356.3,484.1C358.9,490.2 361.6,496.7 362.6,499.2M321,395.7C322.1,399.2 325.4,409.1 328,416.8C330.5,424.4 333.6,433.8 336.3,441.6C339,449.4 341.4,456.4 344.3,463.6C347.3,470.8 351.4,478.8 354.1,484.8C356.9,490.9 359.7,497.3 360.8,499.8"],
    ["shoulders", "M112.8,168.8C103.1,166.5 83.1,186.4 76.8,191.2C70.5,196 75.8,194.9 75.2,197.4C74.5,199.9 73.6,203.1 72.8,206.2C72,209.3 71,212.8 70.2,215.8C69.4,218.9 68.2,221.6 67.9,224.5C67.6,227.4 67.7,230.1 68.3,233.2C68.8,236.3 70.2,240 71.3,243.1C72.3,246.3 73.9,249.6 74.6,252.1C75.3,254.6 73.6,254 75.5,258.1C77.4,262.2 81.3,275.2 86.1,276.5C90.9,277.8 100.8,268.4 104.5,265.9C108.2,263.4 106.5,263.1 108.3,261.3C110.2,259.5 113.2,257.4 115.7,255.1C118.2,252.9 121.3,250.3 123.4,247.7C125.4,245.1 126.9,242.5 128.1,239.5C129.2,236.6 129.5,233.4 130.2,230.1C130.9,226.9 131.6,223.2 132.2,220C132.8,216.8 133.4,213.5 133.9,211C134.4,208.4 138.7,211.8 135.2,204.8C131.7,197.8 122.5,171 112.8,168.8ZM287.2,168.8C277.5,171 268.3,197.8 264.8,204.8C261.3,211.8 265.6,208.4 266.1,211C266.6,213.5 267.2,216.8 267.8,220C268.4,223.2 269.1,226.9 269.8,230.1C270.5,233.4 270.8,236.6 271.9,239.5C273.1,242.5 274.6,245.1 276.6,247.7C278.7,250.3 281.8,252.9 284.3,255.1C286.8,257.4 289.8,259.5 291.7,261.3C293.5,263.1 291.8,263.4 295.5,265.9C299.2,268.4 309.1,277.8 313.9,276.5C318.7,275.2 322.6,262.2 324.5,258.1C326.4,254 324.7,254.6 325.4,252.1C326.1,249.6 327.7,246.3 328.7,243.1C329.8,240 331.2,236.3 331.7,233.2C332.3,230.1 332.4,227.4 332.1,224.5C331.8,221.6 330.6,218.9 329.8,215.8C329,212.8 328,209.3 327.2,206.2C326.4,203.1 325.5,199.9 324.8,197.4C324.2,194.9 329.5,196 323.2,191.2C316.9,186.4 296.9,166.5 287.2,168.8Z", "M119.3,203.9C118.8,206 117.6,211.8 116.6,216.4C115.6,221 114.6,226.6 113.3,231.2C112,235.8 110.8,239.9 108.9,243.9C106.9,248 103.6,252.3 101.6,255.6C99.6,258.9 97.7,262.5 96.9,263.9M108.2,201.3C107.8,203.4 106.4,209.3 105.4,213.8C104.4,218.3 103.1,223.9 102,228.4C100.8,233 99.8,237 98.5,241.2C97.2,245.4 95.5,250.1 94.3,253.6C93.1,257.2 91.9,260.9 91.4,262.4M96,198.5C95.5,200.6 94.1,206.4 93,210.9C91.9,215.4 90.4,220.8 89.4,225.4C88.4,229.9 87.5,233.8 87,238.2C86.5,242.5 86.5,247.7 86.2,251.4C86,255.2 85.5,259.2 85.4,260.8M308.5,197.4C309,199.5 310.5,205.4 311.6,209.8C312.7,214.3 314.3,219.7 315.2,224.2C316.2,228.8 317,232.6 317.3,237C317.5,241.4 316.8,246.8 316.8,250.6C316.7,254.5 316.9,258.6 316.9,260.1M297.5,200C298,202.1 299.3,208 300.4,212.5C301.5,217 302.8,222.4 303.9,227C305,231.6 305.9,235.5 306.9,239.8C307.8,244 308.7,249 309.5,252.6C310.2,256.2 311.1,260.1 311.4,261.6M285.3,202.8C285.7,204.9 287,210.8 288,215.3C289,219.9 290.1,225.5 291.3,230C292.6,234.6 293.7,238.7 295.4,242.8C297.1,246.9 299.7,251.4 301.4,254.8C303.1,258.2 304.7,261.8 305.4,263.2"]]
};
const BODY_BASE = {"front": "<path d=\"M179.3,148C168.4,149.8 163.3,155.1 154.9,158.6C146.4,162.1 135.8,164.6 128.6,168.9C121.4,173.2 115.7,177.2 111.6,184.4C107.6,191.6 104.7,202.2 104.1,211.9C103.5,221.7 105.4,232 107.9,242.9C110.4,253.8 115.1,265.5 119.2,277.3C123.2,289 128.2,301.1 132.3,313.4C136.4,325.7 140.8,339.8 143.6,351.2C146.4,362.7 148.9,372.7 149.2,382.2C149.6,391.7 148.3,399.7 145.5,408C142.7,416.3 135.1,424.9 132.3,432.1C129.5,439.2 126.7,444.7 128.6,451C130.4,457.3 131.7,464.8 143.6,469.9C155.5,475.1 190.6,480 200,482C209.4,484 190.6,484 200,482C209.4,480 244.5,475.1 256.4,469.9C268.3,464.8 269.6,457.3 271.4,451C273.3,444.7 270.5,439.2 267.7,432.1C264.9,424.9 257.3,416.3 254.5,408C251.7,399.7 250.4,391.7 250.8,382.2C251.1,372.7 253.6,362.7 256.4,351.2C259.2,339.8 263.6,325.7 267.7,313.4C271.8,301.1 276.8,289 280.8,277.3C284.9,265.5 289.6,253.8 292.1,242.9C294.6,232 296.5,221.7 295.9,211.9C295.3,202.2 292.4,191.6 288.4,184.4C284.3,177.2 278.6,173.2 271.4,168.9C264.2,164.6 253.6,162.1 245.1,158.6C236.7,155.1 231.6,149.8 220.7,148C209.7,146.2 190.3,146.2 179.3,148Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M109.3,167.4C98.4,165.7 77.8,188.3 71.4,194.7C65.1,201.1 71.1,201.3 71.2,205.9C71.3,210.5 71.8,216.4 72,222.2C72.2,228.1 72.6,234.7 72.5,240.7C72.4,246.8 71.8,252.7 71.3,258.6C70.7,264.5 69.8,270.2 69.2,276.1C68.6,281.9 68.2,288 67.7,293.7C67.2,299.4 66.7,305.2 66,310.5C65.3,315.7 64.4,320.7 63.5,325.3C62.6,329.9 61.6,333.9 60.5,338C59.5,342.2 58.5,346.1 57.3,350.4C56.1,354.7 54.9,359 53.5,363.7C52.1,368.3 50.4,373.3 48.9,378.5C47.3,383.7 45.8,389.1 44.3,394.7C42.8,400.3 41.5,406.3 40.1,412.1C38.7,417.9 37.4,423.9 35.9,429.5C34.5,435.1 33,440.5 31.6,445.7C30.3,451 28.9,455.9 27.8,460.9C26.6,465.9 25.7,471 24.8,475.9C23.8,480.7 23,485.5 22.1,490.1C21.2,494.7 20.2,499 19.3,503.4C18.4,507.8 17.5,512.1 16.9,516.4C16.3,520.6 16,525 15.6,528.8C15.3,532.7 15.2,536.4 14.9,539.4C14.6,542.3 13.2,543.8 14.1,546.6C15.1,549.3 18,555.4 20.6,555.9C23.2,556.3 28,551.7 29.9,549.4C31.7,547.1 30.9,545.1 31.6,542.2C32.3,539.3 33.4,535.8 34.4,532.2C35.4,528.5 36.5,524.5 37.6,520.5C38.6,516.6 39.5,512.6 40.7,508.6C41.9,504.6 43,500.5 44.6,496.3C46.1,492.1 47.9,487.7 49.7,483.1C51.5,478.6 53.5,473.9 55.3,469.1C57.1,464.3 58.7,459.4 60.4,454.3C62.1,449.1 63.7,443.8 65.6,438.3C67.5,432.9 69.6,427.2 71.7,421.6C73.7,416.1 75.9,410.4 77.8,405C79.7,399.7 81.4,394.3 83.1,389.5C84.9,384.7 86.4,380.6 88.2,376.3C90,372 92,368.2 93.9,363.8C95.8,359.5 97.9,355.2 99.7,350.4C101.4,345.5 103.1,340.2 104.5,334.7C105.9,329.2 107,323.1 108.1,317.2C109.2,311.3 110.3,305.2 111.3,299.3C112.3,293.4 113.3,287.4 114.2,281.8C115.1,276.1 115.6,271 116.7,265.4C117.9,259.9 119.2,254.2 121,248.5C122.7,242.8 125.2,236.7 127.3,231.3C129.3,225.8 131.7,220.4 133.2,216.1C134.8,211.8 140.6,213.4 136.6,205.3C132.6,197.2 120.2,169.2 109.3,167.4Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M290.7,167.4C301.6,165.7 322.2,188.3 328.6,194.7C334.9,201.1 328.9,201.3 328.8,205.9C328.7,210.5 328.2,216.4 328,222.2C327.8,228.1 327.4,234.7 327.5,240.7C327.6,246.8 328.2,252.7 328.7,258.6C329.3,264.5 330.2,270.2 330.8,276.1C331.4,281.9 331.8,288 332.3,293.7C332.8,299.4 333.3,305.2 334,310.5C334.7,315.7 335.6,320.7 336.5,325.3C337.4,329.9 338.4,333.9 339.5,338C340.5,342.2 341.5,346.1 342.7,350.4C343.9,354.7 345.1,359 346.5,363.7C347.9,368.3 349.6,373.3 351.1,378.5C352.7,383.7 354.2,389.1 355.7,394.7C357.2,400.3 358.5,406.3 359.9,412.1C361.3,417.9 362.6,423.9 364.1,429.5C365.5,435.1 367,440.5 368.4,445.7C369.7,451 371.1,455.9 372.2,460.9C373.4,465.9 374.3,471 375.2,475.9C376.2,480.7 377,485.5 377.9,490.1C378.8,494.7 379.8,499 380.7,503.4C381.6,507.8 382.5,512.1 383.1,516.4C383.7,520.6 384,525 384.4,528.8C384.7,532.7 384.8,536.4 385.1,539.4C385.4,542.3 386.8,543.8 385.9,546.6C384.9,549.3 382,555.4 379.4,555.9C376.8,556.3 372,551.7 370.1,549.4C368.3,547.1 369.1,545.1 368.4,542.2C367.7,539.3 366.6,535.8 365.6,532.2C364.6,528.5 363.5,524.5 362.4,520.5C361.4,516.6 360.5,512.6 359.3,508.6C358.1,504.6 357,500.5 355.4,496.3C353.9,492.1 352.1,487.7 350.3,483.1C348.5,478.6 346.5,473.9 344.7,469.1C342.9,464.3 341.3,459.4 339.6,454.3C337.9,449.1 336.3,443.8 334.4,438.3C332.5,432.9 330.4,427.2 328.3,421.6C326.3,416.1 324.1,410.4 322.2,405C320.3,399.7 318.6,394.3 316.9,389.5C315.1,384.7 313.6,380.6 311.8,376.3C310,372 308,368.2 306.1,363.8C304.2,359.5 302.1,355.2 300.3,350.4C298.6,345.5 296.9,340.2 295.5,334.7C294.1,329.2 293,323.1 291.9,317.2C290.8,311.3 289.7,305.2 288.7,299.3C287.7,293.4 286.7,287.4 285.8,281.8C284.9,276.1 284.4,271 283.3,265.4C282.1,259.9 280.8,254.2 279,248.5C277.3,242.8 274.8,236.7 272.7,231.3C270.7,225.8 268.3,220.4 266.8,216.1C265.2,211.8 259.4,213.4 263.4,205.3C267.4,197.2 279.8,169.2 290.7,167.4Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M28.3,502.2C23.7,501.4 15.2,510.7 12.2,513.7C9.2,516.7 11.1,517.5 10.2,520.1C9.3,522.6 7.8,525.9 6.6,529.1C5.4,532.3 3.9,535.9 2.8,539.1C1.8,542.4 0.8,545.5 0.3,548.6C-0.3,551.8 -0.3,554.9 -0.4,558.1C-0.5,561.4 -0.2,565.1 -0.1,568.3C0,571.5 0.3,574.8 0.4,577.3C0.4,579.9 -1.6,579.8 0.2,583.6C2.1,587.3 7,599 11.6,599.8C16.1,600.6 24.7,591.3 27.8,588.4C30.8,585.6 28.9,584.9 29.8,582.6C30.7,580.2 32.1,577.2 33.4,574.2C34.6,571.3 36.1,567.9 37.1,564.7C38.2,561.6 39.2,558.6 39.7,555.4C40.3,552.2 40.4,548.9 40.4,545.4C40.5,542 40.3,538.1 40.1,534.7C40,531.2 39.7,527.7 39.7,524.9C39.6,522.2 41.7,522.1 39.8,518.3C37.9,514.5 32.9,503 28.3,502.2Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M371.7,502.2C376.3,501.4 384.8,510.7 387.8,513.7C390.8,516.7 388.9,517.5 389.8,520.1C390.7,522.6 392.2,525.9 393.4,529.1C394.6,532.3 396.1,535.9 397.2,539.1C398.2,542.4 399.2,545.5 399.7,548.6C400.3,551.8 400.3,554.9 400.4,558.1C400.5,561.4 400.2,565.1 400.1,568.3C400,571.5 399.7,574.8 399.6,577.3C399.6,579.9 401.6,579.8 399.8,583.6C397.9,587.3 393,599 388.4,599.8C383.9,600.6 375.3,591.3 372.2,588.4C369.2,585.6 371.1,584.9 370.2,582.6C369.3,580.2 367.9,577.2 366.6,574.2C365.4,571.3 363.9,567.9 362.9,564.7C361.8,561.6 360.8,558.6 360.3,555.4C359.7,552.2 359.6,548.9 359.6,545.4C359.5,542 359.7,538.1 359.9,534.7C360,531.2 360.3,527.7 360.3,524.9C360.4,522.2 358.3,522.1 360.2,518.3C362.1,514.5 367.1,503 371.7,502.2Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M30.2,530.1C28.2,531.4 28,537.6 28.1,539.8C28.2,542 29.7,542.1 30.7,543.6C31.8,545 33.2,546.9 34.4,548.6C35.5,550.3 36.9,552.3 37.8,553.9C38.7,555.4 39.3,556.7 39.8,558C40.3,559.2 40.4,560.1 40.6,561.4C40.8,562.7 40.9,564.4 41,565.8C41.1,567.3 41.1,568.9 41.1,570.2C41.1,571.5 40.2,572.2 41,573.7C41.8,575.2 44,578.9 45.7,579C47.4,579.1 50,575.6 51,574.3C52,573 51.2,572.7 51.5,571.4C51.7,570.1 52.2,568.4 52.5,566.7C52.8,564.9 53.1,562.8 53.1,560.7C53.1,558.6 52.8,556.2 52.2,554C51.6,551.8 50.4,549.6 49.3,547.5C48.2,545.3 46.8,543.1 45.6,541.2C44.4,539.2 43.1,537.2 42.1,535.7C41.2,534.2 41.9,533.1 39.9,532.2C37.9,531.3 32.2,528.9 30.2,530.1Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M369.8,530.1C371.8,531.4 372,537.6 371.9,539.8C371.8,542 370.3,542.1 369.3,543.6C368.2,545 366.8,546.9 365.6,548.6C364.5,550.3 363.1,552.3 362.2,553.9C361.3,555.4 360.7,556.7 360.2,558C359.7,559.2 359.6,560.1 359.4,561.4C359.2,562.7 359.1,564.4 359,565.8C358.9,567.3 358.9,568.9 358.9,570.2C358.9,571.5 359.8,572.2 359,573.7C358.2,575.2 356,578.9 354.3,579C352.6,579.1 350,575.6 349,574.3C348,573 348.8,572.7 348.5,571.4C348.3,570.1 347.8,568.4 347.5,566.7C347.2,564.9 346.9,562.8 346.9,560.7C346.9,558.6 347.2,556.2 347.8,554C348.4,551.8 349.6,549.6 350.7,547.5C351.8,545.3 353.2,543.1 354.4,541.2C355.6,539.2 356.9,537.2 357.9,535.7C358.8,534.2 358.1,533.1 360.1,532.2C362.1,531.3 367.8,528.9 369.8,530.1Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M160.3,412.1C147.3,411.3 126.2,440.5 119.1,448.7C111.9,456.9 118.1,456.2 117.2,461.3C116.3,466.4 114.9,472.9 113.7,479.5C112.5,486.1 111,493.6 110.1,500.8C109.2,508 108.4,515.3 108,522.7C107.7,530 107.9,537.3 108.1,545C108.3,552.6 108.9,560.8 109.3,568.7C109.7,576.6 110.2,584.8 110.5,592.5C110.8,600.2 110.6,607.7 111,614.9C111.4,622.1 111.7,628.9 112.7,635.6C113.6,642.3 115.4,648.7 116.8,655.2C118.1,661.7 119.9,668 120.9,674.4C122,680.8 122.7,687.3 123,693.8C123.3,700.3 122.9,706.8 122.6,713.3C122.3,719.8 121.8,726.1 121.4,732.5C121,738.9 120.5,745.3 120.2,751.9C120,758.6 119.5,764.9 120,772.2C120.5,779.6 121.5,787.7 123.1,796.1C124.6,804.4 127.1,814 129.1,822.3C131.1,830.7 133.7,839.4 135.1,846.2C136.6,852.9 134.5,857.1 138,862.8C141.5,868.5 150.4,880.5 156.4,880.4C162.4,880.3 170.7,867.9 174,862C177.3,856.2 174.9,852.1 176.1,845.3C177.3,838.5 179.5,829.7 181.1,821.2C182.8,812.8 184.9,803.1 186,794.7C187.2,786.2 187.9,778 188,770.6C188.1,763.1 187.3,756.7 186.7,750C186.1,743.4 185.1,737 184.4,730.7C183.6,724.3 182.7,718.2 182.1,711.9C181.6,705.6 180.9,699.3 181,693C181.1,686.7 181.7,680.3 182.7,674C183.6,667.7 185.4,661.5 186.8,655.2C188.1,648.9 189.9,642.6 190.9,636.1C192,629.5 192.5,622.9 193,615.9C193.5,608.8 193.5,601.4 194.1,593.8C194.6,586.3 195.5,578.3 196.2,570.5C197,562.8 197.9,554.9 198.5,547.5C199.1,540.1 199.8,533.1 200,526.1C200.2,519.1 200,512.3 199.8,505.4C199.6,498.4 199,491 198.6,484.5C198.1,478 197.5,471.4 197.3,466.2C197,461 203.1,462.3 196.9,453.3C190.8,444.2 173.2,412.8 160.3,412.1Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M239.7,412.1C252.7,411.3 273.8,440.5 280.9,448.7C288.1,456.9 281.9,456.2 282.8,461.3C283.7,466.4 285.1,472.9 286.3,479.5C287.5,486.1 289,493.6 289.9,500.8C290.8,508 291.6,515.3 292,522.7C292.3,530 292.1,537.3 291.9,545C291.7,552.6 291.1,560.8 290.7,568.7C290.3,576.6 289.8,584.8 289.5,592.5C289.2,600.2 289.4,607.7 289,614.9C288.6,622.1 288.3,628.9 287.3,635.6C286.4,642.3 284.6,648.7 283.3,655.2C281.9,661.7 280.1,668 279.1,674.4C278,680.8 277.3,687.3 277,693.8C276.7,700.3 277.1,706.8 277.4,713.3C277.7,719.8 278.2,726.1 278.6,732.5C279,738.9 279.5,745.3 279.8,751.9C280,758.6 280.5,764.9 280,772.2C279.5,779.6 278.5,787.7 276.9,796.1C275.4,804.4 272.9,814 270.9,822.3C268.9,830.7 266.3,839.4 264.9,846.2C263.4,852.9 265.5,857.1 262,862.8C258.5,868.5 249.6,880.5 243.6,880.4C237.6,880.3 229.3,867.9 226,862C222.7,856.2 225.1,852.1 223.9,845.3C222.7,838.5 220.5,829.7 218.9,821.2C217.2,812.8 215.1,803.1 214,794.7C212.8,786.2 212.1,778 212,770.6C211.9,763.1 212.7,756.7 213.3,750C213.9,743.4 214.9,737 215.6,730.7C216.4,724.3 217.3,718.2 217.9,711.9C218.4,705.6 219.1,699.3 219,693C218.9,686.7 218.3,680.3 217.3,674C216.4,667.7 214.6,661.5 213.3,655.2C211.9,648.9 210.1,642.6 209.1,636.1C208,629.5 207.5,622.9 207,615.9C206.5,608.8 206.5,601.4 205.9,593.8C205.4,586.3 204.5,578.3 203.8,570.5C203,562.8 202.1,554.9 201.5,547.5C200.9,540.1 200.2,533.1 200,526.1C199.8,519.1 200,512.3 200.2,505.4C200.4,498.4 201,491 201.4,484.5C201.9,478 202.5,471.4 202.7,466.2C203,461 196.9,462.3 203.1,453.3C209.2,444.2 226.8,412.8 239.7,412.1Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M158.9,856.2C153.4,853.9 139.7,863.3 135.4,865.9C131.1,868.4 134,869.4 133.3,871.5C132.5,873.7 131.6,876.5 130.8,878.8C130,881.1 128.9,883.9 128.3,885.3C127.7,886.8 127.2,887.2 127.3,887.4C127.5,887.7 129.1,886.7 129.3,887C129.5,887.3 129.3,888.5 128.7,889.3C128.1,890 126.9,891 125.7,891.7C124.6,892.3 123.9,890.8 121.8,893.2C119.7,895.6 112.5,902.6 113.2,906.2C114,909.8 123.7,913.2 126.2,914.8C128.7,916.3 127,915.1 128.2,915.4C129.5,915.8 131.4,916.6 133.8,916.8C136.2,916.9 139.4,917.4 142.5,916.3C145.6,915.2 149.9,912.7 152.7,910.2C155.4,907.6 157.1,904 158.8,901C160.6,898 161.9,894.9 163.2,892.1C164.5,889.4 165.7,886.4 166.6,884.4C167.5,882.3 169.9,884.4 168.6,879.7C167.3,875 164.5,858.5 158.9,856.2Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M241.1,856.2C246.6,853.9 260.3,863.3 264.6,865.9C268.9,868.4 266,869.4 266.7,871.5C267.5,873.7 268.4,876.5 269.2,878.8C270,881.1 271.1,883.9 271.7,885.3C272.3,886.8 272.8,887.2 272.7,887.4C272.5,887.7 270.9,886.7 270.7,887C270.5,887.3 270.7,888.5 271.3,889.3C271.9,890 273.1,891 274.3,891.7C275.4,892.3 276.1,890.8 278.2,893.2C280.3,895.6 287.5,902.6 286.8,906.2C286,909.8 276.3,913.2 273.8,914.8C271.3,916.3 273,915.1 271.8,915.4C270.5,915.8 268.6,916.6 266.2,916.8C263.8,916.9 260.6,917.4 257.5,916.3C254.4,915.2 250.1,912.7 247.3,910.2C244.6,907.6 242.9,904 241.2,901C239.4,898 238.1,894.9 236.8,892.1C235.5,889.4 234.3,886.4 233.4,884.4C232.5,882.3 230.1,884.4 231.4,879.7C232.7,875 235.5,858.5 241.1,856.2Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M200,95C192.3,95 180.9,112.6 177,118C173.1,123.4 176.8,123.7 176.5,127.6C176.3,131.6 175.8,137 175.5,141.7C175.2,146.4 174.7,151.9 174.5,155.8C174.2,159.8 169.7,159.5 174,165.5C178.3,171.4 191.3,191.5 200,191.5C208.7,191.5 221.7,171.4 226,165.5C230.3,159.5 225.8,159.8 225.5,155.8C225.3,151.9 224.8,146.4 224.5,141.7C224.2,137 223.7,131.6 223.5,127.6C223.2,123.7 226.9,123.4 223,118C219.1,112.6 207.7,95 200,95Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M179.3,148C168.4,149.8 163.3,155.1 154.9,158.6C146.4,162.1 135.8,164.6 128.6,168.9C121.4,173.2 115.7,177.2 111.6,184.4C107.6,191.6 104.7,202.2 104.1,211.9C103.5,221.7 105.4,232 107.9,242.9C110.4,253.8 115.1,265.5 119.2,277.3C123.2,289 128.2,301.1 132.3,313.4C136.4,325.7 140.8,339.8 143.6,351.2C146.4,362.7 148.9,372.7 149.2,382.2C149.6,391.7 148.3,399.7 145.5,408C142.7,416.3 135.1,424.9 132.3,432.1C129.5,439.2 126.7,444.7 128.6,451C130.4,457.3 131.7,464.8 143.6,469.9C155.5,475.1 190.6,480 200,482C209.4,484 190.6,484 200,482C209.4,480 244.5,475.1 256.4,469.9C268.3,464.8 269.6,457.3 271.4,451C273.3,444.7 270.5,439.2 267.7,432.1C264.9,424.9 257.3,416.3 254.5,408C251.7,399.7 250.4,391.7 250.8,382.2C251.1,372.7 253.6,362.7 256.4,351.2C259.2,339.8 263.6,325.7 267.7,313.4C271.8,301.1 276.8,289 280.8,277.3C284.9,265.5 289.6,253.8 292.1,242.9C294.6,232 296.5,221.7 295.9,211.9C295.3,202.2 292.4,191.6 288.4,184.4C284.3,177.2 278.6,173.2 271.4,168.9C264.2,164.6 253.6,162.1 245.1,158.6C236.7,155.1 231.6,149.8 220.7,148C209.7,146.2 190.3,146.2 179.3,148Z\" fill=\"url(#bmskin)\"/><path d=\"M109.3,167.4C98.4,165.7 77.8,188.3 71.4,194.7C65.1,201.1 71.1,201.3 71.2,205.9C71.3,210.5 71.8,216.4 72,222.2C72.2,228.1 72.6,234.7 72.5,240.7C72.4,246.8 71.8,252.7 71.3,258.6C70.7,264.5 69.8,270.2 69.2,276.1C68.6,281.9 68.2,288 67.7,293.7C67.2,299.4 66.7,305.2 66,310.5C65.3,315.7 64.4,320.7 63.5,325.3C62.6,329.9 61.6,333.9 60.5,338C59.5,342.2 58.5,346.1 57.3,350.4C56.1,354.7 54.9,359 53.5,363.7C52.1,368.3 50.4,373.3 48.9,378.5C47.3,383.7 45.8,389.1 44.3,394.7C42.8,400.3 41.5,406.3 40.1,412.1C38.7,417.9 37.4,423.9 35.9,429.5C34.5,435.1 33,440.5 31.6,445.7C30.3,451 28.9,455.9 27.8,460.9C26.6,465.9 25.7,471 24.8,475.9C23.8,480.7 23,485.5 22.1,490.1C21.2,494.7 20.2,499 19.3,503.4C18.4,507.8 17.5,512.1 16.9,516.4C16.3,520.6 16,525 15.6,528.8C15.3,532.7 15.2,536.4 14.9,539.4C14.6,542.3 13.2,543.8 14.1,546.6C15.1,549.3 18,555.4 20.6,555.9C23.2,556.3 28,551.7 29.9,549.4C31.7,547.1 30.9,545.1 31.6,542.2C32.3,539.3 33.4,535.8 34.4,532.2C35.4,528.5 36.5,524.5 37.6,520.5C38.6,516.6 39.5,512.6 40.7,508.6C41.9,504.6 43,500.5 44.6,496.3C46.1,492.1 47.9,487.7 49.7,483.1C51.5,478.6 53.5,473.9 55.3,469.1C57.1,464.3 58.7,459.4 60.4,454.3C62.1,449.1 63.7,443.8 65.6,438.3C67.5,432.9 69.6,427.2 71.7,421.6C73.7,416.1 75.9,410.4 77.8,405C79.7,399.7 81.4,394.3 83.1,389.5C84.9,384.7 86.4,380.6 88.2,376.3C90,372 92,368.2 93.9,363.8C95.8,359.5 97.9,355.2 99.7,350.4C101.4,345.5 103.1,340.2 104.5,334.7C105.9,329.2 107,323.1 108.1,317.2C109.2,311.3 110.3,305.2 111.3,299.3C112.3,293.4 113.3,287.4 114.2,281.8C115.1,276.1 115.6,271 116.7,265.4C117.9,259.9 119.2,254.2 121,248.5C122.7,242.8 125.2,236.7 127.3,231.3C129.3,225.8 131.7,220.4 133.2,216.1C134.8,211.8 140.6,213.4 136.6,205.3C132.6,197.2 120.2,169.2 109.3,167.4Z\" fill=\"url(#bmskin)\"/><path d=\"M290.7,167.4C301.6,165.7 322.2,188.3 328.6,194.7C334.9,201.1 328.9,201.3 328.8,205.9C328.7,210.5 328.2,216.4 328,222.2C327.8,228.1 327.4,234.7 327.5,240.7C327.6,246.8 328.2,252.7 328.7,258.6C329.3,264.5 330.2,270.2 330.8,276.1C331.4,281.9 331.8,288 332.3,293.7C332.8,299.4 333.3,305.2 334,310.5C334.7,315.7 335.6,320.7 336.5,325.3C337.4,329.9 338.4,333.9 339.5,338C340.5,342.2 341.5,346.1 342.7,350.4C343.9,354.7 345.1,359 346.5,363.7C347.9,368.3 349.6,373.3 351.1,378.5C352.7,383.7 354.2,389.1 355.7,394.7C357.2,400.3 358.5,406.3 359.9,412.1C361.3,417.9 362.6,423.9 364.1,429.5C365.5,435.1 367,440.5 368.4,445.7C369.7,451 371.1,455.9 372.2,460.9C373.4,465.9 374.3,471 375.2,475.9C376.2,480.7 377,485.5 377.9,490.1C378.8,494.7 379.8,499 380.7,503.4C381.6,507.8 382.5,512.1 383.1,516.4C383.7,520.6 384,525 384.4,528.8C384.7,532.7 384.8,536.4 385.1,539.4C385.4,542.3 386.8,543.8 385.9,546.6C384.9,549.3 382,555.4 379.4,555.9C376.8,556.3 372,551.7 370.1,549.4C368.3,547.1 369.1,545.1 368.4,542.2C367.7,539.3 366.6,535.8 365.6,532.2C364.6,528.5 363.5,524.5 362.4,520.5C361.4,516.6 360.5,512.6 359.3,508.6C358.1,504.6 357,500.5 355.4,496.3C353.9,492.1 352.1,487.7 350.3,483.1C348.5,478.6 346.5,473.9 344.7,469.1C342.9,464.3 341.3,459.4 339.6,454.3C337.9,449.1 336.3,443.8 334.4,438.3C332.5,432.9 330.4,427.2 328.3,421.6C326.3,416.1 324.1,410.4 322.2,405C320.3,399.7 318.6,394.3 316.9,389.5C315.1,384.7 313.6,380.6 311.8,376.3C310,372 308,368.2 306.1,363.8C304.2,359.5 302.1,355.2 300.3,350.4C298.6,345.5 296.9,340.2 295.5,334.7C294.1,329.2 293,323.1 291.9,317.2C290.8,311.3 289.7,305.2 288.7,299.3C287.7,293.4 286.7,287.4 285.8,281.8C284.9,276.1 284.4,271 283.3,265.4C282.1,259.9 280.8,254.2 279,248.5C277.3,242.8 274.8,236.7 272.7,231.3C270.7,225.8 268.3,220.4 266.8,216.1C265.2,211.8 259.4,213.4 263.4,205.3C267.4,197.2 279.8,169.2 290.7,167.4Z\" fill=\"url(#bmskin)\"/><path d=\"M28.3,502.2C23.7,501.4 15.2,510.7 12.2,513.7C9.2,516.7 11.1,517.5 10.2,520.1C9.3,522.6 7.8,525.9 6.6,529.1C5.4,532.3 3.9,535.9 2.8,539.1C1.8,542.4 0.8,545.5 0.3,548.6C-0.3,551.8 -0.3,554.9 -0.4,558.1C-0.5,561.4 -0.2,565.1 -0.1,568.3C0,571.5 0.3,574.8 0.4,577.3C0.4,579.9 -1.6,579.8 0.2,583.6C2.1,587.3 7,599 11.6,599.8C16.1,600.6 24.7,591.3 27.8,588.4C30.8,585.6 28.9,584.9 29.8,582.6C30.7,580.2 32.1,577.2 33.4,574.2C34.6,571.3 36.1,567.9 37.1,564.7C38.2,561.6 39.2,558.6 39.7,555.4C40.3,552.2 40.4,548.9 40.4,545.4C40.5,542 40.3,538.1 40.1,534.7C40,531.2 39.7,527.7 39.7,524.9C39.6,522.2 41.7,522.1 39.8,518.3C37.9,514.5 32.9,503 28.3,502.2Z\" fill=\"url(#bmskin)\"/><path d=\"M371.7,502.2C376.3,501.4 384.8,510.7 387.8,513.7C390.8,516.7 388.9,517.5 389.8,520.1C390.7,522.6 392.2,525.9 393.4,529.1C394.6,532.3 396.1,535.9 397.2,539.1C398.2,542.4 399.2,545.5 399.7,548.6C400.3,551.8 400.3,554.9 400.4,558.1C400.5,561.4 400.2,565.1 400.1,568.3C400,571.5 399.7,574.8 399.6,577.3C399.6,579.9 401.6,579.8 399.8,583.6C397.9,587.3 393,599 388.4,599.8C383.9,600.6 375.3,591.3 372.2,588.4C369.2,585.6 371.1,584.9 370.2,582.6C369.3,580.2 367.9,577.2 366.6,574.2C365.4,571.3 363.9,567.9 362.9,564.7C361.8,561.6 360.8,558.6 360.3,555.4C359.7,552.2 359.6,548.9 359.6,545.4C359.5,542 359.7,538.1 359.9,534.7C360,531.2 360.3,527.7 360.3,524.9C360.4,522.2 358.3,522.1 360.2,518.3C362.1,514.5 367.1,503 371.7,502.2Z\" fill=\"url(#bmskin)\"/><path d=\"M30.2,530.1C28.2,531.4 28,537.6 28.1,539.8C28.2,542 29.7,542.1 30.7,543.6C31.8,545 33.2,546.9 34.4,548.6C35.5,550.3 36.9,552.3 37.8,553.9C38.7,555.4 39.3,556.7 39.8,558C40.3,559.2 40.4,560.1 40.6,561.4C40.8,562.7 40.9,564.4 41,565.8C41.1,567.3 41.1,568.9 41.1,570.2C41.1,571.5 40.2,572.2 41,573.7C41.8,575.2 44,578.9 45.7,579C47.4,579.1 50,575.6 51,574.3C52,573 51.2,572.7 51.5,571.4C51.7,570.1 52.2,568.4 52.5,566.7C52.8,564.9 53.1,562.8 53.1,560.7C53.1,558.6 52.8,556.2 52.2,554C51.6,551.8 50.4,549.6 49.3,547.5C48.2,545.3 46.8,543.1 45.6,541.2C44.4,539.2 43.1,537.2 42.1,535.7C41.2,534.2 41.9,533.1 39.9,532.2C37.9,531.3 32.2,528.9 30.2,530.1Z\" fill=\"url(#bmskin)\"/><path d=\"M369.8,530.1C371.8,531.4 372,537.6 371.9,539.8C371.8,542 370.3,542.1 369.3,543.6C368.2,545 366.8,546.9 365.6,548.6C364.5,550.3 363.1,552.3 362.2,553.9C361.3,555.4 360.7,556.7 360.2,558C359.7,559.2 359.6,560.1 359.4,561.4C359.2,562.7 359.1,564.4 359,565.8C358.9,567.3 358.9,568.9 358.9,570.2C358.9,571.5 359.8,572.2 359,573.7C358.2,575.2 356,578.9 354.3,579C352.6,579.1 350,575.6 349,574.3C348,573 348.8,572.7 348.5,571.4C348.3,570.1 347.8,568.4 347.5,566.7C347.2,564.9 346.9,562.8 346.9,560.7C346.9,558.6 347.2,556.2 347.8,554C348.4,551.8 349.6,549.6 350.7,547.5C351.8,545.3 353.2,543.1 354.4,541.2C355.6,539.2 356.9,537.2 357.9,535.7C358.8,534.2 358.1,533.1 360.1,532.2C362.1,531.3 367.8,528.9 369.8,530.1Z\" fill=\"url(#bmskin)\"/><path d=\"M160.3,412.1C147.3,411.3 126.2,440.5 119.1,448.7C111.9,456.9 118.1,456.2 117.2,461.3C116.3,466.4 114.9,472.9 113.7,479.5C112.5,486.1 111,493.6 110.1,500.8C109.2,508 108.4,515.3 108,522.7C107.7,530 107.9,537.3 108.1,545C108.3,552.6 108.9,560.8 109.3,568.7C109.7,576.6 110.2,584.8 110.5,592.5C110.8,600.2 110.6,607.7 111,614.9C111.4,622.1 111.7,628.9 112.7,635.6C113.6,642.3 115.4,648.7 116.8,655.2C118.1,661.7 119.9,668 120.9,674.4C122,680.8 122.7,687.3 123,693.8C123.3,700.3 122.9,706.8 122.6,713.3C122.3,719.8 121.8,726.1 121.4,732.5C121,738.9 120.5,745.3 120.2,751.9C120,758.6 119.5,764.9 120,772.2C120.5,779.6 121.5,787.7 123.1,796.1C124.6,804.4 127.1,814 129.1,822.3C131.1,830.7 133.7,839.4 135.1,846.2C136.6,852.9 134.5,857.1 138,862.8C141.5,868.5 150.4,880.5 156.4,880.4C162.4,880.3 170.7,867.9 174,862C177.3,856.2 174.9,852.1 176.1,845.3C177.3,838.5 179.5,829.7 181.1,821.2C182.8,812.8 184.9,803.1 186,794.7C187.2,786.2 187.9,778 188,770.6C188.1,763.1 187.3,756.7 186.7,750C186.1,743.4 185.1,737 184.4,730.7C183.6,724.3 182.7,718.2 182.1,711.9C181.6,705.6 180.9,699.3 181,693C181.1,686.7 181.7,680.3 182.7,674C183.6,667.7 185.4,661.5 186.8,655.2C188.1,648.9 189.9,642.6 190.9,636.1C192,629.5 192.5,622.9 193,615.9C193.5,608.8 193.5,601.4 194.1,593.8C194.6,586.3 195.5,578.3 196.2,570.5C197,562.8 197.9,554.9 198.5,547.5C199.1,540.1 199.8,533.1 200,526.1C200.2,519.1 200,512.3 199.8,505.4C199.6,498.4 199,491 198.6,484.5C198.1,478 197.5,471.4 197.3,466.2C197,461 203.1,462.3 196.9,453.3C190.8,444.2 173.2,412.8 160.3,412.1Z\" fill=\"url(#bmskin)\"/><path d=\"M239.7,412.1C252.7,411.3 273.8,440.5 280.9,448.7C288.1,456.9 281.9,456.2 282.8,461.3C283.7,466.4 285.1,472.9 286.3,479.5C287.5,486.1 289,493.6 289.9,500.8C290.8,508 291.6,515.3 292,522.7C292.3,530 292.1,537.3 291.9,545C291.7,552.6 291.1,560.8 290.7,568.7C290.3,576.6 289.8,584.8 289.5,592.5C289.2,600.2 289.4,607.7 289,614.9C288.6,622.1 288.3,628.9 287.3,635.6C286.4,642.3 284.6,648.7 283.3,655.2C281.9,661.7 280.1,668 279.1,674.4C278,680.8 277.3,687.3 277,693.8C276.7,700.3 277.1,706.8 277.4,713.3C277.7,719.8 278.2,726.1 278.6,732.5C279,738.9 279.5,745.3 279.8,751.9C280,758.6 280.5,764.9 280,772.2C279.5,779.6 278.5,787.7 276.9,796.1C275.4,804.4 272.9,814 270.9,822.3C268.9,830.7 266.3,839.4 264.9,846.2C263.4,852.9 265.5,857.1 262,862.8C258.5,868.5 249.6,880.5 243.6,880.4C237.6,880.3 229.3,867.9 226,862C222.7,856.2 225.1,852.1 223.9,845.3C222.7,838.5 220.5,829.7 218.9,821.2C217.2,812.8 215.1,803.1 214,794.7C212.8,786.2 212.1,778 212,770.6C211.9,763.1 212.7,756.7 213.3,750C213.9,743.4 214.9,737 215.6,730.7C216.4,724.3 217.3,718.2 217.9,711.9C218.4,705.6 219.1,699.3 219,693C218.9,686.7 218.3,680.3 217.3,674C216.4,667.7 214.6,661.5 213.3,655.2C211.9,648.9 210.1,642.6 209.1,636.1C208,629.5 207.5,622.9 207,615.9C206.5,608.8 206.5,601.4 205.9,593.8C205.4,586.3 204.5,578.3 203.8,570.5C203,562.8 202.1,554.9 201.5,547.5C200.9,540.1 200.2,533.1 200,526.1C199.8,519.1 200,512.3 200.2,505.4C200.4,498.4 201,491 201.4,484.5C201.9,478 202.5,471.4 202.7,466.2C203,461 196.9,462.3 203.1,453.3C209.2,444.2 226.8,412.8 239.7,412.1Z\" fill=\"url(#bmskin)\"/><path d=\"M158.9,856.2C153.4,853.9 139.7,863.3 135.4,865.9C131.1,868.4 134,869.4 133.3,871.5C132.5,873.7 131.6,876.5 130.8,878.8C130,881.1 128.9,883.9 128.3,885.3C127.7,886.8 127.2,887.2 127.3,887.4C127.5,887.7 129.1,886.7 129.3,887C129.5,887.3 129.3,888.5 128.7,889.3C128.1,890 126.9,891 125.7,891.7C124.6,892.3 123.9,890.8 121.8,893.2C119.7,895.6 112.5,902.6 113.2,906.2C114,909.8 123.7,913.2 126.2,914.8C128.7,916.3 127,915.1 128.2,915.4C129.5,915.8 131.4,916.6 133.8,916.8C136.2,916.9 139.4,917.4 142.5,916.3C145.6,915.2 149.9,912.7 152.7,910.2C155.4,907.6 157.1,904 158.8,901C160.6,898 161.9,894.9 163.2,892.1C164.5,889.4 165.7,886.4 166.6,884.4C167.5,882.3 169.9,884.4 168.6,879.7C167.3,875 164.5,858.5 158.9,856.2Z\" fill=\"url(#bmskin)\"/><path d=\"M241.1,856.2C246.6,853.9 260.3,863.3 264.6,865.9C268.9,868.4 266,869.4 266.7,871.5C267.5,873.7 268.4,876.5 269.2,878.8C270,881.1 271.1,883.9 271.7,885.3C272.3,886.8 272.8,887.2 272.7,887.4C272.5,887.7 270.9,886.7 270.7,887C270.5,887.3 270.7,888.5 271.3,889.3C271.9,890 273.1,891 274.3,891.7C275.4,892.3 276.1,890.8 278.2,893.2C280.3,895.6 287.5,902.6 286.8,906.2C286,909.8 276.3,913.2 273.8,914.8C271.3,916.3 273,915.1 271.8,915.4C270.5,915.8 268.6,916.6 266.2,916.8C263.8,916.9 260.6,917.4 257.5,916.3C254.4,915.2 250.1,912.7 247.3,910.2C244.6,907.6 242.9,904 241.2,901C239.4,898 238.1,894.9 236.8,892.1C235.5,889.4 234.3,886.4 233.4,884.4C232.5,882.3 230.1,884.4 231.4,879.7C232.7,875 235.5,858.5 241.1,856.2Z\" fill=\"url(#bmskin)\"/><path d=\"M200,95C192.3,95 180.9,112.6 177,118C173.1,123.4 176.8,123.7 176.5,127.6C176.3,131.6 175.8,137 175.5,141.7C175.2,146.4 174.7,151.9 174.5,155.8C174.2,159.8 169.7,159.5 174,165.5C178.3,171.4 191.3,191.5 200,191.5C208.7,191.5 221.7,171.4 226,165.5C230.3,159.5 225.8,159.8 225.5,155.8C225.3,151.9 224.8,146.4 224.5,141.7C224.2,137 223.7,131.6 223.5,127.6C223.2,123.7 226.9,123.4 223,118C219.1,112.6 207.7,95 200,95Z\" fill=\"url(#bmskin)\"/><ellipse cx=\"200\" cy=\"78\" rx=\"45\" ry=\"57\" fill=\"url(#bmskin)\" stroke=\"#1b1731\" stroke-width=\"3.5\"/><ellipse cx=\"155\" cy=\"86\" rx=\"7\" ry=\"13\" fill=\"url(#bmskin)\" stroke=\"#1b1731\" stroke-width=\"3\"/><ellipse cx=\"245\" cy=\"86\" rx=\"7\" ry=\"13\" fill=\"url(#bmskin)\" stroke=\"#1b1731\" stroke-width=\"3\"/><path d=\"M166,66 Q178,56 192,66\" fill=\"none\" stroke=\"#1b1731\" stroke-width=\"3.5\" stroke-linecap=\"round\"/><path d=\"M208,66 Q222,56 234,66\" fill=\"none\" stroke=\"#1b1731\" stroke-width=\"3.5\" stroke-linecap=\"round\"/><ellipse cx=\"180\" cy=\"82\" rx=\"9\" ry=\"10\" fill=\"#fff\" stroke=\"#1b1731\" stroke-width=\"2.4\"/><ellipse cx=\"220\" cy=\"82\" rx=\"9\" ry=\"10\" fill=\"#fff\" stroke=\"#1b1731\" stroke-width=\"2.4\"/><circle cx=\"182\" cy=\"84\" r=\"4.6\" fill=\"#1b1731\"/><circle cx=\"218\" cy=\"84\" r=\"4.6\" fill=\"#1b1731\"/><circle cx=\"184\" cy=\"82\" r=\"1.5\" fill=\"#fff\"/><circle cx=\"220\" cy=\"82\" r=\"1.5\" fill=\"#fff\"/><path d=\"M200,86 Q196,100 202,104\" fill=\"none\" stroke=\"#1b1731\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><path d=\"M184,116 Q200,124 216,116\" fill=\"none\" stroke=\"#1b1731\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M156,70 Q154,26 200,22 Q246,26 244,70 Q232,44 200,42 Q168,44 156,70Z\" fill=\"#4a4566\" stroke=\"#1b1731\" stroke-width=\"3\"/>", "back": "<path d=\"M179.3,148C168.4,149.8 163.3,155.1 154.9,158.6C146.4,162.1 135.8,164.6 128.6,168.9C121.4,173.2 115.7,177.2 111.6,184.4C107.6,191.6 104.7,202.2 104.1,211.9C103.5,221.7 105.4,232 107.9,242.9C110.4,253.8 115.1,265.5 119.2,277.3C123.2,289 128.2,301.1 132.3,313.4C136.4,325.7 140.8,339.8 143.6,351.2C146.4,362.7 148.9,372.7 149.2,382.2C149.6,391.7 148.3,399.7 145.5,408C142.7,416.3 135.1,424.9 132.3,432.1C129.5,439.2 126.7,444.7 128.6,451C130.4,457.3 131.7,464.8 143.6,469.9C155.5,475.1 190.6,480 200,482C209.4,484 190.6,484 200,482C209.4,480 244.5,475.1 256.4,469.9C268.3,464.8 269.6,457.3 271.4,451C273.3,444.7 270.5,439.2 267.7,432.1C264.9,424.9 257.3,416.3 254.5,408C251.7,399.7 250.4,391.7 250.8,382.2C251.1,372.7 253.6,362.7 256.4,351.2C259.2,339.8 263.6,325.7 267.7,313.4C271.8,301.1 276.8,289 280.8,277.3C284.9,265.5 289.6,253.8 292.1,242.9C294.6,232 296.5,221.7 295.9,211.9C295.3,202.2 292.4,191.6 288.4,184.4C284.3,177.2 278.6,173.2 271.4,168.9C264.2,164.6 253.6,162.1 245.1,158.6C236.7,155.1 231.6,149.8 220.7,148C209.7,146.2 190.3,146.2 179.3,148Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M109.3,167.4C98.4,165.7 77.8,188.3 71.4,194.7C65.1,201.1 71.1,201.3 71.2,205.9C71.3,210.5 71.8,216.4 72,222.2C72.2,228.1 72.6,234.7 72.5,240.7C72.4,246.8 71.8,252.7 71.3,258.6C70.7,264.5 69.8,270.2 69.2,276.1C68.6,281.9 68.2,288 67.7,293.7C67.2,299.4 66.7,305.2 66,310.5C65.3,315.7 64.4,320.7 63.5,325.3C62.6,329.9 61.6,333.9 60.5,338C59.5,342.2 58.5,346.1 57.3,350.4C56.1,354.7 54.9,359 53.5,363.7C52.1,368.3 50.4,373.3 48.9,378.5C47.3,383.7 45.8,389.1 44.3,394.7C42.8,400.3 41.5,406.3 40.1,412.1C38.7,417.9 37.4,423.9 35.9,429.5C34.5,435.1 33,440.5 31.6,445.7C30.3,451 28.9,455.9 27.8,460.9C26.6,465.9 25.7,471 24.8,475.9C23.8,480.7 23,485.5 22.1,490.1C21.2,494.7 20.2,499 19.3,503.4C18.4,507.8 17.5,512.1 16.9,516.4C16.3,520.6 16,525 15.6,528.8C15.3,532.7 15.2,536.4 14.9,539.4C14.6,542.3 13.2,543.8 14.1,546.6C15.1,549.3 18,555.4 20.6,555.9C23.2,556.3 28,551.7 29.9,549.4C31.7,547.1 30.9,545.1 31.6,542.2C32.3,539.3 33.4,535.8 34.4,532.2C35.4,528.5 36.5,524.5 37.6,520.5C38.6,516.6 39.5,512.6 40.7,508.6C41.9,504.6 43,500.5 44.6,496.3C46.1,492.1 47.9,487.7 49.7,483.1C51.5,478.6 53.5,473.9 55.3,469.1C57.1,464.3 58.7,459.4 60.4,454.3C62.1,449.1 63.7,443.8 65.6,438.3C67.5,432.9 69.6,427.2 71.7,421.6C73.7,416.1 75.9,410.4 77.8,405C79.7,399.7 81.4,394.3 83.1,389.5C84.9,384.7 86.4,380.6 88.2,376.3C90,372 92,368.2 93.9,363.8C95.8,359.5 97.9,355.2 99.7,350.4C101.4,345.5 103.1,340.2 104.5,334.7C105.9,329.2 107,323.1 108.1,317.2C109.2,311.3 110.3,305.2 111.3,299.3C112.3,293.4 113.3,287.4 114.2,281.8C115.1,276.1 115.6,271 116.7,265.4C117.9,259.9 119.2,254.2 121,248.5C122.7,242.8 125.2,236.7 127.3,231.3C129.3,225.8 131.7,220.4 133.2,216.1C134.8,211.8 140.6,213.4 136.6,205.3C132.6,197.2 120.2,169.2 109.3,167.4Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M290.7,167.4C301.6,165.7 322.2,188.3 328.6,194.7C334.9,201.1 328.9,201.3 328.8,205.9C328.7,210.5 328.2,216.4 328,222.2C327.8,228.1 327.4,234.7 327.5,240.7C327.6,246.8 328.2,252.7 328.7,258.6C329.3,264.5 330.2,270.2 330.8,276.1C331.4,281.9 331.8,288 332.3,293.7C332.8,299.4 333.3,305.2 334,310.5C334.7,315.7 335.6,320.7 336.5,325.3C337.4,329.9 338.4,333.9 339.5,338C340.5,342.2 341.5,346.1 342.7,350.4C343.9,354.7 345.1,359 346.5,363.7C347.9,368.3 349.6,373.3 351.1,378.5C352.7,383.7 354.2,389.1 355.7,394.7C357.2,400.3 358.5,406.3 359.9,412.1C361.3,417.9 362.6,423.9 364.1,429.5C365.5,435.1 367,440.5 368.4,445.7C369.7,451 371.1,455.9 372.2,460.9C373.4,465.9 374.3,471 375.2,475.9C376.2,480.7 377,485.5 377.9,490.1C378.8,494.7 379.8,499 380.7,503.4C381.6,507.8 382.5,512.1 383.1,516.4C383.7,520.6 384,525 384.4,528.8C384.7,532.7 384.8,536.4 385.1,539.4C385.4,542.3 386.8,543.8 385.9,546.6C384.9,549.3 382,555.4 379.4,555.9C376.8,556.3 372,551.7 370.1,549.4C368.3,547.1 369.1,545.1 368.4,542.2C367.7,539.3 366.6,535.8 365.6,532.2C364.6,528.5 363.5,524.5 362.4,520.5C361.4,516.6 360.5,512.6 359.3,508.6C358.1,504.6 357,500.5 355.4,496.3C353.9,492.1 352.1,487.7 350.3,483.1C348.5,478.6 346.5,473.9 344.7,469.1C342.9,464.3 341.3,459.4 339.6,454.3C337.9,449.1 336.3,443.8 334.4,438.3C332.5,432.9 330.4,427.2 328.3,421.6C326.3,416.1 324.1,410.4 322.2,405C320.3,399.7 318.6,394.3 316.9,389.5C315.1,384.7 313.6,380.6 311.8,376.3C310,372 308,368.2 306.1,363.8C304.2,359.5 302.1,355.2 300.3,350.4C298.6,345.5 296.9,340.2 295.5,334.7C294.1,329.2 293,323.1 291.9,317.2C290.8,311.3 289.7,305.2 288.7,299.3C287.7,293.4 286.7,287.4 285.8,281.8C284.9,276.1 284.4,271 283.3,265.4C282.1,259.9 280.8,254.2 279,248.5C277.3,242.8 274.8,236.7 272.7,231.3C270.7,225.8 268.3,220.4 266.8,216.1C265.2,211.8 259.4,213.4 263.4,205.3C267.4,197.2 279.8,169.2 290.7,167.4Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M28.3,502.2C23.7,501.4 15.2,510.7 12.2,513.7C9.2,516.7 11.1,517.5 10.2,520.1C9.3,522.6 7.8,525.9 6.6,529.1C5.4,532.3 3.9,535.9 2.8,539.1C1.8,542.4 0.8,545.5 0.3,548.6C-0.3,551.8 -0.3,554.9 -0.4,558.1C-0.5,561.4 -0.2,565.1 -0.1,568.3C0,571.5 0.3,574.8 0.4,577.3C0.4,579.9 -1.6,579.8 0.2,583.6C2.1,587.3 7,599 11.6,599.8C16.1,600.6 24.7,591.3 27.8,588.4C30.8,585.6 28.9,584.9 29.8,582.6C30.7,580.2 32.1,577.2 33.4,574.2C34.6,571.3 36.1,567.9 37.1,564.7C38.2,561.6 39.2,558.6 39.7,555.4C40.3,552.2 40.4,548.9 40.4,545.4C40.5,542 40.3,538.1 40.1,534.7C40,531.2 39.7,527.7 39.7,524.9C39.6,522.2 41.7,522.1 39.8,518.3C37.9,514.5 32.9,503 28.3,502.2Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M371.7,502.2C376.3,501.4 384.8,510.7 387.8,513.7C390.8,516.7 388.9,517.5 389.8,520.1C390.7,522.6 392.2,525.9 393.4,529.1C394.6,532.3 396.1,535.9 397.2,539.1C398.2,542.4 399.2,545.5 399.7,548.6C400.3,551.8 400.3,554.9 400.4,558.1C400.5,561.4 400.2,565.1 400.1,568.3C400,571.5 399.7,574.8 399.6,577.3C399.6,579.9 401.6,579.8 399.8,583.6C397.9,587.3 393,599 388.4,599.8C383.9,600.6 375.3,591.3 372.2,588.4C369.2,585.6 371.1,584.9 370.2,582.6C369.3,580.2 367.9,577.2 366.6,574.2C365.4,571.3 363.9,567.9 362.9,564.7C361.8,561.6 360.8,558.6 360.3,555.4C359.7,552.2 359.6,548.9 359.6,545.4C359.5,542 359.7,538.1 359.9,534.7C360,531.2 360.3,527.7 360.3,524.9C360.4,522.2 358.3,522.1 360.2,518.3C362.1,514.5 367.1,503 371.7,502.2Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M30.2,530.1C28.2,531.4 28,537.6 28.1,539.8C28.2,542 29.7,542.1 30.7,543.6C31.8,545 33.2,546.9 34.4,548.6C35.5,550.3 36.9,552.3 37.8,553.9C38.7,555.4 39.3,556.7 39.8,558C40.3,559.2 40.4,560.1 40.6,561.4C40.8,562.7 40.9,564.4 41,565.8C41.1,567.3 41.1,568.9 41.1,570.2C41.1,571.5 40.2,572.2 41,573.7C41.8,575.2 44,578.9 45.7,579C47.4,579.1 50,575.6 51,574.3C52,573 51.2,572.7 51.5,571.4C51.7,570.1 52.2,568.4 52.5,566.7C52.8,564.9 53.1,562.8 53.1,560.7C53.1,558.6 52.8,556.2 52.2,554C51.6,551.8 50.4,549.6 49.3,547.5C48.2,545.3 46.8,543.1 45.6,541.2C44.4,539.2 43.1,537.2 42.1,535.7C41.2,534.2 41.9,533.1 39.9,532.2C37.9,531.3 32.2,528.9 30.2,530.1Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M369.8,530.1C371.8,531.4 372,537.6 371.9,539.8C371.8,542 370.3,542.1 369.3,543.6C368.2,545 366.8,546.9 365.6,548.6C364.5,550.3 363.1,552.3 362.2,553.9C361.3,555.4 360.7,556.7 360.2,558C359.7,559.2 359.6,560.1 359.4,561.4C359.2,562.7 359.1,564.4 359,565.8C358.9,567.3 358.9,568.9 358.9,570.2C358.9,571.5 359.8,572.2 359,573.7C358.2,575.2 356,578.9 354.3,579C352.6,579.1 350,575.6 349,574.3C348,573 348.8,572.7 348.5,571.4C348.3,570.1 347.8,568.4 347.5,566.7C347.2,564.9 346.9,562.8 346.9,560.7C346.9,558.6 347.2,556.2 347.8,554C348.4,551.8 349.6,549.6 350.7,547.5C351.8,545.3 353.2,543.1 354.4,541.2C355.6,539.2 356.9,537.2 357.9,535.7C358.8,534.2 358.1,533.1 360.1,532.2C362.1,531.3 367.8,528.9 369.8,530.1Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M160.3,412.1C147.3,411.3 126.2,440.5 119.1,448.7C111.9,456.9 118.1,456.2 117.2,461.3C116.3,466.4 114.9,472.9 113.7,479.5C112.5,486.1 111,493.6 110.1,500.8C109.2,508 108.4,515.3 108,522.7C107.7,530 107.9,537.3 108.1,545C108.3,552.6 108.9,560.8 109.3,568.7C109.7,576.6 110.2,584.8 110.5,592.5C110.8,600.2 110.6,607.7 111,614.9C111.4,622.1 111.7,628.9 112.7,635.6C113.6,642.3 115.4,648.7 116.8,655.2C118.1,661.7 119.9,668 120.9,674.4C122,680.8 122.7,687.3 123,693.8C123.3,700.3 122.9,706.8 122.6,713.3C122.3,719.8 121.8,726.1 121.4,732.5C121,738.9 120.5,745.3 120.2,751.9C120,758.6 119.5,764.9 120,772.2C120.5,779.6 121.5,787.7 123.1,796.1C124.6,804.4 127.1,814 129.1,822.3C131.1,830.7 133.7,839.4 135.1,846.2C136.6,852.9 134.5,857.1 138,862.8C141.5,868.5 150.4,880.5 156.4,880.4C162.4,880.3 170.7,867.9 174,862C177.3,856.2 174.9,852.1 176.1,845.3C177.3,838.5 179.5,829.7 181.1,821.2C182.8,812.8 184.9,803.1 186,794.7C187.2,786.2 187.9,778 188,770.6C188.1,763.1 187.3,756.7 186.7,750C186.1,743.4 185.1,737 184.4,730.7C183.6,724.3 182.7,718.2 182.1,711.9C181.6,705.6 180.9,699.3 181,693C181.1,686.7 181.7,680.3 182.7,674C183.6,667.7 185.4,661.5 186.8,655.2C188.1,648.9 189.9,642.6 190.9,636.1C192,629.5 192.5,622.9 193,615.9C193.5,608.8 193.5,601.4 194.1,593.8C194.6,586.3 195.5,578.3 196.2,570.5C197,562.8 197.9,554.9 198.5,547.5C199.1,540.1 199.8,533.1 200,526.1C200.2,519.1 200,512.3 199.8,505.4C199.6,498.4 199,491 198.6,484.5C198.1,478 197.5,471.4 197.3,466.2C197,461 203.1,462.3 196.9,453.3C190.8,444.2 173.2,412.8 160.3,412.1Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M239.7,412.1C252.7,411.3 273.8,440.5 280.9,448.7C288.1,456.9 281.9,456.2 282.8,461.3C283.7,466.4 285.1,472.9 286.3,479.5C287.5,486.1 289,493.6 289.9,500.8C290.8,508 291.6,515.3 292,522.7C292.3,530 292.1,537.3 291.9,545C291.7,552.6 291.1,560.8 290.7,568.7C290.3,576.6 289.8,584.8 289.5,592.5C289.2,600.2 289.4,607.7 289,614.9C288.6,622.1 288.3,628.9 287.3,635.6C286.4,642.3 284.6,648.7 283.3,655.2C281.9,661.7 280.1,668 279.1,674.4C278,680.8 277.3,687.3 277,693.8C276.7,700.3 277.1,706.8 277.4,713.3C277.7,719.8 278.2,726.1 278.6,732.5C279,738.9 279.5,745.3 279.8,751.9C280,758.6 280.5,764.9 280,772.2C279.5,779.6 278.5,787.7 276.9,796.1C275.4,804.4 272.9,814 270.9,822.3C268.9,830.7 266.3,839.4 264.9,846.2C263.4,852.9 265.5,857.1 262,862.8C258.5,868.5 249.6,880.5 243.6,880.4C237.6,880.3 229.3,867.9 226,862C222.7,856.2 225.1,852.1 223.9,845.3C222.7,838.5 220.5,829.7 218.9,821.2C217.2,812.8 215.1,803.1 214,794.7C212.8,786.2 212.1,778 212,770.6C211.9,763.1 212.7,756.7 213.3,750C213.9,743.4 214.9,737 215.6,730.7C216.4,724.3 217.3,718.2 217.9,711.9C218.4,705.6 219.1,699.3 219,693C218.9,686.7 218.3,680.3 217.3,674C216.4,667.7 214.6,661.5 213.3,655.2C211.9,648.9 210.1,642.6 209.1,636.1C208,629.5 207.5,622.9 207,615.9C206.5,608.8 206.5,601.4 205.9,593.8C205.4,586.3 204.5,578.3 203.8,570.5C203,562.8 202.1,554.9 201.5,547.5C200.9,540.1 200.2,533.1 200,526.1C199.8,519.1 200,512.3 200.2,505.4C200.4,498.4 201,491 201.4,484.5C201.9,478 202.5,471.4 202.7,466.2C203,461 196.9,462.3 203.1,453.3C209.2,444.2 226.8,412.8 239.7,412.1Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M158.9,856.2C153.4,853.9 139.7,863.3 135.4,865.9C131.1,868.4 134,869.4 133.3,871.5C132.5,873.7 131.6,876.5 130.8,878.8C130,881.1 128.9,883.9 128.3,885.3C127.7,886.8 127.2,887.2 127.3,887.4C127.5,887.7 129.1,886.7 129.3,887C129.5,887.3 129.3,888.5 128.7,889.3C128.1,890 126.9,891 125.7,891.7C124.6,892.3 123.9,890.8 121.8,893.2C119.7,895.6 112.5,902.6 113.2,906.2C114,909.8 123.7,913.2 126.2,914.8C128.7,916.3 127,915.1 128.2,915.4C129.5,915.8 131.4,916.6 133.8,916.8C136.2,916.9 139.4,917.4 142.5,916.3C145.6,915.2 149.9,912.7 152.7,910.2C155.4,907.6 157.1,904 158.8,901C160.6,898 161.9,894.9 163.2,892.1C164.5,889.4 165.7,886.4 166.6,884.4C167.5,882.3 169.9,884.4 168.6,879.7C167.3,875 164.5,858.5 158.9,856.2Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M241.1,856.2C246.6,853.9 260.3,863.3 264.6,865.9C268.9,868.4 266,869.4 266.7,871.5C267.5,873.7 268.4,876.5 269.2,878.8C270,881.1 271.1,883.9 271.7,885.3C272.3,886.8 272.8,887.2 272.7,887.4C272.5,887.7 270.9,886.7 270.7,887C270.5,887.3 270.7,888.5 271.3,889.3C271.9,890 273.1,891 274.3,891.7C275.4,892.3 276.1,890.8 278.2,893.2C280.3,895.6 287.5,902.6 286.8,906.2C286,909.8 276.3,913.2 273.8,914.8C271.3,916.3 273,915.1 271.8,915.4C270.5,915.8 268.6,916.6 266.2,916.8C263.8,916.9 260.6,917.4 257.5,916.3C254.4,915.2 250.1,912.7 247.3,910.2C244.6,907.6 242.9,904 241.2,901C239.4,898 238.1,894.9 236.8,892.1C235.5,889.4 234.3,886.4 233.4,884.4C232.5,882.3 230.1,884.4 231.4,879.7C232.7,875 235.5,858.5 241.1,856.2Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M200,95C192.3,95 180.9,112.6 177,118C173.1,123.4 176.8,123.7 176.5,127.6C176.3,131.6 175.8,137 175.5,141.7C175.2,146.4 174.7,151.9 174.5,155.8C174.2,159.8 169.7,159.5 174,165.5C178.3,171.4 191.3,191.5 200,191.5C208.7,191.5 221.7,171.4 226,165.5C230.3,159.5 225.8,159.8 225.5,155.8C225.3,151.9 224.8,146.4 224.5,141.7C224.2,137 223.7,131.6 223.5,127.6C223.2,123.7 226.9,123.4 223,118C219.1,112.6 207.7,95 200,95Z\" fill=\"#1b1731\" stroke=\"#1b1731\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M179.3,148C168.4,149.8 163.3,155.1 154.9,158.6C146.4,162.1 135.8,164.6 128.6,168.9C121.4,173.2 115.7,177.2 111.6,184.4C107.6,191.6 104.7,202.2 104.1,211.9C103.5,221.7 105.4,232 107.9,242.9C110.4,253.8 115.1,265.5 119.2,277.3C123.2,289 128.2,301.1 132.3,313.4C136.4,325.7 140.8,339.8 143.6,351.2C146.4,362.7 148.9,372.7 149.2,382.2C149.6,391.7 148.3,399.7 145.5,408C142.7,416.3 135.1,424.9 132.3,432.1C129.5,439.2 126.7,444.7 128.6,451C130.4,457.3 131.7,464.8 143.6,469.9C155.5,475.1 190.6,480 200,482C209.4,484 190.6,484 200,482C209.4,480 244.5,475.1 256.4,469.9C268.3,464.8 269.6,457.3 271.4,451C273.3,444.7 270.5,439.2 267.7,432.1C264.9,424.9 257.3,416.3 254.5,408C251.7,399.7 250.4,391.7 250.8,382.2C251.1,372.7 253.6,362.7 256.4,351.2C259.2,339.8 263.6,325.7 267.7,313.4C271.8,301.1 276.8,289 280.8,277.3C284.9,265.5 289.6,253.8 292.1,242.9C294.6,232 296.5,221.7 295.9,211.9C295.3,202.2 292.4,191.6 288.4,184.4C284.3,177.2 278.6,173.2 271.4,168.9C264.2,164.6 253.6,162.1 245.1,158.6C236.7,155.1 231.6,149.8 220.7,148C209.7,146.2 190.3,146.2 179.3,148Z\" fill=\"url(#bmskin)\"/><path d=\"M109.3,167.4C98.4,165.7 77.8,188.3 71.4,194.7C65.1,201.1 71.1,201.3 71.2,205.9C71.3,210.5 71.8,216.4 72,222.2C72.2,228.1 72.6,234.7 72.5,240.7C72.4,246.8 71.8,252.7 71.3,258.6C70.7,264.5 69.8,270.2 69.2,276.1C68.6,281.9 68.2,288 67.7,293.7C67.2,299.4 66.7,305.2 66,310.5C65.3,315.7 64.4,320.7 63.5,325.3C62.6,329.9 61.6,333.9 60.5,338C59.5,342.2 58.5,346.1 57.3,350.4C56.1,354.7 54.9,359 53.5,363.7C52.1,368.3 50.4,373.3 48.9,378.5C47.3,383.7 45.8,389.1 44.3,394.7C42.8,400.3 41.5,406.3 40.1,412.1C38.7,417.9 37.4,423.9 35.9,429.5C34.5,435.1 33,440.5 31.6,445.7C30.3,451 28.9,455.9 27.8,460.9C26.6,465.9 25.7,471 24.8,475.9C23.8,480.7 23,485.5 22.1,490.1C21.2,494.7 20.2,499 19.3,503.4C18.4,507.8 17.5,512.1 16.9,516.4C16.3,520.6 16,525 15.6,528.8C15.3,532.7 15.2,536.4 14.9,539.4C14.6,542.3 13.2,543.8 14.1,546.6C15.1,549.3 18,555.4 20.6,555.9C23.2,556.3 28,551.7 29.9,549.4C31.7,547.1 30.9,545.1 31.6,542.2C32.3,539.3 33.4,535.8 34.4,532.2C35.4,528.5 36.5,524.5 37.6,520.5C38.6,516.6 39.5,512.6 40.7,508.6C41.9,504.6 43,500.5 44.6,496.3C46.1,492.1 47.9,487.7 49.7,483.1C51.5,478.6 53.5,473.9 55.3,469.1C57.1,464.3 58.7,459.4 60.4,454.3C62.1,449.1 63.7,443.8 65.6,438.3C67.5,432.9 69.6,427.2 71.7,421.6C73.7,416.1 75.9,410.4 77.8,405C79.7,399.7 81.4,394.3 83.1,389.5C84.9,384.7 86.4,380.6 88.2,376.3C90,372 92,368.2 93.9,363.8C95.8,359.5 97.9,355.2 99.7,350.4C101.4,345.5 103.1,340.2 104.5,334.7C105.9,329.2 107,323.1 108.1,317.2C109.2,311.3 110.3,305.2 111.3,299.3C112.3,293.4 113.3,287.4 114.2,281.8C115.1,276.1 115.6,271 116.7,265.4C117.9,259.9 119.2,254.2 121,248.5C122.7,242.8 125.2,236.7 127.3,231.3C129.3,225.8 131.7,220.4 133.2,216.1C134.8,211.8 140.6,213.4 136.6,205.3C132.6,197.2 120.2,169.2 109.3,167.4Z\" fill=\"url(#bmskin)\"/><path d=\"M290.7,167.4C301.6,165.7 322.2,188.3 328.6,194.7C334.9,201.1 328.9,201.3 328.8,205.9C328.7,210.5 328.2,216.4 328,222.2C327.8,228.1 327.4,234.7 327.5,240.7C327.6,246.8 328.2,252.7 328.7,258.6C329.3,264.5 330.2,270.2 330.8,276.1C331.4,281.9 331.8,288 332.3,293.7C332.8,299.4 333.3,305.2 334,310.5C334.7,315.7 335.6,320.7 336.5,325.3C337.4,329.9 338.4,333.9 339.5,338C340.5,342.2 341.5,346.1 342.7,350.4C343.9,354.7 345.1,359 346.5,363.7C347.9,368.3 349.6,373.3 351.1,378.5C352.7,383.7 354.2,389.1 355.7,394.7C357.2,400.3 358.5,406.3 359.9,412.1C361.3,417.9 362.6,423.9 364.1,429.5C365.5,435.1 367,440.5 368.4,445.7C369.7,451 371.1,455.9 372.2,460.9C373.4,465.9 374.3,471 375.2,475.9C376.2,480.7 377,485.5 377.9,490.1C378.8,494.7 379.8,499 380.7,503.4C381.6,507.8 382.5,512.1 383.1,516.4C383.7,520.6 384,525 384.4,528.8C384.7,532.7 384.8,536.4 385.1,539.4C385.4,542.3 386.8,543.8 385.9,546.6C384.9,549.3 382,555.4 379.4,555.9C376.8,556.3 372,551.7 370.1,549.4C368.3,547.1 369.1,545.1 368.4,542.2C367.7,539.3 366.6,535.8 365.6,532.2C364.6,528.5 363.5,524.5 362.4,520.5C361.4,516.6 360.5,512.6 359.3,508.6C358.1,504.6 357,500.5 355.4,496.3C353.9,492.1 352.1,487.7 350.3,483.1C348.5,478.6 346.5,473.9 344.7,469.1C342.9,464.3 341.3,459.4 339.6,454.3C337.9,449.1 336.3,443.8 334.4,438.3C332.5,432.9 330.4,427.2 328.3,421.6C326.3,416.1 324.1,410.4 322.2,405C320.3,399.7 318.6,394.3 316.9,389.5C315.1,384.7 313.6,380.6 311.8,376.3C310,372 308,368.2 306.1,363.8C304.2,359.5 302.1,355.2 300.3,350.4C298.6,345.5 296.9,340.2 295.5,334.7C294.1,329.2 293,323.1 291.9,317.2C290.8,311.3 289.7,305.2 288.7,299.3C287.7,293.4 286.7,287.4 285.8,281.8C284.9,276.1 284.4,271 283.3,265.4C282.1,259.9 280.8,254.2 279,248.5C277.3,242.8 274.8,236.7 272.7,231.3C270.7,225.8 268.3,220.4 266.8,216.1C265.2,211.8 259.4,213.4 263.4,205.3C267.4,197.2 279.8,169.2 290.7,167.4Z\" fill=\"url(#bmskin)\"/><path d=\"M28.3,502.2C23.7,501.4 15.2,510.7 12.2,513.7C9.2,516.7 11.1,517.5 10.2,520.1C9.3,522.6 7.8,525.9 6.6,529.1C5.4,532.3 3.9,535.9 2.8,539.1C1.8,542.4 0.8,545.5 0.3,548.6C-0.3,551.8 -0.3,554.9 -0.4,558.1C-0.5,561.4 -0.2,565.1 -0.1,568.3C0,571.5 0.3,574.8 0.4,577.3C0.4,579.9 -1.6,579.8 0.2,583.6C2.1,587.3 7,599 11.6,599.8C16.1,600.6 24.7,591.3 27.8,588.4C30.8,585.6 28.9,584.9 29.8,582.6C30.7,580.2 32.1,577.2 33.4,574.2C34.6,571.3 36.1,567.9 37.1,564.7C38.2,561.6 39.2,558.6 39.7,555.4C40.3,552.2 40.4,548.9 40.4,545.4C40.5,542 40.3,538.1 40.1,534.7C40,531.2 39.7,527.7 39.7,524.9C39.6,522.2 41.7,522.1 39.8,518.3C37.9,514.5 32.9,503 28.3,502.2Z\" fill=\"url(#bmskin)\"/><path d=\"M371.7,502.2C376.3,501.4 384.8,510.7 387.8,513.7C390.8,516.7 388.9,517.5 389.8,520.1C390.7,522.6 392.2,525.9 393.4,529.1C394.6,532.3 396.1,535.9 397.2,539.1C398.2,542.4 399.2,545.5 399.7,548.6C400.3,551.8 400.3,554.9 400.4,558.1C400.5,561.4 400.2,565.1 400.1,568.3C400,571.5 399.7,574.8 399.6,577.3C399.6,579.9 401.6,579.8 399.8,583.6C397.9,587.3 393,599 388.4,599.8C383.9,600.6 375.3,591.3 372.2,588.4C369.2,585.6 371.1,584.9 370.2,582.6C369.3,580.2 367.9,577.2 366.6,574.2C365.4,571.3 363.9,567.9 362.9,564.7C361.8,561.6 360.8,558.6 360.3,555.4C359.7,552.2 359.6,548.9 359.6,545.4C359.5,542 359.7,538.1 359.9,534.7C360,531.2 360.3,527.7 360.3,524.9C360.4,522.2 358.3,522.1 360.2,518.3C362.1,514.5 367.1,503 371.7,502.2Z\" fill=\"url(#bmskin)\"/><path d=\"M30.2,530.1C28.2,531.4 28,537.6 28.1,539.8C28.2,542 29.7,542.1 30.7,543.6C31.8,545 33.2,546.9 34.4,548.6C35.5,550.3 36.9,552.3 37.8,553.9C38.7,555.4 39.3,556.7 39.8,558C40.3,559.2 40.4,560.1 40.6,561.4C40.8,562.7 40.9,564.4 41,565.8C41.1,567.3 41.1,568.9 41.1,570.2C41.1,571.5 40.2,572.2 41,573.7C41.8,575.2 44,578.9 45.7,579C47.4,579.1 50,575.6 51,574.3C52,573 51.2,572.7 51.5,571.4C51.7,570.1 52.2,568.4 52.5,566.7C52.8,564.9 53.1,562.8 53.1,560.7C53.1,558.6 52.8,556.2 52.2,554C51.6,551.8 50.4,549.6 49.3,547.5C48.2,545.3 46.8,543.1 45.6,541.2C44.4,539.2 43.1,537.2 42.1,535.7C41.2,534.2 41.9,533.1 39.9,532.2C37.9,531.3 32.2,528.9 30.2,530.1Z\" fill=\"url(#bmskin)\"/><path d=\"M369.8,530.1C371.8,531.4 372,537.6 371.9,539.8C371.8,542 370.3,542.1 369.3,543.6C368.2,545 366.8,546.9 365.6,548.6C364.5,550.3 363.1,552.3 362.2,553.9C361.3,555.4 360.7,556.7 360.2,558C359.7,559.2 359.6,560.1 359.4,561.4C359.2,562.7 359.1,564.4 359,565.8C358.9,567.3 358.9,568.9 358.9,570.2C358.9,571.5 359.8,572.2 359,573.7C358.2,575.2 356,578.9 354.3,579C352.6,579.1 350,575.6 349,574.3C348,573 348.8,572.7 348.5,571.4C348.3,570.1 347.8,568.4 347.5,566.7C347.2,564.9 346.9,562.8 346.9,560.7C346.9,558.6 347.2,556.2 347.8,554C348.4,551.8 349.6,549.6 350.7,547.5C351.8,545.3 353.2,543.1 354.4,541.2C355.6,539.2 356.9,537.2 357.9,535.7C358.8,534.2 358.1,533.1 360.1,532.2C362.1,531.3 367.8,528.9 369.8,530.1Z\" fill=\"url(#bmskin)\"/><path d=\"M160.3,412.1C147.3,411.3 126.2,440.5 119.1,448.7C111.9,456.9 118.1,456.2 117.2,461.3C116.3,466.4 114.9,472.9 113.7,479.5C112.5,486.1 111,493.6 110.1,500.8C109.2,508 108.4,515.3 108,522.7C107.7,530 107.9,537.3 108.1,545C108.3,552.6 108.9,560.8 109.3,568.7C109.7,576.6 110.2,584.8 110.5,592.5C110.8,600.2 110.6,607.7 111,614.9C111.4,622.1 111.7,628.9 112.7,635.6C113.6,642.3 115.4,648.7 116.8,655.2C118.1,661.7 119.9,668 120.9,674.4C122,680.8 122.7,687.3 123,693.8C123.3,700.3 122.9,706.8 122.6,713.3C122.3,719.8 121.8,726.1 121.4,732.5C121,738.9 120.5,745.3 120.2,751.9C120,758.6 119.5,764.9 120,772.2C120.5,779.6 121.5,787.7 123.1,796.1C124.6,804.4 127.1,814 129.1,822.3C131.1,830.7 133.7,839.4 135.1,846.2C136.6,852.9 134.5,857.1 138,862.8C141.5,868.5 150.4,880.5 156.4,880.4C162.4,880.3 170.7,867.9 174,862C177.3,856.2 174.9,852.1 176.1,845.3C177.3,838.5 179.5,829.7 181.1,821.2C182.8,812.8 184.9,803.1 186,794.7C187.2,786.2 187.9,778 188,770.6C188.1,763.1 187.3,756.7 186.7,750C186.1,743.4 185.1,737 184.4,730.7C183.6,724.3 182.7,718.2 182.1,711.9C181.6,705.6 180.9,699.3 181,693C181.1,686.7 181.7,680.3 182.7,674C183.6,667.7 185.4,661.5 186.8,655.2C188.1,648.9 189.9,642.6 190.9,636.1C192,629.5 192.5,622.9 193,615.9C193.5,608.8 193.5,601.4 194.1,593.8C194.6,586.3 195.5,578.3 196.2,570.5C197,562.8 197.9,554.9 198.5,547.5C199.1,540.1 199.8,533.1 200,526.1C200.2,519.1 200,512.3 199.8,505.4C199.6,498.4 199,491 198.6,484.5C198.1,478 197.5,471.4 197.3,466.2C197,461 203.1,462.3 196.9,453.3C190.8,444.2 173.2,412.8 160.3,412.1Z\" fill=\"url(#bmskin)\"/><path d=\"M239.7,412.1C252.7,411.3 273.8,440.5 280.9,448.7C288.1,456.9 281.9,456.2 282.8,461.3C283.7,466.4 285.1,472.9 286.3,479.5C287.5,486.1 289,493.6 289.9,500.8C290.8,508 291.6,515.3 292,522.7C292.3,530 292.1,537.3 291.9,545C291.7,552.6 291.1,560.8 290.7,568.7C290.3,576.6 289.8,584.8 289.5,592.5C289.2,600.2 289.4,607.7 289,614.9C288.6,622.1 288.3,628.9 287.3,635.6C286.4,642.3 284.6,648.7 283.3,655.2C281.9,661.7 280.1,668 279.1,674.4C278,680.8 277.3,687.3 277,693.8C276.7,700.3 277.1,706.8 277.4,713.3C277.7,719.8 278.2,726.1 278.6,732.5C279,738.9 279.5,745.3 279.8,751.9C280,758.6 280.5,764.9 280,772.2C279.5,779.6 278.5,787.7 276.9,796.1C275.4,804.4 272.9,814 270.9,822.3C268.9,830.7 266.3,839.4 264.9,846.2C263.4,852.9 265.5,857.1 262,862.8C258.5,868.5 249.6,880.5 243.6,880.4C237.6,880.3 229.3,867.9 226,862C222.7,856.2 225.1,852.1 223.9,845.3C222.7,838.5 220.5,829.7 218.9,821.2C217.2,812.8 215.1,803.1 214,794.7C212.8,786.2 212.1,778 212,770.6C211.9,763.1 212.7,756.7 213.3,750C213.9,743.4 214.9,737 215.6,730.7C216.4,724.3 217.3,718.2 217.9,711.9C218.4,705.6 219.1,699.3 219,693C218.9,686.7 218.3,680.3 217.3,674C216.4,667.7 214.6,661.5 213.3,655.2C211.9,648.9 210.1,642.6 209.1,636.1C208,629.5 207.5,622.9 207,615.9C206.5,608.8 206.5,601.4 205.9,593.8C205.4,586.3 204.5,578.3 203.8,570.5C203,562.8 202.1,554.9 201.5,547.5C200.9,540.1 200.2,533.1 200,526.1C199.8,519.1 200,512.3 200.2,505.4C200.4,498.4 201,491 201.4,484.5C201.9,478 202.5,471.4 202.7,466.2C203,461 196.9,462.3 203.1,453.3C209.2,444.2 226.8,412.8 239.7,412.1Z\" fill=\"url(#bmskin)\"/><path d=\"M158.9,856.2C153.4,853.9 139.7,863.3 135.4,865.9C131.1,868.4 134,869.4 133.3,871.5C132.5,873.7 131.6,876.5 130.8,878.8C130,881.1 128.9,883.9 128.3,885.3C127.7,886.8 127.2,887.2 127.3,887.4C127.5,887.7 129.1,886.7 129.3,887C129.5,887.3 129.3,888.5 128.7,889.3C128.1,890 126.9,891 125.7,891.7C124.6,892.3 123.9,890.8 121.8,893.2C119.7,895.6 112.5,902.6 113.2,906.2C114,909.8 123.7,913.2 126.2,914.8C128.7,916.3 127,915.1 128.2,915.4C129.5,915.8 131.4,916.6 133.8,916.8C136.2,916.9 139.4,917.4 142.5,916.3C145.6,915.2 149.9,912.7 152.7,910.2C155.4,907.6 157.1,904 158.8,901C160.6,898 161.9,894.9 163.2,892.1C164.5,889.4 165.7,886.4 166.6,884.4C167.5,882.3 169.9,884.4 168.6,879.7C167.3,875 164.5,858.5 158.9,856.2Z\" fill=\"url(#bmskin)\"/><path d=\"M241.1,856.2C246.6,853.9 260.3,863.3 264.6,865.9C268.9,868.4 266,869.4 266.7,871.5C267.5,873.7 268.4,876.5 269.2,878.8C270,881.1 271.1,883.9 271.7,885.3C272.3,886.8 272.8,887.2 272.7,887.4C272.5,887.7 270.9,886.7 270.7,887C270.5,887.3 270.7,888.5 271.3,889.3C271.9,890 273.1,891 274.3,891.7C275.4,892.3 276.1,890.8 278.2,893.2C280.3,895.6 287.5,902.6 286.8,906.2C286,909.8 276.3,913.2 273.8,914.8C271.3,916.3 273,915.1 271.8,915.4C270.5,915.8 268.6,916.6 266.2,916.8C263.8,916.9 260.6,917.4 257.5,916.3C254.4,915.2 250.1,912.7 247.3,910.2C244.6,907.6 242.9,904 241.2,901C239.4,898 238.1,894.9 236.8,892.1C235.5,889.4 234.3,886.4 233.4,884.4C232.5,882.3 230.1,884.4 231.4,879.7C232.7,875 235.5,858.5 241.1,856.2Z\" fill=\"url(#bmskin)\"/><path d=\"M200,95C192.3,95 180.9,112.6 177,118C173.1,123.4 176.8,123.7 176.5,127.6C176.3,131.6 175.8,137 175.5,141.7C175.2,146.4 174.7,151.9 174.5,155.8C174.2,159.8 169.7,159.5 174,165.5C178.3,171.4 191.3,191.5 200,191.5C208.7,191.5 221.7,171.4 226,165.5C230.3,159.5 225.8,159.8 225.5,155.8C225.3,151.9 224.8,146.4 224.5,141.7C224.2,137 223.7,131.6 223.5,127.6C223.2,123.7 226.9,123.4 223,118C219.1,112.6 207.7,95 200,95Z\" fill=\"url(#bmskin)\"/><ellipse cx=\"200\" cy=\"78\" rx=\"45\" ry=\"57\" fill=\"url(#bmskin)\" stroke=\"#1b1731\" stroke-width=\"3.5\"/><ellipse cx=\"155\" cy=\"86\" rx=\"7\" ry=\"13\" fill=\"url(#bmskin)\" stroke=\"#1b1731\" stroke-width=\"3\"/><ellipse cx=\"245\" cy=\"86\" rx=\"7\" ry=\"13\" fill=\"url(#bmskin)\" stroke=\"#1b1731\" stroke-width=\"3\"/><path d=\"M156,92 Q150,24 200,20 Q250,24 244,92 Q238,118 200,122 Q162,118 156,92Z\" fill=\"#4a4566\" stroke=\"#1b1731\" stroke-width=\"3\"/>"};
const BODY_DET = {"front": "<path d=\"M150,168.9C153.7,170.9 164.3,179.5 172,181C179.7,182.4 192,178.1 196,177.5M250,168.9C246.3,170.9 235.7,179.5 228,181C220.3,182.4 208,178.1 204,177.5M196,267C191.7,267.8 179.3,271.5 170,272.1C160.7,272.7 145,270.7 140,270.4M204,267C208.3,267.8 220.7,271.5 230,272.1C239.3,272.7 255,270.7 260,270.4M160,709C157.7,709.9 146,712 146,714.2C146,716.4 157.7,720.7 160,722M240,709C242.3,709.9 254,712 254,714.2C254,716.4 242.3,720.7 240,722\" fill=\"none\" stroke=\"#1b1731\" stroke-opacity=\".55\" stroke-width=\"2.2\" stroke-linecap=\"round\"/><ellipse cx=\"200\" cy=\"351.2\" rx=\"4\" ry=\"6\" fill=\"#1b1731\" fill-opacity=\".55\"/><path d=\"M200,284.2C200,300.5 200,354.4 200,382.2C200,410 200,439.5 200,451\" fill=\"none\" stroke=\"#1b1731\" stroke-opacity=\".5\" stroke-width=\"2\"/>", "back": "<path d=\"M122,236C125.3,238 135.3,247.5 142,248C148.7,248.6 158.7,240.9 162,239.4M278,236C274.7,238 264.7,247.5 258,248C251.3,248.6 241.3,240.9 238,239.4M176,404.6C176.3,405.1 177.7,407.4 178,408M224,404.6C223.7,405.1 222.3,407.4 222,408\" fill=\"none\" stroke=\"#1b1731\" stroke-opacity=\".55\" stroke-width=\"2.2\" stroke-linecap=\"round\"/><path d=\"M200,150C200,171.5 200,233.4 200,279C200,324.6 200,399.4 200,423.5\" fill=\"none\" stroke=\"#1b1731\" stroke-opacity=\".5\" stroke-width=\"2\"/>"};
function bbox(d){ const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let q = 0; q + 1 < n.length; q += 2){ x0 = Math.min(x0, n[q]); x1 = Math.max(x1, n[q]); y0 = Math.min(y0, n[q+1]); y1 = Math.max(y1, n[q+1]); } return [x0, y0, x1, y1]; }
const FIB = {};
function fibres(d, ang){
  const key = d + ang; if (FIB[key]) return FIB[key];
  const [x0, y0, x1, y1] = bbox(d), cx = (x0+x1)/2, cy = (y0+y1)/2, L = Math.hypot(x1-x0, y1-y0)/2 + 2, a = ang*Math.PI/180, ux = Math.cos(a), uy = Math.sin(a);
  let out = ""; for (let t = -L; t <= L; t += 2.6){ const mx = cx - uy*t, my = cy + ux*t; out += `M${(mx-ux*L).toFixed(1)},${(my-uy*L).toFixed(1)}L${(mx+ux*L).toFixed(1)},${(my+uy*L).toFixed(1)}`; }
  return FIB[key] = out;
}
let bodyN = 0;
function bodySvg(view, B, defs){
  const uid = view[0] + (++bodyN), idx = k => { const sc = B.m[k].score; return sc >= 0 ? Math.floor(sc/3) : -1; };
  const clips = BODY_PARTS[view].map(([k, d], n) => `<clipPath id="bc${uid}_${n}"><path d="${d}"/></clipPath>`).join("");
  const paths = BODY_PARTS[view].map(([k, d, fib], n) => { const i = idx(k);
    return `<g class="mus r${i}" data-m="${k}" style="--d:${(n*.045 + (view === "back" ? .25 : 0)).toFixed(3)}s"><title>${MNAME[k]}: ${B.m[k].rk ? B.m[k].rk.label : "Unranked"}</title>
      <path d="${d}" fill="url(#bm${i < 0 ? "u" : i})"/><path class="fib" d="${fib}" clip-path="url(#bc${uid}_${n})"/><path d="${d}" fill="url(#bmhi)"/><path class="ol" d="${d}" fill="none"/></g>`; }).join("");
  const g = defs ? `${RANKS.map((R, i) => `<linearGradient id="bm${i}" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${R.c1}"/><stop offset="1" stop-color="${R.c2}"/></linearGradient>`).join("")}
    <linearGradient id="bmu" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#dfe2ef"/><stop offset="1" stop-color="#a3a9c4"/></linearGradient>
    <radialGradient id="bmhi" cx=".32" cy=".26" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient>
    <linearGradient id="bmskin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9bdd2"/><stop offset="1" stop-color="#8d92ad"/></linearGradient>
    <radialGradient id="bmglow"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` : "";
  return `<svg class="bodysvg" viewBox="0 0 400 930" role="img" aria-label="${view === "front" ? "Front" : "Back"} muscles"><defs>${g}${clips}</defs>
    <ellipse cx="200" cy="470" rx="196" ry="450" fill="url(#bmglow)"/><ellipse cx="200" cy="914" rx="110" ry="11" fill="#000" opacity=".4"/>
    ${BODY_BASE[view]}
    <g class="musg">${paths}</g>${BODY_DET[view]}</svg>`;
}
function muscleMini(k, score){
  const m = {}; MUSCLES.forEach(([q, name]) => { m[q] = {score: q === k ? score : -1}; });
  const view = BODY_PARTS.front.some(([q]) => q === k) && !["traps"].includes(k) ? "front" : "back";
  bodyN = 50; return bodySvg(view, {m}, true).replace(`class="mus r${Math.floor(score/3)}"`, `class="mus r${Math.floor(score/3)} sel"`);
}
function renderBody(){
  bodyN = 0;
  const B = bodyRanks(), bw = state.profile.bw;
  if (!ui.muscle || !MNAME[ui.muscle]) ui.muscle = (MUSCLES.map(([k]) => B.m[k]).filter(x => x.rk).sort((a,b) => b.score - a.score)[0] || {k:"chest"}).k;
  embP = "bd"; embN = 0;
  const ov = B.rk, nt = ov && ov.score < 17 ? rankFromScore(ov.score + 1, "Body") : null;
  const weakest = MUSCLES.map(([k]) => B.m[k]).sort((a,b) => a.score - b.score)[0];
  setHTML($("bodyRank"), `<div class="br-head"><div><div class="label" style="color:#b9b2d8">BODY RANK</div><h3>Every muscle, ranked</h3></div><span class="br-n">${B.rankedN} of ${MUSCLES.length} muscles ranked</span></div>
    <div class="br-wrap">
      <div class="br-figs"><figure>${bodySvg("front", B, true)}<figcaption>Front</figcaption></figure><figure>${bodySvg("back", B, false)}<figcaption>Back</figcaption></figure></div>
      <div class="br-side">
        <div class="br-over" style="${ov ? `--rc:${RANKS[ov.i].c1}` : ""}"><div class="br-oe">${ov ? emblem(ov.i, 92, false, ov.tier) : emblem(0, 92, true, 0)}</div>
          <div style="min-width:0"><div class="br-ol">${ov ? esc(ov.label) : "Unranked"}</div>
          <p>${!ov ? "Log any lift to start filling your body." : B.rankedN < MUSCLES.length ? `Unranked muscles count as Bronze 1 and hold your body rank down. Your weakest spot is ${weakest.name.toLowerCase()}.` : nt ? `Every muscle is ranked. Raise your weakest, ${weakest.name.toLowerCase()} (${weakest.rk.label}), to climb to ${nt.label}.` : "Elite 3 everywhere. A complete body."}</p></div></div>
        <div class="br-ladder">${RANKS.map((R, i) => `<div class="${ov && ov.i === i ? "cur" : ov && i < ov.i ? "done" : ""}" style="--i:${i}">${ov && ov.i === i ? `<i class="arrow"></i>` : ""}${emblem(i, 34, !(ov && i <= ov.i), ov && ov.i === i ? ov.tier : 3)}<span>${R.name}</span></div>`).join("")}</div>
        <div class="br-mus" id="brMus"></div>
        <div class="br-list" id="brList"></div>
      </div>
    </div>`);
  lastBody = B; renderBodySel();
}
let lastBody = null;
function renderBodySel(){
  const B = lastBody; if (!B) return;
  const M = B.m[ui.muscle];
  embP = "bs"; embN = 0;
  document.querySelectorAll("#bodyRank .bodysvg .mus").forEach(g => g.classList.toggle("sel", g.dataset.m === ui.muscle));
  setHTML($("brMus"), `
          <div class="br-mh">${M.rk ? emblem(M.rk.i, 30, false, M.rk.tier) : emblem(0, 30, true, 0)}<div><b>${esc(M.name)}</b><span>${M.rk ? esc(M.rk.label) : "Unranked"}</span></div></div>
          ${M.from.length ? `<ul>${M.from.slice(0,5).map(f => `<li><button type="button" data-rk="${esc(f.lift)}">${emblem(f.rk.i, 20, false, f.rk.tier)}<span>${esc(f.lift)}</span><em>${esc(f.rk.label)}</em></button></li>`).join("")}</ul>` : `<p class="br-empty">No lifts for this muscle yet.</p>`}
          ${M.todo.length ? `<div class="br-todo"><span>Rank up with</span>${M.todo.slice(0,4).map(l => `<button type="button" class="chip" data-rk="${esc(l)}">${esc(l)}</button>`).join("")}</div>` : ""}`);
  setHTML($("brList"), MUSCLES.map(([k]) => { const x = B.m[k]; return `<button type="button" data-m="${k}" aria-pressed="${k === ui.muscle}" style="${x.rk ? `--rc:${RANKS[x.rk.i].c1}` : ""}"><i></i>${esc(x.name)}<small>${x.rk ? esc(x.rk.label) : "—"}</small></button>`; }).join(""));
}
function lfLabel(){ const e = EX[$("lfEx").value]; $("lfWl").textContent = e && e.f ? `Added weight (${unit()}, 0 = bodyweight)` : e && e.db ? `Weight per dumbbell (${unit()})` : `Weight (${unit()})`; $("lfW").min = 0; }
function renderLiftRanks(){
  renderBody();
  const bw = state.profile.bw, G = ui.rkGroup || "All";
  const all = CAT.map(c => ({n:c[0], g:c[1], rk:logRank(c[0])}));
  const ranked = all.filter(x => x.rk);
  $("lrCount").textContent = `${ranked.length} of ${all.length} lifts ranked`;
  $("lrSeg").innerHTML = ["All","Ranked",...GROUPS].map(g => `<button type="button" data-v="${g}" aria-pressed="${g === G}">${g}</button>`).join("");
  const list = G === "All" ? all : G === "Ranked" ? ranked : all.filter(x => x.g === G);
  if (!ui.rkEx || !EX[ui.rkEx]) ui.rkEx = (ranked[0] && ranked[0].n) || "Pull-ups";
  embP = "r"; embN = 0;
  const prog = rk => { const nt = nextTier(rk); if (!nt) return 100; const [lo, hi] = rankBand(rk.lift, rk.i), band = (hi - lo)/3, start = lo + band*(rk.tier - 1); return Math.max(4, Math.min(100, Math.round((rk.ratio - start)/band*100))); };
  setHTML($("lrGrid"), list.length ? list.map((x, k) => { const rk = x.rk, R2 = rk ? RANKS[rk.i] : null;
    return `<button type="button" class="lr-t ${rk ? "on" : ""} ${rk && rk.i === 5 ? "elite" : ""}" data-rk="${esc(x.n)}" aria-pressed="${x.n === ui.rkEx}" style="--k:${k};${R2 ? `--rc:${R2.c1};--rc2:${R2.c2}` : ""}">
      <span class="lr-e">${rk ? emblem(rk.i, 34, false, rk.tier) : emblem(0, 34, true, 0)}</span>
      <span class="lr-n">${esc(x.n)}<small>${rk ? esc(rk.label) : "Unranked"}</small></span>
      ${rk ? `<span class="lr-p"><i style="width:${prog(rk)}%"></i></span>` : ""}</button>`; }).join("")
    : `<p class="hint">No ranked lifts yet. Log a set of any lift to rank it.</p>`);

  const ex = ui.rkEx, e = EX[ex], rk = logRank(ex), f = e.f;
  const cols = f ? [["bw","Reps at BW"],[1,"Added ×1"],[5,"Added ×5"]] : [[1,"1 rep"],[5,"5 reps"],[10,"10 reps"]];
  const cell = (r, c) => { if (c === "bw"){ const n = needFor(ex, r, bw, "bw"); return r === 0 ? "1+" : n > 60 ? "60+" : n; } const v = needFor(ex, r, bw, c); return r === 0 ? (f ? "Bodyweight" : "Any") : f && v <= 0 ? "Bodyweight" : WU(v); };
  const nt = rk && nextTier(rk);
  const nextTxt = !rk ? `Log any set of ${ex.toLowerCase()} to get ranked.` : !nt ? "Elite 3. The top of the ladder." :
    f ? `Next: ${nt.label} at ${needFor(ex, nt.ratio, bw, "bw")} reps at bodyweight${needFor(ex, nt.ratio, bw, 5) > 0 ? `, or ${WU(needFor(ex, nt.ratio, bw, 5))} added for 5` : ""}.`
      : `Next: ${nt.label} at ${WU(needFor(ex, nt.ratio, bw, 1))} for 1, ${WU(needFor(ex, nt.ratio, bw, 5))} for 5 or ${WU(needFor(ex, nt.ratio, bw, 10))} for 10.`;
  embP = "rd"; embN = 0;
  setHTML($("lrDet"), `<div class="lrd-top"><div class="lrd-e">${rk ? emblem(rk.i, 78, false, rk.tier) : emblem(0, 78, true, 0)}</div>
      <div style="min-width:0"><div class="label">${esc(e.g)}${e.db ? " · per dumbbell" : ""}${f ? " · bodyweight move" : ""}</div><h3 style="margin:2px 0 4px">${esc(ex)}</h3>
      <div class="lrd-rk" style="${rk ? `color:${RANKS[rk.i].c1 === "#f4f7fb" ? "var(--fg)" : "var(--fg)"}` : ""}">${rk ? `<b>${esc(rk.label)}</b> · ${rk.ratio.toFixed(2)}× BW est. 1RM` : "Unranked"}</div>
      ${rk ? `<div class="muted" style="font-size:13px">Best set ${setTxt(rk.set)} × ${rk.set.reps} on ${shortDate(parse(rk.set.date))} → ${WU(rk.e1)} est. 1RM${f ? " incl. bodyweight" : ""}</div>` : ""}</div></div>
    <p class="lrd-next">${nextTxt}</p>
    <div class="tbl-wrap"><table class="lrd-tbl"><thead><tr><th>Rank</th>${cols.map(c => `<th class="r">${c[1]}</th>`).join("")}</tr></thead><tbody>
      ${RANK_MIN[ex].map((m, i) => `<tr class="${rk && rk.i === i ? "cur" : ""}"><td><span class="lrd-dot" style="background:linear-gradient(135deg,${RANKS[i].c1},${RANKS[i].c2})"></span>${RANKS[i].name}</td>${cols.map(c => `<td class="r mono">${cell(m, c[0])}</td>`).join("")}</tr>`).join("")}
    </tbody></table></div>
    <p class="hint">For your bodyweight of ${WU(bw)}.${e.db ? " Weights are per dumbbell." : ""} Each rank splits into tiers 1 to 3 on the way to the next.</p>
    <button class="btn go" type="button" data-logit="${esc(ex)}">Log a set</button>`);
}
const drawMain = () => { const pts = inRange(series(ui.ex, ui.metric), ui.range).map(p => Object.assign({}, p, {v:toU(p.v)})), t1 = parse(today()); mainGeo = drawChart($("mainChart"), pts, {t0: ui.range ? t1 - ui.range*DAY : undefined, t1}); };
function drawTrainCharts(){
  document.querySelectorAll("canvas[data-spark]").forEach(cv => drawChart(cv, inRange(series(cv.dataset.spark,"e1rm"),90), {mini:true}));
  drawMain(); $("tip").hidden = true;
}
function hover(ev){
  if (!mainGeo) return;
  const r = $("mainChart").getBoundingClientRect(), px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
  let near = null, dmin = 1e9;
  mainGeo.pts.forEach(p => { const d = Math.abs(mainGeo.X(p.t) - px); if (d < dmin){ dmin = d; near = p; } });
  if (!near) return;
  drawMain();
  const g = mainGeo, ctx = $("mainChart").getContext("2d"), x = g.X(near.t), y = g.Y(near.v);
  ctx.save(); ctx.strokeStyle = g.col; ctx.globalAlpha = .55; ctx.setLineDash([3,4]); ctx.beginPath(); ctx.moveTo(x,g.pad.t); ctx.lineTo(x,g.h-g.pad.b); ctx.moveTo(g.pad.l,y); ctx.lineTo(g.w-g.pad.r,y); ctx.stroke(); ctx.restore();
  ctx.fillStyle = g.col; ctx.beginPath(); ctx.arc(x,y,4,0,7); ctx.fill();
  const s = near.set, tip = $("tip");
  tip.innerHTML = `${shortDate(near.t)} · <b>${fmt(near.v)} ${unit()}</b><br><span>${ui.metric === "vol" ? near.n + " entr" + (near.n>1?"ies":"y") : W(s.kg)+" × "+s.reps+" × "+s.sets}</span>`;
  tip.hidden = false; tip.style.left = Math.min(Math.max(x,70), g.w-70) + "px"; tip.style.top = y + "px";
}
$("mainChart").addEventListener("mousemove", hover);
$("mainChart").addEventListener("touchmove", hover, {passive:true});
$("mainChart").addEventListener("touchstart", hover, {passive:true});
$("mainChart").addEventListener("mouseleave", () => { drawMain(); $("tip").hidden = true; });
function liftHint(){ const w = fromU(num($("lfW").value)), r = num($("lfR").value); $("lfHint").textContent = w && r ? `Estimated 1RM for this set: ${WU(e1rm(w,r))}. Your best is ${WU(best($("lfEx").value))}.` : ""; }

/* ---------- fuel ---------- */
function renderFuel(){
  const t = dayTotals(today()), g = state.goals;
  $("todayTitle").textContent = "Today, " + shortDate(parse(today()));
  const bar = (label,a,b,u) => { const pct = b ? a/b*100 : 0; return `<div class="mb"><div class="top"><span>${label}</span><span>${fmt(a)} / ${fmt(b)} ${u}</span></div><div class="track"><div class="fill ${pct>110?"over":""}" style="width:${Math.min(100,pct)}%"></div></div></div>`; };
  $("bars").innerHTML = bar("Calories",t.k,g.k,"kcal") + bar("Protein",t.p,g.p,"g") + bar("Carbs",t.c,g.c,"g") + bar("Fat",t.f,g.f,"g");
  const rows = state.foods.filter(f => f.date === today());
  $("foodToday").innerHTML = rows.map(f => `<tr><td>${esc(f.name)}</td><td class="r mono">${f.p}</td><td class="r mono">${f.c}</td><td class="r mono">${f.f}</td><td class="r mono">${fmt(f.p*4+f.c*4+f.f*9)}</td><td class="r"><button class="x" type="button" data-del-food="${esc(f.id)}" aria-label="Delete entry">✕</button></td></tr>`).join("")
    || `<tr><td colspan="6" class="muted">Nothing logged yet today.</td></tr>`;
  const a7 = adherence(7), a30 = adherence(30);
  $("g7").textContent = grade(a7.score); $("s7").textContent = a7.score + " / 100";
  $("g30").textContent = grade(a30.score); $("s30").textContent = a30.score + " / 100";
  let streak = 0; for (let i = 1; i < 400; i++){ const s = dayScore(daysAgo(i)); if (s !== null && s >= 80) streak++; else break; }
  $("mstats").innerHTML = `<div class="stat"><b>${a30.logged}/30</b>days logged</div><div class="stat"><b>${a30.protein}/30</b>protein target hit</div><div class="stat"><b>${streak}</b>day streak at 80+</div>`;
  let heat = ""; for (let i = 30; i >= 1; i--){ const d = daysAgo(i), s = dayScore(d); heat += `<i style="${s === null ? "" : `background:color-mix(in srgb,var(--gold) ${Math.round(15+85*Math.pow(s/100,2))}%,var(--surface-2))`}" title="${shortDate(parse(d))}: ${s === null ? "not logged" : s}"></i>`; }
  $("heat").innerHTML = heat;
  [["gK","k"],["gP","p"],["gC","c"],["gF","f"]].forEach(([id,k]) => { if (document.activeElement !== $(id)) $(id).value = g[k]; });
  const implied = g.p*4+g.c*4+g.f*9;
  $("goalHint").textContent = `Your macro targets add up to ${fmt(implied)} kcal` + (Math.abs(implied-g.k) > 100 ? `, ${fmt(Math.abs(implied-g.k))} ${implied>g.k?"over":"under"} your calorie target.` : ", which matches your calorie target.");
  updateCal(); renderCalc(); drawFuelChart();
}
function drawFuelChart(){ const pts = []; for (let i = 30; i >= 1; i--){ const d = daysAgo(i), s = dayScore(d); if (s !== null) pts.push({t:parse(d), v:s}); } drawChart($("scoreChart"), pts, {min:0, max:100, t0:parse(daysAgo(30)), t1:parse(daysAgo(1))}); }
// Mifflin-St Jeor BMR x activity, then goal adjustment; protein and fat by bodyweight, carbs fill the rest
function calcMacros(c){
  const kg = c.bw, cm = c.cm, bmr = 10*kg + 6.25*cm - 5*c.age + (c.sex === "f" ? -161 : 5), tdee = bmr*c.act;
  const k = Math.round(tdee*({cut:.8, maint:1, bulk:1.1})[c.goal]/10)*10;
  const p = Math.round(kg*(c.goal === "cut" ? 2.2 : 1.8)), f = Math.round(Math.max(kg*.8, k*.25/9)), cc = Math.max(0, Math.round((k - p*4 - f*9)/4));
  return {bmr:Math.round(bmr), tdee:Math.round(tdee), k, p, c:cc, f};
}
function calcState(){
  if (!state.calc) state.calc = {sex:"m", bw:state.profile.bw, cm:178, age:25, act:1.55, goal:"maint"};
  return state.calc;
}
function renderCalc(){
  const c = calcState(), imp = unit() === "lb";
  document.querySelectorAll("#cSex button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === c.sex));
  document.querySelectorAll("#cGoal button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === c.goal));
  $("cxBwl").textContent = `Bodyweight (${unit()})`;
  if (document.activeElement !== $("cxBw")) $("cxBw").value = Math.round(toU(c.bw)*10)/10;
  if (document.activeElement !== $("cxAge")) $("cxAge").value = c.age;
  $("cxAct").value = String(c.act);
  const hw = $("cxHwrap"), want = imp ? "imp" : "met";
  if (hw.dataset.u !== want){
    hw.dataset.u = want;
    hw.innerHTML = imp ? `<label for="cxFt">Height (ft, in)</label><div style="display:flex;gap:6px"><input id="cxFt" type="number" min="3" max="8" step="1" required aria-label="Feet" placeholder="ft"><input id="cxIn" type="number" min="0" max="11.9" step="any" required aria-label="Inches" placeholder="in"></div>`
      : `<label for="cxCm">Height (cm)</label><input id="cxCm" type="number" min="100" max="250" step="any" required>`;
  }
  if (imp){ const tin = c.cm/2.54; if (document.activeElement !== $("cxFt") && document.activeElement !== $("cxIn")){ $("cxFt").value = Math.floor(tin/12); $("cxIn").value = Math.round(tin%12); } }
  else if (document.activeElement !== $("cxCm")) $("cxCm").value = Math.round(c.cm);
  const m = calcMacros(c), tot = m.p*4 + m.c*4 + m.f*9 || 1;
  const tile = (cls, v, u, label, col, w) => `<div class="ctile ${cls}" style="--c:${col};--w:${w}%"><div><b>${fmt(v)}<span style="font-size:.5em;margin-left:3px">${u}</span></b><small>${label}</small></div><i></i></div>`;
  setHTML($("calcOut"), tile("k", m.k, "kcal", ({cut:"a 20% deficit", maint:"to maintain", bulk:"a 10% surplus"})[c.goal], "var(--gold)", 100)
    + tile("", m.p, "g", "Protein", "#ff6b8b", Math.round(m.p*4/tot*100)) + tile("", m.c, "g", "Carbs", "#20e3ff", Math.round(m.c*4/tot*100)) + tile("", m.f, "g", "Fat", "#ffb21e", Math.round(m.f*9/tot*100))
    + `<div class="ctile"><b>${fmt(m.tdee)}</b><small>Maintenance kcal</small></div><div class="calcnote">Resting burn ${fmt(m.bmr)} kcal. Protein is ${c.goal === "cut" ? "2.2" : "1.8"} g per kg of bodyweight, fat at least 25% of calories, carbs fill the rest. It's an estimate: adjust after two weeks if your weight moves the wrong way.</div>`);
}
function readCalc(){
  const c = calcState(), bw = fromU(num($("cxBw").value));
  if (bw > 20) c.bw = bw;
  const age = num($("cxAge").value); if (age >= 13 && age <= 99) c.age = age;
  if (unit() === "lb"){ const cm = (num($("cxFt").value)*12 + num($("cxIn").value))*2.54; if (cm > 100) c.cm = cm; }
  else { const cm = num($("cxCm").value); if (cm > 100) c.cm = cm; }
  c.act = num($("cxAct").value) || 1.55;
  save(); renderCalc();
}
$("calcForm").addEventListener("input", readCalc);
$("calcForm").addEventListener("change", readCalc);
$("calcForm").addEventListener("submit", e => e.preventDefault());
$("cSex").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ calcState().sex = b.dataset.v; save(); renderCalc(); } });
$("cGoal").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ calcState().goal = b.dataset.v; save(); renderCalc(); } });
$("calcUse").addEventListener("click", () => { const m = calcMacros(calcState()); state.goals = {k:m.k, p:m.p, c:m.c, f:m.f}; commit("Targets updated from the calculator"); });
function updateCal(){ const p=num($("ffP").value), c=num($("ffC").value), f=num($("ffF").value); $("ffCal").textContent = `That's about ${fmt(p*4+c*4+f*9)} kcal.`; }

/* ---------- profile ---------- */
function renderProfile(){
  $("acct").className = "acct" + (cloud ? " on" : "");
  $("acct").innerHTML = `<span class="dot"></span><span>${cloud ? `Signed in as <b>${esc((me && me.name) || "you")}</b>. Your log syncs and your PRs post to the shared board.` : "Not signed in. Everything is saved in this browser only, and the board shows just you and practice rivals."}</span>`;
  if (document.activeElement !== $("pN")) $("pN").value = state.profile.tag || "";
  if (document.activeElement !== $("pB")) $("pB").value = Math.round(toU(state.profile.bw)*10)/10;
  $("pBl").textContent = `Bodyweight (${unit()})`;
  document.querySelectorAll("#unitSeg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === unit()));
  document.querySelectorAll("#modeSeg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === state.settings.mode));
  const bots = players().showBots;
  document.querySelectorAll("#botSeg button").forEach(b => b.setAttribute("aria-pressed", (b.dataset.v === "on") === bots));
  $("swatches").innerHTML = Object.entries(THEMES).map(([k,t]) => `<button class="sw" type="button" data-theme-k="${k}" aria-pressed="${state.settings.graph===k}"><i style="--c:${t.c}"></i>${t.name}</button>`).join("");
  $("wipe").hidden = false; $("wipeYes").hidden = true;
}

/* ---------- shell ---------- */
function renderCharts(){ if (ui.tab === "train") drawTrainCharts(); if (ui.tab === "fuel") drawFuelChart(); }
function renderAll(){
  $("sampleBanner").hidden = !(state.lifts.some(l => l.sample) || state.foods.some(f => f.sample));
  renderChrome();
  ({arena:renderArena, train:renderTrain, fuel:renderFuel, squad:renderSquad, profile:renderProfile})[ui.tab]();
}
function setTab(t){
  ui.tab = t;
  document.querySelectorAll("nav.tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === t));
  document.querySelectorAll(".panel").forEach(p => p.hidden = p.id !== "p-"+t);
  try { localStorage.setItem(KEY+".tab", t); } catch(e){}
  renderAll();
}
let toastT; function toast(m){ const el = $("toast"); el.textContent = m; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 2800); }
function commit(m){ save(); renderAll(); if (m) toast(m); checkProgress(); }

document.querySelectorAll("nav.tabs button").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));
$("watch").addEventListener("click", e => { const b = e.target.closest("[data-ex]"); if (b){ ui.ex = b.dataset.ex; $("lfEx").value = ui.ex; renderTrain(); } });
$("metricSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ ui.metric = b.dataset.v; renderTrain(); } });
$("rangeSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ ui.range = +b.dataset.v; renderTrain(); } });
$("lfEx").innerHTML = GROUPS.map(g => `<optgroup label="${g}">${CAT.filter(c => c[1] === g).map(c => `<option>${esc(c[0])}</option>`).join("")}</optgroup>`).join("");
$("lfD").value = today();
["lfW","lfR","lfEx"].forEach(id => $(id).addEventListener("input", liftHint));
$("lfEx").addEventListener("change", () => { lfLabel(); if (EX[$("lfEx").value] && EX[$("lfEx").value].f) $("lfW").value = 0; liftHint(); });
$("bodyRank").addEventListener("click", e => {
  const m = e.target.closest("[data-m]"), r = e.target.closest("[data-rk]");
  if (m){ ui.muscle = m.dataset.m; renderBodySel(); }
  if (r){ ui.rkEx = r.dataset.rk; ui.rkGroup = "All"; $("lranks").open = true; renderLiftRanks(); setTimeout(() => { const t = $("lrGrid").querySelector(`[data-rk="${CSS.escape(r.dataset.rk)}"]`); if (t) t.scrollIntoView({block:"nearest"}); $("lrDet").scrollIntoView({behavior:"smooth", block:"center"}); }, 60); }
});
$("lrSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ ui.rkGroup = b.dataset.v; renderLiftRanks(); } });
$("lrGrid").addEventListener("click", e => { const b = e.target.closest("[data-rk]"); if (b){ ui.rkEx = b.dataset.rk; renderLiftRanks(); if (matchMedia("(max-width:860px)").matches) $("lrDet").scrollIntoView({behavior:"smooth", block:"nearest"}); } });
$("lrDet").addEventListener("click", e => { const b = e.target.closest("[data-logit]"); if (b){ $("lfEx").value = b.dataset.logit; lfLabel(); if (EX[b.dataset.logit].f) $("lfW").value = 0; liftHint(); $("lfW").focus(); $("liftForm").scrollIntoView({behavior:"smooth", block:"center"}); } });
$("liftForm").addEventListener("submit", e => {
  e.preventDefault();
  const l = {id:uid8(), date:$("lfD").value || today(), ex:$("lfEx").value, kg:Math.max(0, fromU(num($("lfW").value))), reps:num($("lfR").value,1), sets:num($("lfS").value,1)};
  const bwMove = !!(EX[l.ex] && EX[l.ex].f);
  if (!(l.kg > 0) && !bwMove) return;
  const pr = e1rm(load(l),l.reps) > best(l.ex), before = logRank(l.ex), bBefore = bodyRanks();
  state.lifts.push(l); ui.ex = l.ex; ui.rkEx = l.ex;
  const after = logRank(l.ex), bAfter = bodyRanks(), bq = [];
  MUSCLES.forEach(([k]) => { const a = bAfter.m[k].rk, b = bBefore.m[k].rk; if (a && (!b || a.i > b.i)) bq.push({kind: b ? "rank" : "unlock", rk:a, prev:b, lift:a.lift, muscle:k, pfFrom:0, pfTo:0, note:`Your ${a.lift.toLowerCase()} ${b ? "climbed from " + b.label + " to " : "is now ranked "}${a.label} on your body map.`}); });
  if (bAfter.rk && (!bBefore.rk || bAfter.rk.score > bBefore.rk.score)) bq.push({kind: !bBefore.rk ? "unlock" : bAfter.rk.i > bBefore.rk.i ? "rank" : "tier", rk:bAfter.rk, prev:bBefore.rk, lift:"Body", pfFrom:0, pfTo:0, note:`Your overall body rank is now ${bAfter.rk.label}.`});
  if (bq.length) setTimeout(() => celebrate(bq.slice(-3)), 400);
  if (after && (!before || after.score > before.score)){
    const how = bwMove ? `${l.kg > 0 ? "Bodyweight + " + WU(l.kg) : "Bodyweight"} for ${l.reps} rep${l.reps === 1 ? "" : "s"}` : `${WU(l.kg)} for ${l.reps} rep${l.reps === 1 ? "" : "s"}`;
    setTimeout(() => celebrate([{kind: !before ? "unlock" : after.i > before.i ? "rank" : "tier", rk:after, prev:before, lift:l.ex, pfFrom:0, pfTo:0,
      note: `${how} ranks your ${l.ex.toLowerCase()} ${after.label}${before ? " (was " + before.label + ")" : ""}.`}]), 350);
  }
  commit(pr ? `New best on ${l.ex}: ${WU(e1rm(load(l),l.reps))} est. 1RM. +10 XP` : `Logged ${l.ex} ${setTxt(l)} × ${l.reps} × ${l.sets}. +10 XP`);
});
$("recent").addEventListener("click", e => { const b = e.target.closest("[data-del-lift]"); if (b){ state.lifts = state.lifts.filter(l => l.id !== b.dataset.delLift); commit("Set deleted"); } });
["ffP","ffC","ffF"].forEach(id => $(id).addEventListener("input", updateCal));
$("foodForm").addEventListener("submit", e => { e.preventDefault(); state.foods.push({id:uid8(), date:today(), name:$("ffN").value.trim() || "Food", p:num($("ffP").value), c:num($("ffC").value), f:num($("ffF").value)}); $("ffN").value = ""; commit("Added to today"); });
$("foodToday").addEventListener("click", e => { const b = e.target.closest("[data-del-food]"); if (b){ state.foods = state.foods.filter(f => f.id !== b.dataset.delFood); commit("Entry deleted"); } });
$("goalForm").addEventListener("submit", e => { e.preventDefault(); state.goals = {k:num($("gK").value), p:num($("gP").value), c:num($("gC").value), f:num($("gF").value)}; commit("Targets saved"); });
$("profForm").addEventListener("submit", async e => {
  e.preventDefault();
  state.profile = {tag:$("pN").value.trim().slice(0,20), bw:fromU(num($("pB").value))};
  const pr = myPr();
  if (pr){ const doc = Object.assign({}, pr, {tag:state.profile.tag}); if (cloud){ try { await db.doc("prs/"+myId).set(JSON.parse(JSON.stringify(doc))); } catch(err){} } else state.localPr = doc; }
  commit("Profile saved");
});
$("unitSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ state.settings.unit = b.dataset.v; commit("Showing weights in " + b.dataset.v); } });
$("modeSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ state.settings.mode = b.dataset.v; applyTheme(); commit(); } });
$("swatches").addEventListener("click", e => { const b = e.target.closest("[data-theme-k]"); if (b){ state.settings.graph = b.dataset.themeK; applyTheme(); commit("Graph theme: " + THEMES[b.dataset.themeK].name); } });
$("botSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ ui.bots = b.dataset.v === "on"; try { localStorage.setItem(KEY+".bots", b.dataset.v); } catch(err){} renderAll(); } });
$("clearSample").addEventListener("click", () => { state.lifts = state.lifts.filter(l => !l.sample); state.foods = state.foods.filter(f => !f.sample); commit("Sample data removed"); });
$("loadSample").addEventListener("click", () => { const s = seed(); state.lifts = s.lifts; state.foods = s.foods; commit("Sample training data loaded"); });
$("wipe").addEventListener("click", () => { $("wipe").hidden = true; $("wipeYes").hidden = false; });
$("wipeYes").addEventListener("click", () => { state.lifts = []; state.foods = []; commit("Training data deleted"); });
mq.addEventListener("change", renderCharts);
let rz; new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(renderCharts, 60); }).observe(document.body);

applyTheme();
if (state.lastClaim && state.lastClaim.lift) ui.claimLift = state.lastClaim.lift;
if (state.localPr) syncSeen(state.localPr);
let start = "arena";
try { start = localStorage.getItem(KEY+".tab") || "arena"; } catch(e){}
const h = location.hash.slice(1); if (["arena","train","fuel","squad","profile"].includes(h)) start = h;
const rm = /ref=([A-Za-z0-9]{6})/.exec(location.hash + location.search); if (rm) ui.pendingRef = rm[1].toUpperCase();
if (checkStreak()) save();
setTab(start);
setTimeout(showDaily, 1200);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderCharts);
})();
