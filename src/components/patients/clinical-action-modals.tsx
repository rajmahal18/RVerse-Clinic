"use client";
import { AutosaveForm } from "@/components/patients/autosave-form";

import { useState } from "react";
import { CalendarPlus, ClipboardPlus, Syringe, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CsrfField } from "@/components/security/csrf-field";
import { MedicineScheduleFields } from "@/components/patients/medicine-schedule-fields";
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

export function MedicineRequestModal({ action, patientId, visitId, inventoryOptions }: { action: Action; patientId: string; visitId: string; inventoryOptions: InventoryOption[] }) {
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
          <AutosaveForm visitId={visitId}
            draftKey="medicine"
            action={action}
            className="grid gap-3"
          >
            <CsrfField />
            <input type="hidden" name="patientId" value={patientId} />
            <input type="hidden" name="visitId" value={visitId} />
            <label className="grid gap-1 text-sm font-semibold">
              Medicine
              <select
                name="inventoryItemId"
                required
                className="h-10 rounded-xl border px-3 font-normal"
              >
                <option value="">Select medicine batch</option>
                {inventoryOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.dosage ? ` ${item.dosage}` : ""}
                    {item.brandName ? ` / ${item.brandName}` : ""} / exp{" "}
                    {item.expirationDate
                      ? formatDateKey(item.expirationDate)
                      : "N/A"}{" "}
                    / stock {item.stock} {item.unit}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Quantity
              <input
                name="quantity"
                type="number"
                min="1"
                required
                className="h-10 rounded-xl border px-3 font-normal"
              />
            </label>
            <MedicineScheduleFields />
            <textarea
              name="remarks"
              className="min-h-20 rounded-xl border px-3 py-2 text-sm"
              placeholder="Medicine request remarks"
            />
            <Button type="submit">
              <ClipboardPlus className="h-4 w-4" /> Submit Request
            </Button>
          </AutosaveForm>
        </Modal>
      ) : null}
    </>
  );
}

export function ReferralScheduleModal({ action, patientId, visitId }: { action: Action; patientId: string; visitId: string }) {
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
                name="reasonForReferral"
                required
                className="min-h-24 rounded-xl border px-3 py-2 font-normal"
                placeholder="Describe why the patient needs referral"
                defaultValue="For further evaluation and management"
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
