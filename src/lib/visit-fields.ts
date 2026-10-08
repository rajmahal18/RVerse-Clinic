import { UserRole } from "@prisma/client";

export const vitalFields = [
  "bloodPressure",
  "temperature",
  "pulseRate",
  "respiratoryRate",
  "rbs",
] as const;
export const clinicalFields = [
  "progressNotes",
  "diagnosis",
  "physicalExam",
  "diagnosisNotes",
  "treatmentPlan",
] as const;
export const visitFields = [
  "chiefComplaint",
  "intakeNotes",
  ...vitalFields,
  ...clinicalFields,
] as const;

export function canEditVisitField(
  role: UserRole,
  field: string,
  locks: string[],
) {
  if (role === UserRole.ADMIN || role === UserRole.DOCTOR) return true;
  return (
    (role === UserRole.NURSE || role === UserRole.DOCTOR_NURSE) &&
    !clinicalFields.includes(field as (typeof clinicalFields)[number]) &&
    !locks.includes(field)
  );
}

export function validVital(field: string, value: string) {
  if (field === "bloodPressure")
    return (
      /^\d{2,3}\s*\/\s*\d{2,3}$/.test(value.trim()) &&
      value.split("/").every((n) => Number(n) > 0)
    );
  return (
    /^\d+(\.\d+)?$/.test(value.trim()) &&
    Number(value) > 0 &&
    Number.isFinite(Number(value))
  );
}

export function requireVital(values: Record<string, unknown>) {
  const entries = vitalFields.filter((field) =>
    String(values[field] ?? "").trim(),
  );
  if (!entries.length)
    throw new Error("Enter at least one vital sign before starting the visit.");
  for (const field of entries)
    if (!validVital(field, String(values[field])))
      throw new Error(
        `Enter a valid ${field === "bloodPressure" ? "blood pressure (e.g. 120/80)" : field}. Use numbers only for measurements.`,
      );
}

export function printChiefComplaint(value: string | null | undefined) {
  return (value ?? "")
    .split(";")
    .map((part) => part.trim().replace(/^others?\s*:\s*/i, ""))
    .filter((part) => part && !/^others?$/i.test(part))
    .join("; ");
}
