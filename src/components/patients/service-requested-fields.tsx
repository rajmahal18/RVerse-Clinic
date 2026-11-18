"use client";
import { useEffect, useRef, useState } from "react";
type RequestOption = {
  value: string;
  label: string;
};

export function ServiceRequestedFields({
  options,
  defaultValues = [],
  defaultReferralReason = "",
  lockExisting = false,
}: {
  options: RequestOption[];
  defaultValues?: string[];
  defaultReferralReason?: string;
  lockExisting?: boolean;
}) {
  const ref = useRef<HTMLFieldSetElement>(null);
  const [selected, setSelected] = useState(defaultValues);
  useEffect(() => {
    const form = ref.current?.closest("form");
    const restore = (event: Event) => {
      const values = (event as CustomEvent<Record<string, string[]>>).detail;
      if (values.requestTypes) setSelected(lockExisting ? [...new Set([...defaultValues, ...values.requestTypes])] : values.requestTypes);
    };
    form?.addEventListener("restore-draft", restore);
    return () => form?.removeEventListener("restore-draft", restore);
  }, []);
  return (
    <fieldset ref={ref} className="grid gap-3">
      <legend className="text-sm font-black text-slate-900">
        Service Requested
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <input
              type="checkbox"
              name="requestTypes"
              value={option.value}
              checked={selected.includes(option.value)}
              aria-disabled={lockExisting && defaultValues.includes(option.value)}
              onClick={event => { if (lockExisting && defaultValues.includes(option.value)) event.preventDefault(); }}
              onChange={(e) => {
                if (lockExisting && defaultValues.includes(option.value)) return;
                setSelected((current) =>
                  e.target.checked
                    ? [...current, option.value]
                    : current.filter((value) => value !== option.value),
                );
              }}
              className="h-5 w-5 shrink-0 rounded border-slate-300 accent-primary"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {lockExisting && defaultValues.length > 0 && <p className="text-xs text-slate-500">Admin can remove recorded services through Admin Record Management.</p>}
      {selected.includes("REFERRAL") && (
        <label className="grid min-w-0 gap-1 text-sm font-semibold">
          Reason for Referral
          <textarea
            name="referralReason"
            required
            defaultValue={defaultReferralReason}
            className="min-h-24 w-full min-w-0 rounded-lg border p-3 font-normal"
          />
        </label>
      )}
    </fieldset>
  );
}
