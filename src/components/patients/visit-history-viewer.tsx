"use client";

import { useState } from "react";
import { Activity, CalendarClock, CheckCircle2, ClipboardList, Pill, Stethoscope, Syringe, type LucideIcon } from "lucide-react";
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
      <p className="border bg-white px-4 py-8 text-center text-sm text-slate-500">
        No assessment history recorded yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.42fr)_minmax(0,1fr)]">
      <section className="min-w-0 overflow-hidden border bg-white">
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
        <div className="border bg-white">
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

        <div className="border bg-white">
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

        <div className="border bg-white">
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
          <div className="min-w-0 border bg-white">
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

          <div className="min-w-0 border bg-white">
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

          <div className="min-w-0 border bg-white">
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

        {selectedVisit.status === "Completed" ? (
          <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            This visit is completed and shown as history.
          </div>
        ) : null}
      </section>
    </div>
  );
}
