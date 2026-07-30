"use client";

import type { InventoryTableRow } from "@/lib/patient-view";
import { X } from "lucide-react";
import { addInventoryQuantityAction, deleteInventoryItemAction, updateInventoryItemAction } from "@/app/actions/workflow";
import { CsrfField } from "@/components/security/csrf-field";
import { Button } from "@/components/ui/button";

export function InventoryItemModal({ item, onClose }: { item: InventoryTableRow; onClose: () => void }) {
  const editableFields = [
    ["name", "Generic name", item.item],
    ["dosage", "Dosage", item.dosage === "—" ? "" : item.dosage],
    ["brandName", "Brand", item.brandName === "—" ? "" : item.brandName],
    ["classification", "Classification", item.classification],
    ["unit", "Unit", item.unit],
    ["pcsPerBox", "Pieces per box", item.pcsPerBox === "—" ? "" : item.pcsPerBox],
    ["reorderLevel", "Low-stock threshold", String(item.reorder)],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:border"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-4 py-3">
          <div>
            <h2 className="text-lg font-black">{item.item}</h2>
            <p className="text-sm text-slate-500">
              {item.dosage} / {item.brandName} / expires {item.expirationDate}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid gap-5 p-4">
          <form action={addInventoryQuantityAction} className="flex flex-col gap-2 rounded-xl bg-emerald-50 p-3 sm:flex-row sm:items-end">
            <CsrfField />
            <input type="hidden" name="itemId" value={item.id} />
            <label className="grid flex-1 gap-1 text-sm font-bold">
              Add quantity
              <input name="quantity" type="number" min="1" step="1" required className="h-10 rounded-xl border bg-white px-3 font-normal" />
            </label>
            <Button>Add stock</Button>
          </form>

          <form action={updateInventoryItemAction} className="grid gap-3 sm:grid-cols-2">
            <CsrfField />
            <input type="hidden" name="itemId" value={item.id} />
            {editableFields.map(([name, label, value]) => (
              <label key={name} className="grid gap-1 text-sm font-bold">
                {label}
                <input name={name} defaultValue={value} className="h-10 rounded-xl border px-3 font-normal" />
              </label>
            ))}
            <label className="grid gap-1 text-sm font-bold">
              Expiration date
              <input name="expirationDate" type="date" defaultValue={item.expirationDateValue} className="h-10 rounded-xl border px-3 font-normal" />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit">Save changes</Button>
            </div>
          </form>

          <form
            action={deleteInventoryItemAction}
            className="border-t pt-4"
            onSubmit={(event) => {
              if (!window.confirm("Delete this inventory batch? Its movement rows will also be removed.")) event.preventDefault();
            }}
          >
            <CsrfField />
            <input type="hidden" name="itemId" value={item.id} />
            <Button type="submit" variant="outline" className="text-rose-700">
              Delete batch
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
