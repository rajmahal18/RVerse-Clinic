import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildMonthlyReports,
  reportMonth,
  type ReportThresholds,
} from "@/lib/monthly-reports";

const select = {
  id: true,
  patientId: true,
  status: true,
  deletedAt: true,
  timeIn: true,
  timeOut: true,
  bloodPressure: true,
  rbs: true,
  chiefComplaint: true,
  patient: {
    select: {
      firstName: true,
      lastName: true,
      patientNumber: true,
      gender: true,
      agency: true,
    },
  },
  requests: { select: { type: true } },
  medicines: { select: { status: true } },
  vaccinations: { select: { id: true } },
  referrals: { select: { id: true } },
  followUps: { select: { status: true } },
  satisfactionSurvey: {
    select: {
      id: true,
      surveyDate: true,
      createdAt: true,
      customerType: true,
      agencyName: true,
      respondentSex: true,
      respondentAge: true,
      cc1: true,
      cc2: true,
      cc3: true,
      sqd0: true,
      sqd1: true,
      sqd2: true,
      sqd3: true,
      sqd4: true,
      sqd5: true,
      sqd6: true,
      sqd7: true,
      sqd8: true,
    },
  },
} satisfies Prisma.VisitSelect;

export async function getMonthlyReports(
  clinicId: string,
  month: string,
  thresholds: ReportThresholds,
) {
  const { start, end } = reportMonth(month);
  const base = {
    patient: { clinicId },
    deletedAt: null,
    status: { not: "CANCELLED" as const },
  };
  // A single consistent read prevents the two reports seeing different visit states.
  const [visits, surveys] = await prisma.$transaction(
    [
      prisma.visit.findMany({
        where: { ...base, timeIn: { gte: start, lt: end } },
        select,
        orderBy: { timeIn: "asc" },
      }),
      prisma.visit.findMany({
        where: {
          ...base,
          satisfactionSurvey: {
            is: {
              OR: [
                { surveyDate: { gte: start, lt: end } },
                { surveyDate: null, createdAt: { gte: start, lt: end } },
              ],
            },
          },
        },
        select,
        orderBy: { timeIn: "asc" },
      }),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  return buildMonthlyReports(visits, surveys, month, thresholds);
}
