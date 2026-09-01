"use client";

import { useMemo, useState } from "react";
import { Check, X, XIcon } from "lucide-react";
import { resolveItemRequestAction } from "@/app/actions/workflow";
import { CsrfField } from "@/components/security/csrf-field";
import { Button } from "@/components/ui/button";

export type ItemRequestListRow = {
  id: string;
  itemName: string;
  quantity: number;
  status: string;
  patientName: string;
  requestedBy: string;
  frequency: string;
  duration: string;
  dosage: string;
  brandName: string;
  remarks: string;
  createdAt: string;
  resolvedAt: string;
};

function StatusPill({ status }: { status: string }) {
  const label = status === "RELEASED" ? "APPROVED" : status;
  const tone = status === "REJECTED"
    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
    : status === "REQUESTED"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>{label}</span>;
}

function DecisionActions({ requestId, compact = false }: { requestId: string; compact?: boolean }) {
  return (
    <form action={resolveItemRequestAction} className={compact ? "grid grid-cols-2 gap-2" : "flex gap-2"}>
      <CsrfField />
      <input type="hidden" name="requestId" value={requestId} />
      <Button name="decision" value="REJECT" type="submit" variant="outline" className="text-rose-700">
        <X className="h-4 w-4" /> Reject
      </Button>
      <Button name="decision" value="APPROVE" type="submit">
        <Check className="h-4 w-4" /> Approve
      </Button>
    </form>
  );
}

export function ItemRequestList({
  requests,
  historyView,
  canResolveRequests,
}: {
  requests: ItemRequestListRow[];
  historyView: boolean;
  canResolveRequests: boolean;
}) {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  return (
    <>
      <div className="divide-y-8 divide-slate-100 bg-slate-100 md:divide-y md:divide-slate-200 md:bg-white">
        {requests.map((request) => (
          <article
            key={request.id}
            className="grid gap-3 border-y border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 md:grid-cols-[1fr_auto] md:items-center md:border-y-0 md:shadow-none"
          >
            <button type="button" onClick={() => setSelectedRequestId(request.id)} className="min-w-0 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-slate-900">{request.itemName}</p>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">Qty {request.quantity}</span>
                {historyView ? <StatusPill status={request.status} /> : null}
              </div>
              <p className="mt-1 text-sm text-slate-600">{request.patientName} / {request.frequency || "No frequency"} / {request.duration || "No duration"}</p>
              {request.requestedBy ? <p className="mt-1 text-xs text-slate-500">Requested by {request.requestedBy}</p> : null}
              <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                Batch: {request.dosage || "-"} / {request.brandName || "-"} / Requested {request.createdAt}
              </p>
              {request.remarks ? <p className="mt-1 line-clamp-1 text-xs text-slate-500">Remarks: {request.remarks}</p> : null}
            </button>
            {!historyView && canResolveRequests ? (
              <div className="hidden md:block">
                <DecisionActions requestId={request.id} />
              </div>
            ) : null}
          </article>
        ))}
        {requests.length === 0 ? (
          <p className="bg-white px-4 py-12 text-center text-sm text-slate-500">
            {historyView ? "No resolved item requests yet." : "No pending item requests."}
          </p>
        ) : null}
      </div>

      {selectedRequest ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-0 md:place-items-center md:p-4" onClick={() => setSelectedRequestId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-request-details-title"
            className="max-h-[88vh] w-full overflow-hidden rounded-t-2xl border bg-white shadow-2xl md:max-w-xl md:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <h2 id="item-request-details-title" className="truncate text-lg font-black text-slate-900">{selectedRequest.itemName}</h2>
                <p className="text-sm text-slate-500">{selectedRequest.patientName}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedRequestId(null)} aria-label="Close request details">
                <XIcon className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid gap-3 p-4">
              {[
                ["Quantity", String(selectedRequest.quantity)],
                ["Frequency", selectedRequest.frequency || "No frequency"],
                ["Duration", selectedRequest.duration || "No duration"],
                ["Dosage", selectedRequest.dosage || "-"],
                ["Brand", selectedRequest.brandName || "-"],
                ["Requested by", selectedRequest.requestedBy || "-"],
                ["Requested", selectedRequest.createdAt],
                ["Resolved", selectedRequest.resolvedAt || "-"],
                ["Status", selectedRequest.status],
                ["Remarks", selectedRequest.remarks || "-"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border bg-slate-50 px-3 py-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
            {!historyView && canResolveRequests ? (
              <div className="border-t bg-white p-4">
                <DecisionActions requestId={selectedRequest.id} compact />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
