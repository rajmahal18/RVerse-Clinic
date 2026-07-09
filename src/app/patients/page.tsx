import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PatientTable } from "@/components/patients/patient-table";
import { DebouncedSearchForm } from "@/components/search/debounced-search-form";
import { Button } from "@/components/ui/button";
import { getPatientTableRows } from "@/lib/patient-view";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams?.page ?? "1");
  const searchQuery = resolvedSearchParams?.q?.trim() ?? "";
  const result = await getPatientTableRows(undefined, Number.isFinite(page) ? page : 1, 25, searchQuery);

  return (
    <AppShell>
      <PageHeader
        title="Patient Records"
        actions={
          <>
            <DebouncedSearchForm action="/patients" initialQuery={searchQuery} placeholder="Search name, contact, agency" />
            <Button asChild>
              <Link href="/patients/new">
                <Plus className="h-4 w-4" /> Add Patient
              </Link>
            </Button>
          </>
        }
      />
      <PatientTable
        rows={result.rows}
        currentPage={result.currentPage}
        totalPages={result.totalPages}
        totalCount={result.totalCount}
        pageSize={result.pageSize}
        basePath="/patients"
        searchQuery={searchQuery}
      />
    </AppShell>
  );
}
