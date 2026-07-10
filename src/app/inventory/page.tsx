import { AppShell } from "@/components/layout/app-shell";
import { createInventoryItemAction } from "@/app/actions/workflow";
import { PageHeader } from "@/components/layout/page-header";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { AddInventoryItemModal } from "@/components/inventory/add-inventory-item-modal";
import { DebouncedSearchForm } from "@/components/search/debounced-search-form";
import { ActionAlert } from "@/components/ui/action-alert";
import { getInventoryLedgerData } from "@/lib/patient-view";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; month?: string; expiry?: string; sort?: string; error?: string; message?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const searchQuery = resolvedSearchParams?.q?.trim() ?? "";
  const selectedMonth = resolvedSearchParams?.month?.trim() ?? "";
  const expiryFilter = resolvedSearchParams?.expiry?.trim() ?? "all";
  const sort = resolvedSearchParams?.sort?.trim() ?? "name_asc";
  const ledger = await getInventoryLedgerData(searchQuery, selectedMonth, expiryFilter, sort);

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
              preserveParams={{ month: selectedMonth, expiry: expiryFilter, sort }}
            />
            <AddInventoryItemModal action={createInventoryItemAction} />
          </>
        }
      />
      <ActionAlert error={resolvedSearchParams?.error} message={resolvedSearchParams?.message} />
      <InventoryTable ledger={ledger} searchQuery={searchQuery} />
    </AppShell>
  );
}
