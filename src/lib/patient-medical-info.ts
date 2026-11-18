export type VaccineHistoryEntry = {
  vaccine: string;
  dose: string;
  date: string;
};

export function maintenanceLines(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[•*-]\s+/, "").trim())
    .filter(Boolean);
}

export function vaccineHistoryEntries(value: unknown): VaccineHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is VaccineHistoryEntry =>
    Boolean(
      row &&
      typeof row === "object" &&
      typeof row.vaccine === "string" &&
      typeof row.dose === "string" &&
      typeof row.date === "string",
    ),
  );
}

export function parseVaccineHistory(value: FormDataEntryValue | null) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(value ?? "[]"));
  } catch {
    throw new Error("Invalid vaccine history.");
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length > 100 ||
    vaccineHistoryEntries(parsed).length !== parsed.length
  )
    throw new Error("Enter up to 100 valid vaccine history entries.");
  return vaccineHistoryEntries(parsed)
    .map((row) => {
      const entry = {
        vaccine: row.vaccine.trim(),
        dose: row.dose.trim(),
        date: row.date.trim(),
      };
      if (!entry.vaccine && (entry.dose || entry.date))
        throw new Error("Enter a vaccine name for each history entry.");
      if (
        entry.date &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
          !Number.isFinite(Date.parse(entry.date)) ||
          new Date(entry.date).toISOString().slice(0, 10) !== entry.date)
      )
        throw new Error("Enter a valid vaccination date.");
      return entry;
    })
    .filter((entry) => entry.vaccine);
}
