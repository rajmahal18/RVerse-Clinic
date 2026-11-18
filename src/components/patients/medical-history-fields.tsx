"use client";
import { useRef, useState } from "react";
import {
  maintenanceLines,
  type VaccineHistoryEntry,
} from "@/lib/patient-medical-info";
import { Button } from "@/components/ui/button";

export function MaintenanceField({
  initialValue = "",
}: {
  initialValue?: string;
}) {
  const ref = useRef<HTMLFieldSetElement>(null);
  const [lines, setLines] = useState(() => maintenanceLines(initialValue));
  return (
    <fieldset ref={ref} className="grid min-w-0 gap-2">
      <legend className="mb-2 text-sm font-semibold">Maintenance</legend>
      <input
        type="hidden"
        name="maintenance"
        value={lines
          .map((s) => s.trim())
          .filter(Boolean)
          .join("\n")}
      />
      {lines.map((line, index) => (
        <div key={index} className="flex min-w-0 items-center gap-2">
          <span aria-hidden>•</span>
          <input
            aria-label={`Maintenance item ${index + 1}`}
            value={line}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setLines((current) => [
                  ...current.slice(0, index + 1),
                  "",
                  ...current.slice(index + 1),
                ]);
                requestAnimationFrame(() =>
                  ref.current
                    ?.querySelectorAll<HTMLInputElement>("input[aria-label]")
                    [index + 1]?.focus(),
                );
              }
            }}
            onChange={(e) =>
              setLines((current) =>
                current.map((value, i) =>
                  i === index ? e.target.value : value,
                ),
              )
            }
            className="h-11 w-full min-w-0 rounded-lg border px-3 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            aria-label={`Remove maintenance item ${index + 1}`}
            onClick={() =>
              setLines((current) => current.filter((_, i) => i !== index))
            }
          >
            ×
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => setLines((current) => [...current, ""])}
      >
        Add maintenance item
      </Button>
    </fieldset>
  );
}

export function VaccineHistoryFields({
  initialEntries = [],
  legacyHistory = "",
}: {
  initialEntries?: VaccineHistoryEntry[];
  legacyHistory?: string;
}) {
  const [entries, setEntries] = useState<VaccineHistoryEntry[]>(initialEntries);
  function update(
    index: number,
    key: keyof VaccineHistoryEntry,
    value: string,
  ) {
    setEntries((current) =>
      current.map((entry, i) =>
        i === index ? { ...entry, [key]: value } : entry,
      ),
    );
  }
  return (
    <fieldset className="grid min-w-0 gap-3 md:col-span-2">
      <legend className="mb-2 text-sm font-semibold">Vaccine History</legend>
      <input
        type="hidden"
        name="vaccineHistoryEntries"
        value={JSON.stringify(entries)}
      />
      <datalist id="vaccine-history-names">
        {[
          "COVID 19",
          "Flu",
          "HPV",
          "Pneumococcal",
          "Hepatitis B",
          "Tetanus",
        ].map((name) => (
          <option key={name}>{name}</option>
        ))}
      </datalist>
      {entries.map((entry, index) => (
        <div
          key={index}
          className="grid min-w-0 gap-2 border-b pb-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <label className="grid min-w-0 gap-1 text-xs font-semibold">
            Vaccine name
            <input
              list="vaccine-history-names"
              required
              value={entry.vaccine}
              onChange={(e) => update(index, "vaccine", e.target.value)}
              className="h-11 w-full min-w-0 rounded-lg border px-2 text-sm"
            />
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-semibold">
            Dose / Booster
            <input
              value={entry.dose}
              onChange={(e) => update(index, "dose", e.target.value)}
              placeholder="1st / Booster 1"
              className="h-11 w-full min-w-0 rounded-lg border px-2 text-sm"
            />
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-semibold">
            Date given
            <input
              type="date"
              value={entry.date}
              onChange={(e) => update(index, "date", e.target.value)}
              className="h-11 w-full min-w-0 rounded-lg border px-2 text-sm"
            />
          </label>
          <Button
            type="button"
            variant="ghost"
            className="self-end"
            aria-label={`Remove vaccine history entry ${index + 1}`}
            onClick={() =>
              setEntries((current) => current.filter((_, i) => i !== index))
            }
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        onClick={() =>
          setEntries((current) => [
            ...current,
            { vaccine: "", dose: "", date: "" },
          ])
        }
      >
        Add vaccine history
      </Button>
      <label className="grid min-w-0 gap-1 text-sm font-semibold">
        Previous vaccine history / notes
        <textarea
          name="vaccineHistory"
          defaultValue={legacyHistory}
          className="min-h-20 w-full min-w-0 rounded-lg border p-2 font-normal"
        />
      </label>
    </fieldset>
  );
}
