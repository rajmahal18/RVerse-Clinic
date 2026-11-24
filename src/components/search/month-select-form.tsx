"use client";
import { FormFeedback } from "@/components/ui/form-feedback";


import { useFeedbackRouter as useRouter } from "@/components/navigation/use-feedback-router";
import type { InventoryMonthOption } from "@/lib/patient-view";

type MonthSelectFormProps = {
  action: string;
  selectedMonth: string;
  options: InventoryMonthOption[];
  searchQuery?: string;
  preserveParams?: Record<string, string>;
};

export function MonthSelectForm({ action, selectedMonth, options, searchQuery = "", preserveParams = {} }: MonthSelectFormProps) {
  const router = useRouter();

  function handleChange(value: string) {
    const params = new URLSearchParams();
    Object.entries(preserveParams).forEach(([key, preservedValue]) => preservedValue && params.set(key, preservedValue));

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
      <FormFeedback />
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
