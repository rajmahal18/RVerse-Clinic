import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ClipboardCheck, MessageSquareText } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { getMonthlyReports } from "@/lib/monthly-report-data";
import {
  reportMonth,
  reportRoles,
  reportThresholds,
  defaultThresholds,
} from "@/lib/monthly-reports";
import { ReportTable } from "@/components/reports/report-table";
import { ReportExport } from "@/components/reports/report-export";

type Params = {
  month?: string;
  tab?: string;
  systolic?: string;
  diastolic?: string;
  rbs?: string;
};
export default async function MonthlyReportsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!reportRoles.includes(user.role)) redirect("/reports");
  const params = await searchParams;
  let error = "";
  let month = reportMonth().key;
  let thresholds = defaultThresholds;
  try {
    month = reportMonth(params.month).key;
    thresholds = reportThresholds(params);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Invalid report filters.";
  }
  const tab = params.tab === "satisfaction" ? "satisfaction" : "accomplishment";
  const report = error
    ? null
    : await getMonthlyReports(user.clinicId, month, thresholds);
  const title =
    tab === "accomplishment"
      ? "Monthly Accomplishment Report"
      : "Client Satisfaction Measurement Report";
  const sections = report?.[tab] ?? [];
  const query = new URLSearchParams({
    month,
    systolic: String(thresholds.systolic),
    diastolic: String(thresholds.diastolic),
    rbs: String(thresholds.rbs),
  });
  return (
    <AppShell>
      <div className="monthly-report-screen min-w-0 space-y-5 pb-28 sm:pb-10">
        <div className="no-print space-y-4">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Reports
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Monthly reports
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Clinic activity and client feedback, grouped by month.
              </p>
            </div>
            <form
              action="/reports/monthly"
              className="flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="tab" value={tab} />
              {Object.entries(thresholds).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <label className="grid gap-1 text-xs font-semibold text-slate-500">
                Report month
                <input
                  type="month"
                  name="month"
                  defaultValue={month}
                  min="1900-01"
                  max="2199-12"
                  required
                  className="h-10 max-w-full rounded-lg border bg-white px-3 text-sm text-slate-800"
                />
              </label>
              <button className="h-10 rounded-lg border bg-white px-4 text-sm font-semibold text-primary">
                View
              </button>
            </form>
          </div>
          <nav
            aria-label="Monthly report type"
            className="overflow-x-auto border-b"
          >
            <div className="flex min-w-max gap-6">
              {[
                {
                  id: "accomplishment",
                  label: "Accomplishment",
                  icon: ClipboardCheck,
                },
                {
                  id: "satisfaction",
                  label: "Client satisfaction",
                  icon: MessageSquareText,
                },
              ].map(({ id, label, icon: Icon }) => (
                <Link
                  key={id}
                  href={`/reports/monthly?${query}&tab=${id}`}
                  aria-current={tab === id ? "page" : undefined}
                  className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-semibold ${tab === id ? "border-primary text-primary" : "border-transparent text-slate-500"}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        ) : report ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {report.label} · Asia/Manila
                </p>
              </div>
              <ReportExport
                title={title}
                month={report.label}
                sections={sections}
                filename={`${tab}-report-${month}`}
              />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-3 border-y py-4 text-sm">
              {(tab === "accomplishment"
                ? [
                  ["Recorded visits", report.summary.visits],
                    ["Completed visits", report.summary.completedVisits],
                    [
                      "Unique patients catered",
                      report.summary.completedPatients,
                    ],
                    [
                      "Average turnaround",
                      report.summary.averageMinutes === null
                        ? "No valid durations"
                        : `${report.summary.averageMinutes.toFixed(1)} min`,
                    ],
                  ]
                : [
                    ["Surveys", report.summary.surveys],
                    ["Unique survey patients", report.summary.surveyPatients],
                    [
                      "Surveys without recorded service delivery",
                      report.summary.withoutAvailedService,
                    ],
                  ]
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 font-bold tabular-nums text-slate-900">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            {tab === "satisfaction" ? (
              <p className="text-sm leading-6 text-slate-500">
                Based on the recorded survey date, including saved surveys for
                open visits. {report.summary.undatedSurveys} surveys use their
                creation date because the survey date is missing. Patient and
                service subtotals can overlap; do not add them to obtain unique
                overall patients.
              </p>
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                Visits are assigned to the month of recorded Time in. Cancelled
                and deleted visits are excluded. Repeat visits and multi-service
                requests are counted separately from unique patients.
              </p>
            )}
            {tab === "accomplishment" ? (
              <details className="no-print border-b pb-4">
                <summary className="cursor-pointer text-sm font-semibold text-primary">
                  BP / RBS reporting thresholds
                </summary>
                <form
                  action="/reports/monthly"
                  className="mt-3 flex flex-wrap items-end gap-3"
                >
                  <input type="hidden" name="month" value={month} />
                  <input type="hidden" name="tab" value={tab} />
                  {[
                    { name: "systolic", label: "Systolic BP (mmHg)" },
                    { name: "diastolic", label: "Diastolic BP (mmHg)" },
                    { name: "rbs", label: "Random blood sugar (mg/dL)" },
                  ].map(({ name, label }) => (
                    <label
                      key={name}
                      className="grid max-w-full gap-1 text-xs text-slate-500"
                    >
                      {label}
                      <input
                        name={name}
                        type="number"
                        step="any"
                        min="0.1"
                        max="2000"
                        required
                        defaultValue={
                          thresholds[name as keyof typeof thresholds]
                        }
                        className="h-10 w-36 max-w-full rounded-lg border bg-white px-3 text-sm text-slate-800"
                      />
                    </label>
                  ))}
                  <button className="h-10 rounded-lg border px-4 text-sm font-semibold text-primary">
                    Apply thresholds
                  </button>
                </form>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Default report flags: BP ≥140 systolic or ≥90 diastolic; RBS
                  ≥200 mg/dL. These summarize recorded readings and do not
                  establish a diagnosis. Reference:{" "}
                  <a
                    href="https://www.who.int/en/news-room/fact-sheets/detail/hypertension"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    WHO
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    NIDDK
                  </a>
                  .
                </p>
              </details>
            ) : null}
            <div className="space-y-7">
              {sections.map((section) => (
                <ReportTable
                  key={`${month}-${tab}-${section.id}`}
                  section={section}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
