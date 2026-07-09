"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

export function AddInventoryItemModal({ action }: { action: ServerFormAction }) {
  const [open, setOpen] = useState(false);

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
            className="w-full max-w-xl overflow-hidden rounded-2xl border bg-white shadow-2xl"
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

            <form action={action} className="grid gap-3 p-4 sm:grid-cols-2">
              <input name="name" className="h-10 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Item name" required />
              <select name="category" className="h-10 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" defaultValue="MEDICINE">
                <option value="MEDICINE">Medicine</option>
                <option value="VACCINE">Vaccine</option>
                <option value="SUPPLY">Supply</option>
                <option value="EQUIPMENT">Equipment</option>
              </select>
              <input name="stock" type="number" min="0" className="h-10 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Stock" />
              <input name="unit" className="h-10 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Unit" required />
              <input
                name="reorderLevel"
                type="number"
                min="0"
                className="h-10 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Reorder level"
              />
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
