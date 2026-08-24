import { notFound, redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { updatePatientAction } from "@/app/actions/workflow";
import { PatientForm } from "@/components/patients/patient-form";
import { ActionAlert } from "@/components/ui/action-alert";
import { getCurrentUser } from "@/lib/auth";
import { getPatientProfile } from "@/lib/patient-view";

export default async function EditPatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== UserRole.ADMIN) {
    redirect(`/patients/${id}?error=${encodeURIComponent("Only admin accounts can edit patient information.")}`);
  }

  const patient = await getPatientProfile(id);

  if (!patient) {
    notFound();
  }

  return (
    <AppShell>
      <PageHeader title="Edit Patient" />
      <ActionAlert error={resolvedSearchParams?.error} message={resolvedSearchParams?.message} />
      <PatientForm
        action={updatePatientAction}
        submitLabel="Save Patient"
        values={{
          patientId: patient.id,
          primaryContact: patient.primaryContact === "Not provided" ? "" : patient.primaryContact,
          medicalHistory: patient.medicalHistory === "Not provided" ? "" : patient.medicalHistory,
          vaccineHistory: patient.vaccineHistory === "Not provided" ? "" : patient.vaccineHistory,
          allergy: patient.allergy === "Not provided" ? "" : patient.allergy,
          maintenance: patient.maintenance === "Not provided" ? "" : patient.maintenance,
          additionalMedicalInformation: patient.additionalMedicalInformation === "Not provided" ? "" : patient.additionalMedicalInformation,
          lastName: patient.lastName,
          firstName: patient.firstName,
          middleName: patient.middleName,
          birthDate: patient.birthDate,
          gender: patient.gender.toUpperCase(),
          address: patient.address === "Not provided" ? "" : patient.address,
          contactNo: patient.contact === "Not provided" ? "" : patient.contact,
          agency: patient.agency === "Not provided" ? "" : patient.agency,
          designation: patient.designation === "Not provided" ? "" : patient.designation,
          civilStatus: patient.civilStatus === "Not provided" ? "SINGLE" : patient.civilStatus.toUpperCase(),
          heightCm: patient.heightCm,
          weightKg: patient.weightKg,
        }}
      />
    </AppShell>
  );
}
