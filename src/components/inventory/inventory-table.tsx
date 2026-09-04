"use client";

import type { InventoryLedgerData } from "@/lib/patient-view";
import { useState } from "react";
import { AlertTriangle, Boxes, PackageCheck } from "lucide-react";
import { MonthSelectForm } from "@/components/search/month-select-form";
import { InventoryControls } from "@/components/inventory/inventory-controls";
import { InventoryItemModal } from "@/components/inventory/inventory-item-modal";

const categoryLabels: Record<string, string> = {
  MEDICINE: "Medicine",
  VACCINE: "Vaccine",
  SUPPLY: "Medical Supplies",
  OFFICE_SUPPLY: "Office Supplies",
  EQUIPMENT: "Medical Equipment",
  AMBULANCE_SUPPLY: "Ambulance Supplies",
};

function expiryTone(status: string) {
  if (status === "Expired") return "bg-rose-100 text-rose-800";
  if (status === "Within 1 month") return "bg-orange-100 text-orange-800";
  if (status === "Within 3 months") return "bg-amber-100 text-amber-800";
  if (status === "Within 6 months") return "bg-yellow-100 text-yellow-800";
  if (status === "No expiry") return "bg-slate-100 text-slate-600";
  return "bg-emerald-50 text-emerald-700";
}

