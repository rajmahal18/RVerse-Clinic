import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { cancelQueuedVisitAction } from "@/app/actions/workflow";
import { PageHeader } from "@/components/layout/page-header";
import { PatientTable } from "@/components/patients/patient-table";
import { DebouncedSearchForm } from "@/components/search/debounced-search-form";
import { ActionAlert } from "@/components/ui/action-alert";
import { getTodaysPatientQueueSections, type PatientListResult } from "@/lib/patient-view";

function QueueSection({
  title,
  description,
  result,
  children,
}: {
  title: string;
  description: string;
  result: PatientListResult;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-soft">
      <div className="flex flex-col gap-1 border-b bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
          {result.totalCount} patients
        </span>
      </div>
      {children}
    </section>
  );
}

export default async function TodaysPatientsPage({
  searchParams,
}: {
  searchParams?: Promise<{ prevPage?: string; todayPage?: string; q?: string; error?: string; message?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const previousPage = Number(resolvedSearchParams?.prevPage ?? "1");
  const todayPage = Number(resolvedSearchParams?.todayPage ?? "1");
  const searchQuery = resolvedSearchParams?.q?.trim() ?? "";
  const result = await getTodaysPatientQueueSections(
    Number.isFinite(previousPage) ? previousPage : 1,
    Number.isFinite(todayPage) ? todayPage : 1,
    25,
    searchQuery
  );
  const redirectParams = new URLSearchParams();
  if (result.previousQueue.currentPage > 1) redirectParams.set("prevPage", String(result.previousQueue.currentPage));
  if (result.todaysQueue.currentPage > 1) redirectParams.set("todayPage", String(result.todaysQueue.currentPage));
  if (searchQuery) redirectParams.set("q", searchQuery);
  const cancelRedirectTo = `/todays-patients${redirectParams.size ? `?${redirectParams.toString()}` : ""}`;

  return (
    <AppShell>
      <PageHeader
        title="Today's Patient"
        actions={
          <DebouncedSearchForm action="/todays-patients" initialQuery={searchQuery} placeholder="Search today's queue" />
        }
      />
      <ActionAlert error={resolvedSearchParams?.error} message={resolvedSearchParams?.message} />
      <div className="grid gap-5">
        <QueueSection
          title="Today's Patient"
          description="Patient visits queued or updated for the current clinic day."
          result={result.todaysQueue}
        >
          <PatientTable
            rows={result.todaysQueue.rows}
            currentPage={result.todaysQueue.currentPage}
            totalPages={result.todaysQueue.totalPages}
            totalCount={result.todaysQueue.totalCount}
            pageSize={result.todaysQueue.pageSize}
            basePath="/todays-patients"
            searchQuery={searchQuery}
            queryParams={{ prevPage: String(result.previousQueue.currentPage) }}
            cancelVisitAction={cancelQueuedVisitAction}
            cancelRedirectTo={cancelRedirectTo}
            pageParamName="todayPage"
            visitDateLabel="Queued date"
            emptyState="No patient records found for today's queue."
            embedded
          />
        </QueueSection>

        <QueueSection
          title="Queued From Previous Days"
          description="Active queue entries from earlier dates that are not yet completed or cancelled."
          result={result.previousQueue}
        >
          <PatientTable
            rows={result.previousQueue.rows}
            currentPage={result.previousQueue.currentPage}
            totalPages={result.previousQueue.totalPages}
            totalCount={result.previousQueue.totalCount}
            pageSize={result.previousQueue.pageSize}
            basePath="/todays-patients"
            searchQuery={searchQuery}
            queryParams={{ todayPage: String(result.todaysQueue.currentPage) }}
            cancelVisitAction={cancelQueuedVisitAction}
            cancelRedirectTo={cancelRedirectTo}
            pageParamName="prevPage"
            visitDateLabel="Queued date"
            emptyState="No active queue entries from previous days."
            embedded
          />
        </QueueSection>
      </div>
    </AppShell>
  );
}
