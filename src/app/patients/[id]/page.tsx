import { AppShell } from "@/components/layout/app-shell";
import { PatientProfile } from "@/components/patients/patient-profile";
import { ActionAlert } from "@/components/ui/action-alert";

export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
    message?: string;
    visitId?: string;
  }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <AppShell>
      <ActionAlert error={resolvedSearchParams?.error} message={resolvedSearchParams?.message} />
      <PatientProfile id={id} visitId={resolvedSearchParams?.visitId} />
    </AppShell>
  );
}
