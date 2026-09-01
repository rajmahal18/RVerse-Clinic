import { AppShell } from "@/components/layout/app-shell";
import { createInventoryItemAction } from "@/app/actions/workflow";
import { PageHeader } from "@/components/layout/page-header";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { AddInventoryItemModal } from "@/components/inventory/add-inventory-item-modal";
import { DebouncedSearchForm } from "@/components/search/debounced-search-form";
import { ActionAlert } from "@/components/ui/action-alert";
import { getInventoryLedgerData } from "@/lib/patient-view";
import { InventoryCategory } from "@prisma/client";

const inventoryCategories = [
  { value: InventoryCategory.MEDICINE, label: "Medicine" },
  { value: InventoryCategory.SUPPLY, label: "Medical Supplies" },
  { value: InventoryCategory.OFFICE_SUPPLY, label: "Office Supplies" },
  { value: InventoryCategory.VACCINE, label: "Vaccine" },
  { value: InventoryCategory.EQUIPMENT, label: "Equipment" },
];

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; month?: string; expiry?: string; sort?: string; category?: string; error?: string; message?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const searchQuery = resolvedSearchParams?.q?.trim() ?? "";
  const selectedMonth = resolvedSearchParams?.month?.trim() ?? "";
  const expiryFilter = resolvedSearchParams?.expiry?.trim() ?? "all";
  const sort = resolvedSearchParams?.sort?.trim() ?? "name_asc";
  const selectedCategory = inventoryCategories.some((category) => category.value === resolvedSearchParams?.category)
    ? resolvedSearchParams?.category ?? InventoryCategory.MEDICINE
    : InventoryCategory.MEDICINE;
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
        {inventoryCategories.map((category) => (
          <a
            key={category.value}
            href={`/inventory?${new URLSearchParams({
              ...(searchQuery ? { q: searchQuery } : {}),
              ...(selectedMonth ? { month: selectedMonth } : {}),
              expiry: expiryFilter,
              sort,
              category: category.value,
            }).toString()}`}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold ${selectedCategory === category.value ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-900"}`}
          >
            {category.label}
          </a>
        ))}
      </nav>
      <InventoryTable ledger={ledger} searchQuery={searchQuery} />
    </AppShell>
  );
}
