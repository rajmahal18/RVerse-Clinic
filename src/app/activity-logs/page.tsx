import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ActivityLogFilters } from "@/components/activity-logs/activity-log-filters";
import { ActivityLogTable } from "@/components/activity-logs/activity-log-table";
import { getActivityLogData } from "@/lib/activity-log-view";

const modules = ["Patient Records", "Medicines", "Inventory", "Follow-ups", "Vaccination", "Accounts", "Settings", "Authentication"];
const statuses = ["SUCCESS", "FAILED"];
const ranges = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
];

function buildRangeHref(range: string, module?: string, status?: string) {
  const params = new URLSearchParams({ range });
  if (module) params.set("module", module);
  if (status) params.set("status", status);
  return `/activity-logs?${params.toString()}`;
}

export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ module?: string; status?: string; range?: string; from?: string; to?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedModule = resolvedSearchParams?.module?.trim() ?? "";
  const selectedStatus = resolvedSearchParams?.status?.trim() ?? "";
  const selectedRange = resolvedSearchParams?.range?.trim() ?? "today";
  const result = await getActivityLogData({
    module: selectedModule,
    status: selectedStatus,
    range: selectedRange,
    from: resolvedSearchParams?.from?.trim(),
    to: resolvedSearchParams?.to?.trim(),
  });
  const summaryItems = [
    { label: "Total logs", value: result.summary.total },
    { label: "Failed actions", value: result.summary.failed },
    { label: "Sign-ins", value: result.summary.signIns },
    { label: "Patient record changes", value: result.summary.patientRecordChanges },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Activity Logs"
        actions={
          <ActivityLogFilters
            modules={modules}
            statuses={statuses}
            selectedModule={selectedModule}
            selectedStatus={selectedStatus}
            range={result.range}
            from={result.from}
            to={result.to}
          />
        }
      />

      <div className="mb-4 grid gap-3">
        <nav className="flex overflow-x-auto border-b" aria-label="Activity log date ranges">
          {ranges.map((range) => (
            <Link
              key={range.value}
              href={buildRangeHref(range.value, selectedModule, selectedStatus)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${
                result.range === range.value ? "border-primary text-primary" : "border-transparent text-slate-500"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              {range.label}
            </Link>
          ))}
          <span className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${result.range === "custom" ? "border-primary text-primary" : "border-transparent text-slate-500"}`}>
            <CalendarDays className="h-4 w-4" />
            Custom
          </span>
        </nav>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-2xl border bg-white px-4 py-3 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <ActivityLogTable groups={result.groups} totalCount={result.summary.total} />
    </AppShell>
  );
}
