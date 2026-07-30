"use client";

import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";

type ActivityLogFiltersProps = {
  modules: string[];
  statuses: string[];
  selectedModule: string;
  selectedStatus: string;
  range: string;
  from: string;
  to: string;
};

export function ActivityLogFilters({
  modules,
  statuses,
  selectedModule,
  selectedStatus,
  range,
  from,
  to,
}: ActivityLogFiltersProps) {
  const router = useRouter();

  function applySelectFilters(nextModule: string, nextStatus: string) {
    const params = new URLSearchParams({ range });
    if (range === "custom") {
      params.set("from", from);
      params.set("to", to);
    }
    if (nextModule) params.set("module", nextModule);
    if (nextStatus) params.set("status", nextStatus);
    router.push(`/activity-logs?${params.toString()}`);
  }

  return (
    <form className="grid w-full grid-cols-1 gap-2 rounded-2xl border bg-white p-2 sm:w-auto sm:grid-cols-[2.5rem_9.5rem_8rem_9.5rem_9.5rem_auto] sm:items-end">
      <div className="hidden h-10 w-10 items-center justify-center rounded-xl border bg-white text-slate-500 sm:flex" aria-label="Filters">
        <Filter className="h-4 w-4" />
      </div>
      <input type="hidden" name="range" value="custom" />
      <select
        name="module"
        value={selectedModule}
        onChange={(event) => applySelectFilters(event.target.value, selectedStatus)}
        className="h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="Module"
      >
        <option value="">All modules</option>
        {modules.map((module) => (
          <option key={module} value={module}>
            {module}
          </option>
        ))}
      </select>
      <select
        name="status"
        value={selectedStatus}
        onChange={(event) => applySelectFilters(selectedModule, event.target.value)}
        className="h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="Status"
      >
        <option value="">All status</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        From
        <input
          name="from"
          type="date"
          defaultValue={from}
          className="h-10 rounded-xl border px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        To
        <input
          name="to"
          type="date"
          defaultValue={to}
          className="h-10 rounded-xl border px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <button type="submit" className="h-10 rounded-xl bg-primary px-4 text-sm font-bold text-white">
        Apply
      </button>
    </form>
  );
}
