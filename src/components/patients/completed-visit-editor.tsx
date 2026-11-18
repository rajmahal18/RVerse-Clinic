"use client";

import { useState } from "react";
import type { PatientVisitWorkflow } from "@/lib/patient-view";
import { RequestType } from "@prisma/client";
import { correctCompletedVisitAction } from "@/app/actions/workflow";
import { ChiefComplaintField } from "./chief-complaint-field";
import { DiagnosisField } from "./diagnosis-field";
import { ServiceRequestedFields } from "./service-requested-fields";
import { CsrfField } from "@/components/security/csrf-field";
import { Button } from "@/components/ui/button";
import { getLabFieldKeys, labForms } from "@/lib/lab-results";
import { ccQuestions, scale } from "@/lib/survey-questions";
import { requestTypeLabels } from "@/lib/clinic-services";

function Field({
  name,
  label,
  value,
  number = false,
  readOnly = false,
  type,
}: {
  type?: string;
  name: string;
  label: string;
  value: string | number;
  number?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      <input
        name={name}
        defaultValue={value}
        type={type ?? (number ? "number" : "text")}
        min={number ? 1 : undefined}
        step={number ? 1 : undefined}
        readOnly={readOnly}
        required={number}
        className="h-11 w-full min-w-0 rounded-lg border px-3"
      />
    </label>
  );
}

