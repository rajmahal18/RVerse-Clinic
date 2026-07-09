import { PatientGender } from "@prisma/client";
import { Button } from "@/components/ui/button";

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
        Agency
        <input name="agency" defaultValue={values?.agency} className="rounded-xl border px-3 py-2 font-normal" />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Designation
        <input name="designation" defaultValue={values?.designation} className="rounded-xl border px-3 py-2 font-normal" />
      </label>
      <div className="md:col-span-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
