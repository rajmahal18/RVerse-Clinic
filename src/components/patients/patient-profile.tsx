import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronDown, FileText, Pencil, PlayCircle, Save, UserRound } from "lucide-react";
import { RequestType, UserRole, VisitStatus } from "@prisma/client";
import {
  autosaveVisitDraftAction,
  completeVisitAction,
  createVisitAction,
  receiveMedicineAction,
  requestMedicineAction,
  requestVaccineAction,
  scheduleReferralAction,
  startVisitAction,
  updateVisitAction,
  updateVisitStatusAction,
} from "@/app/actions/workflow";
import { getInventoryOptions, getPatientWorkflowProfile, getVaccineOptions } from "@/lib/patient-view";
import { NewVisitModal } from "@/components/patients/new-visit-modal";
import { PatientRecordTabs } from "@/components/patients/patient-record-tabs";
import { VisitStatusModal } from "@/components/patients/visit-status-modal";
import { VisitHistoryViewer } from "@/components/patients/visit-history-viewer";
import { ChiefComplaintField } from "@/components/patients/chief-complaint-field";
import { ServiceRequestedFields } from "@/components/patients/service-requested-fields";
import { SatisfactionSurveyModal } from "@/components/patients/satisfaction-survey-modal";
import { AutosaveForm } from "@/components/patients/autosave-form";
import { MedicineRequestModal, ReferralScheduleModal, VaccineRequestModal } from "@/components/patients/clinical-action-modals";
import { LabResultsPanel } from "@/components/patients/lab-results-panel";
import { CsrfField } from "@/components/security/csrf-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

const requestOptions = [
  { value: RequestType.CONSULTATION, label: "Medical Consultation" },
  { value: RequestType.MEDICINES, label: "Provision of Medicine" },
  { value: RequestType.VACCINATION, label: "Provision of Vaccine" },
  { value: RequestType.REGULAR_MEDICAL_CERTIFICATE, label: "Medical Certificate" },
  { value: RequestType.CS_211_MEDICAL_CERTIFICATE, label: "CS 211" },
  { value: RequestType.MEDICAL_ALLOWANCE, label: "Medical Allowance" },
  { value: RequestType.EMERGENCY, label: "Emergency Medical Services" },
  { value: RequestType.REFERRAL, label: "Referral" },
  { value: RequestType.FIRST_AID_KIT, label: "Provision of First Aid Kit" },
];

const statusOptions = [
  { value: VisitStatus.QUEUED, label: "Queued" },
  { value: VisitStatus.IN_PROGRESS, label: "In progress" },
  { value: VisitStatus.FOR_FOLLOW_UP, label: "For follow up" },
  { value: VisitStatus.COMPLETED, label: "Completed" },
  { value: VisitStatus.CANCELLED, label: "Cancelled" },
];

function medicineStatusLabel(status: string) {
  if (status === "REQUESTED") return "WAITING FOR APPROVAL";
  return status;
}

function medicineStatusTone(status: string) {
  if (status === "RECEIVED") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (status === "APPROVED" || status === "RELEASED") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  if (status === "REJECTED") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
}

function hasCompletedSatisfactionSurvey(survey: { cc1: string; cc2: string; cc3: string; sqd0: string; sqd1: string; sqd2: string; sqd3: string; sqd4: string; sqd5: string; sqd6: string; sqd7: string; sqd8: string } | null) {
  if (!survey) return false;
  return ["cc1", "cc2", "cc3", "sqd0", "sqd1", "sqd2", "sqd3", "sqd4", "sqd5", "sqd6", "sqd7", "sqd8"].every((key) => survey[key as keyof typeof survey]?.trim());
}

