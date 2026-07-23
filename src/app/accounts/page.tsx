import { UserRole } from "@prisma/client";
import { CheckCircle2, UserPlus } from "lucide-react";
import { createUserAction } from "@/app/actions/workflow";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ActionAlert } from "@/components/ui/action-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountList } from "@/components/accounts/account-list";
import { getClinicSettingsData } from "@/lib/patient-view";

function roleLabel(role: string) {
  return role === "DOCTOR_NURSE" ? "Doctor / Nurse" : role === "SUPPLY_OFFICER" ? "Supply Officer" : role === "RECORDS" ? "Records" : "Admin";
}

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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
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

        <aside className="rounded-2xl border bg-white p-4 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-teal-50 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-900">Add Account</h2>
              <p className="text-sm text-slate-500">Create the user record first.</p>
            </div>
          </div>

          <form action={createUserAction} className="grid gap-3">
            <input type="hidden" name="redirectTo" value="/accounts" />
            <input name="name" className="h-10 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Full name" />
            <input name="email" type="email" className="h-10 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Email address" />
            <input
              name="password"
              type="password"
              className="h-10 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Temporary password"
            />
            <select name="role" defaultValue={UserRole.DOCTOR_NURSE} className="h-10 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">
              {Object.values(UserRole).map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
            <Button type="submit">
              <UserPlus className="h-4 w-4" /> Add Account
            </Button>
          </form>

          <p className="mt-4 border-t pt-4 text-xs leading-5 text-slate-500">
            Use a temporary password that meets the login password requirements. The role can be adjusted after the client confirms access scope.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
