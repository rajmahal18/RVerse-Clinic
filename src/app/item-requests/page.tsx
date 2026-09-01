import Link from "next/link";
import { Clock3, History, PackageCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ActionAlert } from "@/components/ui/action-alert";
import { ItemRequestList } from "@/components/item-requests/item-request-list";
import { ItemRequestModal } from "@/components/item-requests/item-request-modal";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/date-time";
import { Prisma, UserRole } from "@prisma/client";
import { getInventoryRequestOptions } from "@/lib/patient-view";

const formatDate = (value: Date) => formatDateTime(value);

export default async function ItemRequestsPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const historyView = params?.view === "history";
  const myRequestsView = params?.view === "my";
  const clinicId = currentUser?.clinicId ?? "__unauthenticated__";
  const clinicRequestWhere: Prisma.MedicineRequestWhereInput = {
    OR: [
      { visit: { patient: { clinicId } } },
      { inventoryItem: { clinicId } },
    ],
  };
  const requestWhere: Prisma.MedicineRequestWhereInput = myRequestsView
    ? { AND: [clinicRequestWhere, { requestedByUserId: currentUser?.id ?? "__unauthenticated__" }] }
    : historyView
      ? { AND: [clinicRequestWhere, { status: { in: ["APPROVED", "REJECTED", "RELEASED"] } }] }
      : { AND: [clinicRequestWhere, { status: "REQUESTED" }] };
  const [pendingCount, historyCount, myRequestsCount, requests, inventoryOptions] = await Promise.all([
    prisma.medicineRequest.count({ where: { AND: [clinicRequestWhere, { status: "REQUESTED" }] } }),
    prisma.medicineRequest.count({ where: { AND: [clinicRequestWhere, { status: { in: ["APPROVED", "REJECTED", "RELEASED"] } }] } }),
    prisma.medicineRequest.count({ where: { AND: [clinicRequestWhere, { requestedByUserId: currentUser?.id ?? "__unauthenticated__" }] } }),
    prisma.medicineRequest.findMany({
      where: requestWhere,
      orderBy: myRequestsView || historyView ? [{ resolvedAt: "desc" }, { createdAt: "desc" }] : { createdAt: "asc" },
      include: { inventoryItem: true, requestedBy: true, visit: { include: { patient: true } } },
    }),
    currentUser ? getInventoryRequestOptions(currentUser.clinicId) : [],
  ]);
  const canResolveRequests = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPPLY_OFFICER;
  const requestRows = requests.map((request) => ({
    id: request.id,
    itemName: request.itemName,
    quantity: request.quantity,
    status: request.status,
    patientName: request.visit ? `${request.visit.patient.lastName}, ${request.visit.patient.firstName}` : "Internal inventory request",
    requestedBy: request.requestedBy?.name || "",
    frequency: request.frequency || "",
    duration: request.duration || "",
    dosage: request.inventoryItem?.dosage || "",
    brandName: request.inventoryItem?.brandName || "",
    remarks: request.remarks || "",
    createdAt: formatDate(request.createdAt),
    resolvedAt: request.resolvedAt ? formatDate(request.resolvedAt) : "",
  }));

  return (
    <AppShell>
      <PageHeader title="Item Requests" eyebrow="Inventory / Request queue" actions={<ItemRequestModal inventoryOptions={inventoryOptions} />} />
      <ActionAlert error={params?.error} message={params?.message} />

      <nav className="mb-4 flex overflow-x-auto border-b" aria-label="Item request views">
        <Link
          href="/item-requests?view=my"
          className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${myRequestsView ? "border-primary text-primary" : "border-transparent text-slate-500"}`}
        >
          <PackageCheck className="h-4 w-4" /> My Requests
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{myRequestsCount}</span>
        </Link>
        <Link
          href="/item-requests"
          className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${!historyView && !myRequestsView ? "border-primary text-primary" : "border-transparent text-slate-500"}`}
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
            <h2 className="font-black">{myRequestsView ? "My requests" : historyView ? "Request history" : "Pending requests"}</h2>
            <p className="text-sm text-slate-500">
              {myRequestsView ? "Requests created by your signed-in account." : historyView ? "Completed approval decisions and stock releases." : "One row represents one request, regardless of quantity."}
            </p>
          </div>
        </div>
        <ItemRequestList requests={requestRows} historyView={historyView} canResolveRequests={canResolveRequests} />
      </section>
    </AppShell>
  );
}
