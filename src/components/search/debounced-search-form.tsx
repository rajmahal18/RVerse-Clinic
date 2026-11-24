"use client";
import { FormFeedback } from "@/components/ui/form-feedback";


import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useFeedbackRouter as useRouter } from "@/components/navigation/use-feedback-router";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type DebouncedSearchFormProps = {
  action: string;
  initialQuery?: string;
  placeholder: string;
  preserveParams?: Record<string, string | undefined>;
  className?: string;
  inputClassName?: string;
};

export function DebouncedSearchForm({
  action,
  initialQuery = "",
  placeholder,
  preserveParams,
  className,
  inputClassName,
}: DebouncedSearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const pendingQueries = useRef(new Set<string>());
  const lastNavigation = useRef<string | null>(null);
  const preservedEntries = useMemo(
    () => Object.entries(preserveParams ?? {}).filter(([, value]) => value?.trim()),
    [preserveParams]
  );

  useEffect(() => {
    // A slow response to an earlier search must not replace newer typing.
    if (pendingQueries.current.delete(initialQuery.trim())) return;
    lastNavigation.current = null;
    setQuery(initialQuery);
  }, [initialQuery]);

  function navigate(target: string, value: string) {
    if (lastNavigation.current === target) return;
    lastNavigation.current = target;
    pendingQueries.current.add(value);
    router.replace(target, { scroll: false });
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const trimmedQuery = query.trim();

      if (trimmedQuery === initialQuery.trim()) {
        return;
      }

      const params = new URLSearchParams();

      preservedEntries.forEach(([key, value]) => {
        if (value?.trim()) {
          params.set(key, value.trim());
        }
      });

      if (trimmedQuery) {
        params.set("q", trimmedQuery);
      }

      const queryString = params.toString();
      navigate(queryString ? `${action}?${queryString}` : action, trimmedQuery);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [action, initialQuery, preservedEntries, query, router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    const params = new URLSearchParams();

    preservedEntries.forEach(([key, value]) => {
      if (value?.trim()) {
        params.set(key, value.trim());
      }
    });

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    const queryString = params.toString();
    navigate(queryString ? `${action}?${queryString}` : action, trimmedQuery);
  }

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <FormFeedback />
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        name="q"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={cn("h-10 rounded-xl border bg-white pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30", inputClassName)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </form>
  );
}
