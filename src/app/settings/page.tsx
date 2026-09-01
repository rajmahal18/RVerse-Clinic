import { UserRole } from "@prisma/client";
import { createUserAction, toggleUserStatusAction, updateClinicSettingsAction } from "@/app/actions/workflow";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { CsrfField } from "@/components/security/csrf-field";
import { ActionAlert } from "@/components/ui/action-alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClinicSettingsData } from "@/lib/patient-view";

function roleLabel(role: string) {
  return role === "DOCTOR_NURSE" ? "Doctor / Nurse" : role === "SUPPLY_OFFICER" ? "Supply Officer" : role === "RECORDS" ? "Records" : "Admin";
}

function statusTone(active: boolean) {
  return active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200";
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const settings = await getClinicSettingsData();

  return (
    <AppShell>
      <PageHeader title="Settings" />
      <ActionAlert error={resolvedSearchParams?.error} message={resolvedSearchParams?.message} />
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="border-b bg-slate-50/70">
            <CardTitle>Clinic Profile</CardTitle>
            <p className="text-sm text-slate-500">Information used across clinic forms and official records.</p>
          </CardHeader>
          <CardContent className="pt-5">
            <form action={updateClinicSettingsAction} className="grid gap-4">
              <CsrfField />
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Clinic name
                <input name="name" defaultValue={settings.clinic.name} className="h-10 rounded-xl border px-3 font-normal" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Address
                <input name="address" defaultValue={settings.clinic.address} className="h-10 rounded-xl border px-3 font-normal" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Contact number
                  <input name="contact" defaultValue={settings.clinic.contact} className="h-10 rounded-xl border px-3 font-normal" />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Email
                  <input name="email" type="email" defaultValue={settings.clinic.email} className="h-10 rounded-xl border px-3 font-normal" />
                </label>
              </div>
              <div className="flex justify-end border-t pt-4">
                <Button type="submit">Save Clinic Settings</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-slate-50/70">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>User Accounts</CardTitle>
                <p className="mt-1 text-sm text-slate-500">Create staff accounts and manage access status.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">{settings.users.length} users</span>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <form action={createUserAction} className="grid gap-3 md:grid-cols-2">
              <CsrfField />
              <input type="hidden" name="redirectTo" value="/settings" />
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Full name
                <input name="name" className="h-10 rounded-xl border px-3 font-normal" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Display name for forms
                <input name="displayName" className="h-10 rounded-xl border px-3 font-normal" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Email
                <input name="email" type="email" className="h-10 rounded-xl border px-3 font-normal" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Temporary password
                <input name="password" type="password" className="h-10 rounded-xl border px-3 font-normal" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Role
                <select name="role" defaultValue={UserRole.DOCTOR_NURSE} className="h-10 rounded-xl border bg-white px-3 font-normal">
                  {Object.values(UserRole).map((role) => (
                    <option key={role} value={role}>{roleLabel(role)}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <Button type="submit" className="w-full md:w-auto">Add User</Button>
              </div>
            </form>

            <div className="my-5 border-t" />

            <div className="overflow-hidden rounded-xl border bg-white">
              {settings.users.map((user, index) => (
                <div key={user.id} className={`flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between ${index ? "border-t" : ""}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold text-slate-900">{user.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ${statusTone(user.isActive)}`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">{user.email}</p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{roleLabel(user.role)}</p>
                  </div>
                  <form action={toggleUserStatusAction} className="shrink-0">
                    <CsrfField />
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="isActive" value={String(!user.isActive)} />
                    <Button type="submit" size="sm" variant={user.isActive ? "outline" : "default"} className={user.isActive ? "text-slate-600" : ""}>
                      {user.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                </div>
              ))}
              {settings.users.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-500">No user accounts configured yet.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
