import { PatientGender, Prisma, RequestType, VisitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const requestTypeLabels: Record<RequestType, string> = {
  CONSULTATION: "Consultation",
  MEDICINES: "Medicines",
  CS_211_MEDICAL_CERTIFICATE: "CS 211 Medical Certificate",
  REGULAR_MEDICAL_CERTIFICATE: "Regular Medical Certificate",
  VACCINATION: "Vaccination",
  EMERGENCY: "Emergency",
};

const visitStatusLabels: Record<VisitStatus, string> = {
  QUEUED: "Queued",
  IN_PROGRESS: "In progress",
  FOR_FOLLOW_UP: "For follow up",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type PatientWithLatestVisit = Prisma.PatientGetPayload<{
  include: {
    visits: {
      include: {
        requests: true;
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
  request: string;
  status: string;
};

export type PatientProfileData = PatientTableRow & {
  createdAt: string;
};

export type PatientListResult = {
  rows: PatientTableRow[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
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

function calculateAge(birthDate: Date) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function formatGender(gender: PatientGender) {
  return gender.charAt(0) + gender.slice(1).toLowerCase();
}

function toPatientTableRow(patient: PatientWithLatestVisit): PatientTableRow {
  const latestVisit = patient.visits[0];
  const latestRequests = latestVisit?.requests ?? [];
  const request = latestRequests.length
    ? latestRequests.map(({ type }) => requestTypeLabels[type]).join(", ")
    : "No request yet";

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
    request,
    status: latestVisit ? visitStatusLabels[latestVisit.status] : "No visit yet",
  };
}

export async function getPatientTableRows(
  filter?: string,
  page = 1,
  pageSize = 25
): Promise<PatientListResult> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(10, pageSize));

  if (!filter) {
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

  const patients = await prisma.patient.findMany({
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

  const normalizedFilter = filter.toLowerCase();
  const filteredRows = patients
    .map(toPatientTableRow)
    .filter(
      (row) =>
        row.request.toLowerCase().includes(normalizedFilter) ||
        row.status.toLowerCase().includes(normalizedFilter)
    );

  const totalCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  const currentPage = Math.min(safePage, totalPages);
  const start = (currentPage - 1) * safePageSize;

  return {
    rows: filteredRows.slice(start, start + safePageSize),
    totalCount,
    currentPage,
    pageSize: safePageSize,
    totalPages,
  };
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
    createdAt: formatDateTime(patient.createdAt),
  };
}
