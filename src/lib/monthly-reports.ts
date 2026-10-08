import type { RequestType, VisitStatus } from "@prisma/client";
import {
  getAvailedServiceLabels,
  requestTypeLabels,
} from "@/lib/clinic-services";
import { formatDateTime, getMonthRange } from "@/lib/date-time";
import { ccQuestions, sqdQuestions, scale } from "@/lib/survey-questions";

export type ReportSurvey = {
  id: string;
  surveyDate: Date | null;
  createdAt: Date;
  customerType: string | null;
  agencyName: string | null;
  respondentSex: string | null;
  respondentAge: number | null;
  cc1: string | null;
  cc2: string | null;
  cc3: string | null;
  sqd0: string | null;
  sqd1: string | null;
  sqd2: string | null;
  sqd3: string | null;
  sqd4: string | null;
  sqd5: string | null;
  sqd6: string | null;
  sqd7: string | null;
  sqd8: string | null;
};
export type ReportVisit = {
  id: string;
  patientId: string;
  status: VisitStatus;
  deletedAt: Date | null;
  timeIn: Date;
  timeOut: Date | null;
  bloodPressure: string | null;
  rbs: string | null;
  chiefComplaint: string | null;
  patient: {
    firstName: string;
    lastName: string;
    patientNumber: string;
    gender: string;
    agency: string | null;
  };
  requests: { type: RequestType }[];
  medicines: { status: string }[];
  vaccinations: unknown[];
  referrals: unknown[];
  followUps: { status: string }[];
  satisfactionSurvey: ReportSurvey | null;
};
export type ReportDetail = { label: string; value: string; href?: string };
export type ReportRow = {
  id: string;
  cells: (string | number)[];
  details?: ReportDetail[];
};
export type ReportSection = {
  id: string;
  title: string;
  description: string;
  columns: string[];
  rows: ReportRow[];
};
export type ReportThresholds = {
  systolic: number;
  diastolic: number;
  rbs: number;
};
export const defaultThresholds: ReportThresholds = {
  systolic: 140,
  diastolic: 90,
  rbs: 200,
};
export const reportRoles = [
  "ADMIN",
  "DOCTOR",
  "NURSE",
  "DOCTOR_NURSE",
  "RECORDS",
];

export function reportMonth(value?: string) {
  if (value && !/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(value))
    throw new Error("Choose a valid report month (1900–2199).");
  return getMonthRange(value);
}
export function reportThresholds(values: {
  systolic?: string;
  diastolic?: string;
  rbs?: string;
}): ReportThresholds {
  const result = { ...defaultThresholds };
  for (const key of ["systolic", "diastolic", "rbs"] as const) {
    if (!values[key]) continue;
    const value = Number(values[key]);
    if (!Number.isFinite(value) || value <= 0 || value > 2000)
      throw new Error(
        "Enter a BP or blood sugar limit greater than 0 and no higher than 2000.",
      );
    result[key] = value;
  }
  return result;
}
const tidy = (value: string | null | undefined) =>
  (value ?? "").trim().replace(/\s+/g, " ");
