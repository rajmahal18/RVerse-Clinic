"use server";

import {
  InventoryCategory,
  Prisma,
  RequestType,
  UserRole,
  VisitStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearAuthCookie, createSessionToken, getCurrentUser, setAuthCookie } from "@/lib/auth";
import { appendActionFeedback, getActionErrorMessage } from "@/lib/action-feedback";
import { writeActivityLog } from "@/lib/activity-log";
import { assertValidCsrfToken } from "@/lib/csrf";
import { formatDateKey, parseAppDateInput } from "@/lib/date-time";
import { hashPassword, isStrongPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { TRUST_PROXY_HEADERS } from "@/lib/security-config";

const MAIN_CLINIC_ID = "main-clinic";
const LOGIN_ATTEMPT_WINDOW_MINUTES = 15;
const LOGIN_ATTEMPT_LIMIT = 5;

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function parseMeasurements(formData: FormData) {
  const heightRaw = optionalString(formData, "heightValue");
  const weightRaw = optionalString(formData, "weightValue");
  const heightUnit = String(formData.get("heightUnit") ?? "cm");
  const weightUnit = String(formData.get("weightUnit") ?? "kg");

  const heightValue = heightRaw ? Number(heightRaw) : null;
  const weightValue = weightRaw ? Number(weightRaw) : null;
  if (heightValue !== null && (!(heightValue > 0) || !Number.isFinite(heightValue))) {
    throw new Error("Height must be greater than zero.");
  }
  if (weightValue !== null && (!(weightValue > 0) || !Number.isFinite(weightValue))) {
    throw new Error("Weight must be greater than zero.");
  }

  return {
    heightCm: heightValue === null ? null : heightUnit === "ft" ? heightValue * 30.48 : heightValue,
    weightKg: weightValue === null ? null : weightUnit === "lbs" ? weightValue * 0.45359237 : weightValue,
  };
}

function requiredPositiveInteger(formData: FormData, key: string, label: string) {
  const raw = requiredString(formData, key);
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive whole number.`);
  }
  return value;
}

function parseMedicineSchedule(formData: FormData) {
  const frequencyMode = requiredString(formData, "frequencyMode");
  const frequencyLabels: Record<string, string> = {
    ONCE_DAILY: "Once daily",
    TWICE_DAILY: "Twice daily",
    THREE_TIMES_DAILY: "Three times daily",
    FOUR_TIMES_DAILY: "Four times daily",
    AS_NEEDED: "As needed",
  };
  let frequency = frequencyLabels[frequencyMode];
  if (frequencyMode === "EVERY_N_HOURS") {
    frequency = `Every ${requiredPositiveInteger(formData, "frequencyHours", "Hour interval")} hours`;
  } else if (frequencyMode === "OTHER") {
    frequency = requiredString(formData, "frequencyOther");
  } else if (!frequency) {
    throw new Error("Select a valid medicine frequency.");
  }

  const durationMode = requiredString(formData, "durationMode");
  const terminalDurations: Record<string, string> = {
    UNTIL_FINISHED: "Until finished",
    AS_NEEDED: "As needed",
  };
  let duration = terminalDurations[durationMode];
  if (["DAYS", "WEEKS", "MONTHS"].includes(durationMode)) {
    const value = requiredPositiveInteger(formData, "durationValue", "Duration");
    const unit = durationMode.toLowerCase();
    duration = `${value} ${value === 1 ? unit.slice(0, -1) : unit}`;
  } else if (!duration) {
    throw new Error("Select a valid medicine duration.");
  }

  return { frequency, duration };
}

function parseDate(value: string) {
  const parsed = parseAppDateInput(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date value.");
  }

  return parsed;
}

async function ensureClinic() {
  return prisma.clinic.upsert({
    where: { id: MAIN_CLINIC_ID },
    update: {},
    create: {
      id: MAIN_CLINIC_ID,
      name: "The Clinic",
      address: "",
      contact: "",
      email: "",
    },
  });
}

async function getClientIpAddress() {
  if (!TRUST_PROXY_HEADERS) {
    return "unknown";
  }

  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "unknown";
}

async function isLoginRateLimited(email: string, ipAddress: string) {
  const since = new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MINUTES * 60 * 1000);
  const attemptScopes: Prisma.LoginAttemptWhereInput[] = [{ email }];
  if (ipAddress !== "unknown") {
    attemptScopes.push({ ipAddress });
  }
  const failedAttempts = await prisma.loginAttempt.count({
    where: {
      success: false,
      createdAt: {
        gte: since,
      },
      OR: attemptScopes,
    },
  });

  return failedAttempts >= LOGIN_ATTEMPT_LIMIT;
}

async function recordLoginAttempt(email: string, ipAddress: string, success: boolean) {
  await prisma.loginAttempt.create({
    data: {
      email,
      ipAddress,
      success,
    },
  });
}

async function getCurrentStaffName() {
  const user = await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);

  return user.name;
}

async function requireRole(allowedRoles: UserRole[]) {
  const user = await getCurrentUser();

  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("You do not have permission to perform this action.");
  }

  return user;
}

function isRequestType(value: string): value is RequestType {
  return value in RequestType;
}

function selectedRequestTypes(formData: FormData) {
  const values = formData.getAll("requestTypes").map(String);
  const legacyValue = formData.get("requestType");
  if (!values.length && legacyValue) values.push(String(legacyValue));
  return [...new Set(values.filter(isRequestType))];
}

function isVisitStatus(value: string): value is VisitStatus {
  return value in VisitStatus;
}

function isUserRole(value: string): value is UserRole {
  return value in UserRole;
}

function isInventoryCategory(value: string): value is InventoryCategory {
  return value in InventoryCategory;
}

function formatLogDate(value: Date) {
  return formatDateKey(value);
}

function getChangedFields(
  before: Record<string, string | null>,
  after: Record<string, string | null>
) {
  return Object.fromEntries(
    Object.entries(after)
      .filter(([key, value]) => (before[key] ?? null) !== (value ?? null))
      .map(([key, value]) => [
        key,
        {
          before: before[key] ?? null,
          after: value ?? null,
        },
      ])
  );
}

async function runAction<T>(
  formData: FormData,
  failurePath: string,
  module: string,
  action: string,
  task: () => Promise<T>,
  entity?: { type?: string; id?: string | null }
) {
  try {
    await assertValidCsrfToken(formData);
    return await task();
  } catch (error) {
    const message = getActionErrorMessage(error);

    await writeActivityLog({
      module,
      action,
      status: "FAILED",
      entityType: entity?.type,
      entityId: entity?.id,
      description: message,
    });

    redirect(appendActionFeedback(failurePath, "error", message));
  }
}

export async function createPatientAction(formData: FormData) {
  const patient = await runAction(formData, "/patients/new", "Patient Records", "Create patient", async () => {
    await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE, UserRole.RECORDS]);
    const clinic = await ensureClinic();
    const measurements = parseMeasurements(formData);
    const createdPatient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        lastName: requiredString(formData, "lastName"),
        firstName: requiredString(formData, "firstName"),
        middleName: optionalString(formData, "middleName"),
        birthDate: parseDate(requiredString(formData, "birthDate")),
        gender: requiredString(formData, "gender") as Prisma.PatientCreateInput["gender"],
        address: optionalString(formData, "address"),
        contactNo: optionalString(formData, "contactNo"),
        agency: optionalString(formData, "agency"),
        designation: optionalString(formData, "designation"),
        civilStatus: optionalString(formData, "civilStatus"),
        ...measurements,
      },
    });

    await writeActivityLog({
      clinicId: clinic.id,
      module: "Patient Records",
      action: "Create patient",
      entityType: "Patient",
      entityId: createdPatient.id,
      description: `Created patient record for ${createdPatient.lastName}, ${createdPatient.firstName}.`,
    });

    return createdPatient;
  });

  revalidatePath("/patients");
  redirect(`/patients/${patient.id}`);
}

export async function updatePatientAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");

  await runAction(formData, `/patients/${patientId}/edit`, "Patient Records", "Update patient", async () => {
    await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE, UserRole.RECORDS]);
    const currentPatient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!currentPatient) {
      throw new Error("The selected record was not found.");
    }

    const nextBirthDate = parseDate(requiredString(formData, "birthDate"));
    const measurements = parseMeasurements(formData);
    const nextValues = {
      lastName: requiredString(formData, "lastName"),
      firstName: requiredString(formData, "firstName"),
      middleName: optionalString(formData, "middleName"),
      birthDate: formatLogDate(nextBirthDate),
      gender: requiredString(formData, "gender"),
      address: optionalString(formData, "address"),
      contactNo: optionalString(formData, "contactNo"),
      agency: optionalString(formData, "agency"),
      designation: optionalString(formData, "designation"),
      civilStatus: optionalString(formData, "civilStatus"),
      heightCm: measurements.heightCm?.toString() ?? null,
      weightKg: measurements.weightKg?.toString() ?? null,
    };
    const previousValues = {
      lastName: currentPatient.lastName,
      firstName: currentPatient.firstName,
      middleName: currentPatient.middleName,
      birthDate: formatLogDate(currentPatient.birthDate),
      gender: currentPatient.gender,
      address: currentPatient.address,
      contactNo: currentPatient.contactNo,
      agency: currentPatient.agency,
      designation: currentPatient.designation,
      civilStatus: currentPatient.civilStatus,
      heightCm: currentPatient.heightCm?.toString() ?? null,
      weightKg: currentPatient.weightKg?.toString() ?? null,
    };

    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        lastName: nextValues.lastName,
        firstName: nextValues.firstName,
        middleName: nextValues.middleName,
        birthDate: nextBirthDate,
        gender: nextValues.gender as Prisma.PatientUpdateInput["gender"],
        address: nextValues.address,
        contactNo: nextValues.contactNo,
        agency: nextValues.agency,
        designation: nextValues.designation,
        civilStatus: nextValues.civilStatus,
        heightCm: measurements.heightCm,
        weightKg: measurements.weightKg,
      },
    });
    const changes = getChangedFields(previousValues, nextValues);

    await writeActivityLog({
      clinicId: patient.clinicId,
      module: "Patient Records",
      action: "Update patient",
      entityType: "Patient",
      entityId: patient.id,
      description: `Updated patient record for ${patient.lastName}, ${patient.firstName}.`,
      metadata: { changes },
    });
  }, { type: "Patient", id: patientId });

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function createVisitAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  await runAction(formData, `/patients/${patientId}`, "Patient Records", "Queue visit", async () => {
    const requestTypes = selectedRequestTypes(formData);
    if (!requestTypes.length) {
      throw new Error("Select at least one service requested.");
    }
    const nurseOnDuty = await getCurrentStaffName();

    const visit = await prisma.visit.create({
      data: {
        patientId,
        timeIn: new Date(),
        status: VisitStatus.QUEUED,
        nurseOnDuty,
        requests: {
          create: requestTypes.map((type) => ({ type })),
        },
      },
      include: {
        patient: true,
      },
    });

    await writeActivityLog({
      clinicId: visit.patient.clinicId,
      module: "Patient Records",
      action: "Queue visit",
      entityType: "Visit",
      entityId: visit.id,
      description: `Queued visit for ${visit.patient.lastName}, ${visit.patient.firstName}.`,
    });
  }, { type: "Patient", id: patientId });

  revalidatePath("/todays-patients");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function startVisitAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const visitId = requiredString(formData, "visitId");

  await runAction(formData, `/patients/${patientId}`, "Patient Records", "Start visit", async () => {
    const nurseOnDuty = await getCurrentStaffName();
    const visit = await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: VisitStatus.IN_PROGRESS,
        nurseOnDuty,
      },
      include: {
        patient: true,
      },
    });

    await writeActivityLog({
      clinicId: visit.patient.clinicId,
      module: "Patient Records",
      action: "Start visit",
      entityType: "Visit",
      entityId: visit.id,
      description: `Started visit for ${visit.patient.lastName}, ${visit.patient.firstName}.`,
      metadata: { assignedStaff: nurseOnDuty },
    });
  }, { type: "Visit", id: visitId });

  revalidatePath("/todays-patients");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function updateVisitAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const visitId = requiredString(formData, "visitId");
  await runAction(formData, `/patients/${patientId}`, "Patient Records", "Update visit", async () => {
    const requestTypes = selectedRequestTypes(formData);
    if (!requestTypes.length) {
      throw new Error("Select at least one service requested.");
    }
    const statusValue = requiredString(formData, "status");
    const status = isVisitStatus(statusValue) ? statusValue : VisitStatus.QUEUED;
    const nurseOnDuty = await getCurrentStaffName();

    const visit = await prisma.$transaction(async (tx) => {
      const updatedVisit = await tx.visit.update({
        where: { id: visitId },
        data: {
          chiefComplaint: optionalString(formData, "chiefComplaint"),
          bloodPressure: optionalString(formData, "bloodPressure"),
          rbs: optionalString(formData, "rbs"),
          temperature: optionalString(formData, "temperature"),
          pulseRate: optionalString(formData, "pulseRate"),
          respiratoryRate: optionalString(formData, "respiratoryRate"),
          diagnosis: optionalString(formData, "diagnosis"),
          treatmentPlan: optionalString(formData, "treatmentPlan"),
          progressNotes: optionalString(formData, "progressNotes"),
          nurseOnDuty,
          status,
          timeOut: status === VisitStatus.COMPLETED || status === VisitStatus.CANCELLED ? new Date() : null,
        },
        include: {
          patient: true,
        },
      });

      await tx.visitRequest.deleteMany({
        where: { visitId, type: { notIn: requestTypes } },
      });
      const existingRequests = await tx.visitRequest.findMany({
        where: { visitId, type: { in: requestTypes } },
        select: { type: true },
      });
      const existingTypes = new Set(existingRequests.map((request) => request.type));
      const missingTypes = requestTypes.filter((type) => !existingTypes.has(type));
      if (missingTypes.length) {
        await tx.visitRequest.createMany({
          data: missingTypes.map((type) => ({ visitId, type })),
        });
      }

      return updatedVisit;
    });

    await writeActivityLog({
      clinicId: visit.patient.clinicId,
      module: "Patient Records",
      action: "Update visit",
      entityType: "Visit",
      entityId: visit.id,
      description: `Updated visit for ${visit.patient.lastName}, ${visit.patient.firstName}.`,
      metadata: { status },
    });
  }, { type: "Visit", id: visitId });

  revalidatePath("/todays-patients");
  revalidatePath("/follow-ups");
  revalidatePath("/vaccination");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function completeVisitAction(formData: FormData) {
  formData.set("status", VisitStatus.COMPLETED);
  return updateVisitAction(formData);
}

export async function updateVisitStatusAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const visitId = requiredString(formData, "visitId");

  await runAction(formData, `/patients/${patientId}`, "Patient Records", "Update visit status", async () => {
    await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);
    const statusValue = requiredString(formData, "status");
    const status = isVisitStatus(statusValue) ? statusValue : VisitStatus.QUEUED;
    const currentVisit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patient: true,
      },
    });

    if (!currentVisit) {
      throw new Error("The selected visit was not found.");
    }
    const nurseOnDuty = status === VisitStatus.IN_PROGRESS ? await getCurrentStaffName() : currentVisit.nurseOnDuty;

    const visit = await prisma.visit.update({
      where: { id: visitId },
      data: {
        status,
        nurseOnDuty,
        timeOut: status === VisitStatus.COMPLETED || status === VisitStatus.CANCELLED ? new Date() : null,
      },
      include: {
        patient: true,
      },
    });

    await writeActivityLog({
      clinicId: visit.patient.clinicId,
      module: "Patient Records",
      action: "Update visit status",
      entityType: "Visit",
      entityId: visit.id,
      description: `Changed visit status for ${visit.patient.lastName}, ${visit.patient.firstName}.`,
      metadata: {
        changes: {
          status: {
            before: currentVisit.status,
            after: status,
          },
        },
      },
    });
  }, { type: "Visit", id: visitId });

  revalidatePath("/todays-patients");
  revalidatePath("/follow-ups");
  revalidatePath("/vaccination");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function cancelQueuedVisitAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const visitId = requiredString(formData, "visitId");
  const redirectToValue = String(formData.get("redirectTo") ?? "/todays-patients");
  const redirectTo = redirectToValue.startsWith("/") ? redirectToValue : "/todays-patients";

  await runAction(formData, redirectTo, "Patient Records", "Cancel queued visit", async () => {
    await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);
    const currentVisit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patient: true,
      },
    });

    if (!currentVisit || currentVisit.patientId !== patientId) {
      throw new Error("The selected visit was not found.");
    }

    if (currentVisit.status === VisitStatus.COMPLETED || currentVisit.status === VisitStatus.CANCELLED) {
      throw new Error("This visit is already closed.");
    }

    const visit = await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: VisitStatus.CANCELLED,
        timeOut: new Date(),
      },
      include: {
        patient: true,
      },
    });

    await writeActivityLog({
      clinicId: visit.patient.clinicId,
      module: "Patient Records",
      action: "Cancel queued visit",
      entityType: "Visit",
      entityId: visit.id,
      description: `Cancelled queued visit for ${visit.patient.lastName}, ${visit.patient.firstName}.`,
      metadata: {
        changes: {
          status: {
            before: currentVisit.status,
            after: VisitStatus.CANCELLED,
          },
        },
      },
    });
  }, { type: "Visit", id: visitId });

  revalidatePath("/todays-patients");
  revalidatePath("/follow-ups");
  revalidatePath("/vaccination");
  revalidatePath(`/patients/${patientId}`);
  redirect(appendActionFeedback(redirectTo, "message", "Queued visit cancelled."));
}

export async function createInventoryItemAction(formData: FormData) {
  await runAction(formData, "/inventory", "Inventory", "Create item", async () => {
    await requireRole([UserRole.ADMIN, UserRole.SUPPLY_OFFICER]);
    const clinic = await ensureClinic();
    const categoryValue = requiredString(formData, "category");
    const category = isInventoryCategory(categoryValue) ? categoryValue : InventoryCategory.SUPPLY;
    const stock = Number(formData.get("stock") ?? 0);
    const reorderLevel = Number(formData.get("reorderLevel") ?? 0);
    const pcsPerBoxRaw = optionalString(formData, "pcsPerBox");
    const pcsPerBox = pcsPerBoxRaw ? Number(pcsPerBoxRaw) : null;
    if (![stock, reorderLevel].every((value) => Number.isInteger(value) && value >= 0) || (pcsPerBox !== null && (!Number.isInteger(pcsPerBox) || pcsPerBox <= 0))) {
      throw new Error("Stock, threshold, and pieces per box must be valid whole numbers.");
    }
    const name = requiredString(formData, "name");
    const dosage = optionalString(formData, "dosage");
    const brandName = optionalString(formData, "brandName");
    const classification = optionalString(formData, "classification");
    const expirationValue = optionalString(formData, "expirationDate");
    if ((category === InventoryCategory.MEDICINE || category === InventoryCategory.VACCINE) && !expirationValue) {
      throw new Error("Expiration date is required for medicines and vaccines.");
    }
    const expirationDate = expirationValue ? parseDate(expirationValue) : null;
    const batchKey = [name, dosage, brandName, classification, expirationValue]
      .map((value) => (value ?? "").trim().toLowerCase().replace(/\s+/g, " "))
      .join("|");
    const existingBatch = await prisma.inventoryItem.findUnique({
      where: { clinicId_batchKey: { clinicId: clinic.id, batchKey } },
      select: { id: true },
    });
    if (existingBatch) {
      throw new Error("This exact medicine batch and expiration date already exists. Use its existing inventory record instead.");
    }

    const item = await prisma.$transaction(async (tx) => {
      const createdItem = await tx.inventoryItem.create({
        data: {
          clinicId: clinic.id,
          name,
          dosage,
          brandName,
          classification,
          pcsPerBox,
          expirationDate,
          batchKey,
          category,
          stock,
          unit: requiredString(formData, "unit"),
          reorderLevel,
        },
      });

      if (stock > 0) {
        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: createdItem.id,
            quantityChange: stock,
            reason: "Opening stock",
          },
        });
      }

      return createdItem;
    });

    await writeActivityLog({
      clinicId: clinic.id,
      module: "Inventory",
      action: "Create item",
      entityType: "InventoryItem",
      entityId: item.id,
      description: `Created inventory item ${item.name}.`,
      metadata: { stock, category },
    });
  });

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function requestMedicineAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const visitId = requiredString(formData, "visitId");
  await runAction(formData, `/patients/${patientId}`, "Medicines", "Request medicine", async () => {
    await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);
    const inventoryItemId = requiredString(formData, "inventoryItemId");
    const inventoryItem = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    if (!inventoryItem) throw new Error("Selected medicine batch was not found.");
    const itemName = inventoryItem.name;
    const quantity = Number(formData.get("quantity") ?? 0);
    const schedule = parseMedicineSchedule(formData);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity must be a positive whole number.");
    }

    const medicineRequest = await prisma.medicineRequest.create({
      data: {
        visitId,
        inventoryItemId,
        itemName,
        quantity,
        frequency: schedule.frequency,
        duration: schedule.duration,
        status: "REQUESTED",
      },
      include: {
        visit: {
          include: {
            patient: true,
          },
        },
      },
    });

    await writeActivityLog({
      clinicId: medicineRequest.visit.patient.clinicId,
      module: "Medicines",
      action: "Request medicine",
      entityType: "MedicineRequest",
      entityId: medicineRequest.id,
      description: `Requested ${quantity} ${itemName} for ${medicineRequest.visit.patient.lastName}, ${medicineRequest.visit.patient.firstName}.`,
    });
  }, { type: "Visit", id: visitId });

  revalidatePath("/inventory");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function dispenseMedicineAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const medicineRequestId = requiredString(formData, "medicineRequestId");
  await runAction(formData, `/patients/${patientId}`, "Medicines", "Dispense medicine", async () => {
    await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);
    const releasedBy = optionalString(formData, "releasedBy") ?? "Clinic staff";
    const receivedBy = optionalString(formData, "receivedBy") ?? "Patient";

    const medicineRequest = await prisma.$transaction(async (tx) => {
      const request = await tx.medicineRequest.findUnique({
        where: { id: medicineRequestId },
        include: {
          visit: {
            include: {
              patient: true,
            },
          },
        },
      });

      if (!request) {
        throw new Error("Medicine request not found.");
      }

      const item = request.inventoryItemId
        ? await tx.inventoryItem.findUnique({ where: { id: request.inventoryItemId } })
        : await tx.inventoryItem.findFirst({
            where: { clinicId: request.visit.patient.clinicId, name: request.itemName },
            orderBy: [{ expirationDate: "asc" }, { createdAt: "asc" }],
          });

      if (!item) {
        throw new Error("Matching inventory item not found.");
      }

      if (item.stock < request.quantity) {
        throw new Error("Insufficient stock for this request.");
      }

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          stock: {
            decrement: request.quantity,
          },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          medicineRequestId: request.id,
          quantityChange: -request.quantity,
          reason: `Medicine release for visit ${request.visitId}`,
        },
      });

      return tx.medicineRequest.update({
        where: { id: request.id },
        data: {
          status: "RELEASED",
          releasedBy,
          receivedBy,
        },
        include: {
          visit: {
            include: {
              patient: true,
            },
          },
        },
      });
    });

    await writeActivityLog({
      clinicId: medicineRequest.visit.patient.clinicId,
      module: "Medicines",
      action: "Dispense medicine",
      entityType: "MedicineRequest",
      entityId: medicineRequest.id,
      description: `Dispensed ${medicineRequest.quantity} ${medicineRequest.itemName}.`,
      metadata: { releasedBy, receivedBy },
    });
  }, { type: "MedicineRequest", id: medicineRequestId });

  revalidatePath("/inventory");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function scheduleFollowUpAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const visitId = requiredString(formData, "visitId");
  await runAction(formData, `/patients/${patientId}`, "Follow-ups", "Schedule follow-up", async () => {
    await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);
    const scheduledFor = parseDate(requiredString(formData, "scheduledFor"));

    const followUp = await prisma.$transaction(async (tx) => {
      const createdFollowUp = await tx.followUp.create({
        data: {
          visitId,
          scheduledFor,
          remarks: optionalString(formData, "remarks"),
        },
        include: {
          visit: {
            include: {
              patient: true,
            },
          },
        },
      });

      await tx.visit.update({
        where: { id: visitId },
        data: {
          status: VisitStatus.FOR_FOLLOW_UP,
        },
      });

      return createdFollowUp;
    });

    await writeActivityLog({
      clinicId: followUp.visit.patient.clinicId,
      module: "Follow-ups",
      action: "Schedule follow-up",
      entityType: "FollowUp",
      entityId: followUp.id,
      description: `Scheduled follow-up for ${followUp.visit.patient.lastName}, ${followUp.visit.patient.firstName}.`,
      metadata: { scheduledFor: scheduledFor.toISOString() },
    });
  }, { type: "Visit", id: visitId });

  revalidatePath("/follow-ups");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function addVaccinationRecordAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const visitId = requiredString(formData, "visitId");
  await runAction(formData, `/patients/${patientId}`, "Vaccination", "Add vaccination record", async () => {
    await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);
    const vaccine = requiredString(formData, "vaccine");
    const doseSelection = optionalString(formData, "dose");
    const dose = doseSelection === "Other" ? requiredString(formData, "doseOther") : doseSelection;
    const nextDoseValue = optionalString(formData, "nextDose");

    const record = await prisma.$transaction(async (tx) => {
      const vaccinationRecord = await tx.vaccinationRecord.create({
        data: {
          visitId,
          vaccine,
          dose,
          givenBy: optionalString(formData, "givenBy"),
          nextDose: nextDoseValue ? parseDate(nextDoseValue) : null,
          remarks: optionalString(formData, "remarks"),
        },
        include: {
          visit: {
            include: {
              patient: true,
            },
          },
        },
      });

      const existingVaccinationRequest = await tx.visitRequest.findFirst({
        where: {
          visitId,
          type: RequestType.VACCINATION,
        },
      });

      if (!existingVaccinationRequest) {
        await tx.visitRequest.create({
          data: {
            visitId,
            type: RequestType.VACCINATION,
          },
        });
      }

      return vaccinationRecord;
    });

    await writeActivityLog({
      clinicId: record.visit.patient.clinicId,
      module: "Vaccination",
      action: "Add vaccination record",
      entityType: "VaccinationRecord",
      entityId: record.id,
      description: `Added ${vaccine} vaccination record.`,
      metadata: { dose, nextDose: record.nextDose?.toISOString() ?? null },
    });
  }, { type: "Visit", id: visitId });

  revalidatePath("/vaccination");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function addInventoryQuantityAction(formData: FormData) {
  const itemId = requiredString(formData, "itemId");
  const quantity = requiredPositiveInteger(formData, "quantity", "Quantity");
  await runAction(formData, "/inventory", "Inventory", "Add quantity", async () => {
    await requireRole([UserRole.ADMIN, UserRole.SUPPLY_OFFICER]);
    await prisma.$transaction([
      prisma.inventoryItem.update({ where: { id: itemId }, data: { stock: { increment: quantity } } }),
      prisma.inventoryMovement.create({ data: { inventoryItemId: itemId, quantityChange: quantity, reason: "Manual stock addition" } }),
    ]);
  }, { type: "InventoryItem", id: itemId });
  revalidatePath("/inventory"); redirect("/inventory");
}

export async function updateInventoryItemAction(formData: FormData) {
  const itemId = requiredString(formData, "itemId");
  await runAction(formData, "/inventory", "Inventory", "Update item", async () => {
    await requireRole([UserRole.ADMIN, UserRole.SUPPLY_OFFICER]);
    const name = requiredString(formData, "name");
    const dosage = optionalString(formData, "dosage");
    const brandName = optionalString(formData, "brandName");
    const classification = optionalString(formData, "classification");
    const expirationValue = optionalString(formData, "expirationDate");
    const current = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!current) throw new Error("Inventory batch not found.");
    const batchKey = [name, dosage, brandName, classification, expirationValue]
      .map((value) => (value ?? "").trim().toLowerCase().replace(/\s+/g, " "))
      .join("|");

    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        name,
        dosage,
        brandName,
        classification,
        expirationDate: expirationValue ? parseDate(expirationValue) : null,
        batchKey,
        unit: requiredString(formData, "unit"),
        reorderLevel: Number(formData.get("reorderLevel") ?? 0),
        pcsPerBox: optionalString(formData, "pcsPerBox") ? Number(formData.get("pcsPerBox")) : null,
      },
    });
  }, { type: "InventoryItem", id: itemId });
  revalidatePath("/inventory"); redirect("/inventory");
}

export async function deleteInventoryItemAction(formData: FormData) {
  const itemId = requiredString(formData, "itemId");
  await runAction(formData, "/inventory", "Inventory", "Delete item", async () => { await requireRole([UserRole.ADMIN, UserRole.SUPPLY_OFFICER]); await prisma.inventoryItem.delete({ where: { id: itemId } }); }, { type: "InventoryItem", id: itemId });
  revalidatePath("/inventory"); redirect("/inventory");
}

export async function resolveItemRequestAction(formData: FormData) {
  const requestId = requiredString(formData, "requestId");
  const decision = requiredString(formData, "decision");
  await runAction(formData, "/item-requests", "Medicines", `${decision} item request`, async () => {
    await requireRole([UserRole.ADMIN, UserRole.SUPPLY_OFFICER]);
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.medicineRequest.findUnique({ where: { id: requestId }, include: { inventoryItem: true, visit: { include: { patient: true } } } });
      if (!request || request.status !== "REQUESTED") throw new Error("This request is no longer pending.");
      if (decision === "REJECT") return tx.medicineRequest.update({ where: { id: requestId }, data: { status: "REJECTED", resolvedAt: new Date() } });
      const item = request.inventoryItem;
      if (!item) throw new Error("The requested inventory batch is no longer available.");
      if (item.stock < request.quantity) throw new Error(`Insufficient stock. Only ${item.stock} ${item.unit} remain.`);
      await tx.inventoryItem.update({ where: { id: item.id }, data: { stock: { decrement: request.quantity } } });
      await tx.inventoryMovement.create({ data: { inventoryItemId: item.id, medicineRequestId: request.id, quantityChange: -request.quantity, reason: `Approved item request ${request.id}` } });
      return tx.medicineRequest.update({ where: { id: requestId }, data: { status: "APPROVED", releasedBy: "Item request queue", resolvedAt: new Date() } });
    });
    await writeActivityLog({ module: "Medicines", action: `${decision} item request`, entityType: "MedicineRequest", entityId: result.id, description: `${decision === "REJECT" ? "Rejected" : "Approved"} request for ${result.quantity} ${result.itemName}.` });
  }, { type: "MedicineRequest", id: requestId });
  revalidatePath("/item-requests"); revalidatePath("/inventory"); redirect("/item-requests");
}

export async function addVaccineOptionAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  await runAction(formData, `/patients/${patientId}`, "Vaccination", "Add vaccine option", async () => {
    await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);
    const clinicId = requiredString(formData, "clinicId");
    const name = requiredString(formData, "vaccineName");
    const vaccine = await prisma.vaccineCatalog.upsert({
      where: { clinicId_name: { clinicId, name } },
      update: {},
      create: { clinicId, name },
    });

    await writeActivityLog({
      clinicId,
      module: "Vaccination",
      action: "Add vaccine option",
      entityType: "VaccineCatalog",
      entityId: vaccine.id,
      description: `Added ${vaccine.name} to the vaccine catalog.`,
    });
  });

  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function updateClinicSettingsAction(formData: FormData) {
  await runAction(formData, "/settings", "Settings", "Update clinic settings", async () => {
    await requireRole([UserRole.ADMIN]);
    const clinic = await ensureClinic();

    const updatedClinic = await prisma.clinic.update({
      where: { id: clinic.id },
      data: {
        name: requiredString(formData, "name"),
        address: optionalString(formData, "address"),
        contact: optionalString(formData, "contact"),
        email: optionalString(formData, "email"),
      },
    });

    await writeActivityLog({
      clinicId: updatedClinic.id,
      module: "Settings",
      action: "Update clinic settings",
      entityType: "Clinic",
      entityId: updatedClinic.id,
      description: "Updated clinic profile settings.",
    });
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings");
}

export async function createUserAction(formData: FormData) {
  const redirectTo = optionalString(formData, "redirectTo") ?? "/settings";
  await runAction(formData, redirectTo, "Accounts", "Create user", async () => {
    await requireRole([UserRole.ADMIN]);
    const clinic = await ensureClinic();
    const roleValue = requiredString(formData, "role");
    const role = isUserRole(roleValue) ? roleValue : UserRole.DOCTOR_NURSE;
    const password = optionalString(formData, "password");

    if (password && !isStrongPassword(password)) {
      throw new Error("Password does not meet the requirements.");
    }

    const user = await prisma.user.create({
      data: {
        clinicId: clinic.id,
        name: requiredString(formData, "name"),
        email: requiredString(formData, "email").toLowerCase(),
        passwordHash: password ? hashPassword(password) : null,
        role,
      },
    });

    await writeActivityLog({
      clinicId: clinic.id,
      module: "Accounts",
      action: "Create user",
      entityType: "User",
      entityId: user.id,
      description: `Created user account for ${user.name}.`,
      metadata: { role },
    });
  });

  revalidatePath("/settings");
  revalidatePath("/accounts");
  redirect(redirectTo);
}

export async function toggleUserStatusAction(formData: FormData) {
  const userId = requiredString(formData, "userId");
  const nextActiveState = String(formData.get("isActive") ?? "") === "true";
  const redirectTo = String(formData.get("redirectTo") ?? "/settings");

  await runAction(formData, redirectTo, "Accounts", nextActiveState ? "Activate user" : "Deactivate user", async () => {
    await requireRole([UserRole.ADMIN]);
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: nextActiveState,
        sessionVersion: {
          increment: 1,
        },
      },
    });

    await writeActivityLog({
      clinicId: user.clinicId,
      module: "Accounts",
      action: nextActiveState ? "Activate user" : "Deactivate user",
      entityType: "User",
      entityId: user.id,
      description: `${nextActiveState ? "Activated" : "Deactivated"} user account for ${user.name}.`,
    });
  }, { type: "User", id: userId });

  revalidatePath("/settings");
  revalidatePath("/accounts");
  redirect(redirectTo);
}

export async function loginAction(formData: FormData) {
  const next = optionalString(formData, "next") ?? "/dashboard";
  const destination = await runAction(formData, "/login", "Authentication", "Sign in", async () => {
    const email = requiredString(formData, "email").toLowerCase();
    const password = requiredString(formData, "password");
    const ipAddress = await getClientIpAddress();

    if (await isLoginRateLimited(email, ipAddress)) {
      await writeActivityLog({
        module: "Authentication",
        action: "Sign in",
        status: "FAILED",
        description: `Blocked sign in after repeated failed attempts for ${email}.`,
        metadata: { email, ipAddress, reason: "RATE_LIMITED" },
      });
      throw new Error(`Too many failed sign-in attempts. Try again in ${LOGIN_ATTEMPT_WINDOW_MINUTES} minutes.`);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      await recordLoginAttempt(email, ipAddress, false);
      await writeActivityLog({
        clinicId: user?.clinicId,
        userId: user?.id,
        module: "Authentication",
        action: "Sign in",
        status: "FAILED",
        entityType: user ? "User" : undefined,
        entityId: user?.id,
        description: `Failed sign in for ${email}.`,
        metadata: { email, ipAddress },
      });
      throw new Error("Invalid email or password.");
    }

    await recordLoginAttempt(email, ipAddress, true);

    await setAuthCookie(
      createSessionToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionVersion: user.sessionVersion,
      })
    );

    await writeActivityLog({
      clinicId: user.clinicId,
      userId: user.id,
      module: "Authentication",
      action: "Sign in",
      entityType: "User",
      entityId: user.id,
      description: `${user.name} signed in.`,
      metadata: { ipAddress },
    });

    return next.startsWith("/") ? next : "/dashboard";
  });

  redirect(destination);
}

export async function createAccountAction(formData: FormData) {
  await runAction(formData, "/login?mode=create-account", "Accounts", "Request account", async () => {
    const clinic = await ensureClinic();
    const name = requiredString(formData, "name");
    const email = requiredString(formData, "email").toLowerCase();
    const password = requiredString(formData, "password");
    const confirmPassword = requiredString(formData, "confirmPassword");

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    if (!isStrongPassword(password)) {
      throw new Error("Password does not meet the requirements.");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("An account with this email already exists.");
    }

    const user = await prisma.user.create({
      data: {
        clinicId: clinic.id,
        name,
        email,
        passwordHash: hashPassword(password),
        role: UserRole.DOCTOR_NURSE,
        isActive: false,
      },
    });

    await writeActivityLog({
      clinicId: clinic.id,
      module: "Accounts",
      action: "Request account",
      entityType: "User",
      entityId: user.id,
      description: `Submitted account request for ${user.name}.`,
    });
  });

  revalidatePath("/accounts");
  redirect(`/login?message=${encodeURIComponent("Account request submitted. An admin must activate the account before sign in.")}`);
}

export async function logoutAction(formData: FormData) {
  await assertValidCsrfToken(formData);
  await writeActivityLog({
    module: "Authentication",
    action: "Sign out",
    description: "User signed out.",
  });
  await clearAuthCookie();
  redirect("/login");
}

