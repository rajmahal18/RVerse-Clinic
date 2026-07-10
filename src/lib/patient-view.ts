import {
  InventoryCategory,
  PatientGender,
  Prisma,
  RequestType,
  VisitStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const requestTypeLabels: Record<RequestType, string> = {
  CONSULTATION: "Medical Consultation",
  MEDICINES: "Provision of Medicine",
  CS_211_MEDICAL_CERTIFICATE: "CS 211 Medical Certificate",
  REGULAR_MEDICAL_CERTIFICATE: "Medical Certificate",
  VACCINATION: "Provision of Vaccine",
  EMERGENCY: "Emergency Medical Services",
  MEDICAL_ALLOWANCE: "Medical Allowance",
  REFERRAL: "Referral",
};

const visitStatusLabels: Record<VisitStatus, string> = {
  QUEUED: "Queued",
  IN_PROGRESS: "In progress",
  FOR_FOLLOW_UP: "For follow up",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type PatientWithVisits = Prisma.PatientGetPayload<{
  include: {
    visits: {
      include: {
        requests: true;
      };
    };
  };
}>;

type PatientWorkflowRecord = Prisma.PatientGetPayload<{
  include: {
    visits: {
      include: {
        requests: true;
        medicines: true;
        followUps: true;
        vaccinations: true;
      };
    };
  };
}>;

export type PatientTableRow = {
  id: string;
  lastName: string;
  firstName: string;
  middleName: string;
  age: number;
  birthDate: string;
  gender: string;
  address: string;
  contact: string;
  agency: string;
  designation: string;
  civilStatus: string;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  request: string;
  status: string;
};

export type PatientProfileData = PatientTableRow & {
  clinicId: string;
  createdAt: string;
};

export type PatientListResult = {
  rows: PatientTableRow[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
};

export type PatientVisitWorkflow = {
  id: string;
  timeIn: string;
  timeOut: string | null;
  statusCode: VisitStatus;
  status: string;
  chiefComplaint: string;
  bloodPressure: string;
  rbs: string;
  temperature: string;
  pulseRate: string;
  respiratoryRate: string;
  diagnosis: string;
  treatmentPlan: string;
  progressNotes: string;
  nurseOnDuty: string;
  requests: { id: string; type: RequestType; label: string }[];
  medicines: {
    id: string;
    itemName: string;
    quantity: number;
    frequency: string;
    duration: string;
    status: string;
    releasedBy: string;
    receivedBy: string;
  }[];
  vaccinations: {
    id: string;
    vaccine: string;
    dose: string;
    givenBy: string;
    nextDose: string;
    remarks: string;
  }[];
  followUps: {
    id: string;
    scheduledFor: string;
    remarks: string;
    status: string;
  }[];
};

export type PatientWorkflowProfile = PatientProfileData & {
  latestVisit: PatientVisitWorkflow | null;
  visitHistory: PatientVisitWorkflow[];
};

export type InventoryTableRow = {
  id: string;
  item: string;
  dosage: string;
  brandName: string;
  classification: string;
  category: string;
  pcsPerBox: string;
  expirationDate: string;
  expirationDateValue: string;
  expiryStatus: "Expired" | "Within 1 month" | "Within 3 months" | "Within 6 months" | "Safe" | "No expiry";
  stock: number;
  unit: string;
  reorder: number;
  status: "Healthy" | "Low stock" | "Out of stock";
  beginningStock: number;
  received: number;
  dispensed: number;
  endingStock: number;
  netMovement: number;
  createdAt: string;
  beginningBoxes: string;
  beginningPieces: string;
  monthIn: string;
  monthOutPieces: string;
  monthOutBoxes: string;
  remainingPieces: string;
  remainingBoxes: string;
};

export type InventoryMonthOption = {
  value: string;
  label: string;
};

export type InventoryLedgerData = {
  rows: InventoryTableRow[];
  selectedMonth: string;
  selectedMonthLabel: string;
  monthOptions: InventoryMonthOption[];
  expiryFilter: string;
  sort: string;
  expiryAlerts: { expired: number; withinOne: number; withinThree: number; withinSix: number };
};

export type ClinicSettingsData = {
  clinic: {
    id: string;
    name: string;
    address: string;
    contact: string;
    email: string;
  };
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  }[];
};

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatDisplayDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(value);
}

function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(value);
}

