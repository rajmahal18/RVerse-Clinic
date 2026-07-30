"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CsrfField } from "@/components/security/csrf-field";
import { cn } from "@/lib/utils";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

type StatusOption = {
  value: string;
  label: string;
};

function statusTone(status: string) {
  if (status === "Completed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "Cancelled") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (status === "For follow up") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (status === "In progress") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function VisitStatusModal({
  action,
  patientId,
  visitId,
  currentStatus,
  currentStatusCode,
  statusOptions,
}: {
  action: ServerFormAction;
  patientId: string;
  visitId: string;
  currentStatus: string;
  currentStatusCode: string;
  statusOptions: StatusOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-bold ring-1 transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-primary/40",
          statusTone(currentStatus)
        )}
      >
        {currentStatus}
        <ChevronDown className="h-4 w-4" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="visit-status-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3">
              <div>
                <h2 id="visit-status-title" className="text-lg font-black text-slate-900">
                  Update Status
                </h2>
                <p className="text-sm text-slate-500">Change the current visit status.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close status update">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form action={action} className="grid gap-4 p-4">
              <CsrfField />
              <input type="hidden" name="patientId" value={patientId} />
              <input type="hidden" name="visitId" value={visitId} />
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Status
                <select name="status" defaultValue={currentStatusCode} className="h-10 rounded-xl border px-3 font-normal outline-none focus:ring-2 focus:ring-primary/30">
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Status</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
