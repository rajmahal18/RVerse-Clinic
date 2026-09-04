"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Boxes, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CsrfField } from "@/components/security/csrf-field";

type ServerFormAction = (formData: FormData) => void | Promise<void>;
const categories = [["MEDICINE", "Medicine"], ["VACCINE", "Vaccine"], ["SUPPLY", "Medical Supplies"], ["OFFICE_SUPPLY", "Office Supplies"], ["EQUIPMENT", "Medical Equipment"], ["AMBULANCE_SUPPLY", "Ambulance Supplies"]] as const;
const Field = ({ name, label, ...props }: { name: string; label: string } & InputHTMLAttributes<HTMLInputElement>) => <label className="grid gap-1.5 text-sm font-semibold text-slate-700">{label}<input name={name} {...props} className="h-10 min-w-0 rounded-xl border px-3 font-normal" /></label>;

export function AddInventoryItemModal({ action }: { action: ServerFormAction }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("MEDICINE");
  const medicineLike = category === "MEDICINE" || category === "VACCINE";
  const medicalSupply = category === "SUPPLY";
  const officeSupply = category === "OFFICE_SUPPLY";
  const equipmentLike = category === "EQUIPMENT" || category === "AMBULANCE_SUPPLY";
  const supportsBrand = medicineLike || medicalSupply || category === "EQUIPMENT";
  return <>
    <Button type="button" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Item</Button>
    {open ? <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 sm:place-items-center sm:p-4" onClick={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="add-item-title" className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border bg-white shadow-2xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5"><div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-primary"><Boxes className="h-5 w-5" /></span><div><h2 id="add-item-title" className="text-lg font-black text-slate-900">Add Inventory Item</h2><p className="mt-0.5 text-sm text-slate-500">Fields adjust to the selected inventory sheet.</p></div></div><Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close add item"><X className="h-5 w-5" /></Button></div>
        <form action={action} className="min-h-0 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5"><CsrfField />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">Category<select name="category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-xl border bg-white px-3 font-normal">{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {!medicineLike ? <Field name="itemCode" label="Item code" placeholder="Entered by clinic staff" /> : null}<Field name="name" label={category === "MEDICINE" ? "Generic name" : category === "VACCINE" ? "Vaccine name" : "Item name"} required />
            {officeSupply ? <div className="sm:col-span-2"><Field name="itemDescription" label="Item description" /></div> : null}{medicineLike ? <Field name="dosage" label="Dosage" placeholder="e.g. 600 mg" /> : null}{supportsBrand ? <Field name="brandName" label="Brand name" /> : null}{medicineLike ? <Field name="classification" label="Classification" /> : null}
            {(medicineLike || medicalSupply) ? <Field name="expirationDate" label={`Expiration date${medicalSupply ? " (optional)" : ""}`} type="date" required={medicineLike} /> : null}{!medicineLike ? <Field name="location" label="Location" /> : null}{!medicineLike ? <div className="sm:col-span-2"><Field name="remarks" label="Remarks" /></div> : null}
          </div>
          <div className="my-5 border-t" /><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Opening quantity</p></div>
            {!equipmentLike ? <Field name="pcsPerBox" label="Qty per box (optional)" type="number" min="1" step="1" /> : null}<Field name="boxStock" label="Box quantity" type="number" min="0" step="1" defaultValue="0" />{!equipmentLike ? <Field name="stock" label="Unit quantity" type="number" min="0" step="1" defaultValue="0" /> : null}<Field name="unit" label="Unit label" placeholder={equipmentLike ? "e.g. pcs, unit, set" : "e.g. pcs, bottle, ream, pack"} required />{!equipmentLike ? <Field name="reorderLevel" label="Low-stock threshold" type="number" min="0" step="1" defaultValue="0" /> : null}
            {equipmentLike ? <><Field name="physicalCount" label="Physical count" type="number" min="0" step="1" required /><Field name="functionalCount" label="Functional units" type="number" min="0" step="1" required /><p className="text-xs leading-5 text-slate-500 sm:col-span-2">Physical Count is the actual quantity available. Functional Units is how many currently work; it cannot exceed Physical Count.</p></> : null}
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">Stock entry type<select name="stockEntryType" defaultValue="ENCODED_EXISTING" className="h-10 rounded-xl border bg-white px-3 font-normal sm:max-w-sm"><option value="ENCODED_EXISTING">Existing stock encoded</option><option value="RECEIVED">New stock received</option></select></label>
          </div><div className="mt-5 flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Save Item</Button></div>
        </form>
      </div>
    </div> : null}
  </>;
}
