"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CsrfField } from "@/components/security/csrf-field";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

export function AddInventoryItemModal({ action }: { action: ServerFormAction }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("MEDICINE");
  const expiringItem = category === "MEDICINE" || category === "VACCINE";

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Item
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-item-title"
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3">
              <div>
                <h2 id="add-item-title" className="text-lg font-black text-slate-900">
                  Add Item
                </h2>
                <p className="text-sm text-slate-500">Create an inventory record.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close add item">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form action={action} className="grid min-h-0 gap-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:grid-cols-2">
              <CsrfField />
              <div className="sm:col-span-2">
                <h3 className="text-sm font-black text-slate-900">Medicine identity</h3>
                <p className="text-xs text-slate-500">Each expiration date is maintained as a separate batch.</p>
              </div>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Generic name<input name="name" className="h-10 rounded-xl border px-3 font-normal" required /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Category<select name="category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-xl border px-3 font-normal">
                <option value="MEDICINE">Medicine</option>
                <option value="VACCINE">Vaccine</option>
                <option value="SUPPLY">Supply</option>
                <option value="EQUIPMENT">Equipment</option>
              </select></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Dosage<input name="dosage" className="h-10 rounded-xl border px-3 font-normal" placeholder="e.g. 600 mg" /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Brand name<input name="brandName" className="h-10 rounded-xl border px-3 font-normal" /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Classification<input name="classification" className="h-10 rounded-xl border px-3 font-normal" placeholder="e.g. Mucolytic" /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Expiration date<input name="expirationDate" type="date" required={expiringItem} className="h-10 rounded-xl border px-3 font-normal" /></label>
              <div className="border-t pt-3 sm:col-span-2"><h3 className="text-sm font-black text-slate-900">Packaging and stock</h3></div>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Pieces per box<input name="pcsPerBox" type="number" min="1" step="1" className="h-10 rounded-xl border px-3 font-normal" /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Initial stock (pieces)<input name="stock" type="number" min="0" step="1" className="h-10 rounded-xl border px-3 font-normal" defaultValue="0" /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Stock entry type<select name="stockEntryType" defaultValue="ENCODED_EXISTING" className="h-10 rounded-xl border px-3 font-normal">
                <option value="ENCODED_EXISTING">Existing stock encoded</option>
                <option value="RECEIVED">New stock received</option>
              </select></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Stock unit<input name="unit" className="h-10 rounded-xl border px-3 font-normal" placeholder="e.g. tablet, piece" required /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Low-stock threshold<input name="reorderLevel" type="number" min="0" step="1" className="h-10 rounded-xl border px-3 font-normal" defaultValue="0" /></label>
              <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800 sm:col-span-2">
                Use existing stock encoded for items already in the clinic before they were entered in the system. Use new stock received for newly delivered batches that should appear under monthly In.
              </p>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Item</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
