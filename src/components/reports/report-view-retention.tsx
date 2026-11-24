"use client";

import { useEffect } from "react";

export function ReportViewRetention({ storageKey }: { storageKey: string }) {
  useEffect(() => {
    let frame = 0;
    let restoring = true;
    let saved = 0;
    const sourceUrl = location.pathname + location.search;
    let observed = window.scrollY;
    let written = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      saved = Number(sessionStorage.getItem(`${storageKey}:scroll`)) || 0;
      written = saved;
    } catch {
      /* Storage is optional. */
    }
    const save = () => {
      if (restoring) return;
      if (location.pathname + location.search === sourceUrl) observed = window.scrollY;
      if (observed === written) return;
      try {
        sessionStorage.setItem(`${storageKey}:scroll`, String(observed));
        written = observed;
      } catch {
        /* Storage is optional. */
      }
    };
    const onScroll = () => {
      if (restoring) return;
      observed = window.scrollY;
      if (!timer) timer = setTimeout(() => { timer = null; save(); }, 120);
    };
    const first = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (saved > 0) window.scrollTo({ top: saved, behavior: "instant" });
        observed = window.scrollY;
        restoring = false;
      });
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    document.addEventListener("click", save, true);
    return () => {
      save();
      cancelAnimationFrame(first);
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("click", save, true);
    };
  }, [storageKey]);
  return null;
}
