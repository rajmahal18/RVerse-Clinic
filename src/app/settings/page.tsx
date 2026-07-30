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
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Clinic Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateClinicSettingsAction} className="grid gap-4">
              <CsrfField />
              <input name="name" defaultValue={settings.clinic.name} className="rounded-xl border px-3 py-2 text-sm" placeholder="Clinic name" />
              <input name="address" defaultValue={settings.clinic.address} className="rounded-xl border px-3 py-2 text-sm" placeholder="Address" />
              <input name="contact" defaultValue={settings.clinic.contact} className="rounded-xl border px-3 py-2 text-sm" placeholder="Contact number" />
              <input name="email" defaultValue={settings.clinic.email} className="rounded-xl border px-3 py-2 text-sm" placeholder="Email" />
              <Button type="submit">Save Clinic Settings</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={createUserAction} className="grid gap-3 md:grid-cols-2">
              <CsrfField />
              <input name="name" className="rounded-xl border px-3 py-2 text-sm" placeholder="Full name" />
              <input name="email" type="email" className="rounded-xl border px-3 py-2 text-sm" placeholder="Email" />
              <select name="role" defaultValue={UserRole.DOCTOR_NURSE} className="rounded-xl border px-3 py-2 text-sm">
                {Object.values(UserRole).map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
              <Button type="submit">Add User</Button>
            </form>

            <div className="space-y-3 rounded-2xl bg-slate-100 p-2">
              {settings.users.map((user) => (
                <div key={user.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{roleLabel(user.role)}</p>
                  </div>
                  <form action={toggleUserStatusAction}>
                    <CsrfField />
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="isActive" value={String(!user.isActive)} />
                    <Button type="submit" variant={user.isActive ? "outline" : "default"}>
                      {user.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                </div>
              ))}
              {settings.users.length === 0 ? (
                <p className="text-sm text-slate-500">No user accounts configured yet.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
