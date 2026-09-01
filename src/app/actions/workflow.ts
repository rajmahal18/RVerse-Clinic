"use server";

import {
  InventoryCategory,
  LabResultType,
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
import { getLabFieldKeys, getLabResultType, labTypeLabels } from "@/lib/lab-results";
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

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;
const pendingMedicineDecisionMessage = "Medicine request is still awaiting pharmacist approval or rejection.";

function isClosedVisitStatus(status: VisitStatus) {
  return status === VisitStatus.COMPLETED || status === VisitStatus.CANCELLED;
}

async function requireSatisfactionSurveyForCompletion(client: PrismaClientLike, visitId: string) {
  const survey = await client.clientSatisfactionSurvey.findUnique({ where: { visitId } });
  const requiredAnswers = ["cc1", "cc2", "cc3", "sqd0", "sqd1", "sqd2", "sqd3", "sqd4", "sqd5", "sqd6", "sqd7", "sqd8"] as const;
  if (!survey || requiredAnswers.some((key) => !survey[key]?.trim())) {
    throw new Error("Complete all required Client Satisfaction Measurement Survey questions before completing this service.");
  }
}

async function requireNoPendingMedicineDecision(client: PrismaClientLike, visitId: string) {
  const pendingCount = await client.medicineRequest.count({
    where: { visitId, status: "REQUESTED" },
  });
  if (pendingCount > 0) {
    throw new Error(pendingMedicineDecisionMessage);
  }
}

async function requireVisitReadyForCompletion(client: PrismaClientLike, visitId: string) {
  await requireSatisfactionSurveyForCompletion(client, visitId);
  await requireNoPendingMedicineDecision(client, visitId);
  const medicines = await client.medicineRequest.findMany({ where: { visitId }, select: { status: true } });
  if (medicines.some((medicine) => medicine.status === "APPROVED" || medicine.status === "RELEASED")) {
    throw new Error("Approved medicine requests must be released and received before completing the visit.");
  }
}

async function getVisitForPatient(client: PrismaClientLike, patientId: string, visitId: string) {
  const visit = await client.visit.findUnique({
    where: { id: visitId },
    include: {
      patient: true,
    },
  });

  if (!visit || visit.patientId !== patientId) {
    throw new Error("The selected visit was not found for this patient.");
  }

  return visit;
}

async function ensureOpenVisitForPatient(
  client: PrismaClientLike,
  patientId: string,
  visitId: string,
  options: { allowQueued?: boolean } = {}
) {
  const visit = await getVisitForPatient(client, patientId, visitId);

  if (isClosedVisitStatus(visit.status)) {
    throw new Error("This visit is already closed.");
  }

  if (!options.allowQueued && visit.status === VisitStatus.QUEUED) {
    throw new Error("Start the visit before adding this record.");
  }

  return visit;
}

async function getMedicineRequestForPatient(client: PrismaClientLike, patientId: string, medicineRequestId: string) {
  const request = await client.medicineRequest.findUnique({
    where: { id: medicineRequestId },
    include: {
      visit: {
        include: {
          patient: true,
        },
      },
    },
  });

  if (!request || !request.visit || request.visit.patientId !== patientId) {
    throw new Error("Medicine request not found for this patient.");
  }

  return request;
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

function inventoryCategoryLabel(category: InventoryCategory) {
  const labels: Record<InventoryCategory, string> = {
    MEDICINE: "Medicine",
    VACCINE: "Vaccine",
    SUPPLY: "Medical supply",
    OFFICE_SUPPLY: "Office supply",
    EQUIPMENT: "Equipment",
  };
  return labels[category];
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
    const patientNumber = `P-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const createdPatient = await prisma.patient.create({
      data: {
        patientNumber,
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
        primaryContact: optionalString(formData, "primaryContact"),
        medicalHistory: optionalString(formData, "medicalHistory"),
        vaccineHistory: optionalString(formData, "vaccineHistory"),
        allergy: optionalString(formData, "allergy"),
        maintenance: optionalString(formData, "maintenance"),
        additionalMedicalInformation: optionalString(formData, "additionalMedicalInformation"),
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
    await requireRole([UserRole.ADMIN]);
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
      primaryContact: optionalString(formData, "primaryContact"),
      medicalHistory: optionalString(formData, "medicalHistory"),
      vaccineHistory: optionalString(formData, "vaccineHistory"),
      allergy: optionalString(formData, "allergy"),
      maintenance: optionalString(formData, "maintenance"),
      additionalMedicalInformation: optionalString(formData, "additionalMedicalInformation"),
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
      primaryContact: currentPatient.primaryContact,
      medicalHistory: currentPatient.medicalHistory,
      vaccineHistory: currentPatient.vaccineHistory,
      allergy: currentPatient.allergy,
      maintenance: currentPatient.maintenance,
      additionalMedicalInformation: currentPatient.additionalMedicalInformation,
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
        primaryContact: nextValues.primaryContact,
        medicalHistory: nextValues.medicalHistory,
        vaccineHistory: nextValues.vaccineHistory,
        allergy: nextValues.allergy,
        maintenance: nextValues.maintenance,
        additionalMedicalInformation: nextValues.additionalMedicalInformation,
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
    const nurseOnDuty = await getCurrentStaffName();
    const requestTypes = selectedRequestTypes(formData);
    if (!requestTypes.length) {
      throw new Error("Select at least one service requested.");
    }
    const existingOpenVisit = await prisma.visit.findFirst({
      where: {
        patientId,
        status: {
          in: [VisitStatus.QUEUED, VisitStatus.IN_PROGRESS],
        },
      },
      select: { id: true },
    });
    if (existingOpenVisit) {
      throw new Error("This patient already has an open visit.");
    }

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
    await ensureOpenVisitForPatient(prisma, patientId, visitId, { allowQueued: true });
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
    await ensureOpenVisitForPatient(prisma, patientId, visitId, { allowQueued: true });
    const submittedRequestTypes = selectedRequestTypes(formData);
    const autoLinkedRequestTypes = await prisma.visitRequest.findMany({
      where: {
        visitId,
        OR: [
          { type: RequestType.MEDICINES, visit: { medicines: { some: {} } } },
          { type: RequestType.REFERRAL, visit: { referrals: { some: {} } } },
          { type: RequestType.REFERRAL, requestedItem: { not: null } },
          { type: RequestType.VACCINATION, visit: { vaccinations: { some: {} } } },
          { type: RequestType.VACCINATION, requestedItem: { not: null } },
        ],
      },
      select: { type: true },
    });
    const requestTypes = [...new Set([...submittedRequestTypes, ...autoLinkedRequestTypes.map((request) => request.type)])];
    if (!requestTypes.length) {
      throw new Error("Select at least one service requested.");
    }
    const statusValue = requiredString(formData, "status");
    const status = isVisitStatus(statusValue) ? statusValue : VisitStatus.QUEUED;
    const nurseOnDuty = await getCurrentStaffName();
    if (status === VisitStatus.FOR_FOLLOW_UP) await requireNoPendingMedicineDecision(prisma, visitId);
    if (status === VisitStatus.COMPLETED) await requireVisitReadyForCompletion(prisma, visitId);

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

export async function autosaveVisitDraftAction(formData: FormData) {
  try {
    await assertValidCsrfToken(formData);
    const patientId = requiredString(formData, "patientId");
    const visitId = requiredString(formData, "visitId");
    await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);
    await ensureOpenVisitForPatient(prisma, patientId, visitId, { allowQueued: true });
    await prisma.visit.update({
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
      },
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
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
    const currentVisit = await getVisitForPatient(prisma, patientId, visitId);
    if (isClosedVisitStatus(currentVisit.status)) {
      throw new Error("This visit is already closed.");
    }
    if (status === VisitStatus.FOR_FOLLOW_UP) await requireNoPendingMedicineDecision(prisma, visitId);
    if (status === VisitStatus.COMPLETED) await requireVisitReadyForCompletion(prisma, visitId);
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
    const stockEntryType = String(formData.get("stockEntryType") ?? "ENCODED_EXISTING");
    const openingReason = stockEntryType === "RECEIVED" ? "Manual stock addition" : "Existing stock encoded";
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
            reason: openingReason,
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
    const user = await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);
    const visit = await ensureOpenVisitForPatient(prisma, patientId, visitId, { allowQueued: false });
    const inventoryItemId = requiredString(formData, "inventoryItemId");
    const inventoryItem = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    if (!inventoryItem) throw new Error("Selected medicine batch was not found.");
    if (inventoryItem.clinicId !== visit.patient.clinicId || inventoryItem.category !== InventoryCategory.MEDICINE) {
      throw new Error("Selected medicine batch was not found.");
    }
    const itemName = inventoryItem.name;
    const quantity = Number(formData.get("quantity") ?? 0);
    const schedule = parseMedicineSchedule(formData);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity must be a positive whole number.");
    }

    const medicineRequest = await prisma.$transaction(async (tx) => {
      const createdRequest = await tx.medicineRequest.create({
        data: {
          visitId,
          inventoryItemId,
          requestedByUserId: user.id,
          itemName,
          quantity,
          frequency: schedule.frequency,
          duration: schedule.duration,
          remarks: optionalString(formData, "remarks"),
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

      await tx.visitRequest.upsert({
        where: { visitId_type: { visitId, type: RequestType.MEDICINES } },
        update: {},
        create: { visitId, type: RequestType.MEDICINES },
      });

      return createdRequest;
    });

    await writeActivityLog({
      clinicId: medicineRequest.visit?.patient.clinicId,
      module: "Medicines",
      action: "Request medicine",
      entityType: "MedicineRequest",
      entityId: medicineRequest.id,
      description: `Requested ${quantity} ${itemName} for ${medicineRequest.visit?.patient.lastName}, ${medicineRequest.visit?.patient.firstName}.`,
    });
  }, { type: "Visit", id: visitId });

  revalidatePath("/inventory");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function createItemRequestAction(formData: FormData) {
  await runAction(formData, "/item-requests?view=my", "Medicines", "Request inventory item", async () => {
    const user = await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE, UserRole.SUPPLY_OFFICER]);
    const inventoryItemId = requiredString(formData, "inventoryItemId");
    const inventoryItem = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    if (!inventoryItem) throw new Error("Selected inventory item was not found.");
    if (inventoryItem.clinicId !== user.clinicId) {
      throw new Error("Selected inventory item was not found.");
    }
    const quantity = Number(formData.get("quantity") ?? 0);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity must be a positive whole number.");
    }

    const request = await prisma.medicineRequest.create({
      data: {
        inventoryItemId,
        requestedByUserId: user.id,
        itemName: inventoryItem.name,
        quantity,
        remarks: optionalString(formData, "remarks"),
        status: "REQUESTED",
      },
    });

    await writeActivityLog({
      clinicId: inventoryItem.clinicId,
      userId: user.id,
      module: "Medicines",
      action: "Request inventory item",
      entityType: "MedicineRequest",
      entityId: request.id,
      description: `Requested ${quantity} ${inventoryCategoryLabel(inventoryItem.category).toLowerCase()} item ${inventoryItem.name}.`,
    });
  });

  revalidatePath("/item-requests");
  redirect("/item-requests?view=my");
}

export async function dispenseMedicineAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const medicineRequestId = requiredString(formData, "medicineRequestId");
  await runAction(formData, `/patients/${patientId}`, "Medicines", "Dispense medicine", async () => {
    const user = await requireRole([UserRole.ADMIN, UserRole.SUPPLY_OFFICER]);
    const releasedBy = optionalString(formData, "releasedBy") ?? "Clinic staff";

    const medicineRequest = await prisma.$transaction(async (tx) => {
      const request = await getMedicineRequestForPatient(tx, patientId, medicineRequestId);
      if (request.status !== "APPROVED") {
        throw new Error("Approve this medicine request before release.");
      }
      if (!request.visit) {
        throw new Error("This medicine request is not linked to a patient visit.");
      }
      if (request.visit.patient.clinicId !== user.clinicId) {
        throw new Error("Approve this medicine request before release.");
      }
      if (isClosedVisitStatus(request.visit.status)) {
        throw new Error("This visit is already closed.");
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
      const existingRelease = await tx.inventoryMovement.findFirst({
        where: { medicineRequestId: request.id, quantityChange: { lt: 0 } },
        select: { id: true },
      });
      if (existingRelease) {
        return tx.medicineRequest.update({
          where: { id: request.id },
          data: {
            status: "RELEASED",
            releasedBy,
            releasedAt: request.releasedAt ?? new Date(),
          },
          include: {
            visit: {
              include: {
                patient: true,
              },
            },
          },
        });
      }

      const releasedAt = new Date();
      const claimed = await tx.medicineRequest.updateMany({
        where: { id: request.id, status: "APPROVED" },
        data: { status: "RELEASED", releasedBy, releasedAt },
      });
      if (claimed.count !== 1) {
        throw new Error("This medicine request is no longer approved for release.");
      }

      const stockUpdate = await tx.inventoryItem.updateMany({
        where: { id: item.id, stock: { gte: request.quantity } },
        data: { stock: { decrement: request.quantity } },
      });
      if (stockUpdate.count !== 1) {
        throw new Error("Insufficient stock for this request.");
      }

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          medicineRequestId: request.id,
          quantityChange: -request.quantity,
          reason: `Medicine release for visit ${request.visitId}`,
        },
      });

      return tx.medicineRequest.findUniqueOrThrow({
        where: { id: request.id },
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
      clinicId: medicineRequest.visit?.patient.clinicId,
      userId: user.id,
      module: "Medicines",
      action: "Release medicine",
      entityType: "MedicineRequest",
      entityId: medicineRequest.id,
      description: `Released ${medicineRequest.quantity} ${medicineRequest.itemName}.`,
      metadata: { releasedBy },
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
    await ensureOpenVisitForPatient(prisma, patientId, visitId, { allowQueued: false });
    await requireNoPendingMedicineDecision(prisma, visitId);
    const scheduledFor = parseDate(requiredString(formData, "scheduledFor"));
    const followUp = await prisma.$transaction(async (tx) => {
      const createdFollowUp = await tx.followUp.create({
        data: { visitId, scheduledFor, remarks: optionalString(formData, "remarks") },
        include: { visit: { include: { patient: true } } },
      });
      await tx.visit.update({ where: { id: visitId }, data: { status: VisitStatus.FOR_FOLLOW_UP } });
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

export async function receiveMedicineAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const medicineRequestId = requiredString(formData, "medicineRequestId");
  await runAction(formData, `/patients/${patientId}`, "Medicines", "Receive medicine", async () => {
    const user = await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);
    const receivedBy = optionalString(formData, "receivedBy") ?? "Patient";
    const medicineRequest = await prisma.$transaction(async (tx) => {
      const request = await getMedicineRequestForPatient(tx, patientId, medicineRequestId);
      if (request.status === "RECEIVED") return request;
      if (request.status !== "RELEASED") {
        throw new Error("Medicine must be released before it can be received.");
      }
      return tx.medicineRequest.update({
        where: { id: request.id },
        data: {
          status: "RECEIVED",
          receivedBy,
          receivedAt: new Date(),
        },
        include: { visit: { include: { patient: true } } },
      });
    });

    await writeActivityLog({
      clinicId: medicineRequest.visit?.patient.clinicId,
      userId: user.id,
      module: "Medicines",
      action: "Receive medicine",
      entityType: "MedicineRequest",
      entityId: medicineRequest.id,
      description: `Recorded receipt for ${medicineRequest.itemName}.`,
      metadata: { receivedBy },
    });
  }, { type: "MedicineRequest", id: medicineRequestId });

  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function saveLabResultAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const visitId = requiredString(formData, "visitId");
  const labResultId = optionalString(formData, "labResultId");
  const type = getLabResultType(optionalString(formData, "type"));
  if (!type) throw new Error("Select a valid laboratory result type.");

  await runAction(formData, `/patients/${patientId}`, "Laboratory Results", labResultId ? "Update lab result" : "Create lab result", async () => {
    const user = await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);
    const visit = await getVisitForPatient(prisma, patientId, visitId);
    if (isClosedVisitStatus(visit.status)) throw new Error("This visit is already closed.");
    if (visit.patient.clinicId !== user.clinicId) throw new Error("The selected visit was not found for this patient.");
    const dateReceivedValue = optionalString(formData, "dateReceived");
    const dateReleasedValue = optionalString(formData, "dateReleased");
    const allowedKeys = new Set(getLabFieldKeys(type));
    const values = [...formData.entries()]
      .filter(([key, value]) => key.startsWith("labValue:") && String(value).trim())
      .map(([key, value]) => ({ fieldKey: key.replace("labValue:", ""), result: String(value).trim() }))
      .filter((value) => allowedKeys.has(value.fieldKey));

    const labResult = await prisma.$transaction(async (tx) => {
      const result = labResultId
        ? await tx.labResult.update({
            where: { id: labResultId },
            data: {
              dateReceived: dateReceivedValue ? parseDate(dateReceivedValue) : null,
              dateReleased: dateReleasedValue ? parseDate(dateReleasedValue) : null,
              laboratoryHospital: optionalString(formData, "laboratoryHospital"),
            },
          })
        : await tx.labResult.create({
            data: {
              visitId,
              type,
              dateReceived: dateReceivedValue ? parseDate(dateReceivedValue) : null,
              dateReleased: dateReleasedValue ? parseDate(dateReleasedValue) : null,
              laboratoryHospital: optionalString(formData, "laboratoryHospital"),
            },
          });
      if (result.visitId !== visitId || result.type !== type) throw new Error("The selected laboratory result was not found.");
      await tx.labResultValue.deleteMany({ where: { labResultId: result.id, fieldKey: { notIn: values.map((value) => value.fieldKey) } } });
      for (const value of values) {
        await tx.labResultValue.upsert({
          where: { labResultId_fieldKey: { labResultId: result.id, fieldKey: value.fieldKey } },
          update: { result: value.result },
          create: { labResultId: result.id, fieldKey: value.fieldKey, result: value.result },
        });
      }
      return result;
    });

    await writeActivityLog({
      clinicId: visit.patient.clinicId,
      userId: user.id,
      module: "Laboratory Results",
      action: labResultId ? "Update lab result" : "Create lab result",
      entityType: "LabResult",
      entityId: labResult.id,
      description: `${labResultId ? "Updated" : "Created"} ${labTypeLabels[type]} result.`,
    });
  }, { type: "LabResult", id: labResultId });

  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function scheduleReferralAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const visitId = requiredString(formData, "visitId");
  await runAction(formData, `/patients/${patientId}`, "Referrals", "Schedule referral", async () => {
    await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);
    await ensureOpenVisitForPatient(prisma, patientId, visitId, { allowQueued: false });
    const scheduledFor = parseDate(requiredString(formData, "scheduledFor"));

    const referral = await prisma.$transaction(async (tx) => {
      const createdReferral = await tx.referral.create({
        data: {
          visitId,
          medicalHistory: optionalString(formData, "medicalHistory"),
          reasonForReferral: requiredString(formData, "reasonForReferral"),
          referredTo: requiredString(formData, "referredTo"),
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

      await tx.visitRequest.upsert({
        where: { visitId_type: { visitId, type: RequestType.REFERRAL } },
        update: { remarks: optionalString(formData, "remarks") },
        create: {
          visitId,
          type: RequestType.REFERRAL,
          requestedItem: requiredString(formData, "referredTo"),
          remarks: optionalString(formData, "remarks"),
        },
      });

      return createdReferral;
    });

    await writeActivityLog({
      clinicId: referral.visit.patient.clinicId,
      module: "Referrals",
      action: "Schedule referral",
      entityType: "Referral",
      entityId: referral.id,
      description: `Scheduled referral for ${referral.visit.patient.lastName}, ${referral.visit.patient.firstName}.`,
      metadata: { scheduledFor: scheduledFor.toISOString() },
    });
  }, { type: "Visit", id: visitId });

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function requestVaccineAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const visitId = requiredString(formData, "visitId");
  await runAction(formData, `/patients/${patientId}`, "Vaccination", "Request vaccine", async () => {
    await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);
    await ensureOpenVisitForPatient(prisma, patientId, visitId, { allowQueued: false });
    const vaccine = requiredString(formData, "vaccine");
    const remarks = optionalString(formData, "remarks");
    await prisma.visitRequest.upsert({
      where: { visitId_type: { visitId, type: RequestType.VACCINATION } },
      update: { requestedItem: vaccine, remarks },
      create: { visitId, type: RequestType.VACCINATION, requestedItem: vaccine, remarks },
    });
  }, { type: "Visit", id: visitId });

  revalidatePath("/vaccination");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function addVaccinationRecordAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const visitId = requiredString(formData, "visitId");
  await runAction(formData, `/patients/${patientId}`, "Vaccination", "Add vaccination record", async () => {
    await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE]);
    await ensureOpenVisitForPatient(prisma, patientId, visitId, { allowQueued: false });
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
    const stockEntryType = String(formData.get("stockEntryType") ?? "RECEIVED");
    const reason = stockEntryType === "ENCODED_EXISTING" ? "Existing stock encoded" : "Manual stock addition";
    await prisma.$transaction([
      prisma.inventoryItem.update({ where: { id: itemId }, data: { stock: { increment: quantity } } }),
      prisma.inventoryMovement.create({ data: { inventoryItemId: itemId, quantityChange: quantity, reason } }),
    ]);
  }, { type: "InventoryItem", id: itemId });
  revalidatePath("/inventory"); redirect("/inventory");
}

export async function updateInventoryItemAction(formData: FormData) {
  const itemId = requiredString(formData, "itemId");
  await runAction(formData, "/inventory", "Inventory", "Update item", async () => {
    await requireRole([UserRole.ADMIN, UserRole.SUPPLY_OFFICER]);
    const current = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!current) throw new Error("Inventory batch not found.");
    const name = requiredString(formData, "name");
    const dosage = formData.has("dosage") ? optionalString(formData, "dosage") : current.dosage;
    const brandName = formData.has("brandName") ? optionalString(formData, "brandName") : current.brandName;
    const classification = formData.has("classification") ? optionalString(formData, "classification") : current.classification;
    const expirationValue = formData.has("expirationDate")
      ? optionalString(formData, "expirationDate")
      : current.expirationDate
        ? formatDateKey(current.expirationDate)
        : null;
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

export async function submitSatisfactionSurveyAction(formData: FormData) {
  const patientId = requiredString(formData, "patientId");
  const visitId = requiredString(formData, "visitId");
  await runAction(formData, `/patients/${patientId}`, "Client Satisfaction", "Submit satisfaction survey", async () => {
    await requireRole([UserRole.ADMIN, UserRole.DOCTOR_NURSE, UserRole.RECORDS]);
    const visit = await getVisitForPatient(prisma, patientId, visitId);
    if (isClosedVisitStatus(visit.status)) throw new Error("This visit is already closed.");
    await requireNoPendingMedicineDecision(prisma, visitId);
    const existingSurvey = await prisma.clientSatisfactionSurvey.findUnique({ where: { visitId } });
    const merged = (key: "clientType" | "regionOfResidence" | "serviceAvailed" | "respondentSex" | "cc1" | "cc2" | "cc3" | "sqd0" | "sqd1" | "sqd2" | "sqd3" | "sqd4" | "sqd5" | "sqd6" | "sqd7" | "sqd8" | "suggestions" | "email") => optionalString(formData, key) ?? existingSurvey?.[key] ?? null;
    const surveyDateValue = optionalString(formData, "surveyDate");
    const surveyDate = surveyDateValue ? parseDate(surveyDateValue) : existingSurvey?.surveyDate ?? null;
    const officeVisited = optionalString(formData, "officeVisited") ?? existingSurvey?.officeVisited ?? null;
    if (!surveyDate || !officeVisited) throw new Error("Survey date and office visited are required.");
    const requiredAnswers = ["cc1", "cc2", "cc3", "sqd0", "sqd1", "sqd2", "sqd3", "sqd4", "sqd5", "sqd6", "sqd7", "sqd8"] as const;
    if (requiredAnswers.some((key) => !merged(key)?.trim())) throw new Error("Complete all required survey questions.");
    const ageRaw = optionalString(formData, "respondentAge");
    const age = ageRaw ? Number(ageRaw) : null;
    if (age !== null && (!Number.isInteger(age) || age < 0 || age > 130)) throw new Error("Respondent age must be a valid whole number.");
    const survey = await prisma.clientSatisfactionSurvey.upsert({
      where: { visitId },
      update: {
        clientType: merged("clientType"), surveyDate, officeVisited, regionOfResidence: merged("regionOfResidence"), serviceAvailed: merged("serviceAvailed"), respondentSex: merged("respondentSex"), respondentAge: age ?? existingSurvey?.respondentAge ?? null,
        cc1: merged("cc1"), cc2: merged("cc2"), cc3: merged("cc3"),
        sqd0: merged("sqd0"), sqd1: merged("sqd1"), sqd2: merged("sqd2"), sqd3: merged("sqd3"), sqd4: merged("sqd4"), sqd5: merged("sqd5"), sqd6: merged("sqd6"), sqd7: merged("sqd7"), sqd8: merged("sqd8"),
        suggestions: merged("suggestions"), email: merged("email"),
      },
      create: {
        visitId,
        clientType: merged("clientType"), surveyDate, officeVisited, regionOfResidence: merged("regionOfResidence"), serviceAvailed: merged("serviceAvailed"), respondentSex: merged("respondentSex"), respondentAge: age,
        cc1: merged("cc1"), cc2: merged("cc2"), cc3: merged("cc3"),
        sqd0: merged("sqd0"), sqd1: merged("sqd1"), sqd2: merged("sqd2"), sqd3: merged("sqd3"), sqd4: merged("sqd4"), sqd5: merged("sqd5"), sqd6: merged("sqd6"), sqd7: merged("sqd7"), sqd8: merged("sqd8"),
        suggestions: merged("suggestions"), email: merged("email"),
      },
    });
    await writeActivityLog({ clinicId: visit.patient.clinicId, module: "Client Satisfaction", action: "Submit satisfaction survey", entityType: "ClientSatisfactionSurvey", entityId: survey.id, description: `Saved client satisfaction survey for ${visit.patient.lastName}, ${visit.patient.firstName}.` });
  }, { type: "Visit", id: visitId });
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
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
    const user = await requireRole([UserRole.ADMIN, UserRole.SUPPLY_OFFICER]);
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.medicineRequest.findUnique({ where: { id: requestId }, include: { inventoryItem: true, visit: { include: { patient: true } } } });
      if (!request || request.status !== "REQUESTED") throw new Error("This request is no longer pending.");
      const requestClinicId = request.inventoryItem?.clinicId ?? request.visit?.patient.clinicId;
      if (requestClinicId !== user.clinicId) {
        throw new Error("This request is no longer pending.");
      }
      if (decision === "REJECT") {
        const updatedRequest = await tx.medicineRequest.update({ where: { id: requestId }, data: { status: "REJECTED", resolvedAt: new Date() } });
        return { request: updatedRequest, clinicId: requestClinicId };
      }
      const updatedRequest = await tx.medicineRequest.update({ where: { id: requestId }, data: { status: "APPROVED", resolvedAt: new Date() } });
      return { request: updatedRequest, clinicId: requestClinicId };
    });
    await writeActivityLog({ clinicId: result.clinicId, userId: user.id, module: "Medicines", action: `${decision} item request`, entityType: "MedicineRequest", entityId: result.request.id, description: `${decision === "REJECT" ? "Rejected" : "Approved"} request for ${result.request.quantity} ${result.request.itemName}.` });
  }, { type: "MedicineRequest", id: requestId });
  revalidatePath("/item-requests"); revalidatePath("/inventory"); redirect("/item-requests");
}

export async function releaseItemRequestAction(formData: FormData) {
  const requestId = requiredString(formData, "requestId");
  await runAction(formData, "/item-requests", "Medicines", "Release item request", async () => {
    const user = await requireRole([UserRole.ADMIN, UserRole.SUPPLY_OFFICER]);
    const releasedBy = optionalString(formData, "releasedBy") ?? user.name;
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.medicineRequest.findUnique({
        where: { id: requestId },
        include: { inventoryItem: true, visit: { include: { patient: true } } },
      });
      if (!request || request.status !== "APPROVED") throw new Error("This request is not approved for release.");
      const requestClinicId = request.inventoryItem?.clinicId ?? request.visit?.patient.clinicId;
      if (requestClinicId !== user.clinicId) throw new Error("This request is not approved for release.");
      const item = request.inventoryItem;
      if (!item) throw new Error("The requested inventory batch is no longer available.");
      const existingRelease = await tx.inventoryMovement.findFirst({
        where: { medicineRequestId: request.id, quantityChange: { lt: 0 } },
        select: { id: true },
      });
      if (existingRelease) {
        const updatedRequest = await tx.medicineRequest.update({
          where: { id: request.id },
          data: { status: "RELEASED", releasedBy, releasedAt: request.releasedAt ?? new Date() },
        });
        return { request: updatedRequest, clinicId: requestClinicId };
      }
      if (item.stock < request.quantity) throw new Error(`Insufficient stock. Only ${item.stock} ${item.unit} remain.`);
      const releasedAt = new Date();
      const claimed = await tx.medicineRequest.updateMany({
        where: { id: request.id, status: "APPROVED" },
        data: { status: "RELEASED", releasedBy, releasedAt },
      });
      if (claimed.count !== 1) throw new Error("This request is no longer approved for release.");
      const stockUpdate = await tx.inventoryItem.updateMany({
        where: { id: item.id, stock: { gte: request.quantity } },
        data: { stock: { decrement: request.quantity } },
      });
      if (stockUpdate.count !== 1) throw new Error(`Insufficient stock. Only ${item.stock} ${item.unit} remain.`);
      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          medicineRequestId: request.id,
          quantityChange: -request.quantity,
          reason: request.visitId ? `Medicine release for visit ${request.visitId}` : `Item request release ${request.id}`,
        },
      });
      const updatedRequest = await tx.medicineRequest.findUniqueOrThrow({ where: { id: request.id } });
      return { request: updatedRequest, clinicId: requestClinicId };
    });

    await writeActivityLog({
      clinicId: result.clinicId,
      userId: user.id,
      module: "Medicines",
      action: "Release item request",
      entityType: "MedicineRequest",
      entityId: result.request.id,
      description: `Released request for ${result.request.quantity} ${result.request.itemName}.`,
      metadata: { releasedBy },
    });
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
        displayName: optionalString(formData, "displayName"),
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

export async function updateUserDisplayNameAction(formData: FormData) {
  const userId = requiredString(formData, "userId");
  const redirectTo = String(formData.get("redirectTo") ?? "/accounts");

  await runAction(formData, redirectTo, "Accounts", "Update user display name", async () => {
    await requireRole([UserRole.ADMIN]);
    const displayName = optionalString(formData, "displayName");
    const user = await prisma.user.update({
      where: { id: userId },
      data: { displayName },
    });

    await writeActivityLog({
      clinicId: user.clinicId,
      module: "Accounts",
      action: "Update user display name",
      entityType: "User",
      entityId: user.id,
      description: `Updated form display name for ${user.name}.`,
    });
  }, { type: "User", id: userId });

  revalidatePath("/settings");
  revalidatePath("/accounts");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/accounts");
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

