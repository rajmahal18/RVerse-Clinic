"use client";

import { useMemo, useState } from "react";

type HeightUnit = "cm" | "ft";
type WeightUnit = "kg" | "lbs";

function bmiLabel(bmi: number) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy range";
  if (bmi < 30) return "Overweight";
  return "Obesity range";
}

export function MeasurementFields({
  initialHeightCm,
  initialWeightKg,
}: {
  initialHeightCm?: number | null;
  initialWeightKg?: number | null;
}) {
  const [height, setHeight] = useState(initialHeightCm?.toString() ?? "");
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [weight, setWeight] = useState(initialWeightKg?.toString() ?? "");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");

  const bmi = useMemo(() => {
    const heightValue = Number(height);
    const weightValue = Number(weight);
    if (!(heightValue > 0) || !(weightValue > 0)) return null;

    const heightMeters = (heightUnit === "cm" ? heightValue : heightValue * 30.48) / 100;
    const weightKg = weightUnit === "kg" ? weightValue : weightValue * 0.45359237;
    return weightKg / heightMeters ** 2;
  }, [height, heightUnit, weight, weightUnit]);

  return (
    <section className="grid gap-4 border-y border-slate-100 py-4 md:col-span-2">
      <div>
        <h2 className="text-sm font-black text-slate-900">Measurements</h2>
        <p className="text-xs text-slate-500">Enter both values to calculate BMI automatically.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_180px]">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Height
          <span className="flex min-w-0">
            <input
              name="heightValue"
              type="number"
              min="0"
              step="0.01"
              value={height}
              onChange={(event) => setHeight(event.target.value)}
              className="min-w-0 flex-1 rounded-l-xl border px-3 py-2 font-normal"
              placeholder={heightUnit === "cm" ? "e.g. 165" : "e.g. 5.5"}
            />
            <select
              name="heightUnit"
              value={heightUnit}
              onChange={(event) => setHeightUnit(event.target.value as HeightUnit)}
              className="rounded-r-xl border border-l-0 bg-slate-50 px-3 py-2 font-normal"
              aria-label="Height unit"
            >
              <option value="cm">cm</option>
              <option value="ft">ft</option>
            </select>
          </span>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Weight
          <span className="flex min-w-0">
            <input
              name="weightValue"
              type="number"
              min="0"
              step="0.01"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className="min-w-0 flex-1 rounded-l-xl border px-3 py-2 font-normal"
              placeholder={weightUnit === "kg" ? "e.g. 60" : "e.g. 132"}
            />
            <select
              name="weightUnit"
              value={weightUnit}
              onChange={(event) => setWeightUnit(event.target.value as WeightUnit)}
              className="rounded-r-xl border border-l-0 bg-slate-50 px-3 py-2 font-normal"
              aria-label="Weight unit"
            >
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </span>
        </label>
        <div className="rounded-xl bg-teal-50 px-4 py-3" aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">BMI</p>
          <p className="mt-1 text-xl font-black text-teal-950">{bmi ? bmi.toFixed(1) : "—"}</p>
          <p className="text-xs font-semibold text-teal-700">{bmi ? bmiLabel(bmi) : "Awaiting measurements"}</p>
        </div>
      </div>
    </section>
  );
}
