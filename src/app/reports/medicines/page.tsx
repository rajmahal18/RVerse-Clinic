import Link from "next/link";
import { ArrowLeft, FileHeart, PackageSearch } from "lucide-react";
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
      <PageHeader
        title="Medicine Reports"
        actions={
          <Link href="/reports" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" /> Reports
          </Link>
        }
      />
      <div className="space-y-5">
        <section className="overflow-hidden rounded-2xl border bg-white shadow-soft">
          <div className="flex flex-col gap-4 border-b bg-slate-50/70 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><FileHeart className="h-5 w-5" /></div>
              <div>
                <h2 className="font-black text-slate-900">Medicine stock movement</h2>
                <p className="mt-0.5 text-sm text-slate-500">{report.rangeLabel}</p>
              </div>
            </div>
            <nav className="flex max-w-full gap-1 overflow-x-auto border-b" aria-label="Medicine report period">
              {periods.map((option) => (
                <Link
                  key={option.value}
                  href={`/reports/medicines?period=${option.value}&category=${selectedCategory}`}
                  className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-bold transition ${selectedPeriod === option.value ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-900"}`}
                >
                  {option.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Metric label="Stock in" value={report.totals.stockIn} tone="text-emerald-700" />
            <Metric label="Stock out" value={report.totals.stockOut} tone="text-blue-700" />
            <Metric label="Movement entries" value={report.totals.movementCount} tone="text-slate-900" />
          </div>
        </section>

        {frequencyReport ? (
          <section className="overflow-hidden rounded-2xl border bg-white shadow-soft">
            <div className="flex flex-col gap-4 border-b bg-slate-50/70 px-4 py-4 xl:flex-row xl:items-center xl:justify-between xl:px-5">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-primary"><PackageSearch className="h-5 w-5" /></div>
                <div>
                  <h2 className="font-black text-slate-900">Item request and release frequency</h2>
                  <p className="mt-0.5 text-sm text-slate-500">{frequencyReport.rangeLabel}</p>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <nav className="flex max-w-full gap-1 overflow-x-auto border-b" aria-label="Frequency report period">
                  {periods.map((option) => (
                    <Link key={option.value} href={`/reports/medicines?period=${option.value}&category=${selectedCategory}`} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-bold ${selectedPeriod === option.value ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-900"}`}>{option.label}</Link>
                  ))}
                </nav>
                <nav className="flex max-w-full gap-1 overflow-x-auto border-b" aria-label="Frequency report category">
                  {categories.map((option) => (
                    <Link key={option.value} href={`/reports/medicines?period=${selectedPeriod}&category=${option.value}`} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-bold ${selectedCategory === option.value ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-900"}`}>{option.label}</Link>
                  ))}
                </nav>
              </div>
            </div>
            <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <Metric label="Request frequency" value={frequencyReport.totals.requestCount} tone="text-slate-900" />
              <Metric label="Quantity released / used" value={frequencyReport.totals.quantityReleased} tone="text-blue-700" />
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Current Stock</th>
                    <th className="px-4 py-3 text-right">Requests</th>
                    <th className="px-4 py-3 text-right">Released / Used</th>
                    <th className="px-4 py-3 text-right">Avg / Request</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {frequencyReport.rows.map((row) => (
                    <tr key={row.itemId} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">{row.item}</td>
                      <td className="px-4 py-3 text-slate-600">{row.category}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.currentStock.toLocaleString()} {row.unit}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">{row.requestCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-blue-700">{row.quantityReleased.toLocaleString()} {row.unit}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.averageReleasedPerRequest.toFixed(1)} {row.unit}</td>
                    </tr>
                  ))}
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

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="px-4 py-4 md:px-5">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-black tabular-nums ${tone}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function ReportTable({ report }: { report: Awaited<ReturnType<typeof getMedicineReportData>> }) {
  return (
    <>
      <section className="overflow-hidden rounded-2xl border bg-white shadow-soft">
        <div className="border-b bg-slate-50/70 px-4 py-3 md:px-5">
          <h2 className="font-black text-slate-900">Medicine movement by period</h2>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
              <tr><th className="px-4 py-3">Period</th><th className="px-4 py-3 text-right">Stock in</th><th className="px-4 py-3 text-right">Stock out</th><th className="px-4 py-3 text-right">Entries</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.map((row) => (
                <tr key={row.start} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.label}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">{row.stockIn.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-blue-700">{row.stockOut.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.movementCount.toLocaleString()}</td>
                </tr>
              ))}
              {report.rows.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No medicine movement recorded for this period.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-soft">
        <div className="border-b bg-slate-50/70 px-4 py-3 md:px-5">
          <h2 className="font-black text-slate-900">History of newly added medicines</h2>
          <p className="mt-0.5 text-sm text-slate-500">New stock received entries only. Existing stock encoded is excluded.</p>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Medicine</th><th className="px-4 py-3">Dosage / Brand</th><th className="px-4 py-3">Batch</th><th className="px-4 py-3">Expiration</th><th className="px-4 py-3 text-right">Quantity</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.newStockHistory.map((entry) => (
                <tr key={entry.id} className="transition hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{entry.date}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{entry.medicine}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.dosage} / {entry.brandName}</td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-slate-600">{entry.batch}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.expirationDate}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700">{entry.quantity.toLocaleString()} {entry.unit}</td>
                </tr>
              ))}
              {report.newStockHistory.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No newly added medicine stock recorded for this period.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
