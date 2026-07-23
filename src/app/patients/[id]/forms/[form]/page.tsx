import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ClinicFormTemplate } from "@/components/clinic-forms/form-templates";
import { PrintActions } from "@/components/clinic-forms/print-actions";
import { Button } from "@/components/ui/button";
import { clinicFormFilename, clinicForms, getClinicFormData, type ClinicFormSlug } from "@/lib/clinic-forms";

function isClinicFormSlug(value: string): value is ClinicFormSlug {
  return clinicForms.some((form) => form.slug === value);
}

export default async function ClinicFormPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; form: string }>;
  searchParams?: Promise<{ visitId?: string }>;
}) {
  const { id, form } = await params;
  const resolvedSearchParams = await searchParams;

  if (!isClinicFormSlug(form)) {
    notFound();
  }

  const data = await getClinicFormData(id, resolvedSearchParams?.visitId);

  if (!data) {
    notFound();
  }

  const formConfig = clinicForms.find((item) => item.slug === form);
  const filename = clinicFormFilename(form, data);

  return (
    <main className="clinic-print-screen">
      <div className="no-print mx-auto mb-4 flex w-[min(100%,210mm)] flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-500">Print Preview</p>
            <h1 className="text-xl font-black text-slate-950">{formConfig?.title}</h1>
          </div>
          <Button asChild variant="outline">
            <Link href={`/patients/${id}/forms`}>
              <ArrowLeft className="h-4 w-4" /> Forms
            </Link>
          </Button>
        </div>
        <PrintActions filename={filename} />
      </div>
      <ClinicFormTemplate form={form} data={data} />
    </main>
  );
}
