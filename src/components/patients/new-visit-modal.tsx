"use client";

import { useState } from "react";
import { CalendarPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceRequestedFields } from "@/components/patients/service-requested-fields";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

type RequestOption = {
  value: string;
  label: string;
};

export function NewVisitModal({
  action,
  patientId,
  requestOptions,
  defaultRequestTypes,
  assignedStaffName,
}: {
  action: ServerFormAction;
  patientId: string;
  requestOptions: RequestOption[];
  defaultRequestTypes: string[];
  assignedStaffName?: string;
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
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3">
              <div>
                <h2 id="new-visit-title" className="text-lg font-black text-slate-900">
                  New Visit
                </h2>
                <p className="text-sm text-slate-500">Add this patient to the clinic queue.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close new visit">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form action={action} className="grid min-h-0 gap-3 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <input type="hidden" name="patientId" value={patientId} />
              <ServiceRequestedFields options={requestOptions} defaultValues={defaultRequestTypes} />
              <div className="grid gap-2 text-sm font-semibold text-slate-700">
                Assigned staff
                <div className="rounded-xl border bg-slate-50 px-3 py-2 font-normal text-slate-700">
                  {assignedStaffName || "Signed-in account"}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add to Queue</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
