"use client";

import { useEffect, useRef, useState } from "react";
import { saveFormDraftAction } from "@/app/actions/workflow";

type Action = (formData: FormData) => void | Promise<void>;
type AutosaveAction = (formData: FormData) => Promise<{ ok: boolean }>;

export function AutosaveForm({
  action,
  autosaveAction = saveFormDraftAction,
  draftKey = "visit",
  visitId,
  className,
  children,
}: {
  action: Action;
  autosaveAction?: AutosaveAction;
  draftKey?: string;
  visitId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef(Promise.resolve());
  const submitted = useRef(false);
  const latest = useRef<FormData | null>(null);
  const storageKey = useRef("");
  const restoring = useRef(false);
  const version = useRef(0);
  const [state, setState] = useState("Draft autosave ready");

  function save(data: FormData, currentVersion: number) {
    queue.current = queue.current.then(async () => {
      if (submitted.current) return;
      try {
        const result = await autosaveAction(data);
        if (currentVersion === version.current)
          setState(
            result.ok ? "Draft saved" : "Draft not saved — please retry",
          );
      } catch {
        if (currentVersion === version.current)
          setState("Draft not saved — please retry");
      }
    });
    return queue.current;
  }

  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    submitted.current = false;
    latest.current = null;
    storageKey.current = "";
    restoring.current = false;
    version.current += 1;
    let cancelled = false;
    const initialVersion = version.current;
    const data = new FormData(form);
    void fetch(
      `/api/form-drafts?visitId=${encodeURIComponent(String(data.get("visitId") ?? ""))}&key=${encodeURIComponent(draftKey)}`,
      { cache: "no-store" },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((result) => {
        if (cancelled || !result) return;
        storageKey.current = `clinic-draft:${result.userId}:${data.get("visitId")}:${draftKey}`;
        if (version.current !== initialVersion) return;
        let values = result.values as Record<string, string[]>;
        try {
          const local = JSON.parse(
            sessionStorage.getItem(storageKey.current) || "null",
          );
          if (
            local &&
            local.at > Date.parse(result.updatedAt || result.visitUpdatedAt)
          )
            values = local.values;
        } catch {
          /* Server drafts work without browser storage. */
        }
        if (draftKey === "visit")
          for (const field of [
            "chiefComplaint",
            "bloodPressure",
            "temperature",
            "pulseRate",
            "respiratoryRate",
            "rbs",
            "diagnosis",
            "progressNotes",
            "physicalExam",
            "treatmentPlan",
            "intakeNotes",
            "diagnosisNotes",
          ]) {
            if (!result.editableFields?.includes(field)) delete values[field];
          }
        if (draftKey === "visit" && !result.editableFields?.includes("diagnosis")) delete values.diagnosisSelections;
        restoring.current = true;
        form.dispatchEvent(
          new CustomEvent("restore-draft", { detail: values }),
        );
        const restoreInputs = () => {
          for (const element of Array.from(form.elements)) {
            if (
              !(
                element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement ||
                element instanceof HTMLSelectElement
              ) ||
              element.disabled ||
              !values[element.name]
            )
              continue;
            if (
              element instanceof HTMLInputElement &&
              element.type === "hidden"
            )
              continue;
            const items = values[element.name];
            if (
              element instanceof HTMLInputElement &&
              ["checkbox", "radio"].includes(element.type)
            )
              element.checked = items.includes(element.value);
            else {
              const prototype =
                element instanceof HTMLSelectElement
                  ? HTMLSelectElement.prototype
                  : element instanceof HTMLTextAreaElement
                    ? HTMLTextAreaElement.prototype
                    : HTMLInputElement.prototype;
              Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(
                element,
                items[0] ?? "",
              );
              element.dispatchEvent(new Event("input", { bubbles: true }));
              element.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }
        };
        restoreInputs();
        // Stateful selections may reveal conditional inputs on the next render.
        requestAnimationFrame(() => {
          restoreInputs();
          restoring.current = false;
        });
        if (Object.keys(values).length) setState("Draft restored");
      })
      .catch(() => {});
    const flush = () => {
      if (!submitted.current && latest.current)
        void fetch("/api/form-drafts", {
          method: "POST",
          body: latest.current,
          keepalive: true,
        }).catch(() => {});
    };
    window.addEventListener("pagehide", flush);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      if (latest.current && !submitted.current)
        void save(latest.current, version.current);
      window.removeEventListener("pagehide", flush);
    };
    // Each mounted form owns a draft and serial save queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, visitId]);

  function handleInput(event: React.FormEvent<HTMLFormElement>) {
    if (submitted.current || restoring.current) return;
    if (timer.current) clearTimeout(timer.current);
    latest.current = new FormData(event.currentTarget);
    const values: Record<string, string[]> = {};
    for (const element of Array.from(event.currentTarget.elements))
      if (
        element instanceof HTMLInputElement &&
        !element.disabled &&
        ["checkbox", "radio"].includes(element.type) &&
        element.name
      )
        values[element.name] = [];
    for (const [key, value] of latest.current)
      if (
        typeof value === "string" &&
        !["csrfToken", "patientId", "visitId", "draftKey"].includes(key) &&
        !key.startsWith("$")
      )
        (values[key] ??= []).push(value);
    try {
      if (storageKey.current)
        sessionStorage.setItem(
          storageKey.current,
          JSON.stringify({ at: Date.now(), values }),
        );
    } catch {
      /* Continue server autosave. */
    }
    const currentVersion = ++version.current;
    setState("Saving draft…");
    const data = latest.current;
    timer.current = setTimeout(() => void save(data, currentVersion), 600);
  }

  function handleSubmit() {
    if (timer.current) clearTimeout(timer.current);
    version.current += 1;
    submitted.current = true;
  }

  async function submit(data: FormData) {
    await queue.current;
    try {
      // Preserve the final keystroke even when submission validation fails.
      await autosaveAction(data);
      latest.current = null;
      await action(data);
    } finally {
      submitted.current = false;
    }
  }
  return (
    <form
      ref={ref}
      action={submit}
      className={`clinic-draft-form min-w-0 ${className ?? ""}`}
      onInput={handleInput}
      onChange={handleInput}
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="draftKey" value={draftKey} />
      {children}
      <span className="text-xs font-semibold text-slate-500" aria-live="polite">
        {state}
      </span>
    </form>
  );
}
