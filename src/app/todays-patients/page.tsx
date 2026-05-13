import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PatientTable } from "@/components/patients/patient-table";
import { getPatientTableRows } from "@/lib/patient-view";

export default async function TodaysPatientsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams?.page ?? "1");
  const result = await getPatientTableRows(undefined, Number.isFinite(page) ? page : 1, 25);

  return (
    <AppShell>
      <PageHeader
        title="Today's Patient"
        eyebrow="Home / Today's Patient"
        actions={<input className="h-10 rounded-xl border bg-white px-4 text-sm" placeholder="Date / Search Patient Name" />}
      />
      <PatientTable
        rows={result.rows}
        currentPage={result.currentPage}
        totalPages={result.totalPages}
        totalCount={result.totalCount}
        pageSize={result.pageSize}
        basePath="/todays-patients"
      />
    </AppShell>
  );
}
