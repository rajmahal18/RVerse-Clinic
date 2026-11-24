import Link from "@/components/navigation/app-link";
import { prisma } from "@/lib/prisma";
import { RecordAction } from "./record-action";

const kinds = {
  User: ["Accounts", "user"],
  Patient: ["Patients", "patient"],
  Visit: ["Visits", "visit"],
  InventoryItem: ["Inventory", "inventoryItem"],
  VisitRequest: ["Removed services", "visitRequest"],
  MedicineRequest: ["Medicines", "medicineRequest"],
  LabResult: ["Laboratory", "labResult"],
  VaccinationRecord: ["Vaccinations", "vaccinationRecord"],
  Referral: ["Referrals", "referral"],
  FollowUp: ["Follow-ups", "followUp"],
} as const;

export async function ArchiveRegistry({
  clinicId,
  kind: requestedKind,
  page: requestedPage,
}: {
  clinicId: string;
  kind?: string;
  page?: string;
}) {
  const kind =
    requestedKind && Object.hasOwn(kinds, requestedKind)
      ? (requestedKind as keyof typeof kinds)
      : "Patient";
  const page = Math.max(1, Math.floor(Number(requestedPage) || 1));
  const delegate = prisma[kinds[kind][1]] as any;
  const where = {
    deletedAt: { not: null },
    ...(["User", "Patient", "InventoryItem"].includes(kind)
      ? { clinicId }
      : kind === "Visit"
        ? { patient: { clinicId } }
        : kind === "MedicineRequest"
          ? {
              OR: [
                { visit: { patient: { clinicId } } },
                { visitId: null, inventoryItem: { clinicId } },
              ],
            }
          : { visit: { patient: { clinicId } } }),
  };
  const [records, count] = await Promise.all([
    delegate.findMany({
      where,
      orderBy: { deletedAt: "desc" },
      skip: (page - 1) * 30,
      take: 30,
    }),
    delegate.count({ where }),
  ]);
  return (
    <section className="min-w-0 border bg-white">
      <h3 className="px-4 pt-4 font-bold">Archived / Voided Records</h3>
      <p className="px-4 py-2 text-sm text-slate-500">
        Restore a patient before its visits, and a visit before its service
        records. Previously deleted records are listed only if their data was
        retained.
      </p>
      <nav
        aria-label="Archive record types"
        className="flex max-w-full gap-1 overflow-x-auto border-b px-2"
      >
        {Object.entries(kinds).map(([key, [label]]) => (
          <Link
            key={key}
            href={`/settings?tab=archives&archiveKind=${key}`}
            className={`shrink-0 border-b-2 px-3 py-3 text-sm ${kind === key ? "border-primary font-bold text-primary" : "border-transparent text-slate-500"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="divide-y">
        {records.map((record: any) => {
          const label =
            record.name ||
            [record.lastName, record.firstName].filter(Boolean).join(", ") ||
            record.itemName ||
            record.vaccine ||
            record.type ||
            (record.timeIn
              ? new Date(record.timeIn).toLocaleString("en-PH", {
                  timeZone: "Asia/Manila",
                })
              : record.id);
          return (
            <div
              key={record.id}
              className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold">{label}</p>
                <p className="break-words text-xs text-slate-500">
                  Archived:{" "}
                  {new Date(record.deletedAt).toLocaleString("en-PH", {
                    timeZone: "Asia/Manila",
                  })}
                </p>
              </div>
              <RecordAction
                kind={kind}
                recordId={record.id}
                label={label}
                summary={
                  kind === "MedicineRequest"
                    ? "If stock was returned when this record was voided, restoring the issued record deducts that quantity again. Restoration is rejected if stock is insufficient."
                    : "Restores this record. Independently archived linked records remain archived."
                }
                restoring
              />
            </div>
          );
        })}
      </div>
      {!records.length && (
        <p className="p-6 text-center text-sm text-slate-500">
          No archived records in this category.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3 text-sm">
        <span>{count} records</span>
        <div className="flex gap-3">
          {page > 1 && (
            <Link
              href={`/settings?tab=archives&archiveKind=${kind}&archivePage=${page - 1}`}
            >
              Previous
            </Link>
          )}
          {page * 30 < count && (
            <Link
              href={`/settings?tab=archives&archiveKind=${kind}&archivePage=${page + 1}`}
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
