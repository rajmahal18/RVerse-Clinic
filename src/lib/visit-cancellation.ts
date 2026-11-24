import { RequestType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requestTypeLabels } from "@/lib/clinic-services";
import { formatDateTime } from "@/lib/date-time";
import { cancellationRemarks, serviceCancellation } from "@/lib/service-state";

type Actor = { id: string; name: string; role: string; clinicId: string };

export async function requireActiveServiceVisit(
  tx: Prisma.TransactionClient,
  visitId: string | null,
  clinicId: string,
  type: RequestType,
) {
  if (!visitId) return;
  await tx.$queryRaw`SELECT id FROM "Visit" WHERE id = ${visitId} FOR UPDATE`;
  const visit = await tx.visit.findFirst({
    where: {
      id: visitId,
      deletedAt: null,
      patient: { clinicId, deletedAt: null },
    },
    select: { id: true, patientId: true, status: true, requests: { select: { type: true, remarks: true } } },
  });
  if (!visit || ["CANCELLED", "COMPLETED"].includes(visit.status))
    throw new Error(
      "This visit is already closed. Further service processing is not allowed.",
    );
  const service = visit.requests.find((request) => request.type === type);
  if (service && serviceCancellation(service))
    throw new Error(
      `${requestTypeLabels[type]} was cancelled. Further processing is not allowed.`,
    );
  return visit;
}

export async function requireActiveMedicineVisit(
  tx: Prisma.TransactionClient,
  visitId: string | null,
  clinicId: string,
) {
  return requireActiveServiceVisit(
    tx,
    visitId,
    clinicId,
    RequestType.MEDICINES,
  );
}

// Always read the child again after acquiring locks. A snapshot read before a
// competing release/receipt must never be used to overwrite its newer status.
export async function getLockedMedicineRequest(
  tx: Prisma.TransactionClient,
  initial: { id: string; visitId: string | null },
  clinicId: string,
) {
  await requireActiveMedicineVisit(tx, initial.visitId, clinicId);
  await tx.$queryRaw`SELECT id FROM "MedicineRequest" WHERE id = ${initial.id} FOR UPDATE`;
  const request = await tx.medicineRequest.findUnique({
    where: { id: initial.id },
    include: { inventoryItem: true, visit: { include: { patient: true } } },
  });
  if (!request || request.visitId !== initial.visitId ||
    (request.inventoryItem?.clinicId ?? request.visit?.patient.clinicId) !== clinicId)
    throw new Error("This request is no longer available. Refresh the list.");
  return request;
}

