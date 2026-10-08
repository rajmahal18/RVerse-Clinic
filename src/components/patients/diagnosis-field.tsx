"use client";
import { useEffect, useRef, useState } from "react";
import { diagnosisStatusLabels } from "@/lib/diagnoses";
const normal = "Essentially normal P.E. findings at the time of examination.";
type Choice = { diseaseId: string; status: string };
const emptyChoices: Choice[] = [];
type Disease = { id: string; name: string; isActive: boolean };
export function DiagnosisField({
  initialValue,
  initialNotes = "",
  physicalExam = "",
  structured = false,
  selections = emptyChoices,
  disabled,
  diseases = [],
}: {
  initialValue: string;
  initialNotes?: string;
  physicalExam?: string;
  structured?: boolean;
  selections?: Choice[];
  disabled: boolean;
  diseases?: Disease[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const [selected, setSelected] = useState<Choice[]>(selections);
  const [finding, setFinding] = useState(physicalExam);
  const [notes, setNotes] = useState(structured ? initialNotes : initialValue);
  const [search, setSearch] = useState("");
  useEffect(() => {
    setSelected(selections);
    setFinding(physicalExam);
    setNotes(structured ? initialNotes : initialValue);
  }, [initialValue, initialNotes, physicalExam, structured, selections]);
  useEffect(() => {
    const form = ref.current?.closest("form");
    const restore = (event: Event) => {
      if (disabled) return;
      const data = (event as CustomEvent<Record<string, string[]>>).detail;
      if (data.diagnosisSelections) {
        try {
          setSelected(JSON.parse(data.diagnosisSelections[0]));
        } catch {}
      }
      if (data.physicalExam) setFinding(data.physicalExam[0]);
      if (data.diagnosisNotes) setNotes(data.diagnosisNotes[0]);
    };
    form?.addEventListener("restore-draft", restore);
    return () => form?.removeEventListener("restore-draft", restore);
  }, [disabled]);
  const encoded = JSON.stringify(selected);
  useEffect(() => {
    if (mounted.current)
      ref.current?.dispatchEvent(new Event("input", { bubbles: true }));
    else mounted.current = true;
  }, [encoded, finding, notes]);
  const visible = diseases.filter(
    (d) =>
      (d.isActive || selected.some((s) => s.diseaseId === d.id)) &&
      (selected.some((s) => s.diseaseId === d.id) ||
        d.name.toLowerCase().includes(search.toLowerCase())),
  );
  return (
    <section
      ref={ref}
      className="grid min-w-0 gap-3"
      aria-label="Diagnosis and findings"
    >
      <h3 className="text-sm font-semibold text-slate-700">
        Diagnosis / Findings{" "}
        <span className="text-xs font-normal text-slate-500">Doctor</span>
      </h3>
      <input
        type="hidden"
        name="diagnosisSelections"
        value={encoded}
        disabled={disabled}
      />
      <input
        type="hidden"
        name="physicalExam"
        value={finding}
        disabled={disabled}
      />
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          disabled={disabled}
          checked={finding === normal}
          onChange={(e) => setFinding(e.target.checked ? normal : "")}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        {normal}
      </label>
      {finding && finding !== normal ? (
        <label className="grid gap-1 text-sm">
          Existing P.E. findings
          <textarea
            disabled={disabled}
            value={finding}
            onChange={(e) => setFinding(e.target.value)}
            className="min-h-20 rounded-lg border p-2"
          />
        </label>
      ) : null}
      {!disabled ? (
        <input
          aria-label="Search diseases"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search disease master list"
          className="min-w-0 rounded-lg border p-2 text-sm"
        />
      ) : null}
      <div className="max-h-72 divide-y overflow-y-auto overscroll-contain">
        {visible.map((d) => {
          const choice = selected.find((s) => s.diseaseId === d.id);
          return (
            <div
              key={d.id}
              className="grid gap-2 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <label className="flex min-w-0 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={disabled || (!d.isActive && !choice)}
                  checked={Boolean(choice)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, { diseaseId: d.id, status: "" }]
                        : selected.filter((s) => s.diseaseId !== d.id),
                    )
                  }
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <span className="min-w-0 flex-1 break-words">
                  {d.name}
                  {!d.isActive ? (
                    <span className="ml-1 text-xs text-slate-400">
                      Archived
                    </span>
                  ) : null}
                </span>
              </label>
              {choice ? (
                <select
                  required
                  disabled={disabled}
                  aria-label={"Status for " + d.name}
                  value={choice.status}
                  onChange={(e) =>
                    setSelected(
                      selected.map((s) =>
                        s.diseaseId === d.id
                          ? { ...s, status: e.target.value }
                          : s,
                      ),
                    )
                  }
                  className="min-w-0 rounded-lg border p-2 text-xs"
                >
                  <option value="">Select status</option>
                  {Object.entries(diagnosisStatusLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          );
        })}
      </div>
      {!visible.length ? (
        <p className="text-xs text-slate-500">
          {diseases.length
            ? "No matching diseases."
            : "No diseases added yet. Admin can manage the master list in Settings."}
        </p>
      ) : null}
      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        Others / Additional findings
        <textarea
          name="diagnosisNotes"
          disabled={disabled}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-24 rounded-xl border p-3 font-normal"
          placeholder="Additional findings or existing diagnosis text"
        />
      </label>
      {!structured && initialValue ? (
        <p className="text-xs text-slate-500">
          Existing text is preserved here. Disease selections must be recorded
          explicitly.
        </p>
      ) : null}
    </section>
  );
}
