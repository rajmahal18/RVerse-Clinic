"use client";

import { useState } from "react";

export function MedicineScheduleFields() {
  const [frequencyMode, setFrequencyMode] = useState("ONCE_DAILY");
  const [durationMode, setDurationMode] = useState("DAYS");

  return (
    <>
      <div className="grid gap-2">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="frequencyMode">Frequency</label>
        <select
          id="frequencyMode"
          name="frequencyMode"
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
              name="frequencyHours"
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
            <input name="frequencyOther" required className="h-10 rounded-xl border px-3 text-sm font-normal" placeholder="Custom frequency" />
          </label>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="durationMode">Duration</label>
        <select
          id="durationMode"
          name="durationMode"
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
              name="durationValue"
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
