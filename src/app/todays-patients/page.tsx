import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PatientTable } from "@/components/patients/patient-table";
import { DebouncedSearchForm } from "@/components/search/debounced-search-form";
import { getTodaysPatientTableRows } from "@/lib/patient-view";

export default async function TodaysPatientsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams?.page ?? "1");
  const searchQuery = resolvedSearchParams?.q?.trim() ?? "";
  const result = await getTodaysPatientTableRows(Number.isFinite(page) ? page : 1, 25, searchQuery);

  return (
    <AppShell>
      <PageHeader
        title="Today's Patient"
        actions={
          <DebouncedSearchForm action="/todays-patients" initialQuery={searchQuery} placeholder="Search today's queue" />
        }
      />
      <PatientTable
        rows={result.rows}
        currentPage={result.currentPage}
        totalPages={result.totalPages}
        totalCount={result.totalCount}
        pageSize={result.pageSize}
        basePath="/todays-patients"
        searchQuery={searchQuery}
      />
    </AppShell>
  );
}
