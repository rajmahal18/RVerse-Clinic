import { AppShell } from "@/components/layout/app-shell";
import { PatientProfile } from "@/components/patients/patient-profile";

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppShell><PatientProfile id={id} /></AppShell>;
}
