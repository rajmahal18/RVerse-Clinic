"use client";

import { useState } from "react";
import { CalendarPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

type RequestOption = {
  value: string;
  label: string;
};

export function NewVisitModal({
  action,
  patientId,
  requestOptions,
  defaultRequestType,
}: {
  action: ServerFormAction;
  patientId: string;
  requestOptions: RequestOption[];
  defaultRequestType: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> New Visit
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-visit-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3">
              <div>
                <h2 id="new-visit-title" className="text-lg font-black text-slate-900">
                  New Visit
                </h2>
                <p className="text-sm text-slate-500">Start a visit record for this patient.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close new visit">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form action={action} className="grid gap-3 p-4">
              <input type="hidden" name="patientId" value={patientId} />
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Request
                <select name="requestType" defaultValue={defaultRequestType} className="h-10 rounded-xl border px-3 font-normal outline-none focus:ring-2 focus:ring-primary/30">
                  {requestOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Assigned staff
                <input name="nurseOnDuty" className="h-10 rounded-xl border px-3 font-normal outline-none focus:ring-2 focus:ring-primary/30" placeholder="Assigned staff" />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Start Visit</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
