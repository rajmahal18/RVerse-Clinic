"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleOff, X } from "lucide-react";
import { toggleUserStatusAction } from "@/app/actions/workflow";
import type { ClinicSettingsData } from "@/lib/patient-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AccountUser = ClinicSettingsData["users"][number];

function roleLabel(role: string) {
  return role === "DOCTOR_NURSE" ? "Doctor / Nurse" : role === "SUPPLY_OFFICER" ? "Supply Officer" : role === "RECORDS" ? "Records" : "Admin";
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge className={active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function ToggleAccountForm({ user, compact = false }: { user: AccountUser; compact?: boolean }) {
  return (
    <form action={toggleUserStatusAction}>
      <input type="hidden" name="redirectTo" value="/accounts" />
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="isActive" value={String(!user.isActive)} />
      <Button type="submit" size={compact ? "default" : "sm"} variant={user.isActive ? "outline" : "default"} className={compact ? "w-full" : undefined}>
        {user.isActive ? (
          <>
            <CircleOff className="h-4 w-4" /> Deactivate
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" /> Activate
          </>
        )}
      </Button>
    </form>
  );
}

export function AccountList({ users }: { users: AccountUser[] }) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  return (
    <>
      <div className="divide-y-8 divide-slate-100 bg-slate-100 lg:hidden">
        {users.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => setSelectedUserId(user.id)}
            className="block w-full border-y border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition active:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black text-slate-900">{user.name}</p>
                <p className="truncate text-sm text-slate-500">{user.email}</p>
              </div>
              <StatusBadge active={user.isActive} />
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">Role</p>
            <p className="text-sm font-semibold text-slate-700">{roleLabel(user.role)}</p>
          </button>
        ))}
        {users.length === 0 ? (
          <p className="bg-white px-4 py-10 text-center text-sm text-slate-500">No accounts configured yet.</p>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto scrollbar-thin lg:block">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {["Name", "Email", "Role", "Status", "Action"].map((header) => (
                <th key={header} className="px-4 py-3 font-bold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-900">{user.name}</td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3">
                  <Badge className="bg-slate-100 text-slate-700">{roleLabel(user.role)}</Badge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge active={user.isActive} />
                </td>
                <td className="px-4 py-3">
                  <ToggleAccountForm user={user} />
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  No accounts configured yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedUser ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-0 md:place-items-center md:p-4" onClick={() => setSelectedUserId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-details-title"
            className="max-h-[88vh] w-full overflow-hidden rounded-t-2xl border bg-white shadow-2xl md:max-w-xl md:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <h2 id="account-details-title" className="truncate text-lg font-black text-slate-900">{selectedUser.name}</h2>
                <p className="truncate text-sm text-slate-500">{selectedUser.email}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedUserId(null)} aria-label="Close account details">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid gap-3 p-4">
              <div className="rounded-xl border bg-slate-50 px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Role</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{roleLabel(selectedUser.role)}</p>
              </div>
              <div className="rounded-xl border bg-slate-50 px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</p>
                <div className="mt-1"><StatusBadge active={selectedUser.isActive} /></div>
              </div>
            </div>
            <div className="border-t bg-white p-4">
              <ToggleAccountForm user={selectedUser} compact />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
