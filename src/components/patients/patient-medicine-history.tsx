import type { PatientVisitWorkflow } from "@/lib/patient-view";
import { receiveMedicineAction } from "@/app/actions/workflow";
import { CsrfField } from "@/components/security/csrf-field";
import { Button } from "@/components/ui/button";

export function PatientMedicineHistory({
  visits,
  patientId,
  canReceive,
}: {
  visits: PatientVisitWorkflow[];
  patientId: string;
  canReceive: boolean;
}) {
  return (
    <div className="min-w-0 divide-y-4 divide-slate-200">
      {visits.map((visit) => (
        <section key={visit.id} className="min-w-0 py-4">
          <h3 className="border-y bg-slate-50 px-3 py-2 font-bold">
            Visit: {visit.timeIn}{" "}
            <span className="ml-2 text-sm font-normal">{visit.status}</span>
          </h3>
          <div className="divide-y">
            {visit.medicines.map((medicine) => (
              <article key={medicine.id} className="min-w-0 px-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="break-words font-semibold">
                    {medicine.itemName}
                  </h4>
                  <span
                    className={`rounded px-2 py-1 text-xs font-bold ${medicine.status === "RECEIVED" ? "bg-emerald-50 text-emerald-700" : medicine.status === "REJECTED" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}
                  >
                    {medicine.status === "REQUESTED"
                      ? "Awaiting approval"
                      : medicine.status}
                  </span>
                </div>
                {medicine.batchLabel && (
                  <p className="mt-1 text-sm text-slate-500">
                    {medicine.batchLabel}
                  </p>
                )}
                <p className="mt-1 text-sm">
                  Quantity: {medicine.quantity} ·{" "}
                  {medicine.frequency || "No frequency recorded"} ·{" "}
                  {medicine.duration || "No duration recorded"}
                </p>
                {medicine.remarks && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">
                    Remarks: {medicine.remarks}
                  </p>
                )}
                {medicine.releasedAt && (
                  <p className="mt-1 text-sm text-slate-600">
                    Released: {medicine.releasedAt}{" "}
                    {medicine.releasedBy && `by ${medicine.releasedBy}`}
                  </p>
                )}
                {medicine.receivedAt && (
                  <p className="mt-1 text-sm text-emerald-700">
                    Received: {medicine.receivedAt} by{" "}
                    {medicine.receivedBy || "Patient"}
                  </p>
                )}
              </article>
            ))}
          </div>
          {!visit.medicines.length && (
            <p className="p-3 text-sm text-slate-500">
              No medicine requests for this visit.
            </p>
          )}
          {canReceive &&
            visit.medicines.some((m) => m.status === "RELEASED") && (
              <div className="mt-3 border-t-2 border-blue-300 bg-blue-50 p-3">
                <h4 className="mb-3 font-bold text-blue-900">
                  Released medicines — confirm receipt
                </h4>
                {visit.medicines
                  .filter((m) => m.status === "RELEASED")
                  .map((medicine) => (
                    <form
                      key={medicine.id}
                      action={receiveMedicineAction}
                      className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
                    >
                      <CsrfField />
                      <input type="hidden" name="patientId" value={patientId} />
                      <input
                        type="hidden"
                        name="medicineRequestId"
                        value={medicine.id}
                      />
                      <p className="break-words text-sm font-semibold">
                        {medicine.itemName} · Qty {medicine.quantity}
                      </p>
                      <input
                        name="receivedBy"
                        aria-label={`Received by for ${medicine.itemName}`}
                        placeholder="Received by"
                        className="h-11 w-full min-w-0 rounded-lg border px-3"
                      />
                      <Button type="submit">Mark received</Button>
                    </form>
                  ))}
              </div>
            )}
        </section>
      ))}
      {!visits.length && (
        <p className="p-4 text-sm text-slate-500">No medicine history.</p>
      )}
    </div>
  );
}
