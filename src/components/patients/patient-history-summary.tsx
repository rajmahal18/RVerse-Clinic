import type { PatientVisitWorkflow } from "@/lib/patient-view";
import { PatientRecordTabs } from "./patient-record-tabs";
import { PatientMedicineHistory } from "./patient-medicine-history";
import { labForms } from "@/lib/lab-results";

export function PatientHistorySummary({
  visits,
  patientId,
  canReceive,
}: {
  visits: PatientVisitWorkflow[];
  patientId: string;
  canReceive: boolean;
}) {
  return (
    <details className="min-w-0 border bg-white">
      <summary className="cursor-pointer bg-slate-50 px-4 py-3 font-bold">
        Patient Summary · Assessment / Medicine Log / Laboratory
      </summary>
      <div className="min-w-0 p-3">
        <PatientRecordTabs
          tabs={[
            {
              id: "assessment-summary",
              label: "ASSESSMENT",
              content: (
                <div className="divide-y-4 divide-slate-200">
                  {visits.map((visit) => (
                    <section key={visit.id} className="py-3">
                      <h3 className="bg-slate-50 p-2 font-bold">
                        {visit.timeIn} · {visit.status}
                      </h3>
                      <dl className="grid gap-3 p-3 sm:grid-cols-2">
                        {[
                          ["Chief Complaint", visit.chiefComplaint],
                          ["Nurse Notes", visit.intakeNotes],
                          ["Doctor Assessment", visit.progressNotes],
                          ["Physical Examination", visit.physicalExam],
                          ["Diagnosis", visit.diagnosis],
                          ["Diagnosis Notes", visit.diagnosisNotes],
                          ["Treatment", visit.treatmentPlan],
                        ].map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <dt className="text-xs font-bold text-slate-500">
                              {label}
                            </dt>
                            <dd className="whitespace-pre-wrap break-words text-sm">
                              {value || "Not recorded"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
              ),
            },
            {
              id: "medicine-summary",
              label: "MEDICINE LOG",
              content: (
                <PatientMedicineHistory
                  visits={visits}
                  patientId={patientId}
                  canReceive={canReceive}
                />
              ),
            },
            {
              id: "lab-summary",
              label: "LABORATORY RESULTS",
              content: (
                <div className="divide-y-4 divide-slate-200">
                  {visits
                    .filter((v) => v.labResults.length)
                    .map((visit) => (
                      <section key={visit.id} className="py-3">
                        <h3 className="bg-slate-50 p-2 font-bold">
                          Visit: {visit.timeIn}
                        </h3>
                        {visit.labResults.map((result) => (
                          <div key={result.id} className="border-b py-3">
                            <h4 className="font-semibold">
                              {result.typeLabel}
                            </h4>
                            <p className="text-xs text-slate-500">
                              {result.laboratoryHospital} · Received:{" "}
                              {result.dateReceived || "Not recorded"} ·
                              Released: {result.dateReleased || "Not recorded"}
                            </p>
                            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                              {Object.entries(result.values).map(
                                ([key, value]) => (
                                  <div key={key} className="min-w-0 text-sm">
                                    <dt className="text-slate-500">
                                      {labForms[result.type].sections
                                        .flatMap((s) => s.tests)
                                        .find((t) =>
                                          key.startsWith(`${t.key}.`),
                                        )?.name ?? key}{" "}
                                      {key.endsWith("siResult")
                                        ? "(SI)"
                                        : key.endsWith("conventionalResult")
                                          ? "(Conventional)"
                                          : ""}
                                    </dt>
                                    <dd className="break-words font-semibold">
                                      {value}
                                    </dd>
                                  </div>
                                ),
                              )}
                            </dl>
                          </div>
                        ))}
                      </section>
                    ))}
                  {!visits.some((v) => v.labResults.length) && (
                    <p className="p-4 text-sm text-slate-500">
                      No laboratory results recorded.
                    </p>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </details>
  );
}
