"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Check, Clock3, FileText, PackageCheck, UserRound, X, XIcon } from "lucide-react";
import { releaseItemRequestAction, resolveItemRequestAction } from "@/app/actions/workflow";
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
  const label = status === "REQUESTED" ? "WAITING FOR APPROVAL" : status;
  const tone = status === "REJECTED"
    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
    : status === "REQUESTED"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : status === "APPROVED"
        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
        : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide ${tone}`}>{label}</span>;
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

function ReleaseAction({ requestId, compact = false }: { requestId: string; compact?: boolean }) {
  return (
    <form action={releaseItemRequestAction} className={compact ? "grid gap-2 sm:grid-cols-[1fr_auto]" : "flex flex-wrap gap-2"}>
      <CsrfField />
      <input type="hidden" name="requestId" value={requestId} />
      <input name="releasedBy" className="min-h-10 rounded-xl border px-3 text-sm" placeholder="Released by" />
      <Button type="submit"><PackageCheck className="h-4 w-4" /> Release</Button>
    </form>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-white px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
    </div>
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
                {request.status === "REQUESTED" ? <DecisionActions requestId={request.id} /> : null}
                {request.status === "APPROVED" ? <ReleaseAction requestId={request.id} /> : null}
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
            className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border bg-white shadow-2xl md:max-w-2xl md:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b px-4 py-4 md:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-primary">
                  <PackageCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id="item-request-details-title" className="truncate text-lg font-black text-slate-900">{selectedRequest.itemName}</h2>
                    <StatusPill status={selectedRequest.status} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">{selectedRequest.patientName}</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedRequestId(null)} aria-label="Close request details" className="shrink-0">
                <XIcon className="h-5 w-5" />
              </Button>
            </div>

            <div className="min-h-0 overflow-y-auto p-4 md:p-5">
              <section className="overflow-hidden rounded-xl border">
                <div className="flex items-center gap-2 border-b bg-slate-50 px-3 py-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">Request details</h3>
                </div>
                <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3">
                  <DetailCell label="Quantity" value={String(selectedRequest.quantity)} />
                  <DetailCell label="Frequency" value={selectedRequest.frequency || "No frequency"} />
                  <DetailCell label="Duration" value={selectedRequest.duration || "No duration"} />
                  <DetailCell label="Dosage" value={selectedRequest.dosage || "-"} />
                  <DetailCell label="Brand" value={selectedRequest.brandName || "-"} />
                  <DetailCell label="Status" value={selectedRequest.status === "REQUESTED" ? "Waiting for approval" : selectedRequest.status} />
                </div>
              </section>

              <section className="mt-4 overflow-hidden rounded-xl border">
                <div className="flex items-center gap-2 border-b bg-slate-50 px-3 py-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">Request timeline</h3>
                </div>
                <div className="grid sm:grid-cols-3 sm:divide-x">
                  <div className="flex gap-3 px-3 py-3">
                    <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Requested by</p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-800">{selectedRequest.requestedBy || "-"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 border-t px-3 py-3 sm:border-t-0">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Requested</p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-800">{selectedRequest.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 border-t px-3 py-3 sm:border-t-0">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Resolved</p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-800">{selectedRequest.resolvedAt || "-"}</p>
                    </div>
                  </div>
                </div>
              </section>

              {selectedRequest.remarks ? (
                <section className="mt-4 rounded-xl border px-3 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Remarks</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{selectedRequest.remarks}</p>
                </section>
              ) : null}
            </div>

            {!historyView && canResolveRequests ? (
              <div className="border-t bg-slate-50/70 p-4 md:px-5">
                {selectedRequest.status === "REQUESTED" ? <DecisionActions requestId={selectedRequest.id} compact /> : null}
                {selectedRequest.status === "APPROVED" ? <ReleaseAction requestId={selectedRequest.id} compact /> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
