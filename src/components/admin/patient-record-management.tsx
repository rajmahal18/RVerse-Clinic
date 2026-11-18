import type { PatientVisitWorkflow } from "@/lib/patient-view";
import { RecordAction } from "./record-action";

export function PatientRecordManagement({
  patientId,
  visits,
}: {
  patientId: string;
  visits: PatientVisitWorkflow[];
}) {
  return (
    <details className="min-w-0 border bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-bold">
        Admin Record Management
      </summary>
      <p className="border-t px-4 py-3 text-sm text-slate-500">
        Use Edit to correct a valid record. Use Remove or Void for duplicates
        and incorrect records. Deleted records can be restored in Settings →
        Archives.
      </p>
      <div className="divide-y-4 divide-slate-100">
        {visits.map((visit) => {
          const records = [
            ...visit.requests.map((r) => ({
              kind: "VisitRequest",
              id: r.id,
              label: r.label,
              summary:
                "Removes this service from the visit. Linked clinical records must be voided first.",
            })),
            ...visit.medicines.map((r) => ({
              kind: "MedicineRequest",
              id: r.id,
              label: `${r.itemName} · Qty ${r.quantity} · ${r.status}`,
              summary:
                "Voids the medicine record without erasing stock movements. Choose stock handling explicitly for an issued medicine.",
              issuedMedicine: ["RELEASED", "RECEIVED"].includes(r.status),
            })),
            ...visit.labResults.map((r) => ({
              kind: "LabResult",
              id: r.id,
              label: r.typeLabel,
              summary:
                "Voids this laboratory result and excludes it from normal result history. Original values are retained.",
            })),
            ...visit.vaccinations.map((r) => ({
              kind: "VaccinationRecord",
              id: r.id,
              label: `${r.vaccine} · ${r.dose}`,
              summary:
                "Voids this vaccination record. Inventory movements remain unchanged.",
            })),
            ...visit.referrals.map((r) => ({
              kind: "Referral",
              id: r.id,
              label: `Referral: ${r.referredTo}`,
              summary:
                "Voids this referral record. Its original reason and remarks are retained.",
            })),
            ...visit.followUps.map((r) => ({
              kind: "FollowUp",
              id: r.id,
              label: `Follow-up: ${r.scheduledFor}`,
              summary: "Voids this follow-up record.",
            })),
          ];
          return (
            <section key={visit.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <h4 className="text-sm font-bold">
                  {visit.timeIn} · {visit.status}
                </h4>
                <RecordAction
                  kind="Visit"
                  recordId={visit.id}
                  label={`Visit ${visit.timeIn}`}
                  returnTo={`/patients/${patientId}`}
                  summary={`${visit.requests.length} services, ${visit.medicines.length} medicine records, ${visit.labResults.length} laboratory results, ${visit.vaccinations.length} vaccinations, ${visit.referrals.length} referrals, and ${visit.followUps.length} follow-ups will be hidden with this visit. Stock will not be returned automatically. The visit status and linked records are retained.`}
                />
              </div>
              <div className="divide-y">
                {records.map((r) => (
                  <div
                    key={`${r.kind}:${r.id}`}
                    className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <p className="min-w-0 break-words text-sm">
                      <span className="mr-2 text-xs text-slate-500">
                        {
                          (
                            {
                              VisitRequest: "Service",
                              MedicineRequest: "Medicine",
                              LabResult: "Laboratory",
                              VaccinationRecord: "Vaccination",
                              Referral: "Referral",
                              FollowUp: "Follow-up",
                            } as Record<string, string>
                          )[r.kind]
                        }
                      </span>
                      {r.label}
                    </p>
                    <RecordAction
                      kind={r.kind}
                      recordId={r.id}
                      label={r.label}
                      summary={r.summary}
                      issuedMedicine={
                        "issuedMedicine" in r
                          ? Boolean(r.issuedMedicine)
                          : false
                      }
                      returnTo={`/patients/${patientId}`}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </details>
  );
}
