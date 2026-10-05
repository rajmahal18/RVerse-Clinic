import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canAccessPath, isAppRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getPatientFormCode } from "@/lib/patient-form-number";
import { PatientQrLabel } from "@/components/patients/patient-qr-label";

export default async function PatientQrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/patients/${id}/qr`)}`);
  if (!isAppRole(user.role) || !canAccessPath(user.role, `/patients/${id}/qr`)) notFound();
  const patient = await prisma.patient.findFirst({
    where: { id, clinicId: user.clinicId },
    select: { id: true, createdAt: true },
  });
  if (!patient) notFound();

  const patientCode = await getPatientFormCode(patient.id, patient.createdAt);
  return <PatientQrLabel patientId={patient.id} patientCode={patientCode} baseUrl={process.env.APP_BASE_URL || undefined} />;
}
