"use client";

import { useState } from "react";
import { Boxes, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CsrfField } from "@/components/security/csrf-field";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

export function AddInventoryItemModal({ action }: { action: ServerFormAction }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("MEDICINE");
  const medicineLike = category === "MEDICINE" || category === "VACCINE";
  const supportsExpiry = medicineLike || category === "SUPPLY";
  const expiringItem = medicineLike;
  const identityTitle = category === "MEDICINE" ? "Medicine details" : category === "VACCINE" ? "Vaccine details" : "Item details";
  const nameLabel = category === "MEDICINE" ? "Generic name" : category === "VACCINE" ? "Vaccine name" : "Item name";
  const unitPlaceholder = medicineLike ? "e.g. tablet, vial" : category === "EQUIPMENT" ? "e.g. unit, set" : "e.g. piece, box, pack";

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Item
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-0 sm:place-items-center sm:p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-item-title"
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border bg-white shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-primary">
                  <Boxes className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="add-item-title" className="text-lg font-black text-slate-900">Add Inventory Item</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Create a stock record under the appropriate inventory category.</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close add item">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form action={action} className="min-h-0 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
              <CsrfField />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">{identityTitle}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {medicineLike
                      ? "Medicine and vaccine batches keep their own dosage, brand, classification, and expiration details."
                      : supportsExpiry
                        ? "Medical supplies can optionally carry an expiration date while stock is tracked by unit."
                        : "Office supplies and equipment focus on item identity, stock unit, packaging, and reorder level."}
                  </p>
                </div>

                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  {nameLabel}
                  <input name="name" className="h-10 rounded-xl border px-3 font-normal" required />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Category
                  <select name="category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-xl border bg-white px-3 font-normal">
                    <option value="MEDICINE">Medicine</option>
                    <option value="VACCINE">Vaccine</option>
                    <option value="SUPPLY">Medical Supplies</option>
                    <option value="OFFICE_SUPPLY">Office Supplies</option>
                    <option value="EQUIPMENT">Equipment</option>
                  </select>
                </label>

                {medicineLike ? (
                  <>
                    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                      Dosage
                      <input name="dosage" className="h-10 rounded-xl border px-3 font-normal" placeholder="e.g. 600 mg" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                      Brand name
                      <input name="brandName" className="h-10 rounded-xl border px-3 font-normal" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                      Classification
                      <input name="classification" className="h-10 rounded-xl border px-3 font-normal" placeholder="e.g. Mucolytic" />
                    </label>
                  </>
                ) : null}

                {supportsExpiry ? (
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                    Expiration date{!expiringItem ? <span className="font-normal text-slate-400"> (optional)</span> : null}
                    <input name="expirationDate" type="date" required={expiringItem} className="h-10 rounded-xl border px-3 font-normal" />
                  </label>
                ) : null}
              </div>

              <div className="my-5 border-t" />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Stock setup</p>
                </div>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Pack size / pieces per box
                  <input name="pcsPerBox" type="number" min="1" step="1" className="h-10 rounded-xl border px-3 font-normal" />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Initial stock
                  <input name="stock" type="number" min="0" step="1" className="h-10 rounded-xl border px-3 font-normal" defaultValue="0" />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Stock unit
                  <input name="unit" className="h-10 rounded-xl border px-3 font-normal" placeholder={unitPlaceholder} required />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Low-stock threshold
                  <input name="reorderLevel" type="number" min="0" step="1" className="h-10 rounded-xl border px-3 font-normal" defaultValue="0" />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
                  Stock entry type
                  <select name="stockEntryType" defaultValue="ENCODED_EXISTING" className="h-10 rounded-xl border bg-white px-3 font-normal sm:max-w-sm">
                    <option value="ENCODED_EXISTING">Existing stock encoded</option>
                    <option value="RECEIVED">New stock received</option>
                  </select>
                </label>
              </div>

              <p className="mt-4 border-l-2 border-blue-300 bg-blue-50/70 px-3 py-2 text-xs leading-5 text-blue-800">
                Existing stock is included in the beginning balance. Choose New stock received only for a delivery that should appear under monthly In.
              </p>

              <div className="mt-5 flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Save Item</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
