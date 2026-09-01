"use client";

import { useMemo, useState } from "react";
import { Activity, Eye, X } from "lucide-react";
import type { ActivityLogGroup, ActivityLogRow } from "@/lib/activity-log-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ChangeValue = {
  before?: unknown;
  after?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function getChanges(metadata: unknown) {
  if (!isRecord(metadata) || !isRecord(metadata.changes)) {
    return [];
  }

  return Object.entries(metadata.changes)
    .filter((entry): entry is [string, ChangeValue] => isRecord(entry[1]))
    .map(([field, value]) => ({
      field,
      before: value.before,
      after: value.after,
    }));
}

function MetadataDetails({ metadata }: { metadata: unknown }) {
  const changes = getChanges(metadata);

  if (changes.length > 0) {
    return (
      <>
      <div className="space-y-3 lg:hidden">
        {changes.map((change) => (
          <div key={change.field} className="rounded-xl border bg-slate-50 px-3 py-2 text-sm">
            <p className="font-bold text-slate-800">{change.field}</p>
            <div className="mt-2 grid gap-2">
              <p>
                <span className="block text-xs font-bold uppercase text-slate-400">Previous</span>
                <span className="whitespace-pre-wrap text-slate-600">{formatValue(change.before)}</span>
              </p>
              <p>
                <span className="block text-xs font-bold uppercase text-slate-400">Current</span>
                <span className="whitespace-pre-wrap text-slate-900">{formatValue(change.after)}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border lg:block">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {["Field", "Previous", "Current"].map((header) => (
                <th key={header} className="px-3 py-2 font-bold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {changes.map((change) => (
              <tr key={change.field}>
                <td className="px-3 py-2 font-semibold text-slate-800">{change.field}</td>
                <td className="whitespace-pre-wrap px-3 py-2 text-slate-600">{formatValue(change.before)}</td>
                <td className="whitespace-pre-wrap px-3 py-2 text-slate-900">{formatValue(change.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
    );
  }

  if (!metadata || metadata === "null") {
    return <p className="text-sm text-slate-500">No additional details recorded.</p>;
  }

  return (
    <pre className="max-h-[260px] overflow-auto rounded-xl border bg-slate-50 p-3 text-xs leading-5 text-slate-700">
      {JSON.stringify(metadata, null, 2)}
    </pre>
  );
}

export function ActivityLogTable({ groups, totalCount }: { groups: ActivityLogGroup[]; totalCount: number }) {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const logs = useMemo(() => groups.flatMap((group) => group.logs), [groups]);
  const selectedLog = useMemo(
    () => logs.find((log) => log.id === selectedLogId) ?? null,
    [logs, selectedLogId]
  );
  const heading = totalCount === 500 ? "Latest 500 records" : `${totalCount.toLocaleString()} records`;

  return (
    <>
      <section className="overflow-hidden rounded-2xl border bg-white shadow-soft">
        <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
          <Activity className="h-4 w-4 text-primary" />
          {heading}
        </div>
        <div className="divide-y-8 divide-slate-100 bg-slate-100 lg:hidden">
          {groups.map((group) => (
            <div key={group.dateKey}>
              <div className="sticky top-0 z-10 border-y border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500">
                {group.label}
              </div>
              {group.logs.map((log) => (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => setSelectedLogId(log.id)}
                  className="block w-full border-b border-slate-200 bg-white px-4 py-3 text-left transition active:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-900">{log.action}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{log.module} / {log.createdAt}</p>
                    </div>
                    <Badge className={log.status === "FAILED" ? "shrink-0 bg-rose-50 text-rose-700" : "shrink-0 bg-emerald-50 text-emerald-700"}>
                      {log.status}
                    </Badge>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-700">{log.description}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <p className="min-w-0">
                      <span className="block text-xs font-bold uppercase text-slate-400">Record</span>
                      <span className="block truncate text-slate-700">{log.entityType}</span>
                    </p>
                    <p className="min-w-0">
                      <span className="block text-xs font-bold uppercase text-slate-400">User</span>
                      <span className="block truncate text-slate-700">{log.user}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ))}
          {totalCount === 0 ? (
            <p className="bg-white px-4 py-10 text-center text-sm text-slate-500">No activity logs found.</p>
          ) : null}
        </div>

        <div className="hidden lg:block">
          {groups.map((group) => (
            <div key={group.dateKey} className="border-b last:border-b-0">
              <div className="border-b bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500">
                {group.label}
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      {["Time", "Module", "Action", "Status", "Record", "User", "Details"].map((header) => (
                        <th key={header} className="px-4 py-3 font-bold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {group.logs.map((log) => (
                      <tr
                        key={log.id}
                        tabIndex={0}
                        role="button"
                        onClick={() => setSelectedLogId(log.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedLogId(log.id);
                          }
                        }}
                        className="cursor-pointer transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.createdAt}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{log.module}</td>
                        <td className="px-4 py-3 text-slate-700">{log.action}</td>
                        <td className="px-4 py-3">
                          <Badge className={log.status === "FAILED" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}>
                            {log.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{log.entityType}</td>
                        <td className="px-4 py-3 text-slate-600">{log.user}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="flex items-center justify-between gap-3">
                            <span>{log.description}</span>
                            <Eye className="h-4 w-4 shrink-0 text-slate-400" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {totalCount === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">No activity logs found.</p>
          ) : null}
        </div>
      </section>

      {selectedLog ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onClick={() => setSelectedLogId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-log-title"
            className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-2xl border bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b px-4 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="activity-log-title" className="text-lg font-black text-slate-900">Log Details</h2>
                  <Badge className={selectedLog.status === "FAILED" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}>{selectedLog.status}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{selectedLog.createdAt}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedLogId(null)} aria-label="Close log details">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="max-h-[calc(88vh-72px)] overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-slate-200 md:grid-cols-3">
                {[
                  ["Module", selectedLog.module],
                  ["Action", selectedLog.action],
                  ["Record", selectedLog.entityType],
                  ["Record ID", selectedLog.entityId],
                  ["User", selectedLog.user],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0 bg-white px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-l-2 border-primary pl-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Details</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{selectedLog.description}</p>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-sm font-bold text-slate-800">Changes / Metadata</p>
                <MetadataDetails metadata={selectedLog.metadata} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
