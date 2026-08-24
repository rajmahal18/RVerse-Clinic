import { Prisma, RequestType } from "@prisma/client";
import {
  formatLongDate,
  formatShortDate as formatAppShortDate,
  formatTime as formatAppTime,
  APP_TIME_ZONE,
} from "@/lib/date-time";
import { prisma } from "@/lib/prisma";

export type ClinicFormSlug = "employee-information" | "assessment-monitoring" | "medical-certificate" | "referral-form" | "medical-allowance" | "doctors-order" | "client-satisfaction-survey";

export const clinicForms: { slug: ClinicFormSlug; title: string; scope: "patient" | "visit"; filenamePrefix: string }[] = [
  { slug: "employee-information", title: "Employee Information", scope: "patient", filenamePrefix: "employee-information" },
  { slug: "assessment-monitoring", title: "Assessment Monitoring Sheet", scope: "patient", filenamePrefix: "assessment-monitoring" },
  { slug: "medical-certificate", title: "Medical Certificate", scope: "visit", filenamePrefix: "medical-certificate" },
  { slug: "referral-form", title: "Referral Form", scope: "visit", filenamePrefix: "referral-form" },
  { slug: "medical-allowance", title: "Medical Allowance Certification", scope: "visit", filenamePrefix: "medical-allowance" },
  { slug: "doctors-order", title: "Doctors Order Sheet", scope: "visit", filenamePrefix: "doctors-order" },
  { slug: "client-satisfaction-survey", title: "Client Satisfaction Measurement Survey", scope: "visit", filenamePrefix: "client-satisfaction-survey" },
];

export type ClinicFormData = NonNullable<Awaited<ReturnType<typeof getClinicFormData>>>;

type PatientWithFormData = Prisma.PatientGetPayload<{
  include: {
    clinic: true;
    visits: {
      include: {
        requests: true;
        medicines: true;
        vaccinations: true;
        referrals: true;
        satisfactionSurvey: true;
      };
    };
  };
}>;

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

export const clinicFormDefaults = {
  physicianName: "DR. QURAESSA MIA S. TAKI, RMT, MPM, DPPS",
  physicianPosition: "Medical Officer V",
  nurseName: "AMINA C. NAKAN, RN",
  nursePosition: "The Clinic Nurse",
  certificateRevision: "OCMTC_MC_2025_REV_03",
  referralRevision: "OCMTC_RF_2025_REV_02",
  officeAddress: "Ground Floor OCM Main Building, Bangsamoro Government Center, Gov. Gutierrez St. Rosary Heights VII, Cotabato City",
  officeEmail: "clinic@bangsamoro.gov.ph",
};

