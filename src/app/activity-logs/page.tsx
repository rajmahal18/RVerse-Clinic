import { Filter } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ActivityLogTable } from "@/components/activity-logs/activity-log-table";
import { getActivityLogRows } from "@/lib/activity-log-view";

const modules = ["Patient Records", "Medicines", "Inventory", "Follow-ups", "Vaccination", "Accounts", "Settings", "Authentication"];
const statuses = ["SUCCESS", "FAILED"];

export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ module?: string; status?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedModule = resolvedSearchParams?.module?.trim() ?? "";
  const selectedStatus = resolvedSearchParams?.status?.trim() ?? "";
  const logs = await getActivityLogRows(selectedModule, selectedStatus);

  return (
    <AppShell>
      <PageHeader
        title="Activity Logs"
        actions={
          <form className="flex w-full flex-col gap-2 rounded-2xl border bg-white p-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 px-2 text-sm font-semibold text-slate-600">
              <Filter className="h-4 w-4" />
              Filter
            </div>
            <select name="module" defaultValue={selectedModule} className="h-10 rounded-xl border px-3 text-sm">
              <option value="">All modules</option>
              {modules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={selectedStatus} className="h-10 rounded-xl border px-3 text-sm">
              <option value="">All status</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button type="submit" className="h-10 rounded-xl bg-primary px-4 text-sm font-bold text-white">
              Apply
            </button>
          </form>
        }
      />

      <ActivityLogTable logs={logs} />
    </AppShell>
  );
}
