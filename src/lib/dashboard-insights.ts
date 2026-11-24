import { getAvailedServiceLabels } from "@/lib/clinic-services";

type InsightVisit = Parameters<typeof getAvailedServiceLabels>[0] & {
  chiefComplaint: string | null;
  patient: { gender: string };
};
export type ServiceInsight = { label: string; visits: number };
export type ComplaintInsight = {
  label: string;
  visits: number;
  female: number;
  male: number;
  unspecified: number;
};

export function buildDashboardInsights(visits: InsightVisit[]) {
  const services = new Map<string, ServiceInsight>();
  const complaints = new Map<string, ComplaintInsight>();
  for (const visit of visits) {
    for (const label of new Set(getAvailedServiceLabels(visit))) {
      const row = services.get(label) ?? { label, visits: 0 };
      row.visits++;
      services.set(label, row);
    }
    const answers = new Map<string, string>();
    for (const raw of (visit.chiefComplaint ?? "").split(";")) {
      const label = raw
        .replace(/^\s*others?\s*:\s*/i, "")
        .trim()
        .replace(/\s+/g, " ");
      if (label && !/^others?$/i.test(label))
        answers.set(label.toLocaleLowerCase("en"), label);
    }
    for (const [key, label] of answers) {
      const row = complaints.get(key) ?? {
        label,
        visits: 0,
        female: 0,
        male: 0,
        unspecified: 0,
      };
      row.visits++;
      if (visit.patient.gender === "FEMALE") row.female++;
      else if (visit.patient.gender === "MALE") row.male++;
      else row.unspecified++;
      complaints.set(key, row);
    }
  }
  const rank = (a: ServiceInsight, b: ServiceInsight) =>
    b.visits - a.visits || a.label.localeCompare(b.label);
  return {
    services: [...services.values()].sort(rank),
    complaints: [...complaints.values()].sort(rank).slice(0, 10),
  };
}
