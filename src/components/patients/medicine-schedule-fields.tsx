"use client";

import { useEffect, useRef, useState } from "react";

export function MedicineScheduleFields({
  prefix = "",
  initialValues,
}: {
  prefix?: string;
  initialValues?: Record<string, string[]>;
}) {
  const ref = useRef<HTMLSelectElement>(null);
  const [frequencyMode, setFrequencyMode] = useState("ONCE_DAILY");
  const [durationMode, setDurationMode] = useState("DAYS");

  useEffect(() => {
    if (initialValues?.[prefix + "frequencyMode"])
      setFrequencyMode(initialValues[prefix + "frequencyMode"][0]);
    if (initialValues?.[prefix + "durationMode"])
      setDurationMode(initialValues[prefix + "durationMode"][0]);
  }, [initialValues, prefix]);
  useEffect(() => {
    const form = ref.current?.closest("form");
    const restore = (event: Event) => {
      const data = (event as CustomEvent<Record<string, string[]>>).detail;
      if (data[prefix + "frequencyMode"])
        setFrequencyMode(data[prefix + "frequencyMode"][0]);
      if (data[prefix + "durationMode"])
        setDurationMode(data[prefix + "durationMode"][0]);
    };
    form?.addEventListener("restore-draft", restore);
    return () => form?.removeEventListener("restore-draft", restore);
  }, []);

  return (
    <>
      <div className="grid gap-2">
        <label
          className="text-xs font-bold uppercase tracking-wide text-slate-500"
          htmlFor={prefix + "frequencyMode"}
        >
          Frequency
        </label>
        <select
          ref={ref}
          id={prefix + "frequencyMode"}
          name={prefix + "frequencyMode"}
          value={frequencyMode}
          onChange={(event) => setFrequencyMode(event.target.value)}
          className="h-10 rounded-xl border px-3 text-sm"
        >
          <option value="ONCE_DAILY">Once daily</option>
          <option value="TWICE_DAILY">Twice daily</option>
          <option value="THREE_TIMES_DAILY">Three times daily</option>
          <option value="FOUR_TIMES_DAILY">Four times daily</option>
          <option value="EVERY_N_HOURS">Every N hours</option>
          <option value="AS_NEEDED">As needed</option>
          <option value="OTHER">Other</option>
        </select>
        {frequencyMode === "EVERY_N_HOURS" ? (
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Number of hours
            <input
              defaultValue={initialValues?.[prefix + "frequencyHours"]?.[0]}
              name={prefix + "frequencyHours"}
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              required
              className="h-10 rounded-xl border px-3 text-sm font-normal"
              placeholder="e.g. 6"
            />
          </label>
        ) : null}
        {frequencyMode === "OTHER" ? (
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Please specify
            <input
              defaultValue={initialValues?.[prefix + "frequencyOther"]?.[0]}
              name={prefix + "frequencyOther"}
              required
              className="h-10 rounded-xl border px-3 text-sm font-normal"
              placeholder="Custom frequency"
            />
          </label>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label
          className="text-xs font-bold uppercase tracking-wide text-slate-500"
          htmlFor={prefix + "durationMode"}
        >
          Duration
        </label>
        <select
          id={prefix + "durationMode"}
          name={prefix + "durationMode"}
          value={durationMode}
          onChange={(event) => setDurationMode(event.target.value)}
          className="h-10 rounded-xl border px-3 text-sm"
        >
          <option value="DAYS">Days</option>
          <option value="WEEKS">Weeks</option>
          <option value="MONTHS">Months</option>
          <option value="UNTIL_FINISHED">Until finished</option>
          <option value="AS_NEEDED">As needed</option>
        </select>
        {["DAYS", "WEEKS", "MONTHS"].includes(durationMode) ? (
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Number of {durationMode.toLowerCase()}
            <input
              defaultValue={initialValues?.[prefix + "durationValue"]?.[0]}
              name={prefix + "durationValue"}
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              required
              className="h-10 rounded-xl border px-3 text-sm font-normal"
              placeholder="e.g. 7"
            />
          </label>
        ) : null}
      </div>
    </>
  );
}