const keyOf = (value: string) => tidy(value).toLocaleLowerCase("en");
function eligible(v: ReportVisit) {
  return !v.deletedAt && v.status !== "CANCELLED";
}
function inRange(date: Date, start: Date, end: Date) {
  return date >= start && date < end;
}
function patientDetail(v: ReportVisit, extra = ""): ReportDetail {
  return {
    label: `${v.patient.lastName}, ${v.patient.firstName}`,
    value: `${v.patient.patientNumber}${extra ? ` · ${extra}` : ""}`,
    href: `/patients/${encodeURIComponent(v.patientId)}?visitId=${encodeURIComponent(v.id)}&tab=history`,
  };
}
function distinct(visits: ReportVisit[]) {
  const latest = new Map<string, ReportVisit>();
  for (const visit of [...visits].sort(
    (a, b) => a.timeIn.getTime() - b.timeIn.getTime(),
  ))
    latest.set(visit.patientId, visit);
  return [...latest.values()];
}
function sex(value: string | null) {
  const normalized = keyOf(value ?? "");
  return normalized === "female"
    ? "Female"
    : normalized === "male"
      ? "Male"
      : "Other / unspecified";
}
function counts(values: string[], labels: string[]) {
  return labels.map(
    (label) => values.filter((value) => value === label).length,
  );
}
const sexLabels = ["Female", "Male", "Other / unspecified"];
const ageLabels = [
  "19 or lower",
  "20–34",
  "35–49",
  "50–64",
  "65 or higher",
  "Did not specify",
];
function ageGroup(age: number | null) {
  if (age === null || !Number.isInteger(age) || age < 0 || age > 130)
    return ageLabels[5];
  return age <= 19
    ? ageLabels[0]
    : age <= 34
      ? ageLabels[1]
      : age <= 49
        ? ageLabels[2]
        : age <= 64
          ? ageLabels[3]
          : ageLabels[4];
}
function grouped(
  visits: ReportVisit[],
  labels: (visit: ReportVisit) => string[],
) {
  const groups = new Map<string, { name: string; visits: ReportVisit[] }>();
  for (const visit of visits) {
    const seen = new Set<string>();
    for (const name of labels(visit).map(tidy).filter(Boolean)) {
      const key = keyOf(name);
      if (seen.has(key)) continue;
      seen.add(key);
      const group = groups.get(key) ?? { name, visits: [] };
      group.visits.push(visit);
      groups.set(key, group);
    }
  }
  return [...groups.entries()].sort((a, b) =>
    a[1].name.localeCompare(b[1].name),
  );
}
const requested = (visit: ReportVisit) =>
  visit.requests.length
    ? visit.requests.map((r) => requestTypeLabels[r.type])
    : ["No service specified"];
