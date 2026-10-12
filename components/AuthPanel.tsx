"use client";

import { FormEvent, useEffect, useState } from "react";

interface Me { user: { id: string; name: string } | null; persistent?: boolean }

export default function AuthPanel() {
  const [me, setMe] = useState<Me | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" }).then(r => r.json()).then(setMe).catch(() => setMe({ user: null }));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch(mode === "signup" ? "/api/signup" : "/api/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || "Something went wrong."); setBusy(false); return; }
      location.reload();
    } catch { setErr("Couldn't reach the server."); setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    location.reload();
  }

  if (!me) return null;
  const warn = me.persistent === false
    ? <p className="authnote">Heads up: no database is connected, so accounts reset whenever the server restarts. Connect Neon and Vercel Blob as described in the README.</p>
    : null;

  if (me.user) {
    return (
      <div className="authbox">
        <button className="btn sm" type="button" onClick={signOut} disabled={busy}>Sign out</button>
        {warn}
      </div>
    );
  }
  return (
    <form className="authbox" onSubmit={submit} autoComplete="on">
      <div className="seg" role="group" aria-label="Account">
        <button type="button" aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setErr(""); }}>Create account</button>
        <button type="button" aria-pressed={mode === "login"} onClick={() => { setMode("login"); setErr(""); }}>Sign in</button>
      </div>
      <label className="fld"><span style={{fontSize:"12.5px",color:"var(--muted)",fontWeight:500}}>Username</span>
        <input name="username" value={name} onChange={e => setName(e.target.value)} autoComplete="username" minLength={3} maxLength={20} required />
      </label>
      <label className="fld"><span style={{fontSize:"12.5px",color:"var(--muted)",fontWeight:500}}>Password</span>
        <input name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required />
      </label>
      {err ? <p className="autherr" role="alert">{err}</p> : null}
      <button className="btn go" type="submit" disabled={busy}>{mode === "signup" ? "Create account" : "Sign in"}</button>
      <p className="authnote">An account syncs your log across devices and posts your PRs to the shared leaderboard.</p>
      {warn}
    </form>
  );
}
