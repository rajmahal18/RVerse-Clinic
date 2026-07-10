type RequestOption = {
  value: string;
  label: string;
};

export function ServiceRequestedFields({
  options,
  defaultValues = [],
}: {
  options: RequestOption[];
  defaultValues?: string[];
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-black text-slate-900">Service Requested</legend>
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
              defaultChecked={defaultValues.includes(option.value)}
              className="h-5 w-5 shrink-0 rounded border-slate-300 accent-primary"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
