"use client";

import type { InventoryTableRow } from "@/lib/patient-view";
import { PackagePlus, PencilLine, Trash2, X } from "lucide-react";
import { addInventoryQuantityAction, deleteInventoryItemAction, updateInventoryItemAction } from "@/app/actions/workflow";
import { CsrfField } from "@/components/security/csrf-field";
import { Button } from "@/components/ui/button";

export function InventoryItemModal({ item, onClose }: { item: InventoryTableRow; onClose: () => void }) {
  const medicineLike = item.category === "Medicine" || item.category === "Vaccine";
  const editableFields = [
    ["name", medicineLike ? "Generic name" : "Item name", item.item],
    ...(medicineLike
      ? [
          ["dosage", "Dosage", item.dosage === "-" ? "" : item.dosage],
          ["brandName", "Brand", item.brandName === "-" ? "" : item.brandName],
          ["classification", "Classification", item.classification],
        ]
      : []),
    ["unit", "Unit", item.unit],
    ["pcsPerBox", "Pieces per box", item.pcsPerBox === "-" ? "" : item.pcsPerBox],
    ["reorderLevel", "Low-stock threshold", String(item.reorder)],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl sm:border"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-black text-slate-900">{item.item}</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">{item.category}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {medicineLike ? [item.dosage, item.brandName, `Expires ${item.expirationDate}`].filter((part) => part && part !== "-").join(" / ") : `${item.unit} inventory item`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Current stock</p>
              <p className="text-base font-black text-slate-900">{item.stock} <span className="text-xs font-semibold text-slate-500">{item.unit}</span></p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close inventory item">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
          <section className="overflow-hidden rounded-xl border">
            <div className="flex items-center gap-2 border-b bg-emerald-50/60 px-3 py-2.5">
              <PackagePlus className="h-4 w-4 text-emerald-700" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Add stock</h3>
                <p className="text-xs text-slate-500 sm:hidden">Current: {item.stock} {item.unit}</p>
              </div>
            </div>
            <form action={addInventoryQuantityAction} className="grid gap-3 p-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.3fr)_auto] sm:items-end">
              <CsrfField />
              <input type="hidden" name="itemId" value={item.id} />
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Quantity
                <input name="quantity" type="number" min="1" step="1" required className="h-10 rounded-xl border bg-white px-3 font-normal" />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Entry type
                <select name="stockEntryType" defaultValue="RECEIVED" className="h-10 rounded-xl border bg-white px-3 font-normal">
                  <option value="RECEIVED">New stock received</option>
                  <option value="ENCODED_EXISTING">Existing stock encoded</option>
                </select>
              </label>
              <Button><PackagePlus className="h-4 w-4" /> Add</Button>
            </form>
          </section>

          <section className="mt-4 overflow-hidden rounded-xl border">
            <div className="flex items-center gap-2 border-b bg-slate-50 px-3 py-2.5">
              <PencilLine className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-black text-slate-900">Item details</h3>
            </div>
            <form action={updateInventoryItemAction} className="grid gap-3 p-3 sm:grid-cols-2">
              <CsrfField />
              <input type="hidden" name="itemId" value={item.id} />
              {editableFields.map(([name, label, value]) => (
                <label key={name} className="grid gap-1 text-sm font-semibold text-slate-700">
                  {label}
                  <input name={name} defaultValue={value} className="h-10 rounded-xl border px-3 font-normal" />
                </label>
              ))}
              {medicineLike ? (
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  Expiration date
                  <input name="expirationDate" type="date" defaultValue={item.expirationDateValue} className="h-10 rounded-xl border px-3 font-normal" />
                </label>
              ) : null}
              <div className="flex justify-end pt-1 sm:col-span-2">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </section>

          <form
            action={deleteInventoryItemAction}
            className="mt-4 flex items-center justify-between gap-4 border-t pt-4"
            onSubmit={(event) => {
              if (!window.confirm("Delete this inventory batch? Its movement rows will also be removed.")) event.preventDefault();
            }}
          >
            <CsrfField />
            <input type="hidden" name="itemId" value={item.id} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800">Delete inventory batch</p>
              <p className="text-xs text-slate-500">This also removes its movement rows.</p>
            </div>
            <Button type="submit" variant="outline" className="shrink-0 text-rose-700">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
