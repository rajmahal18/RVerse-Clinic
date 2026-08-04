import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ActionAlert } from "@/components/ui/action-alert";
import { Badge } from "@/components/ui/badge";
import { AccountList } from "@/components/accounts/account-list";
import { getClinicSettingsData } from "@/lib/patient-view";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const settings = await getClinicSettingsData();
  const activeCount = settings.users.filter((user) => user.isActive).length;

  return (
    <AppShell>
      <PageHeader
        title="Accounts"
        actions={
          <div className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-sm font-semibold text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {activeCount} active
          </div>
        }
      />
      <ActionAlert error={resolvedSearchParams?.error} message={resolvedSearchParams?.message} />

      <div className="grid gap-6">
        <section className="overflow-hidden rounded-2xl border bg-white shadow-soft">
          <div className="flex flex-col gap-2 border-b bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Admin Account List</h2>
              <p className="text-sm text-slate-500">Users registered for clinic system access.</p>
            </div>
            <Badge className="w-fit bg-blue-50 text-blue-700">{settings.users.length} total accounts</Badge>
          </div>

          <AccountList users={settings.users} />
        </section>
      </div>
    </AppShell>
  );
}
