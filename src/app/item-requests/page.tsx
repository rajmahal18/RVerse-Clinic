import Link from "next/link";
import { Check, Clock3, History, PackageCheck, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ActionAlert } from "@/components/ui/action-alert";
import { resolveItemRequestAction } from "@/app/actions/workflow";
import { prisma } from "@/lib/prisma";

const formatDate = (value: Date) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(value);

export default async function ItemRequestsPage({ searchParams }: { searchParams?: Promise<{ view?: string; error?: string; message?: string }> }) {
  const params = await searchParams;
  const historyView = params?.view === "history";
  const [pendingCount, historyCount, requests] = await Promise.all([
    prisma.medicineRequest.count({ where: { status: "REQUESTED" } }),
    prisma.medicineRequest.count({ where: { status: { in: ["APPROVED", "REJECTED", "RELEASED"] } } }),
    prisma.medicineRequest.findMany({
      where: historyView ? { status: { in: ["APPROVED", "REJECTED", "RELEASED"] } } : { status: "REQUESTED" },
      orderBy: historyView ? [{ resolvedAt: "desc" }, { createdAt: "desc" }] : { createdAt: "asc" },
      include: { inventoryItem: true, visit: { include: { patient: true } } },
    }),
  ]);

  return <AppShell><PageHeader title="Item Requests" eyebrow="Inventory / Request queue" /><ActionAlert error={params?.error} message={params?.message} />
    <nav className="mb-4 flex overflow-x-auto border-b" aria-label="Item request views">
      <Link href="/item-requests" className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${!historyView ? "border-primary text-primary" : "border-transparent text-slate-500"}`}><Clock3 className="h-4 w-4" /> Pending <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">{pendingCount}</span></Link>
      <Link href="/item-requests?view=history" className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${historyView ? "border-primary text-primary" : "border-transparent text-slate-500"}`}><History className="h-4 w-4" /> History <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{historyCount}</span></Link>
    </nav>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex items-center gap-3 border-b bg-slate-50 px-4 py-3"><PackageCheck className="h-5 w-5 text-primary" /><div><h2 className="font-black">{historyView ? "Request history" : "Pending requests"}</h2><p className="text-sm text-slate-500">{historyView ? "Completed approval decisions and stock releases." : "One row represents one request, regardless of quantity."}</p></div></div>
    <div className="divide-y">{requests.map((request) => <article key={request.id} className="grid gap-3 px-4 py-4 transition hover:bg-slate-50 md:grid-cols-[1fr_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-900">{request.itemName}</p><span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">Qty {request.quantity}</span>{historyView ? <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${request.status === "REJECTED" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{request.status === "RELEASED" ? "APPROVED" : request.status}</span> : null}</div><p className="mt-1 text-sm text-slate-600">{request.visit.patient.lastName}, {request.visit.patient.firstName} · {request.frequency || "No frequency"} · {request.duration || "No duration"}</p><p className="mt-1 text-xs text-slate-400">Batch: {request.inventoryItem?.dosage || "—"} · {request.inventoryItem?.brandName || "—"} · Requested {formatDate(request.createdAt)}{historyView && request.resolvedAt ? ` · Resolved ${formatDate(request.resolvedAt)}` : ""}</p></div>{!historyView ? <form action={resolveItemRequestAction} className="flex gap-2"><input type="hidden" name="requestId" value={request.id} /><Button name="decision" value="REJECT" type="submit" variant="outline" className="text-rose-700"><X className="h-4 w-4" /> Reject</Button><Button name="decision" value="APPROVE" type="submit"><Check className="h-4 w-4" /> Approve</Button></form> : null}</article>)}{requests.length === 0 ? <p className="px-4 py-12 text-center text-sm text-slate-500">{historyView ? "No resolved item requests yet." : "No pending item requests."}</p> : null}</div></section>
  </AppShell>;
}
