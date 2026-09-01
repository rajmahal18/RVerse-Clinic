import { PatientGender } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { MeasurementFields } from "@/components/patients/measurement-fields";
import { CsrfField } from "@/components/security/csrf-field";
import { AGENCIES } from "@/data/agencies";

type PatientFormValues = {
  patientId?: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  contactNo?: string;
  agency?: string;
  designation?: string;
  civilStatus?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  primaryContact?: string;
  medicalHistory?: string;
  vaccineHistory?: string;
  allergy?: string;
  maintenance?: string;
  additionalMedicalInformation?: string;
};

function SectionLabel({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b pb-2 md:col-span-2">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">{title}</p>
      {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
    </div>
  );
}

export function PatientForm({
  action,
  values,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  values?: PatientFormValues;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4 rounded-2xl border bg-white p-4 shadow-soft md:grid-cols-2 md:p-5">
      <CsrfField />
      {values?.patientId ? <input type="hidden" name="patientId" value={values.patientId} /> : null}

      <SectionLabel title="Personal information" description="Basic identity and contact details." />

      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        Last name
        <input name="lastName" defaultValue={values?.lastName} className="h-10 rounded-xl border px-3 font-normal" required />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        First name
        <input name="firstName" defaultValue={values?.firstName} className="h-10 rounded-xl border px-3 font-normal" required />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        Middle name
        <input name="middleName" defaultValue={values?.middleName} className="h-10 rounded-xl border px-3 font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        Birth date
        <input name="birthDate" type="date" defaultValue={values?.birthDate} className="h-10 rounded-xl border px-3 font-normal" required />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        Gender
        <select name="gender" defaultValue={values?.gender ?? PatientGender.FEMALE} className="h-10 rounded-xl border bg-white px-3 font-normal">
          <option value={PatientGender.FEMALE}>Female</option>
          <option value={PatientGender.MALE}>Male</option>
          <option value={PatientGender.OTHER}>Other</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        Contact number
        <input name="contactNo" defaultValue={values?.contactNo} className="h-10 rounded-xl border px-3 font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2">
        Address
        <input name="address" defaultValue={values?.address} className="h-10 rounded-xl border px-3 font-normal" />
      </label>

      <SectionLabel title="Employment" description="Office assignment and basic employment details." />

      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        Agency / Office
        <select name="agency" defaultValue={values?.agency} className="h-10 rounded-xl border bg-white px-3 font-normal">
          <option value="">Select agency / office</option>
          {values?.agency && !(AGENCIES as readonly string[]).includes(values.agency) ? <option value={values.agency}>{values.agency}</option> : null}
          {AGENCIES.map((agency) => <option key={agency} value={agency}>{agency}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        Designation
        <input name="designation" defaultValue={values?.designation} className="h-10 rounded-xl border px-3 font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        Civil status
        <select name="civilStatus" defaultValue={values?.civilStatus ?? "SINGLE"} className="h-10 rounded-xl border bg-white px-3 font-normal">
          <option value="SINGLE">Single</option>
          <option value="MARRIED">Married</option>
          <option value="WIDOWED">Widowed</option>
          <option value="SEPARATED">Separated</option>
          <option value="DIVORCED">Divorced</option>
        </select>
      </label>

      <MeasurementFields initialHeightCm={values?.heightCm} initialWeightKg={values?.weightKg} />

      <SectionLabel title="Medical information" description="Relevant history and information used during clinic visits." />

      {[
        ["primaryContact", "Primary Contact", values?.primaryContact],
        ["allergy", "Allergy", values?.allergy],
        ["maintenance", "Maintenance", values?.maintenance],
        ["vaccineHistory", "Vaccine History", values?.vaccineHistory],
        ["medicalHistory", "Medical History", values?.medicalHistory],
        ["additionalMedicalInformation", "Additional Medical Information", values?.additionalMedicalInformation],
      ].map(([name, label, fieldValue]) => (
        <label key={name} className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-1">
          {label}
          <textarea name={name} defaultValue={fieldValue} className="min-h-20 rounded-xl border px-3 py-2 font-normal" />
        </label>
      ))}

      <div className="flex justify-end border-t pt-4 md:col-span-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
