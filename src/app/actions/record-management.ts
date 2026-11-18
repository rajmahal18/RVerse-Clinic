"use server";
import { RequestType, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { assertValidCsrfToken } from "@/lib/csrf";
import { getActionErrorMessage } from "@/lib/action-feedback";

const delegates = {
  User: "user",
  Patient: "patient",
  Visit: "visit",
  InventoryItem: "inventoryItem",
  VisitRequest: "visitRequest",
  MedicineRequest: "medicineRequest",
  LabResult: "labResult",
  VaccinationRecord: "vaccinationRecord",
  Referral: "referral",
  FollowUp: "followUp",
} as const;
type Kind = keyof typeof delegates;

async function admin() {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN)
    throw new Error("Only admin can delete, void, or restore records.");
  return user;
}

function destination(form: FormData) {
  const path = String(form.get("returnTo") ?? "/settings?tab=archives");
  return /^\/(patients(?:\/[a-zA-Z0-9_-]+)?|accounts|inventory|settings)(?:\?[^#]*)?$/.test(
    path,
  )
    ? path
    : "/settings?tab=archives";
}

export async function manageRecordAction(form: FormData) {
  let target = destination(form);
  let error: string | undefined;
  try {
    await assertValidCsrfToken(form);
    const user = await admin();
    const kind = String(form.get("kind")) as Kind;
    if (!Object.hasOwn(delegates, kind))
      throw new Error("Invalid record type.");
    const id = String(form.get("recordId") ?? "");
    const reason = String(form.get("reason") ?? "").trim();
    const restoring = form.get("operation") === "restore";
    if (!reason || reason.length > 1000)
      throw new Error("Enter a reason of up to 1,000 characters.");
    if (form.get("acknowledge") !== "true")
      throw new Error(
        "Review the affected records and confirm before continuing.",
      );
    await prisma.$transaction(
      async (tx) => {
        // Serializes archive/restore operations for the clinic, including last-admin checks.
        await tx.$queryRaw`SELECT id FROM "Clinic" WHERE id = ${user.clinicId} FOR UPDATE`;
        const delegate = tx[delegates[kind]] as any;
        const clinicWhere = ["User", "Patient", "InventoryItem"].includes(kind)
          ? { clinicId: user.clinicId }
          : kind === "Visit"
            ? { patient: { clinicId: user.clinicId } }
            : kind === "MedicineRequest"
              ? {
                  OR: [
                    { visit: { patient: { clinicId: user.clinicId } } },
                    { visitId: null, inventoryItem: { clinicId: user.clinicId } },
                  ],
                }
              : { visit: { patient: { clinicId: user.clinicId } } };
        const recordWhere = {
            id,
            ...clinicWhere,
            deletedAt: restoring ? { not: null } : null,
        };
        let before = await delegate.findFirst({ where: recordWhere });
        if (!before)
          throw new Error(
            "This record is unavailable or has already changed. Refresh the page.",
          );
        const parentVisitId = kind === "Visit" ? id : before.visitId as string | undefined;
        if (parentVisitId || kind === "MedicineRequest") {
          // Match clinical correction lock order, including child edits, then
          // re-read the committed quantity/status after concurrent releases.
          if (parentVisitId) await tx.$queryRaw`SELECT id FROM "Visit" WHERE id = ${parentVisitId} FOR UPDATE`;
          if (kind === "MedicineRequest") await tx.$queryRaw`SELECT id FROM "MedicineRequest" WHERE id = ${id} FOR UPDATE`;
          before = await delegate.findFirst({ where: recordWhere });
          if (!before) throw new Error("This record changed. Refresh the page before continuing.");
        }
        if (kind === "User") {
          if (id === user.id)
            throw new Error("You cannot delete your own account.");
          if (
            !restoring &&
            before.role === UserRole.ADMIN &&
            before.isActive &&
            (await tx.user.count({
              where: {
                clinicId: user.clinicId,
                role: UserRole.ADMIN,
                isActive: true,
              },
            })) <= 1
          )
            throw new Error("The last active admin cannot be deleted.");
        }
        if (
          restoring &&
          kind === "Visit" &&
          !(await tx.patient.findFirst({
            where: { id: before.patientId, clinicId: user.clinicId },
          }))
        )
          throw new Error("Restore the patient profile first.");
        if (restoring && kind === "Visit" && ["QUEUED", "IN_PROGRESS", "FOR_FOLLOW_UP"].includes(before.status)) {
          const active = await tx.visit.count({ where: { patientId: before.patientId, status: { in: ["QUEUED", "IN_PROGRESS", "FOR_FOLLOW_UP"] } } });
          if (active) throw new Error("This patient already has an active visit. Complete or archive that visit before restoring another active visit.");
        }
        if (
          restoring &&
          before.visitId &&
          !(await tx.visit.findFirst({
            where: { id: before.visitId, patient: { clinicId: user.clinicId } },
          }))
        )
          throw new Error("Restore the patient profile and visit first.");
        const serviceType = kind === "MedicineRequest" ? RequestType.MEDICINES : kind === "VaccinationRecord" ? RequestType.VACCINATION : kind === "Referral" ? RequestType.REFERRAL : null;
        if (restoring && before.visitId && serviceType && await tx.visitRequest.findFirst({ where: { visitId: before.visitId, type: serviceType, deletedAt: { not: null } } })) {
          throw new Error("Restore the removed service selection before restoring its clinical record.");
        }
        if (!restoring && kind === "VisitRequest") {
          const linked =
            before.type === RequestType.MEDICINES
              ? await tx.medicineRequest.count({
                  where: { visitId: before.visitId },
                })
              : before.type === RequestType.VACCINATION
                ? await tx.vaccinationRecord.count({
                    where: { visitId: before.visitId },
                  })
                : before.type === RequestType.REFERRAL
                  ? await tx.referral.count({
                      where: { visitId: before.visitId },
                    })
                  : 0;
          if (linked)
            throw new Error(
              "Void the linked medicine, vaccination, or referral records before removing this service from the visit.",
            );
        }
        let returnedQuantity = 0;
        if (kind === "MedicineRequest") {
          if (!restoring && ["RELEASED", "RECEIVED"].includes(before.status)) {
            const mode = form.get("stockHandling");
            if (mode !== "record-only" && mode !== "returned")
              throw new Error(
                "Choose whether the medicine was physically returned or this is a record correction only.",
              );
            if (mode === "returned") returnedQuantity = before.quantity;
          }
          if (restoring) {
            const log = await tx.activityLog.findFirst({
              where: {
                clinicId: user.clinicId,
                entityType: kind,
                entityId: id,
                action: "Archive / void record",
                status: "SUCCESS",
              },
              orderBy: { createdAt: "desc" },
            });
            const metadata = log?.metadata as
              | { returnedQuantity?: number }
              | undefined;
            returnedQuantity = -(metadata?.returnedQuantity ?? 0);
          }
          if (returnedQuantity) {
            if (!before.inventoryItemId)
              throw new Error(
                "This record has no stock batch. Use record correction only.",
              );
            const result = await tx.inventoryItem.updateMany({
              where: {
                id: before.inventoryItemId,
                clinicId: user.clinicId,
                ...(returnedQuantity < 0
                  ? { stock: { gte: -returnedQuantity } }
                  : {}),
              },
              data: { stock: { increment: returnedQuantity } },
            });
            if (!result.count)
              throw new Error(
                "Insufficient stock to restore this issued medicine record.",
              );
            await tx.inventoryMovement.create({
              data: {
                inventoryItemId: before.inventoryItemId,
                medicineRequestId: id,
                quantityChange: returnedQuantity,
                reason: `${restoring ? "Restore voided medicine" : "Medicine physically returned"}: ${reason}`,
              },
            });
          }
        }
        const affected: Record<string, number> = {};
        if (kind === "Patient")
          affected.visits = await tx.visit.count({ where: { patientId: id } });
        if (kind === "Visit") {
          for (const [name, model] of Object.entries({
            services: "visitRequest",
            medicines: "medicineRequest",
            laboratory: "labResult",
            vaccinations: "vaccinationRecord",
            referrals: "referral",
            followUps: "followUp",
          }))
            affected[name] = await (tx[model as keyof typeof tx] as any).count({
              where: { visitId: id },
            });
        }
        if (kind === "InventoryItem") {
          affected.stock = before.stock;
          affected.pendingRequests = await tx.medicineRequest.count({
            where: {
              inventoryItemId: id,
              status: { in: ["REQUESTED", "APPROVED"] },
            },
          });
        }
        const data = {
          deletedAt: restoring ? null : new Date(),
          ...(kind === "User"
            ? { isActive: false, sessionVersion: { increment: 1 } }
            : {}),
        };
        const after = await delegate.update({ where: { id }, data });
        if (before.visitId) {
          // Invalidate open clinical editors and refresh the active-visit form.
          await tx.visit.update({ where: { id: before.visitId }, data: { updatedAt: new Date() } });
        }
        if (kind === "Patient" && !restoring) target = "/patients";
        await tx.activityLog.create({
          data: {
            clinicId: user.clinicId,
            userId: user.id,
            module: "Record Management",
            action: restoring ? "Restore record" : "Archive / void record",
            entityType: kind,
            entityId: id,
            description: `${restoring ? "Restored" : "Archived / voided"} ${kind}: ${reason}`,
            metadata: JSON.parse(
              JSON.stringify({
                reason,
                affected,
                returnedQuantity,
                before:
                  kind === "User"
                    ? {
                        id: before.id,
                        name: before.name,
                        role: before.role,
                        isActive: before.isActive,
                        deletedAt: before.deletedAt,
                      }
                    : before,
                after:
                  kind === "User"
                    ? {
                        id: after.id,
                        name: after.name,
                        role: after.role,
                        isActive: after.isActive,
                        deletedAt: after.deletedAt,
                      }
                    : after,
              }),
            ),
          },
        });
      },
      { timeout: 20000 },
    );
  } catch (cause) {
    error = getActionErrorMessage(cause);
  }
  revalidatePath("/", "layout");
  const url = new URL(target, "http://clinic.local");
  url.searchParams.set(
    error ? "error" : "message",
    error ??
      "Record updated. The original data and audit history are retained.",
  );
  redirect(url.pathname + url.search);
}

export async function setClinicServiceAction(form: FormData) {
  let error: string | undefined;
  try {
    await assertValidCsrfToken(form);
    const user = await admin();
    const type = String(form.get("type")) as RequestType;
    if (!Object.values(RequestType).includes(type))
      throw new Error("Invalid service.");
    const isActive = form.get("isActive") === "true";
    const reason = String(form.get("reason") ?? "").trim();
    if (!reason || reason.length > 1000)
      throw new Error("Enter the reason for changing this service.");
    await prisma.$transaction(async (tx) => {
      const before = await tx.clinicServiceSetting.findUnique({
        where: { clinicId_type: { clinicId: user.clinicId, type } },
      });
      await tx.clinicServiceSetting.upsert({
        where: { clinicId_type: { clinicId: user.clinicId, type } },
        create: { clinicId: user.clinicId, type, isActive },
        update: { isActive },
      });
      await tx.activityLog.create({
        data: {
          clinicId: user.clinicId,
          userId: user.id,
          module: "Settings",
          action: "Change service availability",
          entityType: "ClinicServiceSetting",
          entityId: type,
          description: `${isActive ? "Activated" : "Deactivated"} ${type}: ${reason}`,
          metadata: {
            before: before?.isActive ?? true,
            after: isActive,
            reason,
          },
        },
      });
    });
  } catch (cause) {
    error = getActionErrorMessage(cause);
  }
  revalidatePath("/", "layout");
  redirect(
    `/settings?tab=services&${error ? "error" : "message"}=${encodeURIComponent(error ?? "Service availability updated. Existing records are retained.")}`,
  );
}
