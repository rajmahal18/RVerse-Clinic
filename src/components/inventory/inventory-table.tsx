import { inventoryItems } from "@/data/clinic";
import { Badge } from "@/components/ui/badge";

export function InventoryTable() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-soft">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>{['Item','Category','Stock','Unit','Reorder Level','Status'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {inventoryItems.map((item) => (
              <tr key={item.item} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold">{item.item}</td>
                <td className="px-4 py-3">{item.category}</td>
                <td className="px-4 py-3">{item.stock}</td>
                <td className="px-4 py-3">{item.unit}</td>
                <td className="px-4 py-3">{item.reorder}</td>
                <td className="px-4 py-3"><Badge className={item.status === 'Low stock' ? 'bg-rose-50 text-rose-700' : item.status === 'Watch' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}>{item.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
