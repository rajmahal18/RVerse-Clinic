import Link from "next/link";
import { Clock3, History, PackageCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ActionAlert } from "@/components/ui/action-alert";
import { ItemRequestList } from "@/components/item-requests/item-request-list";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";

const formatDate = (value: Date) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(value);

export default async function ItemRequestsPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const historyView = params?.view === "history";
  const [currentUser, pendingCount, historyCount, requests] = await Promise.all([
    getCurrentUser(),
    prisma.medicineRequest.count({ where: { status: "REQUESTED" } }),
    prisma.medicineRequest.count({ where: { status: { in: ["APPROVED", "REJECTED", "RELEASED"] } } }),
    prisma.medicineRequest.findMany({
      where: historyView ? { status: { in: ["APPROVED", "REJECTED", "RELEASED"] } } : { status: "REQUESTED" },
      orderBy: historyView ? [{ resolvedAt: "desc" }, { createdAt: "desc" }] : { createdAt: "asc" },
      include: { inventoryItem: true, visit: { include: { patient: true } } },
    }),
  ]);
  const canResolveRequests = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPPLY_OFFICER;
  const requestRows = requests.map((request) => ({
    id: request.id,
    itemName: request.itemName,
    quantity: request.quantity,
    status: request.status,
    patientName: `${request.visit.patient.lastName}, ${request.visit.patient.firstName}`,
    frequency: request.frequency || "",
    duration: request.duration || "",
    dosage: request.inventoryItem?.dosage || "",
    brandName: request.inventoryItem?.brandName || "",
    createdAt: formatDate(request.createdAt),
    resolvedAt: request.resolvedAt ? formatDate(request.resolvedAt) : "",
  }));

  return (
    <AppShell>
      <PageHeader title="Item Requests" eyebrow="Inventory / Request queue" />
      <ActionAlert error={params?.error} message={params?.message} />

      <nav className="mb-4 flex overflow-x-auto border-b" aria-label="Item request views">
        <Link
          href="/item-requests"
          className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${!historyView ? "border-primary text-primary" : "border-transparent text-slate-500"}`}
        >
          <Clock3 className="h-4 w-4" /> Pending
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">{pendingCount}</span>
        </Link>
        <Link
          href="/item-requests?view=history"
          className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${historyView ? "border-primary text-primary" : "border-transparent text-slate-500"}`}
        >
          <History className="h-4 w-4" /> History
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{historyCount}</span>
        </Link>
      </nav>

      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex items-center gap-3 border-b bg-slate-50 px-4 py-3">
          <PackageCheck className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-black">{historyView ? "Request history" : "Pending requests"}</h2>
            <p className="text-sm text-slate-500">
              {historyView ? "Completed approval decisions and stock releases." : "One row represents one request, regardless of quantity."}
            </p>
          </div>
        </div>
        <ItemRequestList requests={requestRows} historyView={historyView} canResolveRequests={canResolveRequests} />
      </section>
    </AppShell>
  );
}
