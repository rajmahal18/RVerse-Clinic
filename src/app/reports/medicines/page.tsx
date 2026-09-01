import Link from "next/link";
import { ArrowLeft, FileHeart } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getMedicineReportData, getSupplyFrequencyReportData, type MedicineReportPeriod } from "@/lib/patient-view";

const periods: { value: MedicineReportPeriod; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUAL", label: "Annual" },
];

const categories = [
  { value: "all", label: "All tracked items" },
  { value: "MEDICINE", label: "Medicine" },
  { value: "SUPPLY", label: "Medical Supplies" },
  { value: "OFFICE_SUPPLY", label: "Office Supplies" },
];

export default async function MedicineReportsPage({ searchParams }: { searchParams?: Promise<{ period?: string; category?: string }> }) {
  const params = await searchParams;
  const selectedPeriod = periods.some((option) => option.value === params?.period)
    ? params?.period as MedicineReportPeriod
    : "MONTHLY";
  const selectedCategory = categories.some((option) => option.value === params?.category) ? params?.category ?? "all" : "all";
  const currentUser = await getCurrentUser();
  const [report, frequencyReport] = await Promise.all([
    getMedicineReportData(selectedPeriod, currentUser?.clinicId),
    currentUser ? getSupplyFrequencyReportData(currentUser.clinicId, selectedPeriod, selectedCategory) : Promise.resolve(null),
  ]);

  return (
    <AppShell>
      <PageHeader title="Medicine Reports" actions={<Link href="/reports" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"><ArrowLeft className="h-4 w-4" /> Reports</Link>} />
      <div className="space-y-5">
        <section className="border bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700"><FileHeart className="h-5 w-5" /></div>
              <div><h2 className="font-black text-slate-900">Medicine movement report</h2><p className="text-sm text-slate-500">{report.rangeLabel}</p></div>
            </div>
            <nav className="flex max-w-full gap-1 overflow-x-auto border-b" aria-label="Medicine report period">
              {periods.map((option) => <Link key={option.value} href={`/reports/medicines?period=${option.value}`} className={`whitespace-nowrap px-3 py-2 text-sm font-bold ${selectedPeriod === option.value ? "border-b-2 border-primary text-primary" : "text-slate-500 hover:text-slate-900"}`}>{option.label}</Link>)}
            </nav>
          </div>
          <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="px-4 py-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Stock in</p><p className="mt-1 text-2xl font-black text-emerald-700">{report.totals.stockIn.toLocaleString()}</p></div>
            <div className="px-4 py-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Stock out</p><p className="mt-1 text-2xl font-black text-blue-700">{report.totals.stockOut.toLocaleString()}</p></div>
            <div className="px-4 py-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Movement entries</p><p className="mt-1 text-2xl font-black text-slate-900">{report.totals.movementCount.toLocaleString()}</p></div>
          </div>
        </section>
        {frequencyReport ? (
          <section className="overflow-hidden border bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b bg-slate-50 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
              <div><h2 className="font-black text-slate-900">Item request and release frequency</h2><p className="text-sm text-slate-500">{frequencyReport.rangeLabel}</p></div>
              <div className="grid gap-2 md:grid-cols-2">
                <nav className="flex max-w-full gap-1 overflow-x-auto border-b" aria-label="Frequency report period">
                  {periods.map((option) => <Link key={option.value} href={`/reports/medicines?period=${option.value}&category=${selectedCategory}`} className={`whitespace-nowrap px-3 py-2 text-sm font-bold ${selectedPeriod === option.value ? "border-b-2 border-primary text-primary" : "text-slate-500 hover:text-slate-900"}`}>{option.label}</Link>)}
                </nav>
                <nav className="flex max-w-full gap-1 overflow-x-auto border-b" aria-label="Frequency report category">
                  {categories.map((option) => <Link key={option.value} href={`/reports/medicines?period=${selectedPeriod}&category=${option.value}`} className={`whitespace-nowrap px-3 py-2 text-sm font-bold ${selectedCategory === option.value ? "border-b-2 border-primary text-primary" : "text-slate-500 hover:text-slate-900"}`}>{option.label}</Link>)}
                </nav>
              </div>
            </div>
            <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="px-4 py-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Request frequency</p><p className="mt-1 text-2xl font-black text-slate-900">{frequencyReport.totals.requestCount.toLocaleString()}</p></div>
              <div className="px-4 py-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Quantity released / used</p><p className="mt-1 text-2xl font-black text-blue-700">{frequencyReport.totals.quantityReleased.toLocaleString()}</p></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Current Stock</th><th className="px-4 py-3">Requests</th><th className="px-4 py-3">Released / Used</th><th className="px-4 py-3">Avg Released / Request</th></tr>
                </thead>
                <tbody className="divide-y">
                  {frequencyReport.rows.map((row) => <tr key={row.itemId}><td className="px-4 py-3 font-semibold text-slate-900">{row.item}</td><td className="px-4 py-3 text-slate-600">{row.category}</td><td className="px-4 py-3">{row.currentStock.toLocaleString()} {row.unit}</td><td className="px-4 py-3 font-bold">{row.requestCount.toLocaleString()}</td><td className="px-4 py-3 font-bold text-blue-700">{row.quantityReleased.toLocaleString()} {row.unit}</td><td className="px-4 py-3">{row.averageReleasedPerRequest.toFixed(1)} {row.unit}</td></tr>)}
                  {frequencyReport.rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No request or release activity for this period.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
        <ReportTable report={report} />
      </div>
    </AppShell>
  );
}

function ReportTable({ report }: { report: Awaited<ReturnType<typeof getMedicineReportData>> }) {
  return <>
    <section className="overflow-hidden border bg-white shadow-sm">
      <div className="border-b px-4 py-3"><h2 className="font-black text-slate-900">Medicine movement by period</h2></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Period</th><th className="px-4 py-3">Stock in</th><th className="px-4 py-3">Stock out</th><th className="px-4 py-3">Entries</th></tr></thead><tbody className="divide-y">{report.rows.map((row) => <tr key={row.start}><td className="px-4 py-3 font-semibold text-slate-900">{row.label}</td><td className="px-4 py-3 text-emerald-700">{row.stockIn.toLocaleString()}</td><td className="px-4 py-3 text-blue-700">{row.stockOut.toLocaleString()}</td><td className="px-4 py-3 text-slate-600">{row.movementCount.toLocaleString()}</td></tr>)}{report.rows.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No medicine movement recorded for this period.</td></tr> : null}</tbody></table></div>
    </section>
    <section className="overflow-hidden border bg-white shadow-sm">
      <div className="border-b px-4 py-3"><h2 className="font-black text-slate-900">History of newly added medicines</h2><p className="text-sm text-slate-500">New stock received entries only. Existing stock encoded is excluded.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Medicine</th><th className="px-4 py-3">Dosage / Brand</th><th className="px-4 py-3">Batch</th><th className="px-4 py-3">Expiration</th><th className="px-4 py-3">Quantity</th></tr></thead><tbody className="divide-y">{report.newStockHistory.map((entry) => <tr key={entry.id}><td className="whitespace-nowrap px-4 py-3 text-slate-600">{entry.date}</td><td className="px-4 py-3 font-semibold text-slate-900">{entry.medicine}</td><td className="px-4 py-3 text-slate-600">{entry.dosage} / {entry.brandName}</td><td className="max-w-[12rem] truncate px-4 py-3 text-slate-600">{entry.batch}</td><td className="px-4 py-3 text-slate-600">{entry.expirationDate}</td><td className="px-4 py-3 font-bold text-emerald-700">{entry.quantity.toLocaleString()} {entry.unit}</td></tr>)}{report.newStockHistory.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No newly added medicine stock recorded for this period.</td></tr> : null}</tbody></table></div>
    </section>
  </>;
}
