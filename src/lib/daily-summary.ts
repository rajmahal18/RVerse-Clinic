import { prisma } from "@/lib/prisma";
import { formatTime, getDateInputRange } from "@/lib/date-time";

export type DailySummaryRow = { patientId: string; patientNumber: string; name: string; time: string; services: string; status: string; diagnosis: string };
export type DailySummary = { date: string; rows: DailySummaryRow[] };

export function validSummaryDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Select a valid summary date.");
  const { start } = getDateInputRange(date);
  if (Number.isNaN(start.getTime()) || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(start) !== date) throw new Error("Select a valid summary date.");
  return date;
}

export async function buildDailySummary(clinicId: string, date: string): Promise<DailySummary> {
  const { start, end } = getDateInputRange(validSummaryDate(date));
  const visits = await prisma.visit.findMany({ where: { patient: { clinicId }, timeIn: { gte: start, lt: end }, status: { not: "CANCELLED" } }, include: { patient: true, requests: true }, orderBy: { timeIn: "asc" } });
  return { date, rows: visits.map(visit => ({ patientId: visit.patientId, patientNumber: visit.patient.patientNumber, name: `${visit.patient.lastName}, ${visit.patient.firstName}`, time: formatTime(visit.timeIn), services: visit.requests.map(request => request.type.replaceAll("_", " ").toLowerCase()).join(", ") || "Consultation", status: visit.status.replaceAll("_", " ").toLowerCase(), diagnosis: visit.diagnosis ?? "" })) };
}

export function readDailySummary(value: unknown): DailySummary | null {
  if (!value || typeof value !== "object" || !("date" in value) || !("rows" in value) || typeof value.date !== "string" || !Array.isArray(value.rows)) return null;
  const keys = ["patientId", "patientNumber", "name", "time", "services", "status", "diagnosis"];
  if (!value.rows.every(row => row && typeof row === "object" && keys.every(key => typeof row[key] === "string"))) return null;
  return value as DailySummary;
}
