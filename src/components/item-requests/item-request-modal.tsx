"use client";

import { useState } from "react";
import { ClipboardPlus, X } from "lucide-react";
import { createItemRequestAction } from "@/app/actions/workflow";
import { CsrfField } from "@/components/security/csrf-field";
import { Button } from "@/components/ui/button";
import { formatDateKey } from "@/lib/date-time";

type InventoryRequestOption = {
  id: string;
  name: string;
  dosage: string | null;
  brandName: string | null;
  category: string;
  expirationDate: Date | null;
  unit: string;
  stock: number;
};

const categoryLabels: Record<string, string> = {
  MEDICINE: "Medicine",
  VACCINE: "Vaccine",
  SUPPLY: "Medical supplies",
  OFFICE_SUPPLY: "Office supplies",
  EQUIPMENT: "Equipment",
};

export function ItemRequestModal({ inventoryOptions }: { inventoryOptions: InventoryRequestOption[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <ClipboardPlus className="h-4 w-4" /> New Request
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-0 md:place-items-center md:p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-item-request-title"
            className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border bg-white shadow-2xl md:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b bg-slate-50 px-4 py-3">
              <div>
                <h2 id="new-item-request-title" className="font-black text-slate-900">New Item Request</h2>
                <p className="text-sm text-slate-500">Request an inventory item for supply review.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close new request">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form action={createItemRequestAction} className="grid min-h-0 gap-3 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <CsrfField />
              <label className="grid gap-1 text-sm font-semibold">
                Item
                <select name="inventoryItemId" required className="h-10 rounded-xl border px-3 font-normal">
                  <option value="">Select inventory item</option>
                  {inventoryOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {(categoryLabels[item.category] ?? item.category)} / {item.name}
                      {item.dosage ? ` ${item.dosage}` : ""}
                      {item.brandName ? ` / ${item.brandName}` : ""}
                      {item.expirationDate ? ` / exp ${formatDateKey(item.expirationDate)}` : ""}
                      {` / stock ${item.stock} ${item.unit}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Quantity
                <input name="quantity" type="number" min="1" step="1" required className="h-10 rounded-xl border px-3 font-normal" />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Remarks
                <textarea name="remarks" className="min-h-20 rounded-xl border px-3 py-2 font-normal" />
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit"><ClipboardPlus className="h-4 w-4" /> Submit Request</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
