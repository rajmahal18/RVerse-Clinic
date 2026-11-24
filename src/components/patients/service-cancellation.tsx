"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, ClipboardList, X } from "lucide-react";
import { cancelServiceAction } from "@/app/actions/service-cancellation";
import { useFeedbackRouter } from "@/components/navigation/use-feedback-router";
import { CsrfField } from "@/components/security/csrf-field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Button } from "@/components/ui/button";
import type { ServiceCancellation } from "@/lib/service-state";
import { formatDateTime } from "@/lib/date-time";

type Service = {
  id: string;
  label: string;
  cancellation?: ServiceCancellation | null;
};
export function CancellationButton({
  patientId,
  visitId,
  service,
  entireVisit = false,
  onSaved,
}: {
  patientId: string;
  visitId: string;
  service?: Service;
  entireVisit?: boolean;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useFeedbackRouter();
  const dialog = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = entireVisit
    ? "Cancel entire visit"
    : `Cancel ${service?.label}`;
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const focusedButton = trigger.current;
    document.body.style.overflow = "hidden";
    if (pending) dialog.current?.focus({ preventScroll: true });
    else
      dialog.current
        ?.querySelector<HTMLTextAreaElement>("textarea")
        ?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", escape);
      if (focusedButton?.isConnected)
        focusedButton.focus({ preventScroll: true });
    };
  }, [open, pending]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        aria-label={title}
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Ban className="h-3.5 w-3.5" />
        {entireVisit ? "Cancel visit" : "Cancel service"}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="no-print fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-3"
              onClick={() => {
                if (!pending) setOpen(false);
              }}
            >
              <div
                ref={dialog}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className="max-h-[90dvh] w-full max-w-lg min-w-0 overflow-y-auto rounded-lg bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key !== "Tab") return;
                  const focusable = [
                    ...event.currentTarget.querySelectorAll<HTMLElement>(
                      "button:not(:disabled),textarea:not(:disabled)",
                    ),
                  ];
                  if (!focusable.length) {
                    event.preventDefault();
                    return;
                  }
                  const first = focusable[0],
                    last = focusable.at(-1);
                  if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                  } else if (
                    !event.shiftKey &&
                    document.activeElement === last
                  ) {
                    event.preventDefault();
                    first?.focus();
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
                  <h3 className="min-w-0 break-words font-semibold text-slate-900">
                    {title}
                  </h3>
                  <button
                    type="button"
                    disabled={pending}
                    aria-label="Close cancellation"
                    onClick={() => setOpen(false)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form
                  className="space-y-4 p-4"
                  onSubmit={() => setPending(true)}
                  action={async (data) => {
                    setPending(true);
                    setError("");
                    try {
                      const result = await cancelServiceAction(data);
                      if (!result.ok) {
                        setError(result.message);
                        return;
                      }
                      setOpen(false);
                      onSaved?.();
                      router.refresh();
                    } catch {
                      setError("Unable to cancel. Please try again.");
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  <FormFeedback />
                  <CsrfField />
                  <input type="hidden" name="patientId" value={patientId} />
                  <input type="hidden" name="visitId" value={visitId} />
                  <input
                    type="hidden"
                    name="scope"
                    value={entireVisit ? "visit" : "service"}
                  />
                  <input
                    type="hidden"
                    name="serviceId"
                    value={service?.id ?? ""}
                  />
                  <p className="text-sm leading-6 text-slate-600">
                    {entireVisit
                      ? "This cancels the entire visit. Visits with recorded clinical work must be reviewed instead."
                      : "Only this service will be cancelled. Other services will continue. If no active services remain, the visit will be closed with no service provided."}
                  </p>
                  {!entireVisit &&
                  service?.label === "Provision of Medicine" ? (
                    <p className="text-sm leading-6 text-slate-600">
                      Pending and approved medicine requests under this service
                      will also be cancelled. Issued medicine requires admin
                      review.
                    </p>
                  ) : null}
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                    Reason for cancellation
                    <textarea
                      name="reason"
                      required
                      maxLength={1000}
                      rows={3}
                      disabled={pending}
                      className="w-full min-w-0 rounded-md border p-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-primary/25"
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    The reason, previous status, staff member, and time will be
                    recorded in Activity Logs.
                  </p>
                  {error ? (
                    <p role="alert" className="text-sm text-rose-700">
                      {error}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() => setOpen(false)}
                    >
                      Keep {entireVisit ? "visit" : "service"}
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={pending}
                    >
                      {pending
                        ? "Cancelling…"
                        : entireVisit
                          ? "Cancel entire visit"
                          : "Confirm cancellation"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function VisitServices({
  patientId,
  visitId,
  services,
  canCancel = false,
  canCancelVisit = false,
}: {
  patientId: string;
  visitId: string;
  services: Service[];
  canCancel?: boolean;
  canCancelVisit?: boolean;
}) {
  const [notice, setNotice] = useState("");
  return (
    <section className="min-w-0 border-y border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ClipboardList className="h-4 w-4 text-primary" />
          Services
        </h3>
        {canCancelVisit ? (
          <CancellationButton
            patientId={patientId}
            visitId={visitId}
            entireVisit
            onSaved={() => setNotice("Visit cancellation recorded.")}
          />
        ) : null}
      </div>
      {notice ? (
        <p role="status" className="px-3 pb-2 text-xs text-teal-700">
          {notice}
        </p>
      ) : null}
      <ul className="divide-y divide-slate-100">
        {services.map((service) => (
          <li key={service.id} className="min-w-0 px-3 py-2.5">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <span
                className={`min-w-0 flex-1 break-words text-sm font-medium ${service.cancellation ? "text-slate-500" : "text-slate-800"}`}
              >
                {service.label}
              </span>
              {service.cancellation ? (
                <span className="rounded bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                  Service cancelled
                </span>
              ) : canCancel ? (
                <CancellationButton
                  patientId={patientId}
                  visitId={visitId}
                  service={service}
                  onSaved={() => setNotice("Service cancellation recorded.")}
                />
              ) : null}
            </div>
            {service.cancellation ? (
              <div className="mt-1.5 border-l-2 border-rose-200 pl-2 text-xs leading-5 text-slate-600">
                <p className="break-words whitespace-pre-wrap">
                  Reason: {service.cancellation.reason}
                </p>
                <p className="break-words text-slate-500">
                  {service.cancellation.by} ·{" "}
                  {formatDateTime(new Date(service.cancellation.at))}
                </p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
