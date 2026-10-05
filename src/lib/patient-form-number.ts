import { prisma } from "@/lib/prisma";
import { APP_TIME_ZONE } from "@/lib/date-time";

export function formatPatientFormCode(registeredAt: Date, number: number) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(registeredAt);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `TC${year}${month}-${String(number).padStart(4, "0")}`;
}

export async function getPatientFormCode(patientId: string, registeredAt: Date) {
  return prisma.$transaction(async (tx) => {
    // Serialize allocation and include patients registered since the migration,
    // regardless of which patient's form is opened first.
    await tx.$executeRaw`LOCK TABLE "PatientFormNumber" IN SHARE ROW EXCLUSIVE MODE`;
    await tx.$executeRaw`
      INSERT INTO "PatientFormNumber" ("patientId")
      SELECT p."id" FROM "Patient" p
      WHERE NOT EXISTS (
        SELECT 1 FROM "PatientFormNumber" n WHERE n."patientId" = p."id"
      )
      ORDER BY p."createdAt", p."id"
      ON CONFLICT ("patientId") DO NOTHING
    `;
    const [record] = await tx.$queryRaw<{ number: number }[]>`
      SELECT "number" FROM "PatientFormNumber" WHERE "patientId" = ${patientId}
    `;
    if (!record) throw new Error("Patient form number could not be assigned.");
    return formatPatientFormCode(registeredAt, record.number);
  });
}

export async function findPatientByFormCode(code: string, clinicId: string) {
  const normalized = code.trim().toUpperCase();
  const match = /^TC\d{6}-(\d{4,})$/.exec(normalized);
  if (!match) return null;
  const number = Number(match[1]);
  if (!Number.isSafeInteger(number) || number < 1 || number > 2147483647) return null;
  const [patient] = await prisma.$queryRaw<{ id: string; createdAt: Date }[]>`
    SELECT p."id", p."createdAt" FROM "Patient" p
    JOIN "PatientFormNumber" n ON n."patientId" = p."id"
    WHERE n."number" = ${number} AND p."clinicId" = ${clinicId}
  `;
  return patient && formatPatientFormCode(patient.createdAt, number) === normalized ? patient.id : null;
}