function calculateAge(birthDate: Date) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
}

function formatGender(gender: PatientGender) {
  return gender.charAt(0) + gender.slice(1).toLowerCase();
}

function getDayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function getMonthRange(month?: string) {
  const monthPattern = /^\d{4}-\d{2}$/;
  const baseDate = month && monthPattern.test(month) ? new Date(`${month}-01T00:00:00`) : new Date();
  const year = baseDate.getFullYear();
  const monthIndex = baseDate.getMonth();
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);

  return {
    start,
    end,
    key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    label: formatMonthLabel(start),
  };
}

function getInventoryMonthOptions(current = new Date()): InventoryMonthOption[] {
  return Array.from({ length: 12 }, (_, index) => {
    const optionDate = new Date(current.getFullYear(), current.getMonth() - index, 1);
    return {
      value: `${optionDate.getFullYear()}-${String(optionDate.getMonth() + 1).padStart(2, "0")}`,
      label: formatMonthLabel(optionDate),
    };
  });
}

function paginateRows(rows: PatientTableRow[], page: number, pageSize: number): PatientListResult {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(10, pageSize));
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  const currentPage = Math.min(safePage, totalPages);
  const start = (currentPage - 1) * safePageSize;

  return {
    rows: rows.slice(start, start + safePageSize),
    totalCount,
    currentPage,
    pageSize: safePageSize,
    totalPages,
  };
}

function toPatientTableRow(patient: PatientWithVisits): PatientTableRow {
  const latestVisit = patient.visits[0];
  const latestRequests = latestVisit?.requests ?? [];
  const request = latestRequests.length
    ? latestRequests.map(({ type }) => requestTypeLabels[type]).join(", ")
    : "No request yet";
  const bmi = patient.heightCm && patient.weightKg
    ? patient.weightKg / (patient.heightCm / 100) ** 2
    : null;

  return {
    id: patient.id,
    lastName: patient.lastName,
    firstName: patient.firstName,
    middleName: patient.middleName ?? "",
    age: calculateAge(patient.birthDate),
    birthDate: formatDate(patient.birthDate),
    gender: formatGender(patient.gender),
    address: patient.address ?? "Not provided",
    contact: patient.contactNo ?? "Not provided",
    agency: patient.agency ?? "Not provided",
    designation: patient.designation ?? "Not provided",
    civilStatus: patient.civilStatus
      ? patient.civilStatus.charAt(0) + patient.civilStatus.slice(1).toLowerCase()
      : "Not provided",
    heightCm: patient.heightCm,
    weightKg: patient.weightKg,
    bmi,
    request,
    status: latestVisit ? visitStatusLabels[latestVisit.status] : "No visit yet",
  };
}

