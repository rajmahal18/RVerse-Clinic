"use client";
import { AutosaveForm } from "@/components/patients/autosave-form";
import { FormFeedback } from "@/components/ui/form-feedback";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, ClipboardPlus, Syringe, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CsrfField } from "@/components/security/csrf-field";
import { MedicineRequestLines } from "@/components/patients/medicine-request-lines";
import { VaccinationFields } from "@/components/patients/vaccination-fields";
import { formatDateKey } from "@/lib/date-time";

type Action = (formData: FormData) => void | Promise<void>;
type InventoryOption = { id: string; name: string; dosage: string | null; brandName: string | null; expirationDate: Date | null; unit: string; stock: number };

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92dvh] w-full max-w-xl overflow-hidden rounded-2xl border bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
          <h2 className="font-black text-slate-900">{title}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="max-h-[calc(92dvh-4rem)] overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}

export function MedicineRequestModal({
  action,
  patientId,
  visitId,
  inventoryOptions,
}: {
  action: Action;
  patientId: string;
  visitId: string;
  inventoryOptions: InventoryOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <ClipboardPlus className="h-4 w-4" /> Medicine Request
        </Button>
      }
      {open ? (
        <Modal title="Medicine Request" onClose={() => setOpen(false)}>
          <AutosaveForm
            visitId={visitId}
            draftKey="medicine"
            action={action}
            className="grid gap-3"
          >
            <CsrfField />
            <input type="hidden" name="patientId" value={patientId} />
            <input type="hidden" name="visitId" value={visitId} />
            <MedicineRequestLines options={inventoryOptions} />
            <Button type="submit">
              <ClipboardPlus className="h-4 w-4" /> Submit Request
            </Button>
          </AutosaveForm>
        </Modal>
      ) : null}
    </>
  );
}

export function ReferralScheduleModal({ action, patientId, visitId, referralReason = "" }: { action: Action; patientId: string; visitId: string; referralReason?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <CalendarPlus className="h-4 w-4" /> Schedule Referral
        </Button>
      }
      {open ? (
        <Modal title="Schedule Referral" onClose={() => setOpen(false)}>
          <AutosaveForm visitId={visitId}
            draftKey="referral"
            action={action}
            className="grid gap-3"
          >
            <CsrfField />
            <input type="hidden" name="patientId" value={patientId} />
            <input type="hidden" name="visitId" value={visitId} />
            <label className="grid gap-1 text-sm font-semibold">
              Schedule date and time
              <input
                name="scheduledFor"
                type="datetime-local"
                required
                className="h-10 rounded-xl border px-3 font-normal"
              />
            </label>
            <input
              name="referredTo"
              required
              className="h-10 rounded-xl border px-3 text-sm"
              placeholder="Referred to"
            />
            <textarea
              name="medicalHistory"
              className="min-h-20 rounded-xl border px-3 py-2 text-sm"
              placeholder="Medical history"
            />
            <label className="grid gap-1 text-sm font-semibold">
              Reason for referral
              <textarea
                name="reasonForReferral" defaultValue={referralReason}
                required
                className="min-h-24 rounded-xl border px-3 py-2 font-normal"
                placeholder="Describe why the patient needs referral"

              />
            </label>
            <textarea
              name="remarks"
              className="min-h-20 rounded-xl border px-3 py-2 text-sm"
              placeholder="Referral remarks"
            />
            <Button type="submit">
              <CalendarPlus className="h-4 w-4" /> Save Schedule
            </Button>
          </AutosaveForm>
        </Modal>
      ) : null}
    </>
  );
}

