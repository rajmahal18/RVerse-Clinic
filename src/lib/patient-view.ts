import {
  InventoryCategory,
  PatientGender,
  Prisma,
  RequestType,
  VisitStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  addMonths,
  calculateAgeInAppTimeZone,
  formatDateKey,
  formatDateTime,
  formatDisplayDate,
  formatMonthLabel,
  getDayRange,
  getDateParts,
  getMonthRange,
} from "@/lib/date-time";

const requestTypeLabels: Record<RequestType, string> = {
  CONSULTATION: "Medical Consultation",
  MEDICINES: "Provision of Medicine",
  CS_211_MEDICAL_CERTIFICATE: "CS 211 Medical Certificate",
  REGULAR_MEDICAL_CERTIFICATE: "Medical Certificate",
  VACCINATION: "Provision of Vaccine",
  EMERGENCY: "Emergency Medical Services",
  MEDICAL_ALLOWANCE: "Medical Allowance",
  REFERRAL: "Referral",
  FIRST_AID_KIT: "Provision of First Aid Kit",
};

const visitStatusLabels: Record<VisitStatus, string> = {
  QUEUED: "Queued",
  IN_PROGRESS: "In progress",
  FOR_FOLLOW_UP: "For follow up",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const encodedStockReasons = new Set(["Opening stock", "Existing stock encoded"]);

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
        satisfactionSurvey: true;
        followUps: true;
        vaccinations: true;
      };
    };
  };
}>;

export type PatientTableRow = {
  id: string;
  patientNumber: string;
  latestVisitId: string;
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
  primaryContact: string;
  medicalHistory: string;
  vaccineHistory: string;
  allergy: string;
  maintenance: string;
  additionalMedicalInformation: string;
  request: string;
  status: string;
  statusCode: VisitStatus | "NO_VISIT";
  requestTypes: RequestType[];
  latestVisitAt: string;
  latestVisitDay: string;
  latestVisitOut: string;
  latestVisitDateValue: string;
  latestVisitTimestamp: number;
  isCarriedOverQueue: boolean;
  genderCode: PatientGender;
  recordSummary?: string;
  recordMeta?: string;
  recordNote?: string;
  recordIcon?: "calendar" | "syringe";
};

export type PatientTableFilters = {
  status?: string;
  request?: string;
  gender?: string;
  agency?: string;
  ageGroup?: string;
  lastVisit?: string;
  sort?: string;
};

