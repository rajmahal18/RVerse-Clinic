"use client";
import { useEffect, useSyncExternalStore } from "react";
import { LoaderCircle } from "lucide-react";
import { requestFeedback } from "@/lib/request-feedback";

export function InteractionFeedback() {
  const { count, label } = useSyncExternalStore(
    requestFeedback.subscribe,
    requestFeedback.getSnapshot,
    requestFeedback.getServerSnapshot,
  );
  useEffect(() => {
    const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
    function acknowledge(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLElement>(
        'button,a[href],[role="button"]',
      );
      if (!button || button.matches(':disabled,[aria-disabled="true"]')) return;
      button.dataset.clickFeedback = "true";
      clearTimeout(timers.get(button));
      timers.set(
        button,
        setTimeout(() => {
          delete button.dataset.clickFeedback;
          timers.delete(button);
        }, 220),
      );
    }
    document.addEventListener("click", acknowledge, true);
    return () => {
      document.removeEventListener("click", acknowledge, true);
      timers.forEach((timer, button) => {
        clearTimeout(timer);
        delete button.dataset.clickFeedback;
      });
    };
  }, []);
  return (
    <div
      className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex justify-center px-3 sm:justify-end sm:px-5"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {count > 0 ? (
        <div className="flex max-w-full items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-lg">
          <LoaderCircle
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin text-primary motion-reduce:animate-none"
          />
          <span>{label}</span>
        </div>
      ) : null}
    </div>
  );
}
