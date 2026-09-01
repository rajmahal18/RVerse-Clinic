"use client";

import { useMemo, useState } from "react";
import { FlaskConical, Plus, Printer } from "lucide-react";
import { LabResultType } from "@prisma/client";
import { saveLabResultAction } from "@/app/actions/workflow";
import { labFieldName, labForms, labTypeLabels } from "@/lib/lab-results";
import type { PatientVisitWorkflow } from "@/lib/patient-view";
import { CsrfField } from "@/components/security/csrf-field";
import { Button } from "@/components/ui/button";

type LabRecord = PatientVisitWorkflow["labResults"][number];

const labTypes = [LabResultType.CLINICAL_CHEMISTRY, LabResultType.URINALYSIS, LabResultType.HEMATOLOGY];

function LabInput({ name, defaultValue }: { name: string; defaultValue?: string }) {
  return <input name={name} defaultValue={defaultValue ?? ""} className="h-9 min-w-0 rounded-lg border px-2 text-sm" />;
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
    <form action={saveLabResultAction} className="min-w-0 border bg-white">
      <CsrfField />
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="type" value={type} />
      {record ? <input type="hidden" name="labResultId" value={record.id} /> : null}
      <div className="grid gap-3 border-b bg-slate-50 px-3 py-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold">Date Received<input name="dateReceived" type="date" defaultValue={record?.dateReceived ?? ""} className="h-10 rounded-xl border px-3 font-normal" /></label>
        <label className="grid gap-1 text-sm font-semibold">Date Released<input name="dateReleased" type="date" defaultValue={record?.dateReleased ?? ""} className="h-10 rounded-xl border px-3 font-normal" /></label>
        <label className="grid gap-1 text-sm font-semibold">Laboratory / Hospital<input name="laboratoryHospital" defaultValue={record?.laboratoryHospital ?? ""} className="h-10 rounded-xl border px-3 font-normal" /></label>
      </div>
      <div className="grid gap-4 p-3">
        {definition.sections.map((section) => (
          <section key={section.title} className="min-w-0 overflow-hidden border">
            <h4 className="border-b bg-blue-50 px-3 py-2 text-sm font-black uppercase text-slate-900">{section.title}</h4>
            {section.mode === "dual" ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr><th rowSpan={2} className="w-48 px-2 py-2 text-left">Test Name</th><th colSpan={3} className="px-2 py-2">S.I. Units</th><th colSpan={3} className="px-2 py-2">Conventional Units</th></tr>
                    <tr><th className="px-2 py-2">Result</th><th>Unit</th><th>Reference Range</th><th>Result</th><th>Unit</th><th>Reference Range</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {section.tests.map((test) => (
                      <tr key={test.key}>
                        <td className="px-2 py-2 font-semibold">{test.name}</td>
                        <td className="px-2 py-1"><LabInput name={labFieldName(test.key, "siResult")} defaultValue={record?.values[`${test.key}.siResult`]} /></td>
                        <td className="px-2 py-2 text-xs text-slate-500">{test.siUnit}</td>
                        <td className="px-2 py-2 text-xs text-slate-500">{test.siReferenceRange}</td>
                        <td className="px-2 py-1"><LabInput name={labFieldName(test.key, "conventionalResult")} defaultValue={record?.values[`${test.key}.conventionalResult`]} /></td>
                        <td className="px-2 py-2 text-xs text-slate-500">{test.conventionalUnit}</td>
                        <td className="px-2 py-2 text-xs text-slate-500">{test.conventionalReferenceRange}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="divide-y">
                {section.tests.map((test) => (
                  <div key={test.key} className="grid gap-2 px-3 py-2 md:grid-cols-[minmax(10rem,1fr)_10rem_8rem_11rem] md:items-center">
                    <p className="font-semibold text-slate-900">{test.name}</p>
                    <LabInput name={labFieldName(test.key, "result")} defaultValue={record?.values[`${test.key}.result`]} />
                    <p className="text-xs text-slate-500">{test.unit || "-"}</p>
                    <p className="text-xs text-slate-500">{test.referenceRange || "-"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
        <div className="flex flex-wrap justify-end gap-2">
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
      <div className="border bg-white">
        <div className="border-b bg-slate-50 px-4 py-3">
          <h3 className="font-black text-slate-900">Laboratory Results</h3>
          <p className="text-sm text-slate-500">Encode structured laboratory results for this visit.</p>
        </div>
        <div className="flex max-w-full gap-1 overflow-x-auto border-b px-3 pt-2">
          {labTypes.map((option) => (
            <button key={option} type="button" onClick={() => { setType(option); setRecordId("new"); }} className={`shrink-0 border-b-2 px-3 py-2 text-sm font-bold ${type === option ? "border-primary text-primary" : "border-transparent text-slate-500"}`}>
              {labTypeLabels[option]}
            </button>
          ))}
        </div>
        <div className="flex max-w-full gap-2 overflow-x-auto p-3">
          <button type="button" onClick={() => setRecordId("new")} className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${recordId === "new" ? "border-primary text-primary" : "text-slate-600"}`}>
            <Plus className="h-4 w-4" /> New
          </button>
          {recordsForType.map((record) => (
            <button key={record.id} type="button" onClick={() => setRecordId(record.id)} className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs ${selectedRecord?.id === record.id ? "border-primary bg-teal-50 text-primary" : "text-slate-600"}`}>
              <b>{record.dateReleased || record.createdAt}</b>
              <span className="block">{record.laboratoryHospital || "No laboratory"}</span>
            </button>
          ))}
        </div>
      </div>
      <LabForm patientId={patientId} visitId={visit.id} type={type} record={selectedRecord} />
    </div>
  );
}
