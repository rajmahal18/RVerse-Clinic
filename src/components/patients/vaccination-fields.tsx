"use client";

import { useEffect, useRef, useState } from "react";

export function VaccinationFields({
  vaccines,
}: {
  vaccines: { id: string; name: string }[];
}) {
  const ref = useRef<HTMLSelectElement>(null);
  const [vaccine, setVaccine] = useState("");
  const [dose, setDose] = useState("1st dose");
  useEffect(() => {
    const form = ref.current?.closest("form");
    const restore = (event: Event) => {
      const data = (event as CustomEvent<Record<string, string[]>>).detail;
      if (data.vaccine) setVaccine(data.vaccine[0]);
      if (data.dose) setDose(data.dose[0]);
    };
    form?.addEventListener("restore-draft", restore);
    return () => form?.removeEventListener("restore-draft", restore);
  }, []);

  return (
    <>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Name of vaccine
        <select
          ref={ref}
          name="vaccine"
          required
          value={vaccine}
          onChange={(event) => setVaccine(event.target.value)}
          className="h-10 min-w-0 rounded-xl border px-3 font-normal"
        >
          <option value="">Select vaccine</option>
          {vaccines.map((option) => (
            <option key={option.id} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      {vaccine ? (
        <div className="grid gap-3 rounded-xl bg-violet-50 p-3">
          <label className="grid gap-2 text-sm font-semibold text-violet-950">
            Dose
            <select name="dose" value={dose} onChange={(event) => setDose(event.target.value)} className="h-10 rounded-xl border bg-white px-3 font-normal">
              <option value="1st dose">1st dose</option>
              <option value="2nd dose">2nd dose</option>
              <option value="3rd dose">3rd dose</option>
              <option value="Booster">Booster</option>
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
