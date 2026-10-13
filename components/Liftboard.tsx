"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { MARKUP } from "@/lib/markup";
import AuthPanel from "./AuthPanel";
import FoodSearch from "./FoodSearch";

declare global { interface Window { __liftboardLoaded?: boolean } }

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error("Failed to load " + src));
    document.body.appendChild(s);
  });
}

export default function Liftboard() {
  const html = useMemo(() => ({ __html: MARKUP }), []);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [foodSlot, setFoodSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById("authSlot"));
    setFoodSlot(document.getElementById("foodSlot"));
    // The prototype script runs once against the static markup. Guard against
    // React strict-mode double effects and client-side remounts.
    if (window.__liftboardLoaded) return;
    window.__liftboardLoaded = true;
    loadScript("/shim.js").then(() => loadScript("/liftboard.js")).catch(() => { window.__liftboardLoaded = false; });
  }, []);

  return (
    <>
      <div dangerouslySetInnerHTML={html} suppressHydrationWarning />
      {slot ? createPortal(<AuthPanel />, slot) : null}
      {foodSlot ? createPortal(<FoodSearch />, foodSlot) : null}
    </>
  );
}
