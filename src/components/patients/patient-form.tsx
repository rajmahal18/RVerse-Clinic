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
    <form action={action} className="grid gap-4 rounded-[28px] border bg-white p-5 shadow-soft md:grid-cols-2">
      <CsrfField />
      {values?.patientId ? <input type="hidden" name="patientId" value={values.patientId} /> : null}
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Last name
        <input name="lastName" defaultValue={values?.lastName} className="rounded-xl border px-3 py-2 font-normal" required />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        First name
        <input name="firstName" defaultValue={values?.firstName} className="rounded-xl border px-3 py-2 font-normal" required />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Middle name
        <input name="middleName" defaultValue={values?.middleName} className="rounded-xl border px-3 py-2 font-normal" />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Birth date
        <input name="birthDate" type="date" defaultValue={values?.birthDate} className="rounded-xl border px-3 py-2 font-normal" required />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Gender
        <select name="gender" defaultValue={values?.gender ?? PatientGender.FEMALE} className="rounded-xl border px-3 py-2 font-normal">
          <option value={PatientGender.FEMALE}>Female</option>
          <option value={PatientGender.MALE}>Male</option>
          <option value={PatientGender.OTHER}>Other</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Contact number
        <input name="contactNo" defaultValue={values?.contactNo} className="rounded-xl border px-3 py-2 font-normal" />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
        Address
        <input name="address" defaultValue={values?.address} className="rounded-xl border px-3 py-2 font-normal" />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Agency / Office
        <select name="agency" defaultValue={values?.agency} className="rounded-xl border px-3 py-2 font-normal">
          <option value="">Select agency / office</option>
          {values?.agency && !(AGENCIES as readonly string[]).includes(values.agency) ? <option value={values.agency}>{values.agency}</option> : null}
          {AGENCIES.map((agency) => <option key={agency} value={agency}>{agency}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Designation
        <input name="designation" defaultValue={values?.designation} className="rounded-xl border px-3 py-2 font-normal" />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Civil status
        <select name="civilStatus" defaultValue={values?.civilStatus ?? "SINGLE"} className="rounded-xl border px-3 py-2 font-normal">
          <option value="SINGLE">Single</option>
          <option value="MARRIED">Married</option>
          <option value="WIDOWED">Widowed</option>
          <option value="SEPARATED">Separated</option>
          <option value="DIVORCED">Divorced</option>
        </select>
      </label>
      <MeasurementFields initialHeightCm={values?.heightCm} initialWeightKg={values?.weightKg} />
      <div className="grid gap-4 border-t pt-4 md:col-span-2 md:grid-cols-2">
        {[
          ["primaryContact", "Primary Contact", values?.primaryContact],
          ["allergy", "Allergy", values?.allergy],
          ["maintenance", "Maintenance", values?.maintenance],
          ["vaccineHistory", "Vaccine History", values?.vaccineHistory],
          ["medicalHistory", "Medical History", values?.medicalHistory],
          ["additionalMedicalInformation", "Additional Medical Information", values?.additionalMedicalInformation],
        ].map(([name, label, value]) => (
          <label key={name} className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-1">
            {label}
            <textarea name={name} defaultValue={value} className="min-h-20 rounded-xl border px-3 py-2 font-normal" />
          </label>
        ))}
      </div>
      <div className="md:col-span-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
