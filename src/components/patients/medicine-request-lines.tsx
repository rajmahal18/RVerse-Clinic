"use client";

import { useEffect, useRef, useState } from "react";
import { MedicineScheduleFields } from "./medicine-schedule-fields";
import { Button } from "@/components/ui/button";
import { formatDateKey } from "@/lib/date-time";

type Option = {
  id: string;
  name: string;
  dosage: string | null;
  brandName: string | null;
  expirationDate: Date | null;
  stock: number;
  unit: string;
};

function MedicineLine({
  index,
  options,
  remove,
  removable,
  restored,
}: {
  restored: Record<string, string[]>;
  index: number;
  options: Option[];
  remove: () => void;
  removable: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(
    restored[`line:${index}:inventoryItemId`]?.[0] ?? "",
  );
  useEffect(() => {
    setSelected(restored[`line:${index}:inventoryItemId`]?.[0] ?? "");
  }, [restored, index]);
  const matches = options.filter((item) =>
    `${item.name} ${item.brandName ?? ""} ${item.dosage ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <fieldset className="grid min-w-0 gap-3 border-b pb-4">
      <legend className="mb-2 font-semibold">Medicine {index + 1}</legend>
      <label className="grid gap-1 text-sm">
        Search generic name, brand, or dosage
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 w-full min-w-0 rounded-lg border px-3"
          placeholder="Type to filter medicines"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Available batches — earliest expiry first
        <select
          name={`line:${index}:inventoryItemId`}
          required
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="h-11 w-full min-w-0 rounded-lg border px-2"
        >
          <option value="">Select medicine ({matches.length} matches)</option>
          {options
            .filter((item) => item.id === selected || matches.includes(item))
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} {item.dosage} / {item.brandName || "No brand"} / Exp{" "}
                {item.expirationDate
                  ? formatDateKey(item.expirationDate)
                  : "N/A"}{" "}
                / {item.stock} {item.unit}
              </option>
            ))}
        </select>
      </label>
      {!matches.length && (
        <p className="text-sm text-slate-500">
          No available medicine matches your search.
        </p>
      )}
      <label className="grid gap-1 text-sm">
        Quantity
        <input
          name={`line:${index}:quantity`}
          defaultValue={restored[`line:${index}:quantity`]?.[0]}
          type="number"
          min="1"
          step="1"
          required
          className="h-10 min-w-0 rounded-lg border px-3"
        />
      </label>
      <MedicineScheduleFields
        initialValues={restored}
        prefix={`line:${index}:`}
      />
      <label className="grid gap-1 text-sm">
        Remarks
        <textarea
          name={`line:${index}:remarks`}
          defaultValue={restored[`line:${index}:remarks`]?.[0]}
          className="min-w-0 rounded-lg border p-2"
        />
      </label>
      {removable && (
        <Button type="button" variant="ghost" onClick={remove}>
          Remove medicine
        </Button>
      )}
    </fieldset>
  );
}

export function MedicineRequestLines({ options }: { options: Option[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [restored, setRestored] = useState<Record<string, string[]>>({});
  useEffect(() => {
    const form = ref.current?.closest("form");
    const restore = (event: Event) => {
      const data = (event as CustomEvent<Record<string, string[]>>).detail;
      const indices = [
        ...new Set(
          Object.keys(data)
            .filter((key) => /^line:\d+:inventoryItemId$/.test(key))
            .map((key) => Number(key.split(":")[1])),
        ),
      ];
      if (indices.length) {
        setLines(indices);
        setNext(Math.max(...indices) + 1);
        setRestored(data);
      } else if (data.inventoryItemId) {
        const migrated = Object.fromEntries(
          Object.entries(data).map(([key, value]) => [`line:0:${key}`, value]),
        );
        setRestored(migrated);
      }
    };
    form?.addEventListener("restore-draft", restore);
    return () => form?.removeEventListener("restore-draft", restore);
  }, []);
  const [lines, setLines] = useState([0]);
  const [next, setNext] = useState(1);
  return (
    <div ref={ref} className="grid min-w-0 gap-4">
      {lines.map((index) => (
        <MedicineLine
          key={index}
          index={index}
          restored={restored}
          options={options}
          removable={lines.length > 1}
          remove={() =>
            setLines((current) => current.filter((i) => i !== index))
          }
        />
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={lines.length >= 30}
        onClick={() => {
          setLines((current) => [...current, next]);
          setNext(next + 1);
        }}
      >
        Add another medicine
      </Button>
    </div>
  );
}
