import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PatientTable } from "@/components/patients/patient-table";
import { getPatientTableRows } from "@/lib/patient-view";

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams?.page ?? "1");
  const result = await getPatientTableRows("follow", Number.isFinite(page) ? page : 1, 25);

  return (
    <AppShell>
      <PageHeader title="For Follow up" eyebrow="Home / For Follow up" />
      <PatientTable
        rows={result.rows}
        currentPage={result.currentPage}
        totalPages={result.totalPages}
        totalCount={result.totalCount}
        pageSize={result.pageSize}
        basePath="/follow-ups"
      />
    </AppShell>
  );
}
