"use client";

import { useState } from "react";

export function VaccinationFields({ vaccines }: { vaccines: { id: string; name: string }[] }) {
  const [vaccine, setVaccine] = useState(vaccines[0]?.name ?? "");
  const [dose, setDose] = useState("1st dose");

  return (
    <>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Name of vaccine
        <select name="vaccine" value={vaccine} onChange={(event) => setVaccine(event.target.value)} className="h-10 rounded-xl border px-3 font-normal">
          {vaccines.map((option) => (
            <option key={option.id} value={option.name}>{option.name}</option>
          ))}
        </select>
      </label>
      {vaccine.toLowerCase() === "hpv" ? (
        <div className="grid gap-3 rounded-xl bg-violet-50 p-3">
          <label className="grid gap-2 text-sm font-semibold text-violet-950">
            HPV dose
            <select name="dose" value={dose} onChange={(event) => setDose(event.target.value)} className="h-10 rounded-xl border bg-white px-3 font-normal">
              <option value="1st dose">1st dose</option>
              <option value="2nd dose">2nd dose</option>
              <option value="3rd dose">3rd dose</option>
              <option value="Other">Other</option>
            </select>
          </label>
          {dose === "Other" ? (
            <label className="grid gap-2 text-sm font-semibold text-violet-950">
              Please specify
              <input name="doseOther" required className="h-10 rounded-xl border bg-white px-3 font-normal" />
            </label>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
