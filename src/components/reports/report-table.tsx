"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "@/components/navigation/app-link";
import { ChevronRight, Search, X } from "lucide-react";
import type { ReportRow, ReportSection } from "@/lib/monthly-reports";
import { SurveyAnswerCorrection } from "@/components/reports/survey-answer-correction";
import { useReportTableState } from "@/components/reports/use-report-table-state";
import { reportPatientHref } from "@/lib/report-navigation";

export function ReportTable({
  section,
  canCorrectSurvey = false,
  retentionKey,
  returnTo,
}: {
  section: ReportSection;
  canCorrectSurvey?: boolean;
  retentionKey?: string;
  returnTo?: string;
}) {
  const [view, updateView, persistView] = useReportTableState(retentionKey);
  const { search, limit } = view;
  const selected =
    section.rows.find((row) => row.id === view.selectedId) ?? null;
  const detailRef = useRef<HTMLDivElement>(null);
  const restoredDetail = useRef<string | null>(null);
  const setSelected = useCallback(
    (row: ReportRow | null) => {
      updateView({
        selectedId: row?.id ?? null,
        expanded: [],
        detailScroll: 0,
      });
    },
    [updateView],
  );
  const [notice, setNotice] = useState("");
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
      document
        .getElementById(`close-${section.id}`)
        ?.focus({ preventScroll: true }),
    );
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", close);
      cancelAnimationFrame(frame);
      focused?.focus({ preventScroll: true });
    };
  }, [selected, section.id, setSelected]);
  useEffect(() => {
    if (selected && detailRef.current && restoredDetail.current !== selected.id)
      detailRef.current.scrollTop = view.detailScroll;
    restoredDetail.current = selected?.id ?? null;
  }, [selected, view.detailScroll]);
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
          const elements = event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not([disabled]),a[href],summary,select,textarea",
          );
          const visibleElements = [...elements].filter(
            (element) => element.getClientRects().length > 0,
          );
          const first = visibleElements[0];
          const last = visibleElements[visibleElements.length - 1];
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
        <div
          ref={detailRef}
          onScroll={(event) =>
            persistView({ detailScroll: event.currentTarget.scrollTop })
          }
          className="min-h-0 overflow-y-auto px-4 pb-12 pt-2"
        >
          {selected.details?.length ? (
            selected.details.map((detail, index) =>
              detail.respondents ? (
                <details
                  key={index}
                  open={view.expanded.includes(detail.label)}
                  onToggle={(event) => {
                    const open = event.currentTarget.open;
                    if (open === view.expanded.includes(detail.label)) return;
                    updateView({
                      expanded: open
                        ? [...view.expanded, detail.label]
                        : view.expanded.filter(
                            (label) => label !== detail.label,
                          ),
                    });
                  }}
                  className="group min-w-0 border-b border-slate-100 text-sm"
                >
                  <summary className="flex min-w-0 cursor-pointer list-none items-start gap-2 py-3 [&::-webkit-details-marker]:hidden">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-open:rotate-90" />
                    <span className="min-w-0 flex-1 break-words font-semibold text-slate-700">
                      {detail.label}
                    </span>
                    <span className="shrink-0 text-slate-500">
                      {detail.value}
                    </span>
                  </summary>
                  {detail.respondents.length ? (
                    <ul className="min-w-0 divide-y divide-slate-100 pb-2 pl-6">
                      {detail.respondents.map((respondent, respondentIndex) => (
                        <li
                          key={respondentIndex}
                          className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1 py-2"
                        >
                          <Link
                            href={reportPatientHref(respondent.href!, returnTo)}
                            className="min-w-0 flex-1 break-words font-semibold text-primary hover:underline"
                          >
                            {respondent.label}
                          </Link>
                          <span className="max-w-full break-words text-slate-500">
                            {respondent.value}
                          </span>
                          {canCorrectSurvey &&
                          respondent.surveyId &&
                          respondent.answer ? (
                            <SurveyAnswerCorrection
                              surveyId={respondent.surveyId}
                              question={selected.id}
                              answer={respondent.answer}
                              onSaved={() => {
                                setSelected(null);
                                setNotice(
                                  "Answer corrected. The change was recorded in Activity Logs.",
                                );
                              }}
                            />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="pb-3 pl-6 text-slate-500">
                      No respondents for this answer.
                    </p>
                  )}
                </details>
              ) : (
                <div
                  key={index}
                  className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1 border-b border-slate-100 py-3 text-sm"
                >
                  {detail.href ? (
                    <Link
                      href={reportPatientHref(detail.href, returnTo)}
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
              ),
            )
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
                updateView({ search: event.target.value, limit: 20 });
              }}
              aria-label={`Search ${section.title}`}
              placeholder="Search this section"
              className="h-10 w-full min-w-0 rounded-lg border bg-white pl-9 pr-3 text-sm"
            />
          </label>
        ) : null}
      </div>
      {notice ? (
        <p role="status" className="no-print text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}
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
          onClick={() => updateView({ limit: limit + 20 })}
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
