import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PatientFilterBar } from "@/components/patients/patient-filter-bar";
import { PatientTable } from "@/components/patients/patient-table";
import { DebouncedSearchForm } from "@/components/search/debounced-search-form";
import { Button } from "@/components/ui/button";
import { getPatientFilterOptions, getPatientTableRows, type PatientTableFilters } from "@/lib/patient-view";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    q?: string;
    status?: string;
    request?: string;
    gender?: string;
    agency?: string;
    ageGroup?: string;
    lastVisit?: string;
    sort?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams?.page ?? "1");
  const searchQuery = resolvedSearchParams?.q?.trim() ?? "";
  const filters: PatientTableFilters = {
    status: resolvedSearchParams?.status?.trim() || undefined,
    request: resolvedSearchParams?.request?.trim() || undefined,
    gender: resolvedSearchParams?.gender?.trim() || undefined,
    agency: resolvedSearchParams?.agency?.trim() || undefined,
    ageGroup: resolvedSearchParams?.ageGroup?.trim() || undefined,
    lastVisit: resolvedSearchParams?.lastVisit?.trim() || undefined,
    sort: resolvedSearchParams?.sort?.trim() || "name_asc",
  };
  const filterQueryParams = {
    status: filters.status,
    request: filters.request,
    gender: filters.gender,
    agency: filters.agency,
    ageGroup: filters.ageGroup,
    lastVisit: filters.lastVisit,
    sort: filters.sort && filters.sort !== "name_asc" ? filters.sort : undefined,
  };
  const [result, filterOptions] = await Promise.all([
    getPatientTableRows(undefined, Number.isFinite(page) ? page : 1, 25, searchQuery, filters),
    getPatientFilterOptions(),
  ]);

  return (
    <AppShell>
      <PageHeader
        title="Patient Records"
        actions={
          <>
            <DebouncedSearchForm
              action="/patients"
              initialQuery={searchQuery}
              placeholder="Search name, contact, age"
              preserveParams={filterQueryParams}
            />
            <Button asChild>
              <Link href="/patients/new">
                <Plus className="h-4 w-4" /> Add Patient
              </Link>
            </Button>
          </>
        }
      />
      <PatientFilterBar filters={filters} options={filterOptions} searchQuery={searchQuery} />
      <PatientTable
        rows={result.rows}
        currentPage={result.currentPage}
        totalPages={result.totalPages}
        totalCount={result.totalCount}
        pageSize={result.pageSize}
        basePath="/patients"
        searchQuery={searchQuery}
        queryParams={filterQueryParams}
      />
    </AppShell>
  );
}
