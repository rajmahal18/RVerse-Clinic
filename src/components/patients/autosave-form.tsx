"use client";

import { useRef, useState } from "react";

type Action = (formData: FormData) => void | Promise<void>;
type AutosaveAction = (formData: FormData) => Promise<{ ok: boolean }>;

export function AutosaveForm({ action, autosaveAction, className, children }: { action: Action; autosaveAction: AutosaveAction; className?: string; children: React.ReactNode }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = useRef(0);
  const [state, setState] = useState("Saved");

  function handleInput(event: React.FormEvent<HTMLFormElement>) {
    if (timer.current) clearTimeout(timer.current);
    const form = event.currentTarget;
    const currentVersion = ++version.current;
    setState("Saving...");
    timer.current = setTimeout(async () => {
      const result = await autosaveAction(new FormData(form));
      if (currentVersion !== version.current) return;
      setState(result.ok ? "Saved" : "Not saved");
    }, 900);
  }

  function handleSubmit() {
    if (timer.current) clearTimeout(timer.current);
    version.current += 1;
  }

  return <form action={action} className={className} onInput={handleInput} onSubmit={handleSubmit}>{children}<span className="text-xs font-semibold text-slate-500" aria-live="polite">{state}</span></form>;
}
