"use client";

import { Fragment, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronRight, Search, X } from "lucide-react";
import type { ReportRow, ReportSection } from "@/lib/monthly-reports";

export function ReportTable({ section }: { section: ReportSection }) {
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const rows = section.rows.filter((row) =>
    row.cells.some((cell) =>
      String(cell).toLowerCase().includes(search.toLowerCase()),
    ),
  );
  const visibleIds = new Set(rows.slice(0, limit).map((row) => row.id));
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    const focused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", close);
    const frame = requestAnimationFrame(() =>
      document.getElementById(`close-${section.id}`)?.focus(),
    );
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", close);
      cancelAnimationFrame(frame);
      focused?.focus();
    };
  }, [selected, section.id]);
  const modal = selected ? (
    <div
      className="no-print fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-3"
      onClick={() => setSelected(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`detail-${section.id}`}
        className="flex max-h-[88dvh] w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const elements =
            event.currentTarget.querySelectorAll<HTMLElement>("button,a[href]");
          const first = elements[0];
          const last = elements[elements.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">
              {section.title}
            </p>
            <h3
              id={`detail-${section.id}`}
              className="mt-1 break-words font-bold text-slate-900"
            >
              {selected.cells[0]}
            </h3>
          </div>
          <button
            id={`close-${section.id}`}
            type="button"
            aria-label="Close report details"
            onClick={() => setSelected(null)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 pb-12 pt-2">
          {selected.details?.length ? (
            selected.details.map((detail, index) => (
              <div
                key={index}
                className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1 border-b border-slate-100 py-3 text-sm"
              >
                {detail.href ? (
                  <Link
                    href={detail.href}
                    className="min-w-0 flex-1 break-words font-semibold text-primary hover:underline"
                  >
                    {detail.label}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 break-words text-slate-700">
                    {detail.label}
                  </span>
                )}
                <span className="max-w-full break-words text-slate-500">
                  {detail.value}
                </span>
              </div>
            ))
          ) : (
            <p className="py-4 text-sm text-slate-500">
              No matching records for this row.
            </p>
          )}
        </div>
      </div>
    </div>
  ) : null;
  return (
    <section
      id={section.id}
      className="monthly-report-section min-w-0 space-y-3 border-b border-slate-200 pb-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-900">
            {section.title}
          </h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500">
            {section.description}
          </p>
        </div>
        {section.rows.length > 10 ? (
          <label className="no-print relative w-full sm:w-56">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setLimit(20);
              }}
              aria-label={`Search ${section.title}`}
              placeholder="Search this section"
              className="h-10 w-full min-w-0 rounded-lg border bg-white pl-9 pr-3 text-sm"
            />
          </label>
        ) : null}
      </div>
      <div className="hidden sm:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
            <tr>
              {section.columns.map((column, index) => (
                <th
                  key={column}
                  className={`break-words px-3 py-3 ${index === 0 ? "w-[32%]" : ""}`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {section.rows.map((row) => (
              <Fragment key={row.id}>
                <tr
                  onClick={() => setSelected(row)}
                  className={`monthly-report-row cursor-pointer ${visibleIds.has(row.id) ? "" : "report-hidden-screen"} hover:bg-slate-50`}
                >
                  {row.cells.map((cell, index) => (
                    <td
                      key={index}
                      className="break-words px-3 py-3 align-top tabular-nums"
                    >
                      {index === 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelected(row)}
                          className="flex w-full min-w-0 items-start gap-2 text-left font-semibold text-slate-800"
                        >
                          <span className="min-w-0 flex-1 break-words">
                            {cell}
                          </span>
                          <ChevronRight className="no-print mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        </button>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
                {section.id === "responses"
                  ? row.details?.map((detail, index) => (
                      <tr key={index} className="hidden print:table-row">
                        <td colSpan={2} className="px-3 py-2 text-slate-600">
                          {detail.label}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {detail.value}
                        </td>
                      </tr>
                    ))
                  : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="report-mobile-rows divide-y divide-slate-100 sm:hidden">
        {rows.slice(0, limit).map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => setSelected(row)}
            className="block w-full min-w-0 py-4 text-left"
          >
            <span className="flex items-start gap-2 font-semibold text-slate-800">
              <span className="min-w-0 flex-1 break-words">{row.cells[0]}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </span>
            <span className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              {row.cells.slice(1).map((cell, index) => (
                <span key={index} className="min-w-0">
                  <span className="block break-words text-xs text-slate-500">
                    {section.columns[index + 1]}
                  </span>
                  <span className="block break-words text-sm tabular-nums text-slate-800">
                    {cell}
                  </span>
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
      {!rows.length ? (
        <p className="no-print py-3 text-sm text-slate-500">
          {search ? "No matching rows." : "No records for this month."}
        </p>
      ) : null}
      {rows.length > limit ? (
        <button
          type="button"
          onClick={() => setLimit((value) => value + 20)}
          className="no-print rounded-lg border px-4 py-2 text-sm font-semibold text-primary"
        >
          Show more ({Math.min(limit, rows.length)} of {rows.length})
        </button>
      ) : null}
      {typeof document !== "undefined" && modal
        ? createPortal(modal, document.body)
        : null}
    </section>
  );
}