export type PatientFilterOptions = {
  agencies: string[];
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

export type TodaysPatientQueueSections = {
  previousQueue: PatientListResult;
  todaysQueue: PatientListResult;
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
    remarks: string;
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
  satisfactionSurvey: {
    id: string;
    clientType: string;
    surveyDate: string;
    officeVisited: string;
    regionOfResidence: string;
    serviceAvailed: string;
    respondentSex: string;
    respondentAge: number | null;
    cc1: string;
    cc2: string;
    cc3: string;
    sqd0: string;
    sqd1: string;
    sqd2: string;
    sqd3: string;
    sqd4: string;
    sqd5: string;
    sqd6: string;
    sqd7: string;
    sqd8: string;
    suggestions: string;
    email: string;
  } | null;
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

export type MedicineReportPeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL";

export type MedicineReportData = {
  period: MedicineReportPeriod;
  rangeLabel: string;
  rows: { label: string; start: string; stockIn: number; stockOut: number; movementCount: number }[];
  totals: { stockIn: number; stockOut: number; movementCount: number };
  newStockHistory: { id: string; date: string; medicine: string; dosage: string; brandName: string; batch: string; expirationDate: string; quantity: number; unit: string }[];
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
    displayName: string;
    email: string;
    role: string;
    isActive: boolean;
  }[];
};

function calculateAge(birthDate: Date) {
  return calculateAgeInAppTimeZone(birthDate);
}

function getBirthDateRangeForAge(age: number) {
  const today = getDateParts(new Date());
  const oldestBirthDate = new Date(Date.UTC(today.year - age - 1, today.month - 1, today.day + 1, -8, 0, 0, 0));
  const youngestBirthDate = new Date(Date.UTC(today.year - age, today.month - 1, today.day, 15, 59, 59, 999));

  return {
    gte: oldestBirthDate,
    lte: youngestBirthDate,
  };
}

function formatGender(gender: PatientGender) {
  return gender.charAt(0) + gender.slice(1).toLowerCase();
}

function getInventoryMonthOptions(current = new Date()): InventoryMonthOption[] {
  return Array.from({ length: 12 }, (_, index) => {
    const optionDate = new Date(current);
    optionDate.setUTCMonth(optionDate.getUTCMonth() - index);
    return {
      value: formatDateKey(optionDate).slice(0, 7),
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

function hasPatientTableFilters(options?: PatientTableFilters) {
  return Boolean(
    options?.status ||
      options?.request ||
      options?.gender ||
      options?.agency ||
      options?.ageGroup ||
      options?.lastVisit ||
      (options?.sort && options.sort !== "name_asc")
  );
}

function getLastVisitRange(filter?: string) {
  const now = new Date();
  const today = getDayRange(now);

  if (filter === "today") {
    return { start: today.start.getTime(), end: today.end.getTime() };
  }

  if (filter === "week") {
    const start = new Date(today.start);
    start.setUTCDate(start.getUTCDate() - 6);
    return { start: start.getTime(), end: today.end.getTime() };
  }

  if (filter === "month") {
    const { start, end } = getMonthRange();
    return { start: start.getTime(), end: end.getTime() };
  }

  return null;
}

function matchesAgeGroup(age: number, ageGroup?: string) {
  if (!ageGroup) return true;
  if (ageGroup === "18_29") return age >= 18 && age <= 29;
  if (ageGroup === "30_44") return age >= 30 && age <= 44;
  if (ageGroup === "45_59") return age >= 45 && age <= 59;
  if (ageGroup === "60_plus") return age >= 60;
  return true;
}

function applyPatientTableFilters(rows: PatientTableRow[], options?: PatientTableFilters) {
  const status = options?.status;
  const request = options?.request;
  const gender = options?.gender;
  const agency = options?.agency;
  const lastVisitRange = getLastVisitRange(options?.lastVisit);

  return rows.filter((row) => {
    const statusMatches =
      !status ||
      (status === "ACTIVE" &&
        (row.statusCode === VisitStatus.QUEUED || row.statusCode === VisitStatus.IN_PROGRESS || row.statusCode === VisitStatus.FOR_FOLLOW_UP)) ||
      (status === "NO_VISIT" && row.statusCode === "NO_VISIT") ||
      row.statusCode === status;
    const requestMatches = !request || row.requestTypes.includes(request as RequestType);
    const genderMatches = !gender || row.genderCode === gender;
    const agencyMatches = !agency || row.agency === agency;
    const lastVisitMatches = !lastVisitRange || (row.latestVisitTimestamp >= lastVisitRange.start && row.latestVisitTimestamp < lastVisitRange.end);

    return statusMatches && requestMatches && genderMatches && agencyMatches && matchesAgeGroup(row.age, options?.ageGroup) && lastVisitMatches;
  });
}

function sortPatientTableRows(rows: PatientTableRow[], sort = "name_asc") {
  const statusPriority: Record<string, number> = {
    [VisitStatus.IN_PROGRESS]: 1,
    [VisitStatus.QUEUED]: 2,
    [VisitStatus.FOR_FOLLOW_UP]: 3,
    NO_VISIT: 4,
    [VisitStatus.COMPLETED]: 5,
    [VisitStatus.CANCELLED]: 6,
  };
  const compareName = (a: PatientTableRow, b: PatientTableRow) =>
    a.lastName.localeCompare(b.lastName) ||
    a.firstName.localeCompare(b.firstName) ||
    a.middleName.localeCompare(b.middleName);

  return [...rows].sort((a, b) => {
    if (sort === "name_desc") return -compareName(a, b);
    if (sort === "age_asc") return a.age - b.age || compareName(a, b);
    if (sort === "age_desc") return b.age - a.age || compareName(a, b);
    if (sort === "last_visit_asc") return a.latestVisitTimestamp - b.latestVisitTimestamp || compareName(a, b);
    if (sort === "last_visit_desc") return b.latestVisitTimestamp - a.latestVisitTimestamp || compareName(a, b);
    if (sort === "status_priority") return (statusPriority[a.statusCode] ?? 99) - (statusPriority[b.statusCode] ?? 99) || compareName(a, b);
    return compareName(a, b);
  });
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
    patientNumber: patient.patientNumber,
    latestVisitId: latestVisit?.id ?? "",
    lastName: patient.lastName,
    firstName: patient.firstName,
    middleName: patient.middleName ?? "",
    age: calculateAge(patient.birthDate),
    birthDate: formatDateKey(patient.birthDate),
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
    primaryContact: patient.primaryContact ?? "Not provided",
    medicalHistory: patient.medicalHistory ?? "Not provided",
    vaccineHistory: patient.vaccineHistory ?? "Not provided",
    allergy: patient.allergy ?? "Not provided",
    maintenance: patient.maintenance ?? "Not provided",
    additionalMedicalInformation: patient.additionalMedicalInformation ?? "Not provided",
    request,
    status: latestVisit ? visitStatusLabels[latestVisit.status] : "No visit yet",
    statusCode: latestVisit?.status ?? "NO_VISIT",
    requestTypes: latestRequests.map(({ type }) => type),
    latestVisitAt: latestVisit ? formatDateTime(latestVisit.timeIn) : "No visit yet",
    latestVisitDay: latestVisit ? formatDisplayDate(latestVisit.timeIn) : "",
    latestVisitOut: latestVisit?.timeOut ? formatDateTime(latestVisit.timeOut) : "",
    latestVisitDateValue: latestVisit ? formatDateKey(latestVisit.timeIn) : "",
    latestVisitTimestamp: latestVisit?.timeIn.getTime() ?? 0,
    isCarriedOverQueue: false,
    genderCode: patient.gender,
  };
}

type VaccinationPatientRecord = Prisma.PatientGetPayload<{
  include: {
    visits: {
      include: {
        requests: true;
        vaccinations: true;
      };
    };
  };
}>;

type FollowUpPatientRecord = Prisma.PatientGetPayload<{
  include: {
    visits: {
      include: {
        requests: true;
        followUps: true;
      };
    };
  };
}>;

function toVaccinationPatientTableRow(patient: VaccinationPatientRecord): PatientTableRow {
  const row = toPatientTableRow(patient);
  const visit = patient.visits[0];
  const latestRecord = visit?.vaccinations[0];
  const vaccinationCount = visit?.vaccinations.length ?? 0;

  if (!latestRecord) {
    return {
      ...row,
      recordSummary: "No vaccine entry saved yet",
      recordMeta: "Vaccination request only",
      recordIcon: "syringe",
    };
  }

  const meta = [
    latestRecord.dose || null,
    latestRecord.givenBy ? `Given by ${latestRecord.givenBy}` : null,
    latestRecord.nextDose ? `Next dose ${formatDisplayDate(latestRecord.nextDose)}` : null,
  ].filter(Boolean);

  return {
    ...row,
    recordSummary: latestRecord.vaccine,
    recordMeta: meta.join(" / ") || "No dose details recorded",
    recordNote: [
      latestRecord.remarks || null,
      vaccinationCount > 1 ? `${vaccinationCount} vaccination records in this visit` : null,
    ].filter(Boolean).join(" / "),
    recordIcon: "syringe",
  };
}

function toFollowUpPatientTableRow(patient: FollowUpPatientRecord): PatientTableRow {
  const row = toPatientTableRow(patient);
  const visit = patient.visits[0];
  const latestFollowUp = visit?.followUps[0];
  const followUpCount = visit?.followUps.length ?? 0;

  if (!latestFollowUp) {
    return row;
  }

  return {
    ...row,
    recordSummary: formatDateTime(latestFollowUp.scheduledFor),
    recordMeta: latestFollowUp.status.replaceAll("_", " ").toLowerCase(),
    recordNote: [
      latestFollowUp.remarks || "No remarks",
      followUpCount > 1 ? `${followUpCount} scheduled follow-ups in this visit` : null,
    ].filter(Boolean).join(" / "),
    recordIcon: "calendar",
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
      remarks: medicine.remarks ?? "",
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
    satisfactionSurvey: visit.satisfactionSurvey ? {
      id: visit.satisfactionSurvey.id,
      clientType: visit.satisfactionSurvey.clientType ?? "",
      surveyDate: visit.satisfactionSurvey.surveyDate ? formatDateKey(visit.satisfactionSurvey.surveyDate) : "",
      officeVisited: visit.satisfactionSurvey.officeVisited ?? "",
      regionOfResidence: visit.satisfactionSurvey.regionOfResidence ?? "",
      serviceAvailed: visit.satisfactionSurvey.serviceAvailed ?? "",
      respondentSex: visit.satisfactionSurvey.respondentSex ?? "",
      respondentAge: visit.satisfactionSurvey.respondentAge,
      cc1: visit.satisfactionSurvey.cc1 ?? "",
      cc2: visit.satisfactionSurvey.cc2 ?? "",
      cc3: visit.satisfactionSurvey.cc3 ?? "",
      sqd0: visit.satisfactionSurvey.sqd0 ?? "",
      sqd1: visit.satisfactionSurvey.sqd1 ?? "",
      sqd2: visit.satisfactionSurvey.sqd2 ?? "",
      sqd3: visit.satisfactionSurvey.sqd3 ?? "",
      sqd4: visit.satisfactionSurvey.sqd4 ?? "",
      sqd5: visit.satisfactionSurvey.sqd5 ?? "",
      sqd6: visit.satisfactionSurvey.sqd6 ?? "",
      sqd7: visit.satisfactionSurvey.sqd7 ?? "",
      sqd8: visit.satisfactionSurvey.sqd8 ?? "",
      suggestions: visit.satisfactionSurvey.suggestions ?? "",
      email: visit.satisfactionSurvey.email ?? "",
    } : null,
  };
}

function getPatientSearchWhere(search?: string): Prisma.PatientWhereInput | undefined {
  const normalizedSearch = search?.trim();

  if (!normalizedSearch) {
    return undefined;
  }
  const numericSearch = Number(normalizedSearch);
  const ageSearch = Number.isInteger(numericSearch) && numericSearch >= 0 && numericSearch <= 130
    ? getBirthDateRangeForAge(numericSearch)
    : null;

  return {
    OR: [
      { lastName: { contains: normalizedSearch, mode: "insensitive" } },
      { firstName: { contains: normalizedSearch, mode: "insensitive" } },
      { middleName: { contains: normalizedSearch, mode: "insensitive" } },
      { contactNo: { contains: normalizedSearch, mode: "insensitive" } },
      { agency: { contains: normalizedSearch, mode: "insensitive" } },
      { designation: { contains: normalizedSearch, mode: "insensitive" } },
      ...(ageSearch ? [{ birthDate: ageSearch }] : []),
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
  search?: string,
  options?: PatientTableFilters
): Promise<PatientListResult> {
  const where = getPatientSearchWhere(search);

  if (!filter && !where && !hasPatientTableFilters(options)) {
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
  let rows = sortPatientTableRows(applyPatientTableFilters(patients.map(toPatientTableRow), options), options?.sort);

  if (normalizedFilter) {
    rows = rows.filter(
      (row) =>
        row.request.toLowerCase().includes(normalizedFilter) ||
        row.status.toLowerCase().includes(normalizedFilter)
    );
  }

  return paginateRows(rows, page, pageSize);
}

export async function getPatientFilterOptions(): Promise<PatientFilterOptions> {
  const agencies = await prisma.patient.findMany({
    where: {
      agency: {
        not: null,
      },
    },
    distinct: ["agency"],
    orderBy: {
      agency: "asc",
    },
    select: {
      agency: true,
    },
  });

  return {
    agencies: agencies.map((patient) => patient.agency).filter((agency): agency is string => Boolean(agency)),
  };
}

export async function getTodaysPatientTableRows(
  page = 1,
  pageSize = 25,
  search?: string
): Promise<PatientListResult> {
  const { start, end } = getDayRange();
  const searchWhere = getPatientSearchWhere(search);
  const activeCarryOverWhere = {
    timeIn: {
      lt: start,
    },
    status: {
      in: [VisitStatus.QUEUED, VisitStatus.IN_PROGRESS],
    },
  } satisfies Prisma.VisitWhereInput;
  const visibleVisitWhere = {
    OR: [
      {
        timeIn: {
          gte: start,
          lt: end,
        },
      },
      activeCarryOverWhere,
    ],
  } satisfies Prisma.VisitWhereInput;
  const where = {
    ...(searchWhere ?? {}),
    visits: {
      some: visibleVisitWhere,
    },
  } satisfies Prisma.PatientWhereInput;

  const patients = await prisma.patient.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      visits: {
        where: visibleVisitWhere,
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

  const statusPriority: Record<string, number> = {
    [VisitStatus.IN_PROGRESS]: 1,
    [VisitStatus.QUEUED]: 2,
    [VisitStatus.FOR_FOLLOW_UP]: 3,
    [VisitStatus.COMPLETED]: 4,
    [VisitStatus.CANCELLED]: 5,
  };
  const rows = patients
    .map((patient) => {
      const row = toPatientTableRow(patient);
      return {
        ...row,
        isCarriedOverQueue: Boolean(
          patient.visits[0] &&
            patient.visits[0].timeIn < start &&
            (patient.visits[0].status === VisitStatus.QUEUED || patient.visits[0].status === VisitStatus.IN_PROGRESS)
        ),
      };
    })
    .sort((a, b) => {
      if (a.isCarriedOverQueue !== b.isCarriedOverQueue) return a.isCarriedOverQueue ? -1 : 1;
      return (
        (statusPriority[a.statusCode] ?? 99) - (statusPriority[b.statusCode] ?? 99) ||
        a.latestVisitTimestamp - b.latestVisitTimestamp ||
        a.lastName.localeCompare(b.lastName) ||
        a.firstName.localeCompare(b.firstName)
      );
    });

  return paginateRows(rows, page, pageSize);
}

async function getQueueRowsByVisitWhere(
  visitWhere: Prisma.VisitWhereInput,
  page: number,
  pageSize: number,
  search?: string,
  isCarriedOverQueue = false
): Promise<PatientListResult> {
  const searchWhere = getPatientSearchWhere(search);
  const where = {
    ...(searchWhere ?? {}),
    visits: {
      some: visitWhere,
    },
  } satisfies Prisma.PatientWhereInput;

  const patients = await prisma.patient.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      visits: {
        where: visitWhere,
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

  const statusPriority: Record<string, number> = {
    [VisitStatus.IN_PROGRESS]: 1,
    [VisitStatus.QUEUED]: 2,
    [VisitStatus.FOR_FOLLOW_UP]: 3,
    [VisitStatus.COMPLETED]: 4,
    [VisitStatus.CANCELLED]: 5,
  };
  const rows = patients
    .map((patient) => ({
      ...toPatientTableRow(patient),
      isCarriedOverQueue,
    }))
    .sort((a, b) => {
      return (
        (statusPriority[a.statusCode] ?? 99) - (statusPriority[b.statusCode] ?? 99) ||
        a.latestVisitTimestamp - b.latestVisitTimestamp ||
        a.lastName.localeCompare(b.lastName) ||
        a.firstName.localeCompare(b.firstName)
      );
    });

  return paginateRows(rows, page, pageSize);
}

export async function getTodaysPatientQueueSections(
  previousPage = 1,
  todayPage = 1,
  pageSize = 25,
  search?: string
): Promise<TodaysPatientQueueSections> {
  const { start, end } = getDayRange();
  const previousQueueWhere = {
    timeIn: {
      lt: start,
    },
    status: {
      in: [VisitStatus.QUEUED, VisitStatus.IN_PROGRESS],
    },
  } satisfies Prisma.VisitWhereInput;
  const todaysQueueWhere = {
    timeIn: {
      gte: start,
      lt: end,
    },
  } satisfies Prisma.VisitWhereInput;
  const [previousQueue, todaysQueue] = await Promise.all([
    getQueueRowsByVisitWhere(previousQueueWhere, previousPage, pageSize, search, true),
    getQueueRowsByVisitWhere(todaysQueueWhere, todayPage, pageSize, search, false),
  ]);

  return {
    previousQueue,
    todaysQueue,
  };
}

export async function getVaccinationPatientTableRows(
  page = 1,
  pageSize = 25,
  search?: string
): Promise<PatientListResult> {
  const searchWhere = getPatientSearchWhere(search);
  const vaccinationVisitWhere = {
    OR: [
      {
        requests: {
          some: {
            type: RequestType.VACCINATION,
          },
        },
      },
      {
        vaccinations: {
          some: {},
        },
      },
    ],
  } satisfies Prisma.VisitWhereInput;
  const where = {
    ...(searchWhere ?? {}),
    visits: {
      some: vaccinationVisitWhere,
    },
  } satisfies Prisma.PatientWhereInput;

  const patients = await prisma.patient.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      visits: {
        where: vaccinationVisitWhere,
        orderBy: {
          timeIn: "desc",
        },
        take: 1,
        include: {
          requests: true,
          vaccinations: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });

  return paginateRows(patients.map(toVaccinationPatientTableRow), page, pageSize);
}

export async function getFollowUpPatientTableRows(
  page = 1,
  pageSize = 25,
  search?: string
): Promise<PatientListResult> {
  const searchWhere = getPatientSearchWhere(search);
  const followUpVisitWhere = {
    followUps: {
      some: {
        status: "SCHEDULED",
      },
    },
  } satisfies Prisma.VisitWhereInput;
  const where = {
    ...(searchWhere ?? {}),
    visits: {
      some: followUpVisitWhere,
    },
  } satisfies Prisma.PatientWhereInput;

  const patients = await prisma.patient.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      visits: {
        where: followUpVisitWhere,
        orderBy: {
          timeIn: "desc",
        },
        take: 1,
        include: {
          requests: true,
          followUps: {
            where: {
              status: "SCHEDULED",
            },
            orderBy: {
              scheduledFor: "asc",
            },
          },
        },
      },
    },
  });

  return paginateRows(patients.map(toFollowUpPatientTableRow), page, pageSize);
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
          satisfactionSurvey: true,
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
  const expiryWhere: Prisma.InventoryItemWhereInput = expiryFilter === "expired"
    ? { expirationDate: { lt: now } }
    : ["1", "3", "6"].includes(expiryFilter)
      ? { expirationDate: { gte: now, lte: addMonths(now, Number(expiryFilter)) } }
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
    prisma.inventoryItem.findMany({ where: { stock: { gt: 0 }, expirationDate: { lte: addMonths(now, 6) } }, select: { expirationDate: true } }),
  ]);

  return {
    rows: items.map((item) => {
      const monthlyMovements = item.movements.filter((movement) => movement.createdAt >= start && movement.createdAt < end);
      const laterMovements = item.movements.filter((movement) => movement.createdAt >= end);
      const endingStock = item.stock - laterMovements.reduce((sum, movement) => sum + movement.quantityChange, 0);
      const received = monthlyMovements
        .filter((movement) => movement.quantityChange > 0 && !encodedStockReasons.has(movement.reason))
        .reduce((sum, movement) => sum + movement.quantityChange, 0);
      const dispensed = monthlyMovements.filter((movement) => movement.quantityChange < 0).reduce((sum, movement) => sum + Math.abs(movement.quantityChange), 0);
      const beginningStock = endingStock - received + dispensed;
      return {
        id: item.id, item: item.name, dosage: item.dosage ?? "—", brandName: item.brandName ?? "—",
        classification: item.classification ?? item.category.charAt(0) + item.category.slice(1).toLowerCase(),
        category: item.category.charAt(0) + item.category.slice(1).toLowerCase(), pcsPerBox: item.pcsPerBox?.toString() ?? "—",
        expirationDate: item.expirationDate ? formatDisplayDate(item.expirationDate) : "—",
        expirationDateValue: item.expirationDate ? formatDateKey(item.expirationDate) : "",
        expiryStatus: !item.expirationDate ? "No expiry" as const : item.expirationDate < now ? "Expired" as const : item.expirationDate <= addMonths(now, 1) ? "Within 1 month" as const : item.expirationDate <= addMonths(now, 3) ? "Within 3 months" as const : item.expirationDate <= addMonths(now, 6) ? "Within 6 months" as const : "Safe" as const,
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
      withinOne: alertItems.filter((item) => item.expirationDate && item.expirationDate >= now && item.expirationDate <= addMonths(now, 1)).length,
      withinThree: alertItems.filter((item) => item.expirationDate && item.expirationDate > addMonths(now, 1) && item.expirationDate <= addMonths(now, 3)).length,
      withinSix: alertItems.filter((item) => item.expirationDate && item.expirationDate > addMonths(now, 3) && item.expirationDate <= addMonths(now, 6)).length,
    },
  };
}

function getMedicineReportRange(period: MedicineReportPeriod, now = new Date()) {
  const start = new Date(now);
  if (period === "DAILY") start.setDate(start.getDate() - 29);
  if (period === "WEEKLY") start.setDate(start.getDate() - 7 * 11);
  if (period === "MONTHLY") start.setMonth(start.getMonth() - 11, 1);
  if (period === "QUARTERLY") start.setMonth(start.getMonth() - 23, 1);
  if (period === "ANNUAL") start.setFullYear(start.getFullYear() - 4, 0, 1);
  start.setHours(0, 0, 0, 0);
  return { start, end: now };
}

function getMedicinePeriodStart(date: Date, period: MedicineReportPeriod) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  if (period === "DAILY") return start;
  if (period === "WEEKLY") {
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    return start;
  }
  if (period === "MONTHLY") return new Date(start.getFullYear(), start.getMonth(), 1);
  if (period === "QUARTERLY") return new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3, 1);
  return new Date(start.getFullYear(), 0, 1);
}

function medicinePeriodLabel(date: Date, period: MedicineReportPeriod) {
  if (period === "DAILY") return formatDisplayDate(date);
  if (period === "WEEKLY") return `Week of ${formatDisplayDate(date)}`;
  if (period === "MONTHLY") return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  if (period === "QUARTERLY") return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
  return String(date.getFullYear());
}

export async function getMedicineReportData(period: MedicineReportPeriod = "MONTHLY"): Promise<MedicineReportData> {
  const { start, end } = getMedicineReportRange(period);
  const items = await prisma.inventoryItem.findMany({
    where: { category: InventoryCategory.MEDICINE },
    include: { movements: { where: { createdAt: { gte: start, lte: end } }, orderBy: { createdAt: "desc" } } },
  });
  const buckets = new Map<string, MedicineReportData["rows"][number]>();
  for (const item of items) {
    for (const movement of item.movements) {
      const bucketStart = getMedicinePeriodStart(movement.createdAt, period);
      const key = bucketStart.toISOString();
      const row = buckets.get(key) ?? { label: medicinePeriodLabel(bucketStart, period), start: key, stockIn: 0, stockOut: 0, movementCount: 0 };
      row.movementCount += 1;
      if (movement.quantityChange > 0) row.stockIn += movement.quantityChange;
      if (movement.quantityChange < 0) row.stockOut += Math.abs(movement.quantityChange);
      buckets.set(key, row);
    }
  }
  const newStockHistory = await prisma.inventoryMovement.findMany({
    where: { quantityChange: { gt: 0 }, reason: "Manual stock addition", createdAt: { gte: start, lte: end }, item: { category: InventoryCategory.MEDICINE } },
    orderBy: { createdAt: "desc" },
    include: { item: true },
  });
  const rows = [...buckets.values()].sort((a, b) => a.start.localeCompare(b.start));
  const totals = rows.reduce((result, row) => ({ stockIn: result.stockIn + row.stockIn, stockOut: result.stockOut + row.stockOut, movementCount: result.movementCount + row.movementCount }), { stockIn: 0, stockOut: 0, movementCount: 0 });
  return {
    period,
    rangeLabel: `${formatDisplayDate(start)} to ${formatDisplayDate(end)}`,
    rows,
    totals,
    newStockHistory: newStockHistory.map((movement) => ({
      id: movement.id,
      date: formatDateTime(movement.createdAt),
      medicine: movement.item.name,
      dosage: movement.item.dosage ?? "-",
      brandName: movement.item.brandName ?? "-",
      batch: movement.item.batchKey,
      expirationDate: movement.item.expirationDate ? formatDisplayDate(movement.item.expirationDate) : "-",
      quantity: movement.quantityChange,
      unit: movement.item.unit,
    })),
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

export async function getMedicineExpirySummary() {
  const now = new Date();
  const soon = addMonths(now, 1);
  const [expired, expiringSoon] = await Promise.all([
    prisma.inventoryItem.count({ where: { category: InventoryCategory.MEDICINE, stock: { gt: 0 }, expirationDate: { lt: now } } }),
    prisma.inventoryItem.count({ where: { category: InventoryCategory.MEDICINE, stock: { gt: 0 }, expirationDate: { gte: now, lte: soon } } }),
  ]);
  return { expired, expiringSoon };
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
      displayName: user.displayName ?? "",
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    })),
  };
}
