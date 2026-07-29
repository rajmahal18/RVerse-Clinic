import { BarChart3, ClipboardList, FileHeart, Syringe } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";

const reportGroups = [
  {
    title: "Assessment Reports",
    description: "Review consultation entries, vital signs, diagnosis, and treatment records.",
    icon: ClipboardList,
    tone: "bg-teal-50 text-teal-700",
  },
  {
    title: "Medicine Reports",
    description: "Review medicine requests, releases, stock movement, and inventory usage.",
    icon: FileHeart,
    tone: "bg-blue-50 text-blue-700",
  },
  {
    title: "Vaccination Reports",
    description: "Review vaccination entries, dose details, next schedules, and attending staff.",
    icon: Syringe,
    tone: "bg-emerald-50 text-emerald-700",
  },
];

export default function ReportsPage() {
  return (
    <AppShell>
      <PageHeader title="Reports" />
      <section className="border bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b bg-slate-50 px-4 py-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-900">Clinic Reports</h3>
            <p className="text-sm text-slate-500">Select a report category to review clinic records.</p>
          </div>
        </div>
        <div className="grid divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {reportGroups.map((report) => {
            const Icon = report.icon;

            return (
              <div key={report.title} className="min-w-0 px-4 py-5">
                <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${report.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="font-black text-slate-900">{report.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-500">{report.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
