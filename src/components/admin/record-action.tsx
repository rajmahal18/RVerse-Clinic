"use client";
import { useState } from "react";
import { manageRecordAction } from "@/app/actions/record-management";
import { Button } from "@/components/ui/button";
import { CsrfField } from "@/components/security/csrf-field";

export type RecordActionProps = {
  kind: string;
  recordId: string;
  label: string;
  summary: string;
  returnTo?: string;
  restoring?: boolean;
  issuedMedicine?: boolean;
};
export function RecordAction({
  kind,
  recordId,
  label,
  summary,
  returnTo = "/settings?tab=archives",
  restoring = false,
  issuedMedicine = false,
}: RecordActionProps) {
  const [open, setOpen] = useState(false);
  const action = restoring
    ? "Restore"
    : [
          "MedicineRequest",
          "LabResult",
          "VaccinationRecord",
          "Referral",
          "FollowUp",
        ].includes(kind)
      ? "Void"
      : kind === "VisitRequest"
        ? "Remove service"
        : kind === "Visit"
          ? "Archive entire visit"
          : kind === "Patient"
            ? "Archive patient profile"
        : "Delete";
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={restoring ? "" : "border-rose-200 text-rose-700"}
        onClick={() => setOpen(true)}
      >
        {action}
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-3"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`record-action-${recordId}`}
            className="max-h-[92dvh] w-full max-w-lg min-w-0 overflow-y-auto rounded-lg bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={`record-action-${recordId}`}
              className="break-words text-lg font-bold"
            >
              {action}: {label}
            </h2>
            <p className="my-3 whitespace-pre-wrap break-words text-sm text-slate-700">
              {summary}
            </p>
            <p className="mb-4 text-sm text-slate-500">
              {restoring
                ? "The record returns to normal views. Restored accounts remain inactive until activated."
                : "The record is retained for recovery and audit. Linked history is preserved. Archived or voided services are excluded from normal service totals."}
            </p>
            <form action={manageRecordAction} className="grid gap-4">
              <CsrfField />
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="recordId" value={recordId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input
                type="hidden"
                name="operation"
                value={restoring ? "restore" : "archive"}
              />
              {issuedMedicine && !restoring && (
                <fieldset className="grid gap-2 border-y py-3">
                  <legend className="font-semibold">Stock handling</legend>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="stockHandling"
                      value="record-only"
                      required
                    />
                    Record correction only — keep stock unchanged
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="stockHandling"
                      value="returned"
                      required
                    />
                    The full quantity was physically returned — add it back to
                    the linked batch
                  </label>
                </fieldset>
              )}
              <label className="grid gap-1 text-sm font-semibold">
                Reason
                <textarea
                  name="reason"
                  required
                  maxLength={1000}
                  className="min-h-24 w-full min-w-0 rounded-lg border p-2 font-normal"
                />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="acknowledge"
                  value="true"
                  required
                  className="mt-1"
                />
                {kind === "Visit" && !restoring
                  ? "I confirm that this entire visit and all its linked services and results will be hidden."
                  : kind === "Patient" && !restoring
                    ? "I confirm that this patient profile and its visit history will be hidden."
                    : "I reviewed the affected records and confirm this action."}
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Confirm {action.toLowerCase()}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