export function FollowUpScheduleModal({ action, patientId, visitId, disabled = false, disabledReason }: {
  action: Action;
  patientId: string;
  visitId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const close = () => { if (!saving.current) setOpen(false); };
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const button = trigger.current;
    document.body.style.overflow = "hidden";
    form.current?.querySelector<HTMLInputElement>('input[type="datetime-local"]')?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving.current) setOpen(false);
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", escape);
      button?.focus({ preventScroll: true });
    };
  }, [open]);
  return (
    <>
      <Button ref={trigger} type="button" variant="outline" disabled={disabled} title={disabled ? disabledReason : undefined} onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> Schedule Follow-up
      </Button>
      {open ? (
        <Modal title="Schedule Follow-up" onClose={close}>
          <form ref={form} onSubmit={() => { saving.current = true; setPending(true); }} action={async (data) => {
            try { await action(data); }
            finally { saving.current = false; setPending(false); }
          }} className="grid min-w-0 gap-4">
            <FormFeedback />
            <CsrfField />
            <input type="hidden" name="patientId" value={patientId} />
            <input type="hidden" name="visitId" value={visitId} />
            <p className="text-sm text-slate-500">Set the return schedule and mark this visit as for follow up.</p>
            <label className="grid min-w-0 gap-1 text-sm font-semibold">
              Follow-up date and time
              <input name="scheduledFor" type="datetime-local" required className="h-10 w-full min-w-0 max-w-full rounded-lg border px-3 font-normal" />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold">
              Remarks (optional)
              <textarea name="remarks" maxLength={1000} rows={3} className="w-full min-w-0 rounded-lg border px-3 py-2 font-normal" />
            </label>
            <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
              <Button type="button" variant="outline" disabled={pending} onClick={close}>Cancel</Button>
              <Button type="submit"><CalendarPlus className="h-4 w-4" /> Save Follow-up</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

export function VaccineRequestModal({ action, patientId, visitId, vaccines }: { action: Action; patientId: string; visitId: string; vaccines: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <Syringe className="h-4 w-4" /> Vaccine Request
        </Button>
      }
      {open ? (
        <Modal title="Vaccine Request" onClose={() => setOpen(false)}>
          <AutosaveForm visitId={visitId}
            draftKey="vaccine-request"
            action={action}
            className="grid gap-3"
          >
            <CsrfField />
            <input type="hidden" name="patientId" value={patientId} />
            <input type="hidden" name="visitId" value={visitId} />
            <VaccinationFields vaccines={vaccines} />
            <textarea
              name="remarks"
              className="min-h-24 rounded-xl border px-3 py-2 text-sm"
              placeholder="Vaccine request remarks"
            />
            <Button type="submit">
              <Syringe className="h-4 w-4" /> Save Vaccine Request
            </Button>
          </AutosaveForm>
        </Modal>
      ) : null}
    </>
  );
}

export function VaccinationRecordModal({
  action,
  patientId,
  visitId,
  vaccines,
}: {
  action: Action;
  patientId: string;
  visitId: string;
  vaccines: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Syringe className="h-4 w-4" /> Record vaccination
      </Button>
      {open ? (
        <Modal
          title="Record administered vaccine"
          onClose={() => setOpen(false)}
        >
          <AutosaveForm visitId={visitId}
            action={action}
            draftKey="vaccination"
            className="grid gap-3"
          >
            <CsrfField />
            <input type="hidden" name="patientId" value={patientId} />
            <input type="hidden" name="visitId" value={visitId} />
            <p className="text-sm text-slate-500">
              Save only after the vaccine has been administered.
            </p>
            <VaccinationFields vaccines={vaccines} />
            <label className="grid min-w-0 gap-1 text-sm font-semibold">Date given<input type="date" name="administeredAt" required defaultValue={formatDateKey(new Date())} className="h-11 w-full min-w-0 rounded-lg border px-3" /></label>
            <label className="grid gap-1 text-sm font-semibold">
              Given by
              <input
                name="givenBy"
                required
                className="h-10 min-w-0 rounded-lg border px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Next dose
              <input
                name="nextDose"
                type="date"
                className="h-10 min-w-0 rounded-lg border px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Remarks
              <textarea
                name="remarks"
                className="min-h-24 rounded-lg border p-3 font-normal"
              />
            </label>
            <Button type="submit">Save vaccination record</Button>
          </AutosaveForm>
        </Modal>
      ) : null}
    </>
  );
}
