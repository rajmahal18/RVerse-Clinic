import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { clinicForms, getClinicFormData } from "@/lib/clinic-forms";

export default async function PatientFormsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClinicFormData(id);

  if (!data) {
    notFound();
  }

  return (
    <AppShell>
      <PageHeader
        title="Clinic Forms"
        actions={
          <Link href={`/patients/${id}`} className="inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" /> Patient Profile
          </Link>
        }
      />
      <section className="overflow-hidden rounded-2xl border bg-white shadow-soft">
        <div className="flex flex-col gap-2 border-b bg-slate-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">Patient</p>
            <h2 className="mt-0.5 font-black text-slate-900">{data.patient.fullName}</h2>
            <p className="mt-0.5 text-sm text-slate-500">Preview, print, or save available clinic forms as PDF.</p>
          </div>
          {data.selectedVisit ? (
            <Badge className="w-fit bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Visit selected</Badge>
          ) : (
            <Badge className="w-fit bg-slate-100 text-slate-600">No visit selected</Badge>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {clinicForms.map((form) => {
            const disabled = form.scope === "visit" && !data.selectedVisit;

            return (
              <Link
                key={form.slug}
                href={disabled ? "#" : `/patients/${id}/forms/${form.slug}`}
                aria-disabled={disabled}
                className={`group flex items-center gap-3 px-4 py-3.5 transition md:px-5 ${disabled ? "pointer-events-none opacity-45" : "hover:bg-slate-50"}`}
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{form.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{form.scope === "patient" ? "Patient record" : "Current visit record"}</p>
                </div>
                {disabled ? (
                  <Badge className="bg-slate-100 text-slate-600">Requires visit</Badge>
                ) : (
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
