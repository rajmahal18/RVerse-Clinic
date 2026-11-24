"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { beginRequest } from "@/lib/request-feedback";

export function FormFeedback() {
  const { pending } = useFormStatus();
  const marker = useRef<HTMLSpanElement>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const finish = useRef<(() => void) | null>(null);
  const activate = useRef<(() => void) | null>(null);
  const deactivate = useRef<(() => void) | null>(null);
  useEffect(() => {
    const form = marker.current?.closest("form");
    if (!form) return;
    let frame = 0;
    let second = 0;
    let busyButtons: { button: HTMLElement; disabled: string | null }[] = [];
    function clear() {
      delete form!.dataset.requestPending;
      form!.removeAttribute("aria-busy");
      for (const { button, disabled } of busyButtons) {
        delete button.dataset.requestPending;
        if (disabled === null) button.removeAttribute("aria-disabled");
        else button.setAttribute("aria-disabled", disabled);
      }
      busyButtons = [];
      finish.current?.();
      finish.current = null;
    }
    function start(submitter?: HTMLElement | null) {
      if (finish.current) return;
      form!.dataset.requestPending = "true";
      form!.setAttribute("aria-busy", "true");
      const buttons = [
        ...form!.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
          'button:not([type="button"]):not([type="reset"]),input[type="submit"]',
        ),
      ].filter((button) => button.form === form && !button.disabled);
      busyButtons = buttons.map((button) => ({
        button,
        disabled: button.getAttribute("aria-disabled"),
      }));
      buttons.forEach((button) => {
        if (button === (submitter ?? buttons[0]))
          button.dataset.requestPending = "true";
        button.setAttribute("aria-disabled", "true");
      });
      finish.current = beginRequest("Processing request…");
    }
    activate.current = start;
    deactivate.current = clear;
    function submit(event: SubmitEvent) {
      if (form!.dataset.requestPending) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      start(event.submitter);
      // Cancelled confirmations and client-only forms must not leave a busy state.
      frame = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => {
          if (event.defaultPrevented && !pendingRef.current) clear();
        });
      });
    }
    form.addEventListener("submit", submit);
    const settle = () => clear();
    window.addEventListener("pageshow", settle);
    return () => {
      form.removeEventListener("submit", submit);
      window.removeEventListener("pageshow", settle);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(second);
      clear();
      activate.current = null;
      deactivate.current = null;
    };
  }, []);
  useEffect(() => {
    if (pending) activate.current?.();
    else if (finish.current) deactivate.current?.();
  }, [pending]);
  return <span ref={marker} hidden aria-hidden="true" />;
}
