"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

export function InventoryControls({
  search,
  month,
  expiry,
  sort,
  category,
  showExpiry,
  medicineLike,
}: {
  search: string;
  month: string;
  expiry: string;
  sort: string;
  category: string;
  showExpiry: boolean;
  medicineLike: boolean;
}) {
  const router = useRouter();

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (month) params.set("month", month);
    if (category) params.set("category", category);
    params.set("expiry", showExpiry ? (key === "expiry" ? value : expiry) : "all");
    params.set("sort", key === "sort" ? value : sort);
    router.push(`/inventory?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-white px-3 py-3 sm:flex-row sm:items-end">
      <div className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 sm:grid">
        <SlidersHorizontal className="h-4 w-4" />
      </div>
      {showExpiry ? (
        <label className="grid min-w-0 flex-1 gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
          Expiry
          <select value={expiry} onChange={(e) => update("expiry", e.target.value)} className="h-10 rounded-xl border bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800">
            <option value="all">All batches</option>
            <option value="expired">Expired</option>
            <option value="1">Expires within 1 month</option>
            <option value="3">Expires within 3 months</option>
            <option value="6">Expires within 6 months</option>
          </select>
        </label>
      ) : null}
      <label className="grid min-w-0 flex-1 gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        Sort by
        <select value={sort} onChange={(e) => update("sort", e.target.value)} className="h-10 rounded-xl border bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800">
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
          {showExpiry ? <option value="expiry_asc">Expiry soonest</option> : null}
          {showExpiry ? <option value="expiry_desc">Expiry latest</option> : null}
          <option value="stock_asc">Stock lowest</option>
          <option value="stock_desc">Stock highest</option>
          {medicineLike ? <option value="brand_asc">Brand A-Z</option> : null}
          {medicineLike ? <option value="classification_asc">Classification A-Z</option> : null}
        </select>
      </label>
    </div>
  );
}