function SurveyCorrectionField({
  field,
  value,
}: {
  field: string;
  value: string | number | null;
}) {
  const options: readonly string[] | undefined =
    ccQuestions.find((q) => q[0] === field)?.[2] ??
    (field.startsWith("sqd")
      ? scale
      : field === "respondentSex"
        ? ["Male", "Female"]
        : field === "customerType"
          ? ["Employee", "Dependent", "Other"]
          : field === "clientType"
            ? ["Citizen", "Business", "Government"]
            : undefined);
  const label = field.replace(/([A-Z])/g, " $1");
  if (options)
    return (
      <label className="grid min-w-0 gap-1 text-sm">
        <span className="font-semibold">{label}</span>
        <select
          name={`survey:${field}`}
          defaultValue={value ?? ""}
          className="h-11 w-full min-w-0 rounded-lg border px-2"
        >
          <option value="">Not specified</option>
          {value && !options.includes(String(value)) && (
            <option value={value}>{value}</option>
          )}
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  return (
    <Field
      name={`survey:${field}`}
      readOnly={field === "serviceAvailed"}
      label={label}
      value={value ?? ""}
      type={
        field === "surveyDate"
          ? "date"
          : field === "respondentAge"
            ? "number"
            : field === "email"
              ? "email"
              : "text"
      }
    />
  );
}

export function CompletedVisitEditor({
  patientId,
  visits,
  complaints,
  diseases,
}: {
  patientId: string;
  visits: PatientVisitWorkflow[];
  complaints: string[];
  diseases: { id: string; name: string; isActive: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState(visits[0]?.id ?? "");
  const visit = visits.find((v) => v.id === id) ?? visits[0];
  if (!visit) return null;
  return (
    <div className="flex justify-end">
      <Button variant="outline" type="button" onClick={() => setOpen(true)}>
        Edit Completed Services
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-2 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="completed-edit-title"
            className="flex max-h-[94dvh] w-full max-w-4xl min-w-0 flex-col overflow-hidden rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b p-4">
              <h2 id="completed-edit-title" className="font-bold">
                Edit Completed Services
              </h2>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
            <label className="grid gap-1 border-b p-4 text-sm font-semibold">
              Completed visit
              <select
                value={visit.id}
                onChange={(e) => setId(e.target.value)}
                className="h-11 min-w-0 rounded-lg border px-2"
              >
                {visits.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.timeIn}
                  </option>
                ))}
              </select>
            </label>
            <form
              key={visit.id + visit.updatedAt}
              action={correctCompletedVisitAction}
              className="grid min-h-0 min-w-0 gap-5 overflow-y-auto p-4"
            >
              <CsrfField />
              <input type="hidden" name="patientId" value={patientId} />
              <input type="hidden" name="visitId" value={visit.id} />
              <input type="hidden" name="version" value={visit.updatedAt} />
              <label className="grid gap-1 text-sm font-semibold">
                Reason for correction
                <textarea
                  name="correctionReason"
                  required
                  className="rounded-lg border p-2"
                />
              </label>
              <Field
                name="nurseOnDuty"
                label="Assigned nurse / staff"
                value={visit.nurseOnDuty ?? ""}
              />
              <ServiceRequestedFields lockExisting defaultReferralReason={visit.referralReason}
                options={Object.values(RequestType).map((value) => ({
                  value,
                  label: requestTypeLabels[value],
                }))}
                defaultValues={visit.requests.map((r) => r.type)}
              />
              <section className="grid gap-3 rounded-lg border border-teal-200 p-4">
                <h3 className="font-bold text-teal-800">
                  Nurse Notes and Vital Signs
                </h3>
                <ChiefComplaintField
                  initialValue={visit.chiefComplaint}
                  additionalOptions={complaints}
                />
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["bloodPressure", "Blood pressure"],
                      ["temperature", "Temperature"],
                      ["pulseRate", "Pulse rate"],
                      ["respiratoryRate", "Respiratory rate"],
                      ["rbs", "RBS"],
                    ] as const
                  ).map(([name, label]) => (
                    <Field
                      key={name}
                      name={name}
                      label={label}
                      value={visit[name]}
                    />
                  ))}
                </div>
                <label className="grid gap-1 text-sm font-semibold">
                  Nurse Notes
                  <textarea
                    name="intakeNotes"
                    defaultValue={visit.intakeNotes}
                    className="min-h-24 rounded-lg border p-2"
                  />
                </label>
              </section>
              <section className="grid gap-3 rounded-lg border border-blue-200 p-4">
                <h3 className="font-bold text-blue-800">Doctor Assessment</h3>
                <label className="grid gap-1 text-sm font-semibold">
                  Progress Notes / Medical History
                  <textarea
                    name="progressNotes"
                    defaultValue={visit.progressNotes}
                    className="min-h-24 rounded-lg border p-2"
                  />
                </label>
                <DiagnosisField
                  disabled={false}
                  diseases={diseases.map((d) => ({
                    ...d,
                    name:
                      visit.diagnoses.find((s) => s.diseaseId === d.id)
                        ?.diseaseName ?? d.name,
                  }))}
                  selections={visit.diagnoses}
                  initialValue={visit.diagnosis}
                  initialNotes={visit.diagnosisNotes}
                  physicalExam={visit.physicalExam}
                  structured={visit.diagnosesStructured}
                />
                <label className="grid gap-1 text-sm font-semibold">
                  Treatment
                  <textarea
                    name="treatmentPlan"
                    defaultValue={visit.treatmentPlan}
                    className="min-h-24 rounded-lg border p-2"
                  />
                </label>
              </section>
              {visit.medicines.map((m) => (
                <fieldset
                  key={m.id}
                  className="grid min-w-0 gap-3 border-t pt-3 sm:grid-cols-2"
                >
                  <legend className="font-bold">
                    Medicine: {m.itemName} · {m.status}
                  </legend>
                  <Field
                    name={`medicine:${m.id}:quantity`}
                    label="Quantity"
                    value={m.quantity}
                    number
                  />
                  <Field
                    name={`medicine:${m.id}:frequency`}
                    label="Frequency"
                    value={m.frequency}
                  />
                  <Field
                    name={`medicine:${m.id}:duration`}
                    label="Duration"
                    value={m.duration}
                  />
                  <Field
                    name={`medicine:${m.id}:remarks`}
                    label="Remarks"
                    value={m.remarks}
                  />
                  <Field
                    name={`medicine:${m.id}:releasedBy`}
                    label="Released by"
                    value={m.releasedBy}
                  />
                  <Field
                    name={`medicine:${m.id}:receivedBy`}
                    label="Received by"
                    value={m.receivedBy}
                  />
                </fieldset>
              ))}
              {visit.labResults.map((l) => (
                <fieldset
                  key={l.id}
                  className="grid min-w-0 gap-3 border-t pt-3 sm:grid-cols-2"
                >
                  <legend className="font-bold">
                    Laboratory: {l.typeLabel}
                  </legend>
                  <Field
                    name={`lab:${l.id}:laboratoryHospital`}
                    label="Laboratory / Hospital"
                    value={l.laboratoryHospital}
                  />
                  <Field
                    name={`lab:${l.id}:dateReceived`}
                    type="date"
                    label="Date received"
                    value={l.dateReceived}
                  />
                  <Field
                    name={`lab:${l.id}:dateReleased`}
                    type="date"
                    label="Date released"
                    value={l.dateReleased}
                  />
                  {getLabFieldKeys(l.type).map((key) => (
                    <Field
                      key={key}
                      name={`lab:${l.id}:${key}`}
                      label={`${labForms[l.type].sections.flatMap((s) => s.tests).find((t) => key.startsWith(t.key + "."))?.name ?? key}${key.endsWith("siResult") ? " (SI)" : key.endsWith("conventionalResult") ? " (Conventional)" : ""}`}
                      value={l.values[key] ?? ""}
                    />
                  ))}
                </fieldset>
              ))}
              {visit.vaccinations.map((v) => (
                <fieldset
                  key={v.id}
                  className="grid min-w-0 gap-3 border-t pt-3 sm:grid-cols-2"
                >
                  <legend className="font-bold">Vaccination</legend>
                  <Field name={`vaccine:${v.id}:administeredAt`} label="Date given" type="date" value={v.dateGiven ?? ""} />
                  {(
                    [
                      ["vaccine", "Vaccine"],
                      ["dose", "Dose"],
                      ["givenBy", "Given by"],
                      ["remarks", "Remarks"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field
                      key={key}
                      name={`vaccine:${v.id}:${key}`}
                      label={label}
                      value={v[key]}
                    />
                  ))}
                </fieldset>
              ))}
              {visit.referrals.map((r) => (
                <fieldset
                  key={r.id}
                  className="grid min-w-0 gap-3 border-t pt-3 sm:grid-cols-2"
                >
                  <legend className="font-bold">Referral</legend>
                  {(
                    [
                      ["referredTo", "Referred to"],
                      ["reasonForReferral", "Reason"],
                      ["medicalHistory", "Medical history"],
                      ["remarks", "Remarks"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field
                      key={key}
                      name={`referral:${r.id}:${key}`}
                      label={label}
                      value={r[key]}
                    />
                  ))}
                </fieldset>
              ))}
              {visit.satisfactionSurvey && (
                <fieldset className="grid min-w-0 gap-3 border-t pt-3 sm:grid-cols-2">
                  <legend className="font-bold">
                    Client Satisfaction Measurement
                  </legend>
                  {Object.entries(visit.satisfactionSurvey)
                    .filter(([key]) => key !== "id")
                    .map(([key, value]) => (
                      <SurveyCorrectionField
                        key={key}
                        field={key}
                        value={key === "serviceAvailed" ? visit.servicesReceived : value}
                      />
                    ))}
                </fieldset>
              )}
              <p className="text-sm text-slate-600">
                Changes are logged with your name and reason. The visit remains
                completed. Corrections to issued quantities also adjust stock.
              </p>
              <Button type="submit">Save Corrections</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