function toVisitWorkflow(
  visit: PatientWorkflowRecord["visits"][number]
): PatientVisitWorkflow {
  return {
    id: visit.id,
    timeIn: formatDateTime(visit.timeIn),
    timeOut: visit.timeOut ? formatDateTime(visit.timeOut) : null,
    statusCode: visit.status,
    status: visitStatusLabels[visit.status],
    chiefComplaint: visit.chiefComplaint ?? "",
    bloodPressure: visit.bloodPressure ?? "",
    rbs: visit.rbs ?? "",
    temperature: visit.temperature ?? "",
    pulseRate: visit.pulseRate ?? "",
    respiratoryRate: visit.respiratoryRate ?? "",
    diagnosis: visit.diagnosis ?? "",
    treatmentPlan: visit.treatmentPlan ?? "",
    progressNotes: visit.progressNotes ?? "",
    nurseOnDuty: visit.nurseOnDuty ?? "",
    requests: visit.requests.map((request) => ({
      id: request.id,
      type: request.type,
      label: requestTypeLabels[request.type],
    })),
    medicines: visit.medicines.map((medicine) => ({
      id: medicine.id,
      itemName: medicine.itemName,
      quantity: medicine.quantity,
      frequency: medicine.frequency ?? "",
      duration: medicine.duration ?? "",
      status: medicine.status,
      releasedBy: medicine.releasedBy ?? "",
      receivedBy: medicine.receivedBy ?? "",
    })),
    vaccinations: visit.vaccinations.map((record) => ({
      id: record.id,
      vaccine: record.vaccine,
      dose: record.dose ?? "",
      givenBy: record.givenBy ?? "",
      nextDose: record.nextDose ? formatDisplayDate(record.nextDose) : "",
      remarks: record.remarks ?? "",
    })),
    followUps: visit.followUps.map((followUp) => ({
      id: followUp.id,
      scheduledFor: formatDateTime(followUp.scheduledFor),
      remarks: followUp.remarks ?? "",
      status: followUp.status.replaceAll("_", " ").toLowerCase(),
    })),
  };
}

function getPatientSearchWhere(search?: string): Prisma.PatientWhereInput | undefined {
  const normalizedSearch = search?.trim();

  if (!normalizedSearch) {
    return undefined;
  }

  return {
    OR: [
      { lastName: { contains: normalizedSearch, mode: "insensitive" } },
      { firstName: { contains: normalizedSearch, mode: "insensitive" } },
      { middleName: { contains: normalizedSearch, mode: "insensitive" } },
      { contactNo: { contains: normalizedSearch, mode: "insensitive" } },
      { agency: { contains: normalizedSearch, mode: "insensitive" } },
      { designation: { contains: normalizedSearch, mode: "insensitive" } },
    ],
  };
}

async function listPatients(where?: Prisma.PatientWhereInput) {
  return prisma.patient.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      visits: {
        orderBy: {
          timeIn: "desc",
        },
        take: 1,
        include: {
          requests: true,
        },
      },
    },
  });
}

export async function getPatientTableRows(
  filter?: string,
  page = 1,
  pageSize = 25,
  search?: string
): Promise<PatientListResult> {
  const where = getPatientSearchWhere(search);

  if (!filter && !where) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(10, pageSize));
    const totalCount = await prisma.patient.count();
    const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
    const currentPage = Math.min(safePage, totalPages);
    const patients = await prisma.patient.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (currentPage - 1) * safePageSize,
      take: safePageSize,
      include: {
        visits: {
          orderBy: {
            timeIn: "desc",
          },
          take: 1,
          include: {
            requests: true,
          },
        },
      },
    });

    return {
      rows: patients.map(toPatientTableRow),
      totalCount,
      currentPage,
      pageSize: safePageSize,
      totalPages,
    };
  }

  const normalizedFilter = filter?.trim().toLowerCase();
  const patients = await listPatients(where);
  let rows = patients.map(toPatientTableRow);

  if (normalizedFilter) {
    rows = rows.filter(
      (row) =>
        row.request.toLowerCase().includes(normalizedFilter) ||
        row.status.toLowerCase().includes(normalizedFilter)
    );
  }

  return paginateRows(rows, page, pageSize);
}

export async function getTodaysPatientTableRows(
  page = 1,
  pageSize = 25,
  search?: string
): Promise<PatientListResult> {
  const { start, end } = getDayRange();
  const searchWhere = getPatientSearchWhere(search);
  const where = {
    ...(searchWhere ?? {}),
    visits: {
      some: {
        timeIn: {
          gte: start,
          lt: end,
        },
      },
    },
  } satisfies Prisma.PatientWhereInput;

  const patients = await prisma.patient.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      visits: {
        where: {
          timeIn: {
            gte: start,
            lt: end,
          },
        },
        orderBy: {
          timeIn: "desc",
        },
        take: 1,
        include: {
          requests: true,
        },
      },
    },
  });

  return paginateRows(patients.map(toPatientTableRow), page, pageSize);
}

