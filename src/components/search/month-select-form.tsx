"use client";

import { useRouter } from "next/navigation";
import type { InventoryMonthOption } from "@/lib/patient-view";

type MonthSelectFormProps = {
  action: string;
  selectedMonth: string;
  options: InventoryMonthOption[];
  searchQuery?: string;
};

export function MonthSelectForm({ action, selectedMonth, options, searchQuery = "" }: MonthSelectFormProps) {
  const router = useRouter();

  function handleChange(value: string) {
    const params = new URLSearchParams();

    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }

    if (value.trim()) {
      params.set("month", value.trim());
    }

    const queryString = params.toString();
    router.push(queryString ? `${action}?${queryString}` : action);
  }

  return (
    <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        name="month"
        value={selectedMonth}
        onChange={(event) => handleChange(event.target.value)}
        className="h-10 rounded-xl border bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}
