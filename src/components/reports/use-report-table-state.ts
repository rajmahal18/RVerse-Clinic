"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type TableState = {
  search: string;
  limit: number;
  selectedId: string | null;
  expanded: string[];
  detailScroll: number;
};
const initial: TableState = {
  search: "",
  limit: 20,
  selectedId: null,
  expanded: [],
  detailScroll: 0,
};

export function useReportTableState(storageKey?: string) {
  const [state, setState] = useState<TableState>(initial);
  const latest = useRef(state);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let next = initial;
    try {
      const saved = JSON.parse(
        storageKey ? sessionStorage.getItem(storageKey) || "null" : "null",
      );
      if (
        saved &&
        typeof saved.search === "string" &&
        Number.isInteger(saved.limit) &&
        saved.limit >= 20 &&
        (saved.selectedId === null || typeof saved.selectedId === "string") &&
        Array.isArray(saved.expanded) &&
        saved.expanded.every((id: unknown) => typeof id === "string") &&
        Number.isFinite(saved.detailScroll)
      )
        next = saved;
    } catch {
      /* Invalid or unavailable storage starts with the default view. */
    }
    latest.current = next;
    setState(next);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current); timer.current = null;
        try { if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify(latest.current)); } catch { /* Storage is optional. */ }
      }
    };
  }, [storageKey]);
  const write = useCallback(() => {
    try { if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify(latest.current)); } catch { /* Storage is optional. */ }
  }, [storageKey]);
  const update = useCallback((change: Partial<TableState>) => {
    latest.current = { ...latest.current, ...change };
    setState(latest.current); write();
  }, [write]);
  const persist = useCallback((change: Partial<TableState>) => {
    latest.current = { ...latest.current, ...change };
    if (!timer.current) timer.current = setTimeout(() => { timer.current = null; write(); }, 120);
  }, [write]);
  return [state, update, persist] as const;
}