function stockTone(status: string) {
  if (status === "Out of stock") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  if (status === "Low stock") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
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
  const medicineLike = ledger.category === "MEDICINE" || ledger.category === "VACCINE";
  const supportsExpiry = medicineLike || ledger.category === "SUPPLY";
  const equipmentLike = ledger.category === "EQUIPMENT" || ledger.category === "AMBULANCE_SUPPLY";
  const categoryLabel = categoryLabels[ledger.category] ?? "Inventory";
  const movementVerb = medicineLike ? "dispensed" : "released / used";

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border bg-white shadow-soft">
        <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-primary">
              <Boxes className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">{categoryLabel}</p>
              <h3 className="mt-0.5 text-xl font-black tracking-tight text-slate-950">Monthly stock movement</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                Beginning stock, newly received quantities, {movementVerb} quantities, and remaining stock for{" "}
                <span className="font-semibold text-slate-800">{ledger.selectedMonthLabel}</span>.
              </p>
            </div>
          </div>
          <MonthSelectForm
            action="/inventory"
            selectedMonth={ledger.selectedMonth}
            options={ledger.monthOptions}
            searchQuery={searchQuery}
            preserveParams={{ expiry: ledger.expiryFilter, sort: ledger.sort, category: ledger.category }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-slate-50/70 px-4 py-2 text-xs text-slate-500 md:px-5">
          <span>Existing encoded stock is included in beginning stock.</span>
          <span className="hidden text-slate-300 sm:inline">•</span>
          <span>Only newly received stock appears under In.</span>
        </div>
      </div>

      {supportsExpiry && (ledger.expiryAlerts.expired + ledger.expiryAlerts.withinOne + ledger.expiryAlerts.withinThree + ledger.expiryAlerts.withinSix) > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="font-black">Expiration attention needed</p>
            <p className="mt-0.5 text-amber-800">
              {ledger.expiryAlerts.expired} expired · {ledger.expiryAlerts.withinOne} within 1 month ·{" "}
              {ledger.expiryAlerts.withinThree} within 3 months · {ledger.expiryAlerts.withinSix} within 6 months
            </p>
          </div>
        </div>
      ) : null}

      <InventoryControls
        search={searchQuery}
        month={ledger.selectedMonth}
        expiry={ledger.expiryFilter}
        sort={ledger.sort}
        category={ledger.category}
        showExpiry={supportsExpiry}
        medicineLike={medicineLike}
      />

      <div className="divide-y overflow-hidden rounded-2xl border bg-white lg:hidden">
        {ledger.rows.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            className="block w-full px-4 py-4 text-left transition hover:bg-slate-50 active:bg-slate-100"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black text-slate-900">{item.item}</p>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                  {medicineLike
                    ? [item.dosage, item.brandName].filter((part) => part && part !== "—" && part !== "-").join(" / ") || "No dosage / brand"
                    : [item.itemCode !== "—" ? item.itemCode : "", item.location !== "—" ? item.location : "", item.itemDescription !== "—" ? item.itemDescription : ""].filter(Boolean).join(" · ") || item.unit}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${stockTone(equipmentLike && item.functionalStatus === "NF" ? "Out of stock" : item.status)}`}>
                {equipmentLike ? item.functionalStatus : item.status}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-sm">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Beginning</span>
                <b className="mt-0.5 block text-slate-800">{item.beginningPieces} {item.unit}</b>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Out</span>
                <b className="mt-0.5 block text-slate-800">{item.monthOutPieces} {item.unit}</b>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{equipmentLike ? "Physical count" : "Remaining"}</span>
                <b className="mt-0.5 block text-slate-900">{equipmentLike ? item.physicalCount ?? "—" : item.remainingPieces} {item.unit}</b>
              </div>
            </div>

            {supportsExpiry ? (
              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">Expiration</span>
                <span className={`rounded-full px-2 py-1 font-bold ${expiryTone(item.expiryStatus)}`}>{item.expirationDate}</span>
              </div>
            ) : null}
          </button>
        ))}
        {ledger.rows.length === 0 ? (
          <div className="grid place-items-center px-4 py-12 text-center">
            <PackageCheck className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No {categoryLabel.toLowerCase()} found for this view.</p>
            <p className="mt-1 text-xs text-slate-400">Add an item or adjust the filters above.</p>
          </div>
        ) : null}
      </div>

      {medicineLike ? (
        <div className="hidden overflow-hidden rounded-2xl border bg-white shadow-soft lg:block">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-[1320px] w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-center text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                  <th rowSpan={2} className="border-b border-r bg-slate-100 px-4 py-3 text-left text-slate-800">Generic Name</th>
                  <th rowSpan={2} className="border-b border-r bg-slate-100 px-4 py-3">Dosage</th>
                  <th rowSpan={2} className="border-b border-r bg-slate-100 px-4 py-3">Brand</th>
                  <th rowSpan={2} className="border-b border-r bg-slate-100 px-4 py-3">Classification</th>
                  <th rowSpan={2} className="border-b border-r bg-slate-100 px-4 py-3">Pcs / Box</th>
                  <th rowSpan={2} className="border-b border-r bg-slate-100 px-4 py-3">Expiration</th>
                  <th colSpan={2} className="border-b border-r bg-emerald-100 px-4 py-3 text-emerald-900">Beginning Stock</th>
                  <th colSpan={5} className="border-b bg-slate-900 px-4 py-3 text-white">{ledger.selectedMonthLabel}</th>
                </tr>
                <tr className="text-center text-[11px] font-bold text-slate-700">
                  <th className="border-b border-r bg-emerald-50 px-4 py-2.5">Box</th>
                  <th className="border-b border-r bg-emerald-50 px-4 py-2.5">Pcs</th>
                  <th className="border-b border-r bg-slate-100 px-4 py-2.5">In</th>
                  <th className="border-b border-r bg-slate-100 px-4 py-2.5">Out (pcs)</th>
                  <th className="border-b border-r bg-slate-100 px-4 py-2.5">Out (box)</th>
                  <th className="border-b border-r bg-teal-50 px-4 py-2.5 text-teal-800">Remaining (pcs)</th>
                  <th className="border-b bg-teal-50 px-4 py-2.5 text-teal-800">Remaining (box)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.rows.map((item) => (
                  <tr key={item.id} onClick={() => setSelectedId(item.id)} className="cursor-pointer bg-white transition hover:bg-slate-50">
                    <td className="border-r px-4 py-3 font-bold text-slate-900">{item.item}</td>
                    <td className="border-r px-4 py-3 text-center text-slate-600">{item.dosage}</td>
                    <td className="border-r px-4 py-3 text-center text-slate-600">{item.brandName}</td>
                    <td className="border-r px-4 py-3 text-center text-slate-600">{item.classification}</td>
                    <td className="border-r px-4 py-3 text-center text-slate-600">{item.pcsPerBox}</td>
                    <td className="border-r px-4 py-3 text-center text-slate-600">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${expiryTone(item.expiryStatus)}`}>{item.expirationDate}</span>
                    </td>
                    <td className="border-r px-4 py-3 text-center text-slate-700">{item.beginningBoxes}</td>
                    <td className="border-r px-4 py-3 text-center text-slate-700">{item.beginningPieces}</td>
                    <td className="border-r px-4 py-3 text-center font-semibold text-emerald-700">{item.monthIn}</td>
                    <td className="border-r px-4 py-3 text-center text-slate-700">{item.monthOutPieces}</td>
                    <td className="border-r px-4 py-3 text-center text-slate-700">{item.monthOutBoxes}</td>
                    <td className="border-r px-4 py-3 text-center font-black text-slate-900">{item.remainingPieces}</td>
                    <td className="px-4 py-3 text-center font-black text-slate-900">{item.remainingBoxes}</td>
                  </tr>
                ))}
                {ledger.rows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-sm text-slate-500">
                      No {categoryLabel.toLowerCase()} found for this view.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="hidden overflow-hidden rounded-2xl border bg-white shadow-soft lg:block">
          <div>
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                <tr>
                  <th className="w-[13%] px-4 py-3">Item Code</th>
                  <th className="w-[29%] px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-right">Beginning</th>
                  <th className="px-4 py-3 text-right text-emerald-700">In</th>
                  <th className="px-4 py-3 text-right">Out</th>
                  <th className="px-4 py-3 text-right text-primary">{equipmentLike ? "Physical Count" : "Remaining"}</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.rows.map((item) => (
                  <tr key={item.id} onClick={() => setSelectedId(item.id)} className="cursor-pointer transition hover:bg-slate-50">
                    <td className="truncate px-4 py-3 font-semibold text-slate-600">{item.itemCode}</td>
                    <td className="px-4 py-3"><p className="truncate font-bold text-slate-900">{item.item}</p><p className="truncate text-xs text-slate-500">{[item.brandName !== "—" ? item.brandName : "", item.itemDescription !== "—" ? item.itemDescription : "", item.location !== "—" ? item.location : ""].filter(Boolean).join(" · ") || item.unit}</p></td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{item.beginningBoxes} box / {item.beginningPieces} {item.unit}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">{item.monthInBoxes} box / {item.monthIn} {item.unit}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{item.monthOutPieces}</td>
                    <td className="px-4 py-3 text-right font-black tabular-nums text-slate-900">{equipmentLike ? item.physicalCount ?? "—" : `${item.remainingBoxes} box / ${item.remainingPieces} ${item.unit}`}</td>
                    <td className="px-4 py-3">
                      {supportsExpiry ? <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${expiryTone(item.expiryStatus)}`}>{item.expirationDate}</span> : <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${stockTone(equipmentLike && item.functionalStatus === "NF" ? "Out of stock" : item.status)}`}>{equipmentLike ? item.functionalStatus : item.status}</span>}
                    </td>
                  </tr>
                ))}
                {ledger.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                      No {categoryLabel.toLowerCase()} found for this view.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedItem ? <InventoryItemModal item={selectedItem} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}