export async function cancelVisitService(
  user: Actor,
  input: {
    patientId: string;
    visitId: string;
    serviceId?: string;
    reason: string;
    entireVisit?: boolean;
  },
) {
  if (!["ADMIN", "DOCTOR", "NURSE", "DOCTOR_NURSE"].includes(user.role))
    throw new Error("You do not have permission to cancel a service.");
  if (input.entireVisit && !["ADMIN", "DOCTOR"].includes(user.role))
    throw new Error(
      "Only an admin or doctor can cancel an entire visit. Cancel the individual service instead.",
    );
  const reason = input.reason.trim();
  if (!reason || reason.length > 1000)
    throw new Error("Enter a cancellation reason of up to 1,000 characters.");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Visit" WHERE id = ${input.visitId} FOR UPDATE`;
    const visit = await tx.visit.findFirst({
      where: {
        id: input.visitId,
        patientId: input.patientId,
        deletedAt: null,
        patient: { clinicId: user.clinicId, deletedAt: null },
      },
      include: {
        requests: true,
        medicines: true,
        vaccinations: true,
        referrals: true,
        labResults: true,
      },
    });
    if (!visit) throw new Error("Visit not found.");
    if (["COMPLETED", "CANCELLED"].includes(visit.status))
      throw new Error("This visit is already closed.");
    const selected = input.entireVisit
      ? visit.requests.filter((request) => !serviceCancellation(request))
      : visit.requests.filter((request) => request.id === input.serviceId);
    if (!selected.length && !input.entireVisit)
      throw new Error("Service not found.");
    if (selected.some((request) => serviceCancellation(request)))
      throw new Error(
        "This service has already been cancelled. Refresh the visit.",
      );
    const types = new Set(selected.map((request) => request.type));
    if (
      (types.has(RequestType.BP_CHECKING) && visit.bloodPressure) ||
      (types.has(RequestType.RBS_CHECKING) && visit.rbs)
    )
      throw new Error(
        "This checking service already has a recorded result. Ask an admin to review the record instead of cancelling it.",
      );
    const cancelsMedicine =
      input.entireVisit || types.has(RequestType.MEDICINES);
    if (
      cancelsMedicine &&
      visit.medicines.some(
        (medicine) =>
          ["RELEASED", "RECEIVED"].includes(medicine.status) ||
          medicine.releasedAt ||
          medicine.receivedAt,
      )
    )
      throw new Error(
        "Medicine has already been released or received. Ask an admin to use the correction / return process.",
      );
    if (cancelsMedicine && visit.medicines.length) {
      const movements = await tx.inventoryMovement.count({
        where: {
          medicineRequestId: {
            in: visit.medicines.map((medicine) => medicine.id),
          },
          quantityChange: { lt: 0 },
        },
      });
      if (movements)
        throw new Error(
          "A medicine stock release is recorded. Ask an admin to use the correction / return process.",
        );
    }
    if (
      ((input.entireVisit || types.has(RequestType.VACCINATION)) &&
        visit.vaccinations.length) ||
      ((input.entireVisit || types.has(RequestType.REFERRAL)) &&
        visit.referrals.length) ||
      ((input.entireVisit || types.has(RequestType.CONSULTATION)) &&
        (visit.progressNotesDoneAt ||
          visit.treatmentDoneAt ||
          visit.progressNotes?.trim() ||
          visit.treatmentPlan?.trim() ||
          visit.diagnosis?.trim() ||
          visit.physicalExam?.trim() ||
          visit.labResults.length))
    )
      throw new Error(
        "This service has recorded work. Ask an admin to review the record instead of cancelling it.",
      );
    if (
      input.entireVisit &&
      (visit.bloodPressure ||
        visit.rbs ||
        visit.diagnosis ||
        visit.progressNotes ||
        visit.treatmentPlan)
    )
      throw new Error(
        "This visit already has clinical work. Cancel only the unprovided service and complete the remaining visit.",
      );
    const now = new Date();
    const cancellation = {
      reason,
      by: user.name,
      userId: user.id,
      at: now.toISOString(),
    };
    for (const request of selected)
      await tx.visitRequest.update({
        where: { id: request.id },
        data: {
          remarks: cancellationRemarks({
            ...cancellation,
            previousRemarks: request.remarks,
          }),
        },
      });
    const cancelledMedicines = cancelsMedicine
      ? visit.medicines.filter((medicine) =>
          ["REQUESTED", "APPROVED"].includes(medicine.status),
        )
      : [];
    for (const medicine of cancelledMedicines)
      await tx.medicineRequest.update({
        where: { id: medicine.id },
        data: {
          status: "CANCELLED",
          resolvedAt: now,
          remarks: [
            medicine.remarks,
            `Service cancelled: ${reason}. By ${user.name} on ${formatDateTime(now)} (PHT).`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      });
    const allCancelled =
      visit.requests.length > 0 &&
      visit.requests.every(
        (request) => types.has(request.type) || serviceCancellation(request),
      );
    const nextStatus = input.entireVisit
      ? "CANCELLED"
      : allCancelled
        ? "COMPLETED"
        : visit.status;
    await tx.visit.update({
      where: { id: visit.id },
      data: {
        status: nextStatus,
        updatedAt: now,
        ...(["CANCELLED", "COMPLETED"].includes(nextStatus)
          ? { timeOut: now }
          : {}),
      },
    });
    await tx.activityLog.create({
      data: {
        clinicId: user.clinicId,
        userId: user.id,
        module: "Patient Records",
        action: input.entireVisit ? "Cancel entire visit" : "Cancel service",
        entityType: input.entireVisit ? "Visit" : "VisitRequest",
        entityId: input.entireVisit ? visit.id : selected[0].id,
        description: `${input.entireVisit ? "Cancelled entire visit" : `Cancelled ${requestTypeLabels[selected[0].type]}`} for ${visit.patientId}. Reason: ${reason}`,
        metadata: {
          reason,
          visitId: visit.id,
          patientId: visit.patientId,
          closedWithoutService: !input.entireVisit && allCancelled,
          changes: {
            visitStatus: { before: visit.status, after: nextStatus },
            services: {
              before: selected.map((request) => ({
                id: request.id,
                type: request.type,
                status: "ACTIVE",
                remarks: request.remarks,
              })),
              after: selected.map((request) => ({
                id: request.id,
                type: request.type,
                status: "CANCELLED",
                ...cancellation,
              })),
            },
            medicines: {
              before: cancelledMedicines.map((medicine) => ({
                id: medicine.id,
                status: medicine.status,
              })),
              after: cancelledMedicines.map((medicine) => ({
                id: medicine.id,
                status: "CANCELLED",
              })),
            },
          },
        },
      },
    });
    return { closedWithoutService: !input.entireVisit && allCancelled };
  });
}
