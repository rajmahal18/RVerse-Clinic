"use client";

import { useMemo, useState } from "react";
import { CalendarDays, FlaskConical, Hospital, Plus, Printer } from "lucide-react";
import { LabResultType } from "@prisma/client";
import { saveLabResultAction } from "@/app/actions/workflow";
import { labFieldName, labForms, labTypeLabels } from "@/lib/lab-results";
import type { PatientVisitWorkflow } from "@/lib/patient-view";
import { CsrfField } from "@/components/security/csrf-field";
import { Button } from "@/components/ui/button";

type LabRecord = PatientVisitWorkflow["labResults"][number];

const labTypes = [LabResultType.CLINICAL_CHEMISTRY, LabResultType.URINALYSIS, LabResultType.HEMATOLOGY];

function LabInput({ name, defaultValue }: { name: string; defaultValue?: string }) {
  return <input name={name} defaultValue={defaultValue ?? ""} className="h-9 w-full min-w-0 rounded-lg border bg-white px-2 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15" />;
}

function LabForm({
  patientId,
  visitId,
  type,
  record,
}: {
  patientId: string;
  visitId: string;
  type: LabResultType;
  record: LabRecord | null;
}) {
  const definition = labForms[type];

  return (
    <form action={saveLabResultAction} className="min-w-0 overflow-hidden rounded-2xl border bg-white shadow-soft">
      <CsrfField />
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="type" value={type} />
      {record ? <input type="hidden" name="labResultId" value={record.id} /> : null}

      <div className="border-b bg-slate-50/70 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">{labTypeLabels[type]}</p>
            <p className="mt-0.5 text-sm text-slate-500">{record ? "Editing a saved laboratory result." : "New laboratory result."}</p>
          </div>
          {record ? <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">Saved record</span> : null}
        </div>
      </div>

      <div className="grid gap-3 border-b px-4 py-4 md:grid-cols-3">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-slate-400" /> Date Received</span>
          <input name="dateReceived" type="date" defaultValue={record?.dateReceived ?? ""} className="h-10 rounded-xl border px-3 font-normal" />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-slate-400" /> Date Released</span>
          <input name="dateReleased" type="date" defaultValue={record?.dateReleased ?? ""} className="h-10 rounded-xl border px-3 font-normal" />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          <span className="inline-flex items-center gap-1.5"><Hospital className="h-3.5 w-3.5 text-slate-400" /> Laboratory / Hospital</span>
          <input name="laboratoryHospital" defaultValue={record?.laboratoryHospital ?? ""} className="h-10 rounded-xl border px-3 font-normal" />
        </label>
      </div>

      <div className="grid gap-4 p-3 sm:p-4">
        {definition.sections.map((section) => (
          <section key={section.title} className="min-w-0 overflow-hidden rounded-xl border">
            <div className="border-b bg-slate-50 px-3 py-2.5">
              <h4 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">{section.title}</h4>
            </div>
            {section.mode === "dual" ? (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-white text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <tr className="border-b">
                      <th rowSpan={2} className="w-48 bg-slate-50 px-3 py-2 text-left text-slate-700">Test Name</th>
                      <th colSpan={3} className="border-l px-3 py-2 text-center text-primary">S.I. Units</th>
                      <th colSpan={3} className="border-l px-3 py-2 text-center text-slate-700">Conventional Units</th>
                    </tr>
                    <tr className="border-b bg-slate-50/60 text-center">
                      <th className="border-l px-2 py-2">Result</th><th className="px-2 py-2">Unit</th><th className="px-2 py-2">Reference Range</th>
                      <th className="border-l px-2 py-2">Result</th><th className="px-2 py-2">Unit</th><th className="px-2 py-2">Reference Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {section.tests.map((test) => (
                      <tr key={test.key} className="transition hover:bg-slate-50/60">
                        <td className="bg-white px-3 py-2 font-semibold text-slate-900">{test.name}</td>
                        <td className="border-l px-2 py-1.5"><LabInput name={labFieldName(test.key, "siResult")} defaultValue={record?.values[`${test.key}.siResult`]} /></td>
                        <td className="px-2 py-2 text-xs text-slate-500">{test.siUnit}</td>
                        <td className="px-2 py-2 text-xs text-slate-500">{test.siReferenceRange}</td>
                        <td className="border-l px-2 py-1.5"><LabInput name={labFieldName(test.key, "conventionalResult")} defaultValue={record?.values[`${test.key}.conventionalResult`]} /></td>
                        <td className="px-2 py-2 text-xs text-slate-500">{test.conventionalUnit}</td>
                        <td className="px-2 py-2 text-xs text-slate-500">{test.conventionalReferenceRange}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div>
                <div className="hidden grid-cols-[minmax(10rem,1fr)_10rem_8rem_11rem] border-b bg-slate-50/60 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 md:grid">
                  <span>Test Name</span><span>Result</span><span>Unit</span><span>Reference Range</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {section.tests.map((test) => (
                    <div key={test.key} className="grid gap-2 px-3 py-3 transition hover:bg-slate-50/60 md:grid-cols-[minmax(10rem,1fr)_10rem_8rem_11rem] md:items-center md:py-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{test.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400 md:hidden">{test.unit || "No unit"} · Ref {test.referenceRange || "—"}</p>
                      </div>
                      <LabInput name={labFieldName(test.key, "result")} defaultValue={record?.values[`${test.key}.result`]} />
                      <p className="hidden text-xs text-slate-500 md:block">{test.unit || "—"}</p>
                      <p className="hidden text-xs text-slate-500 md:block">{test.referenceRange || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        ))}

        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          {record ? (
            <Button asChild type="button" variant="outline">
              <a href={`/patients/${patientId}/labs/${record.id}/print`} target="_blank" rel="noreferrer"><Printer className="h-4 w-4" /> Print</a>
            </Button>
          ) : null}
          <Button type="submit"><FlaskConical className="h-4 w-4" /> Save Result</Button>
        </div>
      </div>
    </form>
  );
}

export function LabResultsPanel({ patientId, visit }: { patientId: string; visit: PatientVisitWorkflow }) {
  const [type, setType] = useState<LabResultType>(LabResultType.CLINICAL_CHEMISTRY);
  const [recordId, setRecordId] = useState<string>("new");
  const recordsForType = useMemo(() => visit.labResults.filter((record) => record.type === type), [visit.labResults, type]);
  const selectedRecord = recordId === "new" ? null : recordsForType.find((record) => record.id === recordId) ?? recordsForType[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-primary"><FlaskConical className="h-5 w-5" /></span>
            <div>
              <h3 className="font-black text-slate-900">Laboratory Results</h3>
              <p className="mt-0.5 text-sm text-slate-500">Encode and retain structured laboratory results for this visit.</p>
            </div>
          </div>
          <span className="w-fit rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">{visit.labResults.length} saved</span>
        </div>

        <div className="flex max-w-full gap-1 overflow-x-auto border-b px-3 pt-2">
          {labTypes.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => { setType(option); setRecordId("new"); }}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-bold transition ${type === option ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-900"}`}
            >
              {labTypeLabels[option]}
            </button>
          ))}
        </div>

        <div className="flex max-w-full items-center gap-2 overflow-x-auto bg-slate-50/50 p-3">
          <button
            type="button"
            onClick={() => setRecordId("new")}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-bold transition ${recordId === "new" ? "border-primary text-primary ring-2 ring-primary/10" : "text-slate-600 hover:border-slate-300"}`}
          >
            <Plus className="h-4 w-4" /> New result
          </button>
          {recordsForType.map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => setRecordId(record.id)}
              className={`shrink-0 rounded-xl border bg-white px-3 py-2 text-left text-xs transition ${selectedRecord?.id === record.id ? "border-primary text-primary ring-2 ring-primary/10" : "text-slate-600 hover:border-slate-300"}`}
            >
              <b className="block text-slate-800">{record.dateReleased || record.createdAt}</b>
              <span className="mt-0.5 block max-w-40 truncate">{record.laboratoryHospital || "Laboratory not specified"}</span>
            </button>
          ))}
        </div>
      </div>

      <LabForm patientId={patientId} visitId={visit.id} type={type} record={selectedRecord} />
    </div>
  );
}
