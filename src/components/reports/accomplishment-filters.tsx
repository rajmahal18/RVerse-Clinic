"use client";
import { FormFeedback } from "@/components/ui/form-feedback";

import { useState } from "react";
import { reportPeriods, type ReportPeriod } from "@/lib/report-period";

export function AccomplishmentFilters({
  period,
  date,
  month,
  year,
  thresholds,
}: {
  period: ReportPeriod;
  date: string;
  month: string;
  year: string;
  thresholds: Record<string, number>;
}) {
  const [selected, setSelected] = useState(period);
  const inputClass =
    "h-10 w-full min-w-0 rounded-lg border bg-white px-3 text-sm text-slate-800";
  return (
    <form
      action="/reports/monthly"
      className="flex w-full min-w-0 flex-wrap items-end gap-2 sm:w-auto"
    >
      <FormFeedback />
      <input type="hidden" name="tab" value="accomplishment" />
      {Object.entries(thresholds).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label className="grid min-w-0 flex-1 gap-1 text-xs font-semibold text-slate-500 sm:flex-none">
        Period
        <select
          name="period"
          value={selected}
          onChange={(event) => setSelected(event.target.value as ReportPeriod)}
          className={inputClass}
        >
          {reportPeriods.map((value) => (
            <option key={value} value={value}>
              {value === "all-time"
                ? "All time"
                : value[0].toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </label>
      {selected === "daily" || selected === "weekly" ? (
        <label className="grid min-w-0 flex-1 gap-1 text-xs font-semibold text-slate-500 sm:flex-none">
          {selected === "weekly" ? "Date within week (Mon–Sun)" : "Report date"}
          <input
            key="date"
            type="date"
            name="date"
            defaultValue={date}
            min="1900-01-01"
            max="2199-12-31"
            required
            className={inputClass}
          />
        </label>
      ) : selected === "monthly" ? (
        <label className="grid min-w-0 flex-1 gap-1 text-xs font-semibold text-slate-500 sm:flex-none">
          Report month
          <input
            key="month"
            type="month"
            name="month"
            defaultValue={month}
            min="1900-01"
            max="2199-12"
            required
            className={inputClass}
          />
        </label>
      ) : selected === "yearly" ? (
        <label className="grid min-w-0 flex-1 gap-1 text-xs font-semibold text-slate-500 sm:flex-none">
          Report year
          <input
            key="year"
            type="number"
            name="year"
            defaultValue={year}
            min="1900"
            max="2199"
            required
            className={`${inputClass} sm:w-28`}
          />
        </label>
      ) : null}
      <button className="h-10 rounded-lg border bg-white px-4 text-sm font-semibold text-primary">
        View
      </button>
    </form>
  );
}
