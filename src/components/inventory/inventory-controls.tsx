"use client";

import { useRouter } from "next/navigation";

export function InventoryControls({
  search,
  month,
  expiry,
  sort,
  category,
}: {
  search: string;
  month: string;
  expiry: string;
  sort: string;
  category: string;
}) {
  const router = useRouter();

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (month) params.set("month", month);
    if (category) params.set("category", category);
    params.set("expiry", key === "expiry" ? value : expiry);
    params.set("sort", key === "sort" ? value : sort);
    router.push(`/inventory?${params.toString()}`);
  }

  return (
    <div className="grid gap-2 rounded-2xl border bg-white p-3 sm:grid-cols-2">
      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        Expiry filter
        <select value={expiry} onChange={(e) => update("expiry", e.target.value)} className="h-10 rounded-xl border px-3 text-sm font-normal normal-case tracking-normal text-slate-800">
          <option value="all">All batches</option>
          <option value="expired">Expired</option>
          <option value="1">Will expire within 1 month</option>
          <option value="3">Will expire within 3 months</option>
          <option value="6">Will expire within 6 months</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        Sort by
        <select value={sort} onChange={(e) => update("sort", e.target.value)} className="h-10 rounded-xl border px-3 text-sm font-normal normal-case tracking-normal text-slate-800">
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
          <option value="expiry_asc">Expiry soonest</option>
          <option value="expiry_desc">Expiry latest</option>
          <option value="stock_asc">Stock lowest</option>
          <option value="stock_desc">Stock highest</option>
          <option value="brand_asc">Brand A-Z</option>
          <option value="classification_asc">Classification A-Z</option>
        </select>
      </label>
    </div>
  );
}