export async function getPatientProfile(id: string): Promise<PatientProfileData | null> {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      visits: {
        orderBy: {
          timeIn: "desc",
        },
        take: 1,
        include: {
          requests: true,
        },
      },
    },
  });

  if (!patient) {
    return null;
  }

  return {
    ...toPatientTableRow(patient),
    clinicId: patient.clinicId,
    createdAt: formatDateTime(patient.createdAt),
  };
}

export async function getPatientWorkflowProfile(id: string): Promise<PatientWorkflowProfile | null> {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      visits: {
        orderBy: {
          timeIn: "desc",
        },
        include: {
          requests: true,
          medicines: {
            orderBy: {
              createdAt: "desc",
            },
          },
          followUps: {
            orderBy: {
              scheduledFor: "desc",
            },
          },
          vaccinations: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });

  if (!patient) {
    return null;
  }

  const baseProfile = await getPatientProfile(id);

  if (!baseProfile) {
    return null;
  }

  const visitHistory = patient.visits.map(toVisitWorkflow);

  return {
    ...baseProfile,
    latestVisit: visitHistory[0] ?? null,
    visitHistory,
  };
}

export async function getInventoryLedgerData(search?: string, month?: string, expiryFilter = "all", sort = "name_asc"): Promise<InventoryLedgerData> {
  const normalizedSearch = search?.trim();
  const { start, end, key, label } = getMonthRange(month);
  const now = new Date();
  const addMonths = (months: number) => new Date(now.getFullYear(), now.getMonth() + months, now.getDate(), 23, 59, 59, 999);
  const expiryWhere: Prisma.InventoryItemWhereInput = expiryFilter === "expired"
    ? { expirationDate: { lt: now } }
    : ["1", "3", "6"].includes(expiryFilter)
      ? { expirationDate: { gte: now, lte: addMonths(Number(expiryFilter)) } }
      : {};
  const searchWhere: Prisma.InventoryItemWhereInput = normalizedSearch ? { OR: [
    { name: { contains: normalizedSearch, mode: "insensitive" } },
    { dosage: { contains: normalizedSearch, mode: "insensitive" } },
    { brandName: { contains: normalizedSearch, mode: "insensitive" } },
    { classification: { contains: normalizedSearch, mode: "insensitive" } },
    { unit: { contains: normalizedSearch, mode: "insensitive" } },
  ] } : {};
  const orderBy: Prisma.InventoryItemOrderByWithRelationInput[] =
    sort === "name_desc" ? [{ name: "desc" }] : sort === "expiry_asc" ? [{ expirationDate: { sort: "asc", nulls: "last" } }] :
    sort === "expiry_desc" ? [{ expirationDate: { sort: "desc", nulls: "last" } }] : sort === "stock_asc" ? [{ stock: "asc" }] :
    sort === "stock_desc" ? [{ stock: "desc" }] : sort === "brand_asc" ? [{ brandName: { sort: "asc", nulls: "last" } }] :
    sort === "classification_asc" ? [{ classification: { sort: "asc", nulls: "last" } }] : [{ name: "asc" }, { expirationDate: "asc" }];
  const [items, alertItems] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { AND: [searchWhere, expiryWhere] }, orderBy, include: { movements: { orderBy: { createdAt: "asc" } } } }),
    prisma.inventoryItem.findMany({ where: { stock: { gt: 0 }, expirationDate: { lte: addMonths(6) } }, select: { expirationDate: true } }),
  ]);

  return {
    rows: items.map((item) => {
      const monthlyMovements = item.movements.filter((movement) => movement.createdAt >= start && movement.createdAt < end);
      const laterMovements = item.movements.filter((movement) => movement.createdAt >= end);
      const endingStock = item.stock - laterMovements.reduce((sum, movement) => sum + movement.quantityChange, 0);
      const received = monthlyMovements.filter((movement) => movement.quantityChange > 0).reduce((sum, movement) => sum + movement.quantityChange, 0);
      const dispensed = monthlyMovements.filter((movement) => movement.quantityChange < 0).reduce((sum, movement) => sum + Math.abs(movement.quantityChange), 0);
      const beginningStock = endingStock - received + dispensed;
      return {
        id: item.id, item: item.name, dosage: item.dosage ?? "—", brandName: item.brandName ?? "—",
        classification: item.classification ?? item.category.charAt(0) + item.category.slice(1).toLowerCase(),
        category: item.category.charAt(0) + item.category.slice(1).toLowerCase(), pcsPerBox: item.pcsPerBox?.toString() ?? "—",
        expirationDate: item.expirationDate ? formatDisplayDate(item.expirationDate) : "—",
        expirationDateValue: item.expirationDate?.toISOString().slice(0, 10) ?? "",
        expiryStatus: !item.expirationDate ? "No expiry" as const : item.expirationDate < now ? "Expired" as const : item.expirationDate <= addMonths(1) ? "Within 1 month" as const : item.expirationDate <= addMonths(3) ? "Within 3 months" as const : item.expirationDate <= addMonths(6) ? "Within 6 months" as const : "Safe" as const,
        stock: item.stock, unit: item.unit, reorder: item.reorderLevel,
        status: item.stock <= 0 ? "Out of stock" as const : item.stock <= item.reorderLevel ? "Low stock" as const : "Healthy" as const,
        beginningStock: Math.max(0, beginningStock), received, dispensed, endingStock: Math.max(0, endingStock), netMovement: received - dispensed,
        createdAt: formatDisplayDate(item.createdAt), beginningBoxes: item.pcsPerBox ? String(Math.floor(Math.max(0, beginningStock) / item.pcsPerBox)) : "—",
        beginningPieces: String(Math.max(0, beginningStock)), monthIn: String(received), monthOutPieces: String(dispensed), monthOutBoxes: "0",
        remainingPieces: String(Math.max(0, endingStock)), remainingBoxes: item.pcsPerBox ? String(Math.floor(Math.max(0, endingStock) / item.pcsPerBox)) : "—",
      };
    }),
    selectedMonth: key, selectedMonthLabel: label, monthOptions: getInventoryMonthOptions(start), expiryFilter, sort,
    expiryAlerts: {
      expired: alertItems.filter((item) => item.expirationDate && item.expirationDate < now).length,
      withinOne: alertItems.filter((item) => item.expirationDate && item.expirationDate >= now && item.expirationDate <= addMonths(1)).length,
      withinThree: alertItems.filter((item) => item.expirationDate && item.expirationDate > addMonths(1) && item.expirationDate <= addMonths(3)).length,
      withinSix: alertItems.filter((item) => item.expirationDate && item.expirationDate > addMonths(3) && item.expirationDate <= addMonths(6)).length,
    },
  };
}

export async function getInventoryOptions(clinicId: string) {
  return prisma.inventoryItem.findMany({
    where: { clinicId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      dosage: true,
      brandName: true,
      expirationDate: true,
      unit: true,
      stock: true,
    },
  });
}

export async function getVaccineOptions(clinicId: string) {
  const defaults = ["Flu vaccine", "Pneumococcal", "HPV"];
  await prisma.vaccineCatalog.createMany({
    data: defaults.map((name) => ({ clinicId, name })),
    skipDuplicates: true,
  });

  return prisma.vaccineCatalog.findMany({
    where: { clinicId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getClinicSettingsData(): Promise<ClinicSettingsData> {
  const clinic = await prisma.clinic.upsert({
    where: { id: "main-clinic" },
    update: {},
    create: {
      id: "main-clinic",
      name: "The Clinic",
      address: "",
      contact: "",
      email: "",
    },
    include: {
      users: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return {
    clinic: {
      id: clinic.id,
      name: clinic.name,
      address: clinic.address ?? "",
      contact: clinic.contact ?? "",
      email: clinic.email ?? "",
    },
    users: clinic.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    })),
  };
}
