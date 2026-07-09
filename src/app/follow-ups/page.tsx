import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PatientTable } from "@/components/patients/patient-table";
import { DebouncedSearchForm } from "@/components/search/debounced-search-form";
import { getPatientTableRows } from "@/lib/patient-view";

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams?.page ?? "1");
  const searchQuery = resolvedSearchParams?.q?.trim() ?? "";
  const result = await getPatientTableRows("follow", Number.isFinite(page) ? page : 1, 25, searchQuery);

  return (
    <AppShell>
      <PageHeader
        title="For Follow up"
        actions={
          <DebouncedSearchForm action="/follow-ups" initialQuery={searchQuery} placeholder="Search follow-ups" />
        }
      />
      <PatientTable
        rows={result.rows}
        currentPage={result.currentPage}
        totalPages={result.totalPages}
        totalCount={result.totalCount}
        pageSize={result.pageSize}
        basePath="/follow-ups"
        searchQuery={searchQuery}
      />
    </AppShell>
  );
}