function clean(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function fullName(patient: Pick<PatientWithFormData, "lastName" | "firstName" | "middleName">) {
  return [patient.firstName, patient.middleName, patient.lastName].map(clean).filter(Boolean).join(" ");
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "";
  return formatLongDate(value);
}

function formatShortDate(value: Date | null | undefined) {
  if (!value) return "";
  return formatAppShortDate(value);
}

function formatTime(value: Date | null | undefined) {
  if (!value) return "";
  return formatAppTime(value);
}

function ageAt(birthDate: Date, asOf = new Date()) {
  const birth = formatAppShortDate(birthDate).split("/").map(Number);
  const current = formatAppShortDate(asOf).split("/").map(Number);
  const [birthMonth, birthDay, birthYear] = birth;
  const [currentMonth, currentDay, currentYear] = current;
  let age = currentYear - birthYear;
  const monthDifference = currentMonth - birthMonth;

  if (monthDifference < 0 || (monthDifference === 0 && currentDay < birthDay)) {
    age -= 1;
  }

  return age;
}

function genderLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function ordinalDay(value: Date) {
  const day = Number(formatAppShortDate(value).split("/")[1]);
  const mod100 = day % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : day % 10 === 1 ? "st" : day % 10 === 2 ? "nd" : day % 10 === 3 ? "rd" : "th";
  return `${day}${suffix}`;
}

function visitServices(visit: PatientWithFormData["visits"][number]) {
  return visit.requests.map((request) => requestTypeLabels[request.type]).join(", ");
}

function medicineLine(medicine: PatientWithFormData["visits"][number]["medicines"][number]) {
  return [medicine.itemName, medicine.frequency, medicine.duration].map(clean).filter(Boolean).join(" - ");
}

export async function getClinicFormData(patientId: string, visitId?: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      clinic: true,
      visits: {
        orderBy: { timeIn: "desc" },
        include: {
          requests: true,
          medicines: true,
          vaccinations: true,
          referrals: true,
          satisfactionSurvey: true,
        },
      },
    },
  });

  if (!patient) return null;

  const latestVisit = patient.visits[0] ?? null;
  const selectedVisit = (visitId ? patient.visits.find((visit) => visit.id === visitId) : latestVisit) ?? latestVisit;
  const completedOrLatestVisit = patient.visits.find((visit) => visit.status === "COMPLETED") ?? latestVisit;
  const issueDate = new Date();
  const selectedDate = selectedVisit?.timeIn ?? issueDate;
  const clinicAddress = clean(patient.clinic.address) || clinicFormDefaults.officeAddress;
  const clinicEmail = clean(patient.clinic.email) || clinicFormDefaults.officeEmail;
  const staffDisplayNames = await prisma.user.findMany({
    where: {
      clinicId: patient.clinicId,
      isActive: true,
      displayName: {
        not: null,
      },
    },
    select: {
      name: true,
      displayName: true,
    },
  });
  const displayNameByAccountName = new Map(
    staffDisplayNames
      .map((user) => [clean(user.name), clean(user.displayName)] as const)
      .filter(([name, displayName]) => name && displayName)
  );
  const formatStaffName = (name: string | null | undefined) => displayNameByAccountName.get(clean(name)) || clean(name);

  return {
    patient: {
      id: patient.id,
      fullName: fullName(patient),
      birthDate: formatDate(patient.birthDate),
      shortBirthDate: formatShortDate(patient.birthDate),
      age: String(ageAt(patient.birthDate, selectedDate)),
      ageSex: `${ageAt(patient.birthDate, selectedDate)}/${genderLabel(patient.gender).charAt(0)}`,
      gender: genderLabel(patient.gender),
      civilStatus: clean(patient.civilStatus),
      address: clean(patient.address),
      contact: clean(patient.contactNo),
      officeDivision: clean(patient.agency),
      designation: clean(patient.designation),
      height: patient.heightCm ? `${patient.heightCm.toFixed(1)} cm` : "",
      weight: patient.weightKg ? `${patient.weightKg.toFixed(1)} kg` : "",
      allergy: clean(patient.allergy),
      medicalHistory: clean(patient.medicalHistory),
      primaryContact: clean(patient.primaryContact),
    },
    clinic: {
      name: clean(patient.clinic.name) || "The Clinic",
      address: clinicAddress,
      email: clinicEmail,
    },
    selectedVisit: selectedVisit
      ? {
          id: selectedVisit.id,
          date: formatDate(selectedVisit.timeIn),
          shortDate: formatShortDate(selectedVisit.timeIn),
          timeIn: formatTime(selectedVisit.timeIn),
          timeOut: formatTime(selectedVisit.timeOut),
          chiefComplaint: clean(selectedVisit.chiefComplaint),
          bloodPressure: clean(selectedVisit.bloodPressure),
          rbs: clean(selectedVisit.rbs),
          temperature: clean(selectedVisit.temperature),
          pulseRate: clean(selectedVisit.pulseRate),
          respiratoryRate: clean(selectedVisit.respiratoryRate),
          diagnosis: clean(selectedVisit.diagnosis),
          treatmentPlan: clean(selectedVisit.treatmentPlan),
          progressNotes: clean(selectedVisit.progressNotes),
          allergy: clean(patient.allergy),
          satisfactionSurvey: selectedVisit.satisfactionSurvey,
          nurseOnDuty: formatStaffName(selectedVisit.nurseOnDuty),
          services: visitServices(selectedVisit),
          medicines: selectedVisit.medicines.map(medicineLine).filter(Boolean),
          referral: selectedVisit.referrals[0] ?? null,
        }
      : null,
    latestVisit: completedOrLatestVisit
      ? {
          date: formatDate(completedOrLatestVisit.timeIn),
          reason: clean(completedOrLatestVisit.chiefComplaint),
          medicalHistory: clean(completedOrLatestVisit.progressNotes),
          medicines: completedOrLatestVisit.medicines.map(medicineLine).filter(Boolean),
        }
      : null,
    visits: [...patient.visits]
      .sort((a, b) => a.timeIn.getTime() - b.timeIn.getTime())
      .map((visit) => ({
        id: visit.id,
        date: formatShortDate(visit.timeIn),
        timeIn: formatTime(visit.timeIn),
        chiefComplaint: clean(visit.chiefComplaint),
        bloodPressure: clean(visit.bloodPressure),
        rbs: clean(visit.rbs),
        temperature: clean(visit.temperature),
        pulseRate: clean(visit.pulseRate),
        services: visitServices(visit),
        timeOut: formatTime(visit.timeOut),
        nurseOnDuty: formatStaffName(visit.nurseOnDuty),
      })),
    vaccinations: patient.visits
      .flatMap((visit) => visit.vaccinations.map((record) => ({ ...record, visitDate: visit.timeIn })))
      .sort((a, b) => a.visitDate.getTime() - b.visitDate.getTime())
      .map((record) => ({
        vaccine: clean(record.vaccine),
        dose: clean(record.dose),
        date: formatShortDate(record.visitDate),
      })),
    issued: {
      date: formatDate(issueDate),
      ordinalDay: ordinalDay(issueDate),
      month: new Intl.DateTimeFormat("en-PH", { timeZone: APP_TIME_ZONE, month: "long" }).format(issueDate),
      year: new Intl.DateTimeFormat("en-PH", { timeZone: APP_TIME_ZONE, year: "numeric" }).format(issueDate),
    },
    signatory: clinicFormDefaults,
  };
}

export function clinicFormFilename(form: ClinicFormSlug, data: ClinicFormData) {
  const formConfig = clinicForms.find((item) => item.slug === form);
  const datePart = data.selectedVisit?.shortDate.replaceAll("/", "-");
  return [formConfig?.filenamePrefix ?? form, data.patient.id, datePart].filter(Boolean).join("-");
}
