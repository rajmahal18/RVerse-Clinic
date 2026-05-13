import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PatientTable } from "@/components/patients/patient-table";
import { getPatientTableRows } from "@/lib/patient-view";

export default async function VaccinationPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams?.page ?? "1");
  const result = await getPatientTableRows("vaccination", Number.isFinite(page) ? page : 1, 25);

  return (
    <AppShell>
      <PageHeader title="Vaccination" eyebrow="Home / Vaccination" />
      <PatientTable
        rows={result.rows}
        currentPage={result.currentPage}
        totalPages={result.totalPages}
        totalCount={result.totalCount}
        pageSize={result.pageSize}
        basePath="/vaccination"
      />
    </AppShell>
  );
}
