import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { createPatientAction } from "@/app/actions/workflow";
import { PatientForm } from "@/components/patients/patient-form";
import { ActionAlert } from "@/components/ui/action-alert";

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <AppShell>
      <PageHeader title="Register Patient" />
      <ActionAlert error={resolvedSearchParams?.error} message={resolvedSearchParams?.message} />
      <PatientForm action={createPatientAction} submitLabel="Create Patient" />
    </AppShell>
  );
}
