import Link from "next/link";
import { InventoryCategory } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { createInventoryItemAction } from "@/app/actions/workflow";
import { PageHeader } from "@/components/layout/page-header";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { AddInventoryItemModal } from "@/components/inventory/add-inventory-item-modal";
import { DebouncedSearchForm } from "@/components/search/debounced-search-form";
import { ActionAlert } from "@/components/ui/action-alert";
import { getInventoryLedgerData } from "@/lib/patient-view";

const inventoryCategories = [
  { value: InventoryCategory.MEDICINE, label: "Medicine" },
  { value: InventoryCategory.SUPPLY, label: "Medical Supplies" },
  { value: InventoryCategory.OFFICE_SUPPLY, label: "Office Supplies" },
  { value: InventoryCategory.VACCINE, label: "Vaccine" },
  { value: InventoryCategory.EQUIPMENT, label: "Medical Equipment" },
  { value: InventoryCategory.AMBULANCE_SUPPLY, label: "Ambulance Supplies" },
];

function categorySupportsExpiry(category: string) {
  return category === InventoryCategory.MEDICINE || category === InventoryCategory.VACCINE || category === InventoryCategory.SUPPLY;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; month?: string; expiry?: string; sort?: string; category?: string; error?: string; message?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const searchQuery = resolvedSearchParams?.q?.trim() ?? "";
  const selectedMonth = resolvedSearchParams?.month?.trim() ?? "";
  const requestedSort = resolvedSearchParams?.sort?.trim() ?? "name_asc";
  const selectedCategory = inventoryCategories.some((category) => category.value === resolvedSearchParams?.category)
    ? resolvedSearchParams?.category ?? InventoryCategory.MEDICINE
    : InventoryCategory.MEDICINE;
  const expiryFilter = categorySupportsExpiry(selectedCategory) ? resolvedSearchParams?.expiry?.trim() ?? "all" : "all";
  const medicineLike = selectedCategory === InventoryCategory.MEDICINE || selectedCategory === InventoryCategory.VACCINE;
  const sort = (!categorySupportsExpiry(selectedCategory) && requestedSort.startsWith("expiry_")) || (!medicineLike && ["brand_asc", "classification_asc"].includes(requestedSort))
    ? "name_asc"
    : requestedSort;
  const ledger = await getInventoryLedgerData(searchQuery, selectedMonth, expiryFilter, sort, selectedCategory);

  return (
    <AppShell>
      <PageHeader
        title="Inventory"
        actions={
          <>
            <DebouncedSearchForm
              action="/inventory"
              initialQuery={searchQuery}
              placeholder="Search item"
              preserveParams={{ month: selectedMonth, expiry: expiryFilter, sort, category: selectedCategory }}
            />
            <AddInventoryItemModal action={createInventoryItemAction} />
          </>
        }
      />
      <ActionAlert error={resolvedSearchParams?.error} message={resolvedSearchParams?.message} />
      <nav className="mb-4 flex max-w-full gap-1 overflow-x-auto border-b" aria-label="Inventory categories">
        {inventoryCategories.map((category) => {
          const nextExpiry = categorySupportsExpiry(category.value) ? expiryFilter : "all";
          const href = `/inventory?${new URLSearchParams({
            ...(searchQuery ? { q: searchQuery } : {}),
            ...(selectedMonth ? { month: selectedMonth } : {}),
            expiry: nextExpiry,
            sort,
            category: category.value,
          }).toString()}`;

          return (
            <Link
              key={category.value}
              href={href}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition ${
                selectedCategory === category.value
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-900"
              }`}
            >
              {category.label}
            </Link>
          );
        })}
      </nav>
      <InventoryTable ledger={ledger} searchQuery={searchQuery} />
    </AppShell>
  );
}
