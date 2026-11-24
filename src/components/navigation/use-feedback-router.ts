"use client";
import { useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { beginRequest } from "@/lib/request-feedback";

export function useFeedbackRouter() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (pending) return beginRequest("Loading page…");
  }, [pending]);
  return useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) =>
        startTransition(() => router.push(...args)),
      replace: (...args: Parameters<typeof router.replace>) =>
        startTransition(() => router.replace(...args)),
      refresh: () => startTransition(() => router.refresh()),
    }),
    [router],
  );
}
