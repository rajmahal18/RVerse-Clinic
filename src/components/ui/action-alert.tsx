import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ActionAlert({
  error,
  message,
}: {
  error?: string | null;
  message?: string | null;
}) {
  const text = error || message;

  if (!text) {
    return null;
  }

  const isError = Boolean(error);
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      className={cn(
        "mb-4 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm font-medium",
        isError ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