export async function PatientProfile({ id }: { id: string }) {
  const patient = await getPatientWorkflowProfile(id);

  if (!patient) {
    notFound();
  }

  const inventoryOptions = await getInventoryOptions(patient.clinicId);
  const vaccineOptions = await getVaccineOptions(patient.clinicId);
  const currentUser = await getCurrentUser();
  const canManageVisits = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.DOCTOR_NURSE;
  const canEditPatient = currentUser?.role === UserRole.ADMIN;
  const latestVisit = patient.latestVisit;
  const activeVisit = patient.visitHistory.find((visit) => visit.statusCode !== VisitStatus.COMPLETED && visit.statusCode !== VisitStatus.CANCELLED) ?? null;
  const historicalVisits = activeVisit
    ? patient.visitHistory.filter((visit) => visit.id !== activeVisit.id)
    : patient.visitHistory;
  const activeVisitSurveyComplete = activeVisit ? hasCompletedSatisfactionSurvey(activeVisit.satisfactionSurvey) : false;
  const activeVisitMedicineReady = activeVisit
    ? !activeVisit.medicines.some((medicine) => ["REQUESTED", "APPROVED", "RELEASED"].includes(medicine.status))
    : true;
  const activeVisitCompletionReady = activeVisitSurveyComplete && activeVisitMedicineReady;
  const medicineDecisionPending = activeVisit?.medicines.some((medicine) => medicine.status === "REQUESTED") ?? false;
  const medicineDecisionPendingMessage = "Medicine request is still awaiting pharmacist approval or rejection.";
  const medicineBlockMessage = medicineDecisionPending
    ? medicineDecisionPendingMessage
    : activeVisit?.medicines.some((medicine) => medicine.status === "APPROVED")
      ? "Approved medicine must be released before this visit can be completed."
      : activeVisit?.medicines.some((medicine) => medicine.status === "RELEASED")
        ? "Released medicine must be marked received before this visit can be completed."
        : "";
  const availableStatusOptions = statusOptions.filter((option) => {
    if (!activeVisit) return true;
    if (option.value === VisitStatus.COMPLETED) return activeVisitCompletionReady;
    if (option.value === VisitStatus.FOR_FOLLOW_UP) return !activeVisit.medicines.some((medicine) => medicine.status === "REQUESTED");
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="shrink-0 border bg-white" aria-label="Back to patient records">
              <Link href="/patients">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h2 className="text-3xl font-black tracking-tight uppercase">
              {patient.lastName}, {patient.firstName} {patient.middleName}
            </h2>
            {patient.gender === "Male" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-sm font-black text-blue-700 ring-1 ring-blue-200">
                <UserRound className="h-3.5 w-3.5" /> Male
              </span>
            ) : patient.gender === "Female" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-1 text-sm font-black text-pink-700 ring-1 ring-pink-200">
                <UserRound className="h-3.5 w-3.5" /> Female
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-sm font-bold text-violet-700 ring-1 ring-violet-200">Other</span>
            )}
          </div>
          <p className="text-slate-600">
            {patient.age} / {patient.gender} / {patient.birthDate}
          </p>
          <p className="text-sm text-slate-500">Registered: {patient.createdAt}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/patients/${patient.id}/forms`}>
              <FileText className="h-4 w-4" /> Clinic Forms
            </Link>
          </Button>
          {canEditPatient ? <Button asChild variant="outline">
            <Link href={`/patients/${patient.id}/edit`}><Pencil className="h-4 w-4" /> Edit Patient</Link>
          </Button> : null}
          {canManageVisits ? (
            <NewVisitModal
              action={createVisitAction}
              patientId={patient.id}
              requestOptions={requestOptions}
              defaultRequestTypes={[RequestType.CONSULTATION]}
              assignedStaffName={currentUser?.name}
            />
          ) : null}
        </div>
      </div>

      <details open className="group rounded-2xl border bg-white shadow-soft">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 border-b bg-slate-50 px-4 py-3 marker:hidden">
          <div className="min-w-0">
            <h3 className="text-base font-black text-slate-900">Patient Information</h3>
            <p className="text-sm text-slate-500">Basic profile details and current visit status.</p>
          </div>
          <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl border bg-white text-slate-500 transition group-open:rotate-180">
            <ChevronDown className="h-4 w-4" />
          </span>
        </summary>
        <div className="border-b bg-white px-4 py-3">
          {activeVisit && canManageVisits ? (
            <VisitStatusModal
              action={updateVisitStatusAction}
              patientId={patient.id}
              visitId={activeVisit.id}
              currentStatus={activeVisit.status}
              currentStatusCode={activeVisit.statusCode}
              statusOptions={availableStatusOptions}
            />
          ) : activeVisit ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-blue-50 text-blue-700">Active visit: {activeVisit.status}</Badge>
              <span className="text-sm text-slate-500">Managed by clinic staff.</span>
            </div>
          ) : latestVisit ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={latestVisit.statusCode === VisitStatus.COMPLETED ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}>
                Latest visit: {latestVisit.status}
              </Badge>
              <span className="text-sm text-slate-500">This visit is now part of the patient history.</span>
            </div>
          ) : (
            <span className="w-fit rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">No visit yet</span>
          )}
        </div>
        <div className="grid gap-0 divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
          {[
            { label: "Patient No.", value: patient.patientNumber },
            { label: "Address", value: patient.address },
            { label: "Contact", value: patient.contact },
            { label: "Agency", value: patient.agency },
            { label: "Designation", value: patient.designation },
            { label: "Civil Status", value: patient.civilStatus },
            { label: "Height", value: patient.heightCm ? `${patient.heightCm.toFixed(1)} cm` : "Not provided" },
            { label: "Weight", value: patient.weightKg ? `${patient.weightKg.toFixed(1)} kg` : "Not provided" },
            { label: "BMI", value: patient.bmi ? patient.bmi.toFixed(1) : "Not available" },
            { label: "Primary Contact", value: patient.primaryContact },
            { label: "Medical History", value: patient.medicalHistory },
            { label: "Vaccine History", value: patient.vaccineHistory },
            { label: "Allergy", value: patient.allergy },
            { label: "Maintenance", value: patient.maintenance },
            { label: "Additional Medical Information", value: patient.additionalMedicalInformation },
          ].map((item) => (
            <div key={item.label} className="px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-800">{item.value}</p>
            </div>
          ))}
        </div>
      </details>

      {activeVisit && canManageVisits ? (
        <PatientRecordTabs
          defaultTabId="current-visit"
          tabs={[
            {
              id: "current-visit",
              label: "CURRENT VISIT",
              content: (
          <Card>
            <CardHeader>
              <CardTitle>Current Visit</CardTitle>
            </CardHeader>
            <CardContent>
              {activeVisit.statusCode === VisitStatus.QUEUED ? (
                <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <section className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-semibold text-slate-700">
                        Time in
                        <input value={activeVisit.timeIn} readOnly className="rounded-xl border bg-slate-50 px-3 py-2 font-normal" />
                      </label>
                      <div className="grid gap-2 text-sm font-semibold text-slate-700">
                        Status
                        <div className="rounded-xl border bg-slate-50 px-3 py-2 font-normal text-slate-700">Queued</div>
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm font-semibold text-slate-700">
                      Assigned staff
                      <div className="rounded-xl border bg-slate-50 px-3 py-2 font-normal text-slate-700">
                        {currentUser?.name || activeVisit.nurseOnDuty || "Signed-in account"}
                      </div>
                    </div>
                    <div className="rounded-2xl border bg-slate-50 px-4 py-4">
                      <p className="text-sm font-semibold text-slate-700">Visit requests</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {activeVisit.requests.map((request) => (
                          <Badge key={request.id} className="bg-blue-50 text-blue-700">
                            {request.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="flex min-h-56 flex-col justify-center border-l-4 border-primary bg-teal-50 px-5 py-5">
                    <h3 className="text-xl font-black text-slate-950">Start the visit when the patient is ready for assessment.</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Assessment fields, medicine requests, vaccination records, and follow-up scheduling will open after the visit is started.
                    </p>
                    <form action={startVisitAction} className="mt-5">
                      <CsrfField />
                      <input type="hidden" name="patientId" value={patient.id} />
                      <input type="hidden" name="visitId" value={activeVisit.id} />
                      <Button type="submit" size="lg" className="h-12">
                        <PlayCircle className="h-5 w-5" /> Start Visit
                      </Button>
                    </form>
                  </section>
                </div>
              ) : (
              <>
              <AutosaveForm action={updateVisitAction} autosaveAction={autosaveVisitDraftAction} className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
                <CsrfField />
                <input type="hidden" name="patientId" value={patient.id} />
                <input type="hidden" name="visitId" value={activeVisit.id} />
                <section className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Time in
                      <input value={activeVisit.timeIn} readOnly className="rounded-xl border bg-slate-50 px-3 py-2 font-normal" />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Status
                      <select name="status" defaultValue={activeVisit.statusCode} className="rounded-xl border px-3 py-2 font-normal">
                        {availableStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-2 text-sm font-semibold text-slate-700">
                    Assigned staff
                    <div className="rounded-xl border bg-slate-50 px-3 py-2 font-normal text-slate-700">
                      {currentUser?.name || activeVisit.nurseOnDuty || "Signed-in account"}
                    </div>
                    {activeVisit.nurseOnDuty && activeVisit.nurseOnDuty !== currentUser?.name ? (
                      <p className="text-xs font-normal text-slate-500">Current record: {activeVisit.nurseOnDuty}</p>
                    ) : null}
                  </div>
                  <ServiceRequestedFields
                    options={requestOptions}
                    defaultValues={activeVisit.requests.map((request) => request.type)}
                  />
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">Vital signs</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      <input name="bloodPressure" defaultValue={activeVisit.bloodPressure} className="rounded-xl border px-3 py-2 text-sm" placeholder="BP" />
                      <input name="temperature" defaultValue={activeVisit.temperature} className="rounded-xl border px-3 py-2 text-sm" placeholder="Temp" />
                      <input name="pulseRate" defaultValue={activeVisit.pulseRate} className="rounded-xl border px-3 py-2 text-sm" placeholder="PR" />
                      <input name="respiratoryRate" defaultValue={activeVisit.respiratoryRate} className="rounded-xl border px-3 py-2 text-sm" placeholder="RR" />
                      <input name="rbs" defaultValue={activeVisit.rbs} className="rounded-xl border px-3 py-2 text-sm" placeholder="RBS" />
                    </div>
                  </div>
                  <ChiefComplaintField initialValue={activeVisit.chiefComplaint} />
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Progress Notes / Medical History
                    <textarea name="progressNotes" defaultValue={activeVisit.progressNotes} className="h-24 rounded-xl border bg-yellow-50/70 px-3 py-2 font-normal" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Diagnosis
                    <textarea name="diagnosis" defaultValue={activeVisit.diagnosis} className="h-24 rounded-xl border bg-yellow-50/70 px-3 py-2 font-normal" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Treatment
                    <textarea name="treatmentPlan" defaultValue={activeVisit.treatmentPlan} className="h-24 rounded-xl border bg-yellow-50/70 px-3 py-2 font-normal" />
                  </label>
                </section>

                <section className="space-y-4">
                  <div className="rounded-3xl border bg-slate-50 px-4 py-4">
                    <p className="text-sm font-semibold text-slate-700">Visit requests</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeVisit.requests.length ? (
                        activeVisit.requests.map((request) => (
                          <Badge key={request.id} className="bg-blue-50 text-blue-700">
                            {request.label}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No requests linked yet.</span>
                      )}
                    </div>
                  </div>

                  {!activeVisitSurveyComplete ? (
                    <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                      Complete the Client Satisfaction Measurement Survey before marking this appointment as completed.
                    </div>
                  ) : null}
                  {medicineBlockMessage ? (
                    <div className="border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
                      {medicineBlockMessage}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <SatisfactionSurveyModal patientId={patient.id} visitId={activeVisit.id} serviceAvailed={activeVisit.servicesReceived} survey={activeVisit.satisfactionSurvey} disabled={medicineDecisionPending} disabledReason={medicineDecisionPendingMessage} />
                    <Button type="submit">
                      <Save className="h-4 w-4" /> Save Visit
                    </Button>
                    {activeVisit.statusCode !== VisitStatus.COMPLETED && activeVisit.statusCode !== VisitStatus.CANCELLED ? (
                      <Button
                        type="submit"
                        formAction={completeVisitAction}
                        variant="outline"
                        disabled={!activeVisitCompletionReady}
                        title={!activeVisitCompletionReady ? (medicineBlockMessage || "Complete the Client Satisfaction Measurement Survey first.") : undefined}
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Mark as completed
                      </Button>
                    ) : null}
                  </div>
                </section>
              </AutosaveForm>
              <div className="mt-5 border bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Treatment Actions</h3>
                    <p className="text-sm text-slate-500">Create medicine, referral, or vaccine requests for this appointment.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <MedicineRequestModal action={requestMedicineAction} patientId={patient.id} visitId={activeVisit.id} inventoryOptions={inventoryOptions} />
                    <ReferralScheduleModal action={scheduleReferralAction} patientId={patient.id} visitId={activeVisit.id} />
                    <VaccineRequestModal action={requestVaccineAction} patientId={patient.id} visitId={activeVisit.id} vaccines={vaccineOptions} />
                  </div>
                </div>
              </div>
              </>
              )}
            </CardContent>
          </Card>
              ),
            },
            ...(activeVisit.statusCode === VisitStatus.QUEUED ? [] : [
            {
              id: "history",
              label: "HISTORY",
              content: (
                <VisitHistoryViewer visits={historicalVisits} />
              ),
            },
            {
              id: "labs",
              label: "LABORATORY",
              content: <LabResultsPanel patientId={patient.id} visit={activeVisit} />,
            },
            {
              id: "medicines",
              label: "MEDICINES",
              content: (
              <Card>
                <CardHeader>
                  <CardTitle>Medicine Request History</CardTitle>
                  <MedicineRequestModal action={requestMedicineAction} patientId={patient.id} visitId={activeVisit.id} inventoryOptions={inventoryOptions} />
                </CardHeader>
                <CardContent className="space-y-4">

                  <div className="space-y-3 lg:hidden">
                    {activeVisit.medicines.map((medicine) => (
                      <div key={medicine.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-900">{medicine.itemName}</p>
                            <p className="mt-0.5 text-sm text-slate-500">Qty {medicine.quantity} / {medicine.frequency || "-"} / {medicine.duration || "-"}</p>
                            {medicine.remarks ? <p className="mt-1 text-xs text-slate-500">Remarks: {medicine.remarks}</p> : null}
                          </div>
                          <Badge className={`shrink-0 ${medicineStatusTone(medicine.status)}`}>
                            {medicineStatusLabel(medicine.status)}
                          </Badge>
                        </div>
                        <div className="mt-3 border-t pt-3">
                          {medicine.status === "RELEASED" ? (
                            <form action={receiveMedicineAction} className="grid gap-2">
                              <CsrfField />
                              <input type="hidden" name="patientId" value={patient.id} />
                              <input type="hidden" name="medicineRequestId" value={medicine.id} />
                              <input name="receivedBy" className="h-10 rounded-xl border px-3 text-sm" placeholder="Received by" />
                              <Button size="sm" type="submit">Mark received</Button>
                            </form>
                          ) : medicine.status === "APPROVED" ? (
                            <span className="text-xs text-blue-600">Approved. Awaiting release by supply staff.</span>
                          ) : medicine.status === "RECEIVED" ? (
                            <span className="text-xs text-emerald-700">Received by {medicine.receivedBy || "Patient"}{medicine.receivedAt ? ` / ${medicine.receivedAt}` : ""}</span>
                          ) : medicine.status === "REJECTED" ? (
                            <span className="text-xs text-rose-600">Rejected request</span>
                          ) : (
                            <span className="text-xs text-amber-700">Waiting for pharmacist approval or rejection.</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {activeVisit.medicines.length === 0 ? (
                      <p className="rounded-2xl border bg-white px-4 py-8 text-center text-sm text-slate-500">
                        No medicine requests recorded for this visit.
                      </p>
                    ) : null}
                  </div>

                  <div className="hidden overflow-x-auto lg:block">
                    <table className="min-w-[720px] w-full text-sm">
                      <thead className="bg-slate-100 text-slate-500">
                        <tr>
                          {["Item", "Frequency", "Duration", "Qty", "Remarks", "Status", "Action"].map((header) => (
                            <th key={header} className="px-3 py-2 text-left">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeVisit.medicines.map((medicine) => (
                          <tr key={medicine.id} className="border-b">
                            <td className="px-3 py-3 font-semibold text-slate-800">{medicine.itemName}</td>
                            <td className="px-3 py-3">{medicine.frequency || "-"}</td>
                            <td className="px-3 py-3">{medicine.duration || "-"}</td>
                            <td className="px-3 py-3">{medicine.quantity}</td>
                            <td className="max-w-[14rem] px-3 py-3 text-xs text-slate-500">{medicine.remarks || "-"}</td>
                            <td className="px-3 py-3">
                              <Badge className={medicineStatusTone(medicine.status)}>
                                {medicineStatusLabel(medicine.status)}
                              </Badge>
                            </td>
                            <td className="px-3 py-3">
                              {medicine.status === "RELEASED" ? (
                                <form action={receiveMedicineAction} className="flex flex-wrap gap-2">
                                  <CsrfField />
                                  <input type="hidden" name="patientId" value={patient.id} />
                                  <input type="hidden" name="medicineRequestId" value={medicine.id} />
                                  <input name="receivedBy" className="w-32 rounded-xl border px-2 py-1 text-xs" placeholder="Received by" />
                                  <Button size="sm" type="submit">Mark received</Button>
                                </form>
                              ) : medicine.status === "APPROVED" ? (
                                <span className="text-xs text-blue-600">Awaiting release by supply staff.</span>
                              ) : medicine.status === "RECEIVED" ? (
                                <span className="text-xs text-emerald-700">Received by {medicine.receivedBy || "Patient"}{medicine.receivedAt ? ` / ${medicine.receivedAt}` : ""}</span>
                              ) : medicine.status === "REJECTED" ? (
                                <span className="text-xs text-rose-600">Rejected request</span>
                              ) : (
                                <span className="text-xs text-amber-700">Waiting for approval.</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {activeVisit.medicines.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                              No medicine requests recorded for this visit.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              ),
            },
            ]),
          ]}
        />
      ) : activeVisit ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Visit</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Status</p>
                <Badge className="mt-1 bg-blue-50 text-blue-700">{activeVisit.status}</Badge>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Time in</p>
                <p className="mt-1 font-semibold text-slate-800">{activeVisit.timeIn}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Assigned staff</p>
                <p className="mt-1 font-semibold text-slate-800">{activeVisit.nurseOnDuty || "Not assigned"}</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Visit requests</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeVisit.requests.map((request) => (
                    <Badge key={request.id} className="bg-blue-50 text-blue-700">
                      {request.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          {historicalVisits.length ? (
            <PatientRecordTabs
              defaultTabId="history"
              tabs={[
                {
                  id: "history",
                  label: "HISTORY",
                  content: <VisitHistoryViewer visits={historicalVisits} />,
                },
              ]}
            />
          ) : null}
        </div>
      ) : historicalVisits.length ? (
        <PatientRecordTabs
          defaultTabId="history"
          tabs={[
            {
              id: "history",
              label: "HISTORY",
              content: <VisitHistoryViewer visits={historicalVisits} />,
            },
          ]}
        />
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            No visit has been started for this patient yet. Use <span className="font-semibold text-slate-700">New Appointment</span> to begin charting.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

