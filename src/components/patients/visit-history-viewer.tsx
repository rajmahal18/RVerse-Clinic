"use client";

import { useState } from "react";
import { Activity, CalendarClock, CheckCircle2, ClipboardList, FlaskConical, Pill, Stethoscope, Syringe, type LucideIcon } from "lucide-react";
import { labForms } from "@/lib/lab-results";
import type { PatientVisitWorkflow } from "@/lib/patient-view";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0 border-b border-slate-100 px-3 py-2 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-800">{value || "-"}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b bg-slate-50 px-3 py-2 text-sm font-black text-slate-800">
      <Icon className="h-4 w-4 text-primary" />
      {title}
    </div>
  );
}

export function VisitHistoryViewer({ visits }: { visits: PatientVisitWorkflow[] }) {
  const [selectedVisitId, setSelectedVisitId] = useState(visits[0]?.id ?? "");
  const selectedVisit = visits.find((visit) => visit.id === selectedVisitId) ?? visits[0];

  if (!visits.length || !selectedVisit) {
    return (
      <p className="rounded-xl border border-dashed bg-white px-4 py-8 text-center text-sm text-slate-500">
        No assessment history recorded yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.42fr)_minmax(0,1fr)]">
      <section className="min-w-0 overflow-hidden rounded-2xl border bg-white shadow-soft">
        <div className="border-b bg-slate-50 px-3 py-2">
          <h3 className="text-sm font-black text-slate-900">Visit History</h3>
          <p className="text-xs text-slate-500">Select a row to review the visit record.</p>
        </div>

        <div className="divide-y">
          {visits.map((visit) => {
            const selected = visit.id === selectedVisit.id;

            return (
              <button
                key={visit.id}
                type="button"
                onClick={() => setSelectedVisitId(visit.id)}
                className={cn(
                  "grid w-full gap-2 px-3 py-3 text-left transition hover:bg-slate-50",
                  selected && "bg-teal-50 hover:bg-teal-50"
                )}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{visit.timeIn}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{visit.nurseOnDuty || "No assigned staff"}</p>
                  </div>
                  <Badge className={selected ? "shrink-0 bg-primary text-white" : "shrink-0 bg-slate-100 text-slate-700"}>
                    {visit.status}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-xs leading-5 text-slate-600">
                  {visit.requests.map((request) => request.label).join(", ") || "No request recorded"}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="min-w-0 space-y-4">
        <div className="overflow-hidden rounded-xl border bg-white">
          <SectionHeader icon={ClipboardList} title="Visit Summary" />
          <div className="grid md:grid-cols-3">
            <DetailItem label="Time in" value={selectedVisit.timeIn} />
            <DetailItem label="Time out" value={selectedVisit.timeOut} />
            <DetailItem label="Status" value={selectedVisit.status} />
          </div>
          <div className="grid md:grid-cols-2">
            <DetailItem label="Assigned staff" value={selectedVisit.nurseOnDuty} />
            <DetailItem label="Request" value={selectedVisit.requests.map((request) => request.label).join(", ")} />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white">
          <SectionHeader icon={Stethoscope} title="Assessment" />
          <div className="grid md:grid-cols-2">
            <DetailItem label="Chief complaint" value={selectedVisit.chiefComplaint} />
            <DetailItem label="Diagnosis" value={selectedVisit.diagnosis} />
          </div>
          <div className="grid md:grid-cols-2">
            <DetailItem label="Treatment plan" value={selectedVisit.treatmentPlan} />
            <DetailItem label="Progress notes / medical history" value={selectedVisit.progressNotes} />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white">
          <SectionHeader icon={Activity} title="Vital Signs" />
          <div className="grid grid-cols-2 md:grid-cols-5">
            <DetailItem label="BP" value={selectedVisit.bloodPressure} />
            <DetailItem label="Temp" value={selectedVisit.temperature} />
            <DetailItem label="PR" value={selectedVisit.pulseRate} />
            <DetailItem label="RR" value={selectedVisit.respiratoryRate} />
            <DetailItem label="RBS" value={selectedVisit.rbs} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="min-w-0 overflow-hidden rounded-xl border bg-white">
            <SectionHeader icon={Pill} title="Medicines" />
            <div className="divide-y">
              {selectedVisit.medicines.map((medicine) => (
                <div key={medicine.id} className="px-3 py-2 text-sm">
                  <p className="font-bold text-slate-800">{medicine.itemName}</p>
                  <p className="text-xs text-slate-500">Qty {medicine.quantity} / {medicine.frequency || "-"} / {medicine.duration || "-"}</p>
                  <p className="text-xs text-slate-500">{medicine.status}{medicine.releasedBy ? ` by ${medicine.releasedBy}` : ""}</p>
                </div>
              ))}
              {selectedVisit.medicines.length === 0 ? <p className="px-3 py-4 text-sm text-slate-500">No medicine records.</p> : null}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border bg-white">
            <SectionHeader icon={Syringe} title="Vaccination" />
            <div className="divide-y">
              {selectedVisit.vaccinations.map((record) => (
                <div key={record.id} className="px-3 py-2 text-sm">
                  <p className="font-bold text-slate-800">{record.vaccine}</p>
                  <p className="text-xs text-slate-500">{record.givenBy || "Clinic staff"}{record.dose ? ` / ${record.dose}` : ""}</p>
                  {record.remarks ? <p className="text-xs text-slate-500">{record.remarks}</p> : null}
                </div>
              ))}
              {selectedVisit.vaccinations.length === 0 ? <p className="px-3 py-4 text-sm text-slate-500">No vaccination records.</p> : null}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border bg-white">
            <SectionHeader icon={CalendarClock} title="Follow-ups" />
            <div className="divide-y">
              {selectedVisit.followUps.map((followUp) => (
                <div key={followUp.id} className="px-3 py-2 text-sm">
                  <p className="font-bold text-slate-800">{followUp.scheduledFor}</p>
                  <p className="text-xs text-slate-500">{followUp.remarks || "No remarks"}</p>
                  <p className="text-xs text-slate-500">{followUp.status}</p>
                </div>
              ))}
              {selectedVisit.followUps.length === 0 ? <p className="px-3 py-4 text-sm text-slate-500">No follow-up records.</p> : null}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white">
          <SectionHeader icon={FlaskConical} title="Laboratory Results" />
          <div className="divide-y">
            {selectedVisit.labResults.map((result) => {
              const definition = labForms[result.type];
              return (
                <details key={result.id} className="px-3 py-2 text-sm">
                  <summary className="cursor-pointer font-bold text-slate-800">
                    {result.typeLabel} / Received {result.dateReceived || "-"} / Released {result.dateReleased || "-"}
                    <span className="block text-xs font-normal text-slate-500">{result.laboratoryHospital || "No laboratory recorded"}</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    {definition.sections.map((section) => (
                      <div key={section.title} className="overflow-hidden rounded-lg border">
                        <p className="border-b bg-slate-50 px-2 py-1 text-xs font-black uppercase text-slate-600">{section.title}</p>
                        <div className="divide-y">
                          {section.tests.map((test) => {
                            const primary = result.values[`${test.key}.result`];
                            const si = result.values[`${test.key}.siResult`];
                            const conventional = result.values[`${test.key}.conventionalResult`];
                            const display = section.mode === "dual"
                              ? [`SI: ${si || "-"}`, `Conventional: ${conventional || "-"}`].join(" / ")
                              : primary || "-";
                            return (
                              <div key={test.key} className="grid gap-1 px-2 py-1 md:grid-cols-[14rem_1fr]">
                                <span className="font-semibold text-slate-700">{test.name}</span>
                                <span className="text-slate-600">{display}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
            {selectedVisit.labResults.length === 0 ? <p className="px-3 py-4 text-sm text-slate-500">No laboratory results recorded.</p> : null}
          </div>
        </div>

        {selectedVisit.status === "Completed" ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            This visit is completed and shown as history.
          </div>
        ) : null}
      </section>
    </div>
  );
}
