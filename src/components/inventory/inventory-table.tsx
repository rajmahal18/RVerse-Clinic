"use client";

import type { InventoryLedgerData } from "@/lib/patient-view";
import { useState } from "react";
import { MonthSelectForm } from "@/components/search/month-select-form";
import { AlertTriangle } from "lucide-react";
import { InventoryControls } from "@/components/inventory/inventory-controls";
import { InventoryItemModal } from "@/components/inventory/inventory-item-modal";

function expiryTone(status: string) {
  if (status === "Expired") return "bg-rose-100 text-rose-800";
  if (status === "Within 1 month") return "bg-orange-100 text-orange-800";
  if (status === "Within 3 months") return "bg-amber-100 text-amber-800";
  if (status === "Within 6 months") return "bg-yellow-100 text-yellow-800";
  return "bg-emerald-50 text-emerald-700";
}

export function InventoryTable({
  ledger,
  searchQuery,
}: {
  ledger: InventoryLedgerData;
  searchQuery: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = ledger.rows.find((item) => item.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border bg-[linear-gradient(135deg,#eefbf6,#ffffff_45%,#f8fafc)] p-4 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Inventory Ledger</p>
            <h3 className="text-xl font-black tracking-tight text-slate-950">Monthly stock movement sheet</h3>
            <p className="mt-1 text-sm text-slate-600">
              Review beginning balance, received quantities, dispensed quantities, and ending stock for{" "}
              <span className="font-semibold text-slate-800">{ledger.selectedMonthLabel}</span>.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Encoded existing stock is included in beginning stocks. Only newly received stock appears under In.
            </p>
          </div>
          <MonthSelectForm
            action="/inventory"
            selectedMonth={ledger.selectedMonth}
            options={ledger.monthOptions}
            searchQuery={searchQuery}
            preserveParams={{ expiry: ledger.expiryFilter, sort: ledger.sort }}
          />
        </div>
      </div>

      {(ledger.expiryAlerts.expired + ledger.expiryAlerts.withinOne + ledger.expiryAlerts.withinThree + ledger.expiryAlerts.withinSix) > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-black">Expiration attention needed</p>
            <p className="mt-0.5 text-amber-800">
              {ledger.expiryAlerts.expired} expired / {ledger.expiryAlerts.withinOne} within 1 month /{" "}
              {ledger.expiryAlerts.withinThree} within 3 months / {ledger.expiryAlerts.withinSix} within 6 months
            </p>
          </div>
        </div>
      ) : null}

      <InventoryControls search={searchQuery} month={ledger.selectedMonth} expiry={ledger.expiryFilter} sort={ledger.sort} category={ledger.category} />

      <div className="divide-y-8 divide-slate-100 overflow-hidden rounded-2xl border bg-slate-100 lg:hidden">
        {ledger.rows.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            className="block w-full border-y border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition active:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black text-slate-900">{item.item}</p>
                <p className="truncate text-sm text-slate-500">{item.dosage} / {item.brandName}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${expiryTone(item.expiryStatus)}`}>
                {item.expiryStatus}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <p>
                <span className="block text-xs font-bold uppercase text-slate-400">Expires</span>
                <b>{item.expirationDate}</b>
              </p>
              <p>
                <span className="block text-xs font-bold uppercase text-slate-400">Remaining</span>
                <b>{item.remainingPieces} {item.unit}</b>
              </p>
              <p className="min-w-0">
                <span className="block text-xs font-bold uppercase text-slate-400">Class</span>
                <span className="block truncate text-slate-700">{item.classification}</span>
              </p>
              <p>
                <span className="block text-xs font-bold uppercase text-slate-400">Stock</span>
                <span className="font-semibold text-slate-700">{item.status}</span>
              </p>
            </div>
          </button>
        ))}
        {ledger.rows.length === 0 ? (
          <p className="bg-white px-4 py-10 text-center text-sm text-slate-500">No inventory items found for this view yet.</p>
        ) : null}
      </div>

      <div className="hidden overflow-hidden rounded-[28px] border bg-white shadow-soft lg:block">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-[1480px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-700">
                <th rowSpan={2} className="border-b border-r bg-[#a9c7e6] px-4 py-4 text-slate-900">Generic Name</th>
                <th rowSpan={2} className="border-b border-r bg-[#a9c7e6] px-4 py-4 text-slate-900">Dosage</th>
                <th rowSpan={2} className="border-b border-r bg-[#a9c7e6] px-4 py-4 text-slate-900">Brand Name</th>
                <th rowSpan={2} className="border-b border-r bg-[#a9c7e6] px-4 py-4 text-slate-900">Classification</th>
                <th rowSpan={2} className="border-b border-r bg-[#a9c7e6] px-4 py-4 text-slate-900">Pcs/Box</th>
                <th rowSpan={2} className="border-b border-r bg-[#a9c7e6] px-4 py-4 text-slate-900">Expiration Date</th>
                <th colSpan={2} className="border-b border-r bg-[#7eb24f] px-4 py-4 text-slate-950">Beginning Stocks</th>
                <th colSpan={5} className="border-b bg-blue-500 px-4 py-4 text-white">{ledger.selectedMonthLabel}</th>
              </tr>
              <tr className="text-center text-xs font-bold text-slate-900">
                <th className="border-b border-r bg-[#93c36b] px-4 py-3">Box (T)</th>
                <th className="border-b border-r bg-[#93c36b] px-4 py-3">Pcs (T)</th>
                <th className="border-b border-r bg-[#a7c6ff] px-4 py-3">In</th>
                <th className="border-b border-r bg-[#4c84de] px-4 py-3 text-white">Out (pcs)</th>
                <th className="border-b border-r bg-[#4c84de] px-4 py-3 text-white">Out (box)</th>
                <th className="border-b border-r bg-[#93c36b] px-4 py-3">RS (Pcs)</th>
                <th className="border-b bg-[#93c36b] px-4 py-3">RS (Box)</th>
              </tr>
            </thead>
            <tbody>
              {ledger.rows.map((item, index) => (
                <tr key={item.id} onClick={() => setSelectedId(item.id)} className={`${index % 2 === 0 ? "bg-[#f8ecd9]" : "bg-[#eef5e5]"} cursor-pointer hover:brightness-95`}>
                  <td className="border-b border-r px-4 py-3 font-bold text-slate-900">{item.item}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.dosage}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.brandName}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.classification}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.pcsPerBox}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${expiryTone(item.expiryStatus)}`}>{item.expirationDate}</span>
                  </td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.beginningBoxes}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.beginningPieces}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.monthIn}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.monthOutPieces}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.monthOutBoxes}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.remainingPieces}</td>
                  <td className="border-b px-4 py-3 text-center text-slate-700">{item.remainingBoxes}</td>
                </tr>
              ))}
              {ledger.rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-sm text-slate-500">
                    No inventory items found for this view yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      {selectedItem ? <InventoryItemModal item={selectedItem} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}
