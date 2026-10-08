import { RequestType, VisitStatus } from "@prisma/client";

export const requestTypeLabels: Record<RequestType, string> = {
  BP_CHECKING: "BP Checking",
  RBS_CHECKING: "RBS Checking",
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

type AvailedVisitSource = {
  status: VisitStatus;
  requests: { type: RequestType }[];
  medicines: { status: string }[];
  vaccinations: unknown[];
  followUps: { status: string }[];
  referrals: unknown[];
};

export function getAvailedServiceLabels(visit: AvailedVisitSource) {
  const requested = new Set(visit.requests.map((request) => request.type));
  const labels: string[] = [];

  if (
    requested.has(RequestType.CONSULTATION) &&
    visit.status === VisitStatus.COMPLETED
  ) {
    labels.push(requestTypeLabels.CONSULTATION);
  }
  if (visit.medicines.some((medicine) => medicine.status === "RECEIVED")) {
    labels.push(requestTypeLabels.MEDICINES);
  }
  if (visit.vaccinations.length > 0) {
    labels.push(requestTypeLabels.VACCINATION);
  }
  if (visit.referrals.length > 0) {
    labels.push(requestTypeLabels.REFERRAL);
  }
  for (const type of [
    RequestType.CS_211_MEDICAL_CERTIFICATE,
    RequestType.REGULAR_MEDICAL_CERTIFICATE,
    RequestType.MEDICAL_ALLOWANCE,
    RequestType.EMERGENCY,
    RequestType.FIRST_AID_KIT,
    RequestType.BP_CHECKING,
    RequestType.RBS_CHECKING,
  ]) {
    if (requested.has(type) && visit.status === VisitStatus.COMPLETED)
      labels.push(requestTypeLabels[type]);
  }

  return labels;
}
