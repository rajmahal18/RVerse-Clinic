import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/date-time";
import { createHash } from "node:crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const since = new Date(Date.now() - 30 * 86400000);
  const notifications: { id: string; title: string; detail: string; href?: string; at: string }[] = [];
  const clinical = ["ADMIN", "DOCTOR", "NURSE", "DOCTOR_NURSE"].includes(
    user.role,
  );
  const records = user.role === "RECORDS" || user.role === "ADMIN";
  const [
    items,
    schedules,
    referrals,
    releases,
    summaries,
    queued,
    completed,
    doctorDone,
    intakeReady,
  ] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { clinicId: user.clinicId, category: { notIn: ["EQUIPMENT", "AMBULANCE_SUPPLY"] }, stock: { lte: prisma.inventoryItem.fields.reorderLevel }, boxStock: 0 }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, stock: true, unit: true, reorderLevel: true } }),
    clinical ? prisma.followUp.findMany({ where: { visit: { patient: { clinicId: user.clinicId } }, status: "SCHEDULED", createdAt: { gte: since } }, include: { visit: { include: { patient: true } } }, orderBy: { createdAt: "desc" }, take: 50 }) : [],
    clinical ? prisma.referral.findMany({ where: { visit: { patient: { clinicId: user.clinicId } }, createdAt: { gte: since } }, include: { visit: { include: { patient: true } } }, orderBy: { createdAt: "desc" }, take: 50 }) : [],
    clinical ? prisma.medicineRequest.findMany({ where: { visit: { patient: { clinicId: user.clinicId } }, releasedAt: { gte: since }, status: { in: ["RELEASED", "RECEIVED"] } }, include: { visit: { include: { patient: true } } }, orderBy: { releasedAt: "desc" }, take: 50 }) : [],
    user.role === "RECORDS" || user.role === "ADMIN" ? prisma.activityLog.findMany({ where: { clinicId: user.clinicId, module: "Daily Summary", action: "Submit daily summary", status: "SUCCESS", createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 30 }) : [],
    clinical && user.role !== "DOCTOR"
      ? prisma.visit.findMany({
          where: {
            patient: { clinicId: user.clinicId },
            deletedAt: null,
            status: "QUEUED",
            createdAt: { gte: since },
          },
          include: { patient: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [],
    records
      ? prisma.visit.findMany({
          where: {
            patient: { clinicId: user.clinicId },
            deletedAt: null,
            status: "COMPLETED",
            timeOut: { gte: since },
          },
          include: { patient: true },
          orderBy: { timeOut: "desc" },
          take: 50,
        })
      : [],
    ["ADMIN", "NURSE", "DOCTOR_NURSE"].includes(user.role)
      ? prisma.visit.findMany({
          where: {
            patient: { clinicId: user.clinicId },
            deletedAt: null,
            OR: [
              { progressNotesDoneAt: { gte: since } },
              { treatmentDoneAt: { gte: since } },
            ],
            ...(user.role === "ADMIN"
              ? {}
              : {
                  AND: [
                    { OR: [{ nurseOnDuty: user.name }, { nurseOnDuty: null }] },
                  ],
                }),
          },
          include: { patient: true },
          orderBy: { updatedAt: "desc" },
          take: 50,
        })
      : [],
    ["ADMIN", "DOCTOR"].includes(user.role) ? prisma.visit.findMany({ where: { patient: { clinicId: user.clinicId }, deletedAt: null, status: { in: ["IN_PROGRESS", "FOR_FOLLOW_UP"] }, readyForDoctorAt: { gte: since } }, include: { patient: true }, orderBy: { readyForDoctorAt: "desc" }, take: 50 }) : [],
  ]);
  if (items.length) {
    const stockKey = createHash("sha256").update(items.map(item => `${item.id}:${item.stock}:${item.reorderLevel}`).join("|")).digest("hex");
    notifications.push({ id: `low-stock:${stockKey}`, title: `${items.length} low-stock items`, detail: items.map(item => `${item.name}: ${item.stock} ${item.unit} (threshold ${item.reorderLevel})`).join("\n"), ...(user.role === "ADMIN" || user.role === "PHARMACIST" || user.role === "SUPPLY_OFFICER" ? { href: "/inventory" } : {}), at: new Date().toISOString() });
  }
  const patientLink = (patientId: string, visitId: string, section: string) =>
    `/patients/${patientId}?visitId=${visitId}&section=${section}#${section}`;
  for (const visit of intakeReady) if (visit.readyForDoctorAt) notifications.push({ id: "intake-ready:" + visit.id + ":" + visit.readyForDoctorAt.toISOString(), title: "Patient ready for doctor", detail: visit.patient.lastName + ", " + visit.patient.firstName + " ? Ready for assessment", href: patientLink(visit.patientId, visit.id, "progressNotes"), at: visit.readyForDoctorAt.toISOString() });
  for (const visit of doctorDone) {
    for (const [section, at] of [
      ["progressNotes", visit.progressNotesDoneAt],
      ["treatmentPlan", visit.treatmentDoneAt],
    ] as const) {
      if (at && at >= since)
        notifications.push({
          id: `doctor-done:${visit.id}:${section}:${at.toISOString()}`,
          title:
            section === "progressNotes"
              ? "Doctor finished progress notes"
              : "Doctor finished treatment",
          detail: `${visit.patient.lastName}, ${visit.patient.firstName}`,
          href: patientLink(visit.patientId, visit.id, section),
          at: at.toISOString(),
        });
    }
  }
  for (const schedule of [...schedules, ...referrals]) {
    const patient = schedule.visit.patient;
    notifications.push({
      id: `schedule:${schedule.id}`,
      title: "Patient scheduled",
      detail: `${patient.lastName}, ${patient.firstName} • ${schedule.scheduledFor ? formatDateTime(schedule.scheduledFor) : "No date"}`,
      href: patientLink(
        patient.id,
        schedule.visitId,
        "reasonForReferral" in schedule ? "referrals" : "follow-ups",
      ),
      at: schedule.createdAt.toISOString(),
    });
  }
  for (const release of releases) {
    const patient = release.visit!.patient;
    notifications.push({
      id: `release:${release.id}`,
      title: "Medicine released",
      detail: `${patient.lastName}, ${patient.firstName} • ${release.itemName}, quantity ${release.quantity}`,
      href: `/patients/${patient.id}?visitId=${release.visitId}&tab=medicines&section=medicines#medicines`,
      at: release.releasedAt!.toISOString(),
    });
  }
  for (const visit of queued)
    notifications.push({
      id: `queued:${visit.id}`,
      title: "Patient added to the queue",
      detail: `${visit.patient.lastName}, ${visit.patient.firstName} • ${formatDateTime(visit.timeIn)}`,
      href: patientLink(visit.patientId, visit.id, "current-visit"),
      at: visit.createdAt.toISOString(),
    });
  for (const visit of completed) notifications.push({ id: `patient-summary:${visit.id}`, title: "Patient summary ready for print", detail: `${visit.patient.lastName}, ${visit.patient.firstName} • Visit completed ${formatDateTime(visit.timeOut!)}`, href: `/patients/${visit.patientId}/forms/daily-patient-summary?visitId=${visit.id}`, at: visit.timeOut!.toISOString() });
  for (const summary of summaries) notifications.push({ id: `summary:${summary.id}`, title: "Daily patient summary ready for print", detail: summary.description, href: `/reports/daily-summary?submission=${summary.id}`, at: summary.createdAt.toISOString() });
  return NextResponse.json({ notifications: notifications.sort((a, b) => b.at.localeCompare(a.at)), userId: user.id }, { headers: { "Cache-Control": "no-store" } });
}
