import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PatientTable } from "@/components/patients/patient-table";
import { Button } from "@/components/ui/button";
import { getPatientTableRows } from "@/lib/patient-view";

export default async function PatientsPage({
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
        title="Patient Records"
        eyebrow="Home / Patient Records"
        actions={
          <>
            <input
              className="h-10 rounded-xl border bg-white px-4 text-sm"
              placeholder="Search Patient Name"
            />
            <Button>
              <Plus className="h-4 w-4" /> Add Patient
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
      />
    </AppShell>
  );
}