const availed = (visit: ReportVisit) => getAvailedServiceLabels(visit);
function genderRows(
  visits: ReportVisit[],
  labels: (visit: ReportVisit) => string[],
  survey = false,
): ReportRow[] {
  return grouped(visits, labels).map(([id, group]) => {
    // One demographic contribution per patient per group; latest survey wins.
    const people = survey
      ? latestSurveyPeople(group.visits)
      : distinct(group.visits);
    return {
      id,
      cells: [
        group.name,
        people.length,
        ...counts(
          people.map((v) =>
            sex(
              survey ? v.satisfactionSurvey!.respondentSex : v.patient.gender,
            ),
          ),
          sexLabels,
        ),
        group.visits.length,
      ],
      details: people.map((v) =>
        patientDetail(
          v,
          sex(survey ? v.satisfactionSurvey!.respondentSex : v.patient.gender),
        ),
      ),
    };
  });
}
function surveyDate(visit: ReportVisit) {
  return (
    visit.satisfactionSurvey!.surveyDate ?? visit.satisfactionSurvey!.createdAt
  );
}
function latestSurveyPeople(visits: ReportVisit[]) {
  const people = new Map<string, ReportVisit>();
  for (const visit of [...visits].sort(
    (a, b) =>
      surveyDate(a).getTime() - surveyDate(b).getTime() ||
      a.satisfactionSurvey!.createdAt.getTime() -
        b.satisfactionSurvey!.createdAt.getTime() ||
      a.timeIn.getTime() - b.timeIn.getTime() ||
      a.id.localeCompare(b.id),
  ))
    people.set(visit.patientId, visit);
  return [...people.values()];
}
function numeric(value: string | null) {
  const cleaned = tidy(value);
  return /^\d+(?:\.\d+)?$/.test(cleaned) &&
    Number.isFinite(Number(cleaned)) &&
    Number(cleaned) > 0
    ? Number(cleaned)
    : null;
}
function bp(value: string | null) {
  const match = /^(\d{2,3})\s*\/\s*(\d{2,3})(?:\s*mmhg)?$/i.exec(tidy(value));
  return match && Number(match[1]) > 0 && Number(match[2]) > 0
    ? [Number(match[1]), Number(match[2])]
    : null;
}
function rbs(value: string | null) {
  // Only numbers and explicitly labelled mg/dL are comparable to the report threshold.
  return numeric(tidy(value).replace(/\s*mg\s*\/\s*dl$/i, ""));
}
export function buildMonthlyReports(
  visits: ReportVisit[],
  surveyVisits: ReportVisit[],
  month: string,
  thresholds = defaultThresholds,
) {
  const { start, end, label } = reportMonth(month);
  const monthVisits = visits.filter(
    (v) => eligible(v) && inRange(v.timeIn, start, end),
  );
  const started = monthVisits.filter((v) => v.status !== "QUEUED");
  const completed = started.filter((v) => v.status === "COMPLETED");
  const surveys = surveyVisits.filter(
    (v) =>
      eligible(v) && v.satisfactionSurvey && inRange(surveyDate(v), start, end),
  );
  const completedPatients = distinct(completed).length;
  const serviceRows = genderRows(monthVisits, requested);
  const cateredRows = grouped(completed, availed).map(([id, group]) => ({
    id,
    cells: [group.name, distinct(group.visits).length, group.visits.length],
    details: distinct(group.visits).map((v) => patientDetail(v)),
  }));
  const durations = completed.map((v) => ({
    visit: v,
    minutes:
      v.timeOut && v.timeOut >= v.timeIn
        ? (v.timeOut.getTime() - v.timeIn.getTime()) / 60000
        : null,
  }));
  const validDurations = durations.filter(
    (d): d is { visit: ReportVisit; minutes: number } => d.minutes !== null,
  );
  const missingTimes = durations.length - validDurations.length;
  const averageMinutes = validDurations.length
    ? validDurations.reduce((n, d) => n + d.minutes, 0) / validDurations.length
    : null;
  const durationRows = durations.map(({ visit: v, minutes }) => ({
    id: v.id,
    cells: [
      `${v.patient.lastName}, ${v.patient.firstName}`,
      formatDateTime(v.timeIn),
      v.timeOut ? formatDateTime(v.timeOut) : "Missing",
      minutes === null
        ? "Not available — check visit times"
        : `${minutes.toFixed(1)} min`,
    ],
    details: [
      patientDetail(v),
      { label: "Recorded time in", value: formatDateTime(v.timeIn) },
      {
        label: "Recorded time out",
        value: v.timeOut ? formatDateTime(v.timeOut) : "Missing",
      },
      {
        label: "Services availed",
        value: availed(v).join(", ") || "No service recorded",
      },
    ],
  }));
  const withBP = started.filter((v) => bp(v.bloodPressure));
  const withRBS = started.filter((v) => rbs(v.rbs) !== null);
  const raisedBP = withBP.filter((v) => {
    const [s, d] = bp(v.bloodPressure)!;
    return s >= thresholds.systolic || d >= thresholds.diastolic;
  });
  const raisedRBS = withRBS.filter((v) => rbs(v.rbs)! >= thresholds.rbs);
  const highSugarPatients = new Set(raisedRBS.map((v) => v.patientId));
  const both = raisedBP.filter((v) => highSugarPatients.has(v.patientId));
  const vitalRows = [
    {
      id: "bp",
      cells: [
        `BP ≥ ${thresholds.systolic} systolic OR ≥ ${thresholds.diastolic} diastolic (mmHg)`,
        distinct(raisedBP).length,
        raisedBP.length,
        distinct(withBP).length,
      ],
      details: raisedBP.map((v) =>
        patientDetail(
          v,
          `${v.bloodPressure} mmHg · ${formatDateTime(v.timeIn)}`,
        ),
      ),
    },
    {
      id: "rbs",
      cells: [
        `RBS ≥ ${thresholds.rbs} mg/dL`,
        distinct(raisedRBS).length,
        raisedRBS.length,
        distinct(withRBS).length,
      ],
      details: raisedRBS.map((v) =>
        patientDetail(v, `${v.rbs} · ${formatDateTime(v.timeIn)}`),
      ),
    },
    {
      id: "both",
      cells: [
        "Patients flagged for both during the month",
        distinct(both).length,
        "—",
        "—",
      ],
      details: distinct(both).map((v) => patientDetail(v)),
    },
  ];
  const complaintGroups = grouped(started, (v) =>
    (v.chiefComplaint ?? "")
      .split(";")
      .map((text) => tidy(text).replace(/^others?\s*:\s*/i, ""))
      .filter((text) => text && !/^others?$/i.test(text)),
  );
  const complaintRows = complaintGroups
    .map(([id, group]) => ({
      id,
      cells: [group.name, distinct(group.visits).length, group.visits.length],
      details: distinct(group.visits).map((v) => patientDetail(v)),
    }))
    .sort(
      (a, b) =>
        Number(b.cells[1]) - Number(a.cells[1]) ||
        Number(b.cells[2]) - Number(a.cells[2]) ||
        String(a.cells[0]).localeCompare(String(b.cells[0])),
    )
    .slice(0, 10);
  const questions = [
    "cc1",
    "cc2",
    "cc3",
    "sqd0",
    "sqd1",
    "sqd2",
    "sqd3",
    "sqd4",
    "sqd5",
    "sqd6",
    "sqd7",
    "sqd8",
  ] as const;
  const questionRows = questions.map((question) => {
    const answers = new Map<string, { label: string; count: number }>();
    const cc = ccQuestions.find(([key]) => key === question);
    const sqd = sqdQuestions.find(([key]) => key === question);
    for (const option of cc?.[2] ?? scale)
      answers.set(keyOf(option), { label: option, count: 0 });
    let answered = 0;
    for (const visit of surveys) {
      const answer = tidy(visit.satisfactionSurvey![question]);
      if (!answer) continue;
      answered++;
      const key = keyOf(answer);
      const item = answers.get(key) ?? { label: answer, count: 0 };
      item.count++;
      answers.set(key, item);
    }
    return {
      id: question,
      cells: [
        `${question.toUpperCase()} · ${cc?.[1] ?? sqd?.[1] ?? ""}`,
        answered,
        surveys.length - answered,
      ],
      details: [...answers.values()].map((item) => ({
        label: item.label,
        value: `${item.count} response${item.count === 1 ? "" : "s"}`,
      })),
    };
  });
  const surveyServices = grouped(surveys, availed).map(([id, group]) => ({
    id,
    cells: [group.name, distinct(group.visits).length, group.visits.length],
    details: distinct(group.visits).map((v) => patientDetail(v)),
  }));
  const ageRows = grouped(surveys, requested).flatMap(([id, group]) => {
    const latest = latestSurveyPeople(group.visits);
    return ageLabels.map((label, index) => {
      const people = latest.filter(
        (v) => ageGroup(v.satisfactionSurvey!.respondentAge) === label,
      );
      return {
        id: `${id}-${index}`,
        cells: [group.name, label, people.length],
        details: people.map((v) =>
          patientDetail(
            v,
            v.satisfactionSurvey!.respondentAge === null
              ? "Did not specify"
              : `Age ${v.satisfactionSurvey!.respondentAge}`,
          ),
        ),
      };
    });
  });
  const customerRows = [
    "Employee",
    "Dependent",
    "Other",
    "Did not specify",
  ].map((category) => {
    const subset = surveys.filter(
      (v) =>
        (v.satisfactionSurvey!.customerType || "Did not specify") === category,
    );
    return {
      id: category,
      cells: [category, distinct(subset).length, subset.length],
      details: distinct(subset).map((v) => patientDetail(v)),
    };
  });
  const agency = (v: ReportVisit) => [
    tidy(v.satisfactionSurvey!.agencyName) || "Did not specify",
  ];
  const agencyRows = genderRows(surveys, agency, true);
  const genderColumns = [
    "Service requested",
    "Unique patients",
    ...sexLabels,
    "Visits",
  ];
  const accomplishment: ReportSection[] = [
    {
      id: "requested",
      title: "Gender distribution per service requested",
      description:
        "Patients grouped by requested service, including those still in the queue.",
      columns: genderColumns,
      rows: serviceRows,
    },
    {
      id: "catered",
      title: "Patients catered per service",
      description:
        "Services received during completed visits. Patients may appear under more than one service.",
      columns: ["Service availed", "Unique patients", "Completed visits"],
      rows: cateredRows,
    },
    {
      id: "turnaround",
      title: "Patient turnaround time",
      description: `Time spent per completed visit, including waiting.${missingTimes ? ` ${missingTimes} ${missingTimes === 1 ? "visit is" : "visits are"} excluded because the times are missing or incorrect.` : ""}`,
      columns: ["Patient", "Time in (PHT)", "Time out (PHT)", "Turnaround"],
      rows: durationRows,
    },
    {
      id: "vitals",
      title: "Increased BP and random blood sugar",
      description: `Patients with readings at or above the selected limits. Raised readings alone do not confirm a diagnosis.${started.length > withBP.length ? ` BP readings are unavailable for ${started.length - withBP.length} visits.` : ""}${started.length > withRBS.length ? ` Blood sugar readings are unavailable for ${started.length - withRBS.length} visits.` : ""}`,
      columns: [
        "Reading limit",
        "Unique flagged patients",
        "Flagged visits",
        "Unique patients measured",
      ],
      rows: vitalRows,
    },
    {
      id: "complaints",
      title: "Top 10 chief complaints",
      description:
        "Most common chief complaints for the month. Patients with multiple complaints may appear in more than one category.",
      columns: ["Chief complaint", "Unique patients", "Visits"],
      rows: complaintRows,
    },
  ];
  const satisfaction: ReportSection[] = [
    {
      id: "responses",
      title: "Responses per question",
      description:
        "Survey answers for the month. Select a question to view the response breakdown.",
      columns: ["Question", "Answered", "Unanswered"],
      rows: questionRows,
    },
    {
      id: "survey-services",
      title: "Patients catered per service",
      description: "Services received by patients who submitted a survey.",
      columns: ["Service availed", "Unique patients", "Surveys"],
      rows: surveyServices,
    },
    {
      id: "survey-gender",
      title: "Gender distribution per service requested",
      description:
        "Respondents grouped by requested service, using their latest survey for each service.",
      columns: [
        "Service requested",
        "Unique patients",
        ...sexLabels,
        "Surveys",
      ],
      rows: genderRows(surveys, requested, true),
    },
    {
      id: "survey-age",
      title: "Age distribution per service requested",
      description:
        "Age groups by requested service, using each patient's latest survey. Unanswered ages appear under Did not specify.",
      columns: ["Service requested", "Age range", "Unique patients"],
      rows: ageRows,
    },
    {
      id: "customer-type",
      title: "Customer type",
      description:
        "Patients grouped as Employee, Dependent, or Other. Unanswered surveys appear under Did not specify.",
      columns: ["Customer type", "Unique patients", "Surveys"],
      rows: customerRows,
    },
    {
      id: "agencies",
      title: "Patients and gender distribution per agency",
      description:
        "Patients grouped by agency. Missing agency details appear under Did not specify.",
      columns: ["Agency", "Unique patients", ...sexLabels, "Surveys"],
      rows: agencyRows,
    },
  ];
  return {
    month,
    label,
    accomplishment,
    satisfaction,
    summary: {
      visits: monthVisits.length,
      completedVisits: completed.length,
      completedPatients,
      averageMinutes,
      surveys: surveys.length,
      surveyPatients: distinct(surveys).length,
      undatedSurveys: surveys.filter((v) => !v.satisfactionSurvey!.surveyDate)
        .length,
      withoutAvailedService: surveys.filter((v) => !availed(v).length).length,
    },
  };
}

export function reportCsv(
  title: string,
  month: string,
  sections: ReportSection[],
) {
  const cell = (value: string | number) => {
    const raw = String(value);
    // Prevent spreadsheet formula execution, including cells with leading whitespace.
    const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const lines = [[title, month]];
  for (const section of sections) {
    lines.push(
      [],
      [section.title],
      [section.description],
      section.columns,
      ...section.rows.map((row) => row.cells.map(String)),
    );
    for (const row of section.rows)
      if (row.details?.length) {
        lines.push(
          [],
          [String(row.cells[0]), "Breakdown / details"],
          ...row.details.map((detail) => [detail.label, detail.value]),
        );
      }
  }
  return "\uFEFF" + lines.map((line) => line.map(cell).join(",")).join("\r\n");
}
