import type { InventoryLedgerData } from "@/lib/patient-view";
import { MonthSelectForm } from "@/components/search/month-select-form";

export function InventoryTable({
  ledger,
  searchQuery,
}: {
  ledger: InventoryLedgerData;
  searchQuery: string;
}) {
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
          </div>
          <MonthSelectForm action="/inventory" selectedMonth={ledger.selectedMonth} options={ledger.monthOptions} searchQuery={searchQuery} />
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border bg-white shadow-soft">
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
                <th colSpan={5} className="border-b bg-blue-500 px-4 py-4 text-white">
                  {ledger.selectedMonthLabel}
                </th>
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
                <tr key={item.id} className={index % 2 === 0 ? "bg-[#f8ecd9]" : "bg-[#eef5e5]"}>
                  <td className="border-b border-r px-4 py-3 font-bold text-slate-900">{item.item}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.dosage}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.brandName}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.category}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.pcsPerBox}</td>
                  <td className="border-b border-r px-4 py-3 text-center text-slate-700">{item.expirationDate}</td>
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
    </div>
  );
}
