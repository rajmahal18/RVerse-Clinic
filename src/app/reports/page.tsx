import { ArrowRight, BarChart3, ClipboardList, FileHeart, Syringe } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";

const reportGroups = [
  {
    title: "Assessment Reports",
    description: "Consultation entries, vital signs, diagnosis, and treatment records.",
    icon: ClipboardList,
    tone: "bg-teal-50 text-teal-700",
  },
  {
    title: "Medicine Reports",
    description: "Medicine requests, releases, stock movement, and inventory usage.",
    icon: FileHeart,
    tone: "bg-blue-50 text-blue-700",
    href: "/reports/medicines",
  },
  {
    title: "Vaccination Reports",
    description: "Vaccination entries, dose details, next schedules, and attending staff.",
    icon: Syringe,
    tone: "bg-emerald-50 text-emerald-700",
  },
];

export default function ReportsPage() {
  return (
    <AppShell>
      <PageHeader title="Reports" />
      <section className="overflow-hidden rounded-2xl border bg-white shadow-soft">
        <div className="flex items-center gap-3 border-b bg-slate-50/70 px-4 py-4 md:px-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-900">Clinic Reports</h3>
            <p className="mt-0.5 text-sm text-slate-500">Open an available report to review operational records and trends.</p>
          </div>
        </div>
        <div className="grid divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {reportGroups.map((report) => {
            const Icon = report.icon;
            const content = (
              <>
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${report.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-black text-slate-900">{report.title}</h4>
                    {!report.href ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">Not available yet</span> : null}
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">{report.description}</p>
                </div>
                {report.href ? <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-primary" /> : null}
              </>
            );

            return report.href ? (
              <Link key={report.title} href={report.href} className="group flex min-w-0 items-start gap-3 px-4 py-5 transition hover:bg-slate-50 md:px-5">
                {content}
              </Link>
            ) : (
              <div key={report.title} className="flex min-w-0 items-start gap-3 px-4 py-5 md:px-5">
                {content}
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
