export const diagnosisStatusLabels = {
  CONFIRMED: "Confirmed",
  TO_CONSIDER: "To consider",
  RULE_OUT: "Rule out",
} as const;
export type SelectedDiagnosis = {
  diseaseId: string;
  status: keyof typeof diagnosisStatusLabels;
};
export function parseDiagnosisSelections(raw: string): SelectedDiagnosis[] {
  let entries: unknown;
  try {
    entries = JSON.parse(raw);
  } catch {
    throw new Error("Invalid diagnosis selections.");
  }
  if (!Array.isArray(entries) || entries.length > 100)
    throw new Error("Invalid diagnosis selections.");
  const ids = new Set<string>();
  return entries.map((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.diseaseId !== "string" ||
      !Object.hasOwn(diagnosisStatusLabels, entry.status) ||
      ids.has(entry.diseaseId)
    )
      throw new Error(
        "Select a valid status for each disease; duplicate selections are not allowed.",
      );
    ids.add(entry.diseaseId);
    return { diseaseId: entry.diseaseId, status: entry.status };
  });
}
