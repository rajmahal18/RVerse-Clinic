import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";
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
      <PageHeader title="Generated Forms" />
      <section className="overflow-hidden rounded-2xl border bg-white shadow-soft">
        <div className="border-b bg-slate-50 px-4 py-3">
          <h2 className="font-black text-slate-900">{data.patient.fullName}</h2>
          <p className="text-sm text-slate-500">Select a form to preview, print, or save as PDF.</p>
        </div>
        <div className="divide-y-8 divide-slate-100 bg-slate-100 lg:divide-y lg:divide-slate-200 lg:bg-white">
          {clinicForms.map((form) => {
            const disabled = form.scope === "visit" && !data.selectedVisit;

            return (
              <Link
                key={form.slug}
                href={disabled ? "#" : `/patients/${id}/forms/${form.slug}`}
                aria-disabled={disabled}
                className={`flex items-center gap-3 border-y border-slate-200 bg-white px-4 py-4 shadow-sm transition lg:border-y-0 lg:shadow-none ${disabled ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-900">{form.title}</p>
                  <p className="text-sm text-slate-500">{form.scope === "patient" ? "Patient-level form" : "Consultation-level form"}</p>
                </div>
                {disabled ? <Badge className="bg-slate-100 text-slate-600">No visit</Badge> : <ArrowRight className="h-4 w-4 text-slate-400" />}
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
