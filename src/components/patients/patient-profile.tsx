
import { FormFeedback } from "@/components/ui/form-feedback";
import { RecordAction } from "@/components/admin/record-action";
import { PatientRecordManagement } from "@/components/admin/patient-record-management";
import { getAvailedServiceLabels } from "@/lib/clinic-services";
import { clinicServiceOptions } from "@/lib/service-settings";
import { maintenanceLines } from "@/lib/patient-medical-info";
import { PatientMedicineHistory } from "./patient-medicine-history";
import { PatientHistorySummary } from "./patient-history-summary";
import { CompletedVisitEditor } from "./completed-visit-editor";
import { DiagnosisField } from "@/components/patients/diagnosis-field";
import { DeleteAppointmentButton } from "@/components/patients/delete-appointment-button";
import { prisma } from "@/lib/prisma";
import { canEditVisitField } from "@/lib/visit-fields";
import Link from "@/components/navigation/app-link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronDown, FileText, Pencil, PlayCircle, QrCode, Save, UserRound } from "lucide-react";
import { RequestType, UserRole, VisitStatus } from "@prisma/client";
import {
  addVaccinationRecordAction,
  autosaveVisitDraftAction,
  createVisitAction,
  receiveMedicineAction,
  requestMedicineAction,
  requestVaccineAction,
  scheduleReferralAction,
  scheduleFollowUpAction,
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
import {
  MedicineRequestModal,
  ReferralScheduleModal,
  FollowUpScheduleModal,
  VaccineRequestModal,
  VaccinationRecordModal,
} from "@/components/patients/clinical-action-modals";
import { LabResultsPanel } from "@/components/patients/lab-results-panel";
import { CsrfField } from "@/components/security/csrf-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { VisitServices } from "@/components/patients/service-cancellation";
import { closedWithoutServiceLabel } from "@/lib/service-state";
import { safeReportReturnTo } from "@/lib/report-navigation";
import { RetainedBackLink } from "@/components/navigation/retained-back-link";

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

export async function PatientProfile({
  id,
  visitId,
  returnTo,
}: {
  id: string;
  visitId?: string;
  returnTo?: string;
}) {
  const reportReturnTo = safeReportReturnTo(returnTo);
  const patient = await getPatientWorkflowProfile(id);

  if (!patient) {
    notFound();
  }

  const [availableRequests, complaints, diseaseOptions, inventoryOptions, vaccineOptions, currentUser] = await Promise.all([
    clinicServiceOptions(patient.clinicId, patient.visitHistory.flatMap(v => v.requests.map(r => r.type))),
    prisma.chiefComplaintCatalog.findMany({
      where: { clinicId: patient.clinicId },
      orderBy: { name: "asc" },
    }),
    prisma.diseaseCatalog.findMany({
    where: { clinicId: patient.clinicId },
    orderBy: { name: "asc" },
    }),
    getInventoryOptions(patient.clinicId),
    getVaccineOptions(patient.clinicId),
    getCurrentUser(),
  ]);
  const newVisitRequests = availableRequests.filter(option => option.isActive);
  const complaintOptions = complaints.map(c => c.name);
  const canManageVisits = (
    [
      UserRole.ADMIN,
      UserRole.DOCTOR,
      UserRole.NURSE,
      UserRole.DOCTOR_NURSE,
    ] as UserRole[]
  ).includes(currentUser?.role as UserRole);
  const canQueueVisits =
    canManageVisits || currentUser?.role === UserRole.RECORDS;
  const canEditPatient = currentUser?.role === UserRole.ADMIN;
  const isDoctor =
    currentUser?.role === UserRole.DOCTOR ||
    currentUser?.role === UserRole.ADMIN;
  const editable = (field: string) =>
    currentUser
      ? canEditVisitField(
          currentUser.role,
          field,
          patient.visitHistory.find(
            (v) =>
              v.statusCode !== VisitStatus.COMPLETED &&
              v.statusCode !== VisitStatus.CANCELLED,
          )?.doctorLockedFields ?? [],
        )
      : false;
  const latestVisit = patient.latestVisit;
  const activeVisit =
    patient.visitHistory.find(
      (visit) =>
        visit.statusCode !== VisitStatus.COMPLETED &&
        visit.statusCode !== VisitStatus.CANCELLED,
    ) ?? null;
  const historicalVisits = activeVisit
    ? patient.visitHistory.filter((visit) => visit.id !== activeVisit.id)
    : patient.visitHistory;
  const serviceCancelled = (type: RequestType) => Boolean(activeVisit?.requests.some((request) => request.type === type && request.cancellation));
  const activeVisitSurveyComplete = activeVisit
    ? hasCompletedSatisfactionSurvey(activeVisit.satisfactionSurvey)
    : false;
  const activeVisitMedicineReady = activeVisit
    ? !activeVisit.medicines.some((medicine) =>
        ["REQUESTED", "APPROVED", "RELEASED"].includes(medicine.status),
      )
    : true;
  const activeVisitCompletionReady =
    activeVisitSurveyComplete && activeVisitMedicineReady;
  const medicineDecisionPending =
    activeVisit?.medicines.some(
      (medicine) => medicine.status === "REQUESTED",
    ) ?? false;
  const medicineDecisionPendingMessage =
    "Medicine request is still awaiting pharmacist approval or rejection.";
  const medicineBlockMessage = medicineDecisionPending
    ? medicineDecisionPendingMessage
    : activeVisit?.medicines.some((medicine) => medicine.status === "APPROVED")
      ? "Approved medicine must be released before this visit can be completed."
      : activeVisit?.medicines.some(
            (medicine) => medicine.status === "RELEASED",
          )
        ? "Released medicine must be marked received before this visit can be completed."
        : "";
  const availableStatusOptions = statusOptions.filter((option) => {
    if (option.value === VisitStatus.CANCELLED) return false;
    if (!activeVisit) return true;
    if (option.value === VisitStatus.COMPLETED)
      return activeVisitCompletionReady;
    if (option.value === VisitStatus.FOR_FOLLOW_UP)
      return !activeVisit.medicines.some(
        (medicine) => medicine.status === "REQUESTED",
      );
    return true;
  });

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="shrink-0 border bg-white"
              aria-label={reportReturnTo ? "Back to report" : "Back to patient records"}
            >
              <RetainedBackLink href={reportReturnTo ?? "/patients"} source>
                <ArrowLeft className="h-5 w-5" />
              </RetainedBackLink>
            </Button>
            <h2 className="min-w-0 max-w-full break-words text-2xl font-black tracking-tight uppercase sm:text-3xl">
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
              <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-sm font-bold text-violet-700 ring-1 ring-violet-200">
                Other
              </span>
            )}
          </div>
          <p className="text-slate-600">
            {patient.age} / {patient.gender} / {patient.birthDate}
          </p>
          <p className="text-sm text-slate-500">
            Registered: {patient.createdAt}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/patients/${patient.id}/qr`}>
              <QrCode className="h-4 w-4" /> Print QR Label
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/patients/${patient.id}/forms`}>
              <FileText className="h-4 w-4" /> Clinic Forms
            </Link>
          </Button>
          {canEditPatient && <RecordAction kind="Patient" recordId={patient.id} label={`${patient.lastName}, ${patient.firstName}`} summary={`${patient.visitHistory.length} visits and all linked service histories will be hidden with this profile. Original records, stock movements, and patient number are retained. Restore the profile from Settings ? Archives.`} returnTo="/patients" />}
          {canEditPatient ? (
            <Button asChild variant="outline">
              <Link href={`/patients/${patient.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit Patient
              </Link>
            </Button>
          ) : null}
          {currentUser?.role === UserRole.ADMIN &&
          activeVisit?.statusCode === VisitStatus.QUEUED ? (
            <DeleteAppointmentButton
              patientId={patient.id}
              visitId={activeVisit.id}
            />
          ) : null}
          {canQueueVisits ? (
            <NewVisitModal
              action={createVisitAction}
              patientId={patient.id}
              requestOptions={newVisitRequests}
              defaultRequestTypes={[]}
              assignedStaffName={
                currentUser?.role === UserRole.NURSE ||
                currentUser?.role === UserRole.DOCTOR_NURSE
                  ? currentUser.name
                  : "Not assigned"
              }
            />
          ) : null}
        </div>
      </div>

      <details open className="group rounded-2xl border bg-white shadow-soft">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 border-b bg-slate-50 px-4 py-3 marker:hidden">
          <div className="min-w-0">
            <h3 className="text-base font-black text-slate-900">
              Patient Information
            </h3>
            <p className="text-sm text-slate-500">
              Basic profile details and current visit status.
            </p>
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
              <Badge className="bg-blue-50 text-blue-700">
                Active visit: {activeVisit.status}
              </Badge>
              <span className="text-sm text-slate-500">
                Managed by clinic staff.
              </span>
            </div>
          ) : latestVisit ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={
                  latestVisit.statusCode === VisitStatus.COMPLETED
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }
              >
                Latest visit: {latestVisit.status}
              </Badge>
              <span className="text-sm text-slate-500">
                This visit is now part of the patient history.
              </span>
            </div>
          ) : (
            <span className="w-fit rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">
              No visit yet
            </span>
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
            {
              label: "Height",
              value: patient.heightCm
                ? `${patient.heightCm.toFixed(1)} cm`
                : "Not provided",
            },
            {
              label: "Weight",
              value: patient.weightKg
                ? `${patient.weightKg.toFixed(1)} kg`
                : "Not provided",
            },
            {
              label: "BMI",
              value: patient.bmi ? patient.bmi.toFixed(1) : "Not available",
            },
            { label: "Primary Contact Name", value: patient.primaryContact },
            {
              label: "Primary Contact Number",
              value: patient.primaryContactNo,
            },
            { label: "Medical History", value: patient.medicalHistory },
            { label: "Vaccine History", value: patient.vaccineHistory },
            { label: "Allergy", value: patient.allergy },
            { label: "Maintenance", value: patient.maintenance },
            {
              label: "Additional Medical Information",
              value: patient.additionalMedicalInformation,
            },
          ].map((item) => (
            <div key={item.label} className="px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {item.label}
              </p>
              <div className="mt-1 break-words text-sm font-semibold text-slate-800">
                {item.label === "Maintenance" && item.value !== "Not provided" ? <ul className="list-disc space-y-1 pl-5">{maintenanceLines(item.value).map((line,index) => <li key={index}>{line}</li>)}</ul> : item.value}
              </div>
            </div>
          ))}
        </div>
        {patient.vaccineHistoryEntries?.length ? <div className="border-t p-4"><h4 className="mb-2 text-sm font-bold">Vaccine History</h4><div className="divide-y">{patient.vaccineHistoryEntries.map((entry,index) => <div key={index} className="grid gap-1 py-2 text-sm sm:grid-cols-3"><span className="font-semibold">{entry.vaccine}</span><span>Dose: {entry.dose || "Not recorded"}</span><span>Date: {entry.date || "Not recorded"}</span></div>)}</div></div> : null}
      </details>
      {canEditPatient && <PatientRecordManagement patientId={patient.id} visits={patient.visitHistory} />}
      <PatientHistorySummary
        visits={patient.visitHistory}
        patientId={patient.id}
        canReceive={canManageVisits}
      />
      {activeVisit ? <VisitServices patientId={patient.id} visitId={activeVisit.id} services={activeVisit.requests} canCancel={canManageVisits} canCancelVisit={currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.DOCTOR} /> : null}
      {currentUser?.role === UserRole.ADMIN &&
      historicalVisits.some((v) => v.statusCode === VisitStatus.COMPLETED && v.status !== closedWithoutServiceLabel) ? (
        <CompletedVisitEditor
          visits={historicalVisits.filter(
            (v) => v.statusCode === VisitStatus.COMPLETED && v.status !== closedWithoutServiceLabel,
          )}
          patientId={patient.id}
          complaints={complaintOptions}
          diseases={diseaseOptions}
        />
      ) : null}

      {activeVisit && canManageVisits ? (
        <PatientRecordTabs
          defaultTabId={
            visitId && visitId !== activeVisit.id ? "history" : "current-visit"
          }
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
                        <section
                          id="current-visit"
                          className="min-w-0 space-y-4"
                        >
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="grid gap-2 text-sm font-semibold text-slate-700">
                              Time in
                              <input
                                value={activeVisit.timeIn}
                                readOnly
                                className="rounded-xl border bg-slate-50 px-3 py-2 font-normal"
                              />
                            </label>
                            <div className="grid gap-2 text-sm font-semibold text-slate-700">
                              Status
                              <div className="rounded-xl border bg-slate-50 px-3 py-2 font-normal text-slate-700">
                                Queued
                              </div>
                            </div>
                          </div>
                          <div className="grid gap-2 text-sm font-semibold text-slate-700">
                            Assigned staff
                            <div className="rounded-xl border bg-slate-50 px-3 py-2 font-normal text-slate-700">
                              {activeVisit.nurseOnDuty || "Not assigned"}
                            </div>
                          </div>
                          <div className="rounded-2xl border bg-slate-50 px-4 py-4">
                            <p className="text-sm font-semibold text-slate-700">
                              Visit requests
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {activeVisit.requests.map((request) => (
                                <Badge
                                  key={request.id}
                                  className="bg-blue-50 text-blue-700"
                                >
                                  {request.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </section>

                        <section className="flex min-h-56 flex-col justify-center border-l-4 border-primary bg-teal-50 px-5 py-5">
                          <h3 className="text-xl font-black text-slate-950">
                            Start the visit when the patient is ready for
                            assessment.
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Enter the patient&apos;s vital signs to begin the
                            assessment.
                          </p>
                          <form
                            action={startVisitAction}
                            className="mt-5 grid gap-4"
                          >
      <FormFeedback />
                            <p className="text-sm font-semibold text-slate-700">
                              Enter at least one vital sign to start.
                            </p>
                            <ChiefComplaintField
                              additionalOptions={complaintOptions}
                              initialValue={activeVisit.chiefComplaint}
                            />
                            <div className="grid min-w-0 grid-cols-2 gap-3">
                              {[
                                {
                                  name: "bloodPressure",
                                  label: "BP",
                                  placeholder: "120/80",
                                },
                                {
                                  name: "temperature",
                                  label: "Temperature",
                                  placeholder: "?C",
                                },
                                {
                                  name: "pulseRate",
                                  label: "Pulse rate",
                                  placeholder: "bpm",
                                },
                                {
                                  name: "respiratoryRate",
                                  label: "Respiratory rate",
                                  placeholder: "breaths/min",
                                },
                                {
                                  name: "rbs",
                                  label: "RBS",
                                  placeholder: "mg/dL",
                                },
                              ].map((field) => (
                                <label
                                  key={field.name}
                                  className="grid min-w-0 gap-1 text-xs font-semibold"
                                >
                                  {field.label}
                                  <input
                                    name={field.name}
                                    defaultValue={
                                      activeVisit[field.name as "bloodPressure"]
                                    }
                                    placeholder={field.placeholder}
                                    className="w-full min-w-0 rounded-lg border bg-white px-3 py-2 text-sm"
                                  />
                                </label>
                              ))}
                            </div>
                            <CsrfField />
                            <input
                              type="hidden"
                              name="patientId"
                              value={patient.id}
                            />
                            <input
                              type="hidden"
                              name="visitId"
                              value={activeVisit.id}
                            />
                            <Button type="submit" size="lg" className="h-12">
                              <PlayCircle className="h-5 w-5" /> Start Visit
                            </Button>
                          </form>
                        </section>
                      </div>
                    ) : (
                      <>
                        <AutosaveForm
                          key={activeVisit.id + ":" + activeVisit.updatedAt}
                          visitId={activeVisit.id}
                          action={updateVisitAction}
                          autosaveAction={autosaveVisitDraftAction}
                          className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]"
                        >
                          <CsrfField />
                          <input type="hidden" name="visitVersion" value={activeVisit.updatedAt} />
                          <input
                            type="hidden"
                            name="patientId"
                            value={patient.id}
                          />
                          <input
                            type="hidden"
                            name="visitId"
                            value={activeVisit.id}
                          />
                          <section className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-3">
                              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                                Time in
                                <input
                                  value={activeVisit.timeIn}
                                  readOnly
                                  className="rounded-xl border bg-slate-50 px-3 py-2 font-normal"
                                />
                              </label>
                              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                                Status
                                <select
                                  name="status"
                                  defaultValue={activeVisit.statusCode}
                                  className="rounded-xl border px-3 py-2 font-normal"
                                >
                                  {availableStatusOptions.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <div className="grid gap-2 text-sm font-semibold text-slate-700">
                              Assigned staff
                              <div className="rounded-xl border bg-slate-50 px-3 py-2 font-normal text-slate-700">
                                {activeVisit.nurseOnDuty || "Not assigned"}
                              </div>
                              {activeVisit.nurseOnDuty &&
                              activeVisit.nurseOnDuty !== currentUser?.name ? (
                                <p className="text-xs font-normal text-slate-500">
                                  Current record: {activeVisit.nurseOnDuty}
                                </p>
                              ) : null}
                            </div>
                            <ServiceRequestedFields
                              lockExisting
                              cancelledValues={activeVisit.requests.filter((request) => request.cancellation).map((request) => request.type)}
                              options={availableRequests}
                                defaultReferralReason={activeVisit.referralReason}
                              defaultValues={activeVisit.requests.map(
                                (request) => request.type,
                              )}
                            />
                            <div>
                              <p className="mb-2 text-sm font-semibold text-slate-700">
                                Vital signs
                              </p>
                              <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
                                <input
                                  name="bloodPressure"
                                  disabled={!editable("bloodPressure")}
                                  defaultValue={activeVisit.bloodPressure}
                                  className="w-full min-w-0 rounded-xl border px-3 py-2 text-sm disabled:bg-slate-50"
                                  placeholder="BP"
                                />
                                <input
                                  name="temperature"
                                  disabled={!editable("temperature")}
                                  defaultValue={activeVisit.temperature}
                                  className="w-full min-w-0 rounded-xl border px-3 py-2 text-sm disabled:bg-slate-50"
                                  placeholder="Temp"
                                />
                                <input
                                  name="pulseRate"
                                  disabled={!editable("pulseRate")}
                                  defaultValue={activeVisit.pulseRate}
                                  className="rounded-xl border px-3 py-2 text-sm"
                                  placeholder="PR"
                                />
                                <input
                                  name="respiratoryRate"
                                  disabled={!editable("respiratoryRate")}
                                  defaultValue={activeVisit.respiratoryRate}
                                  className="rounded-xl border px-3 py-2 text-sm"
                                  placeholder="RR"
                                />
                                <input
                                  name="rbs"
                                  disabled={!editable("rbs")}
                                  defaultValue={activeVisit.rbs}
                                  className="rounded-xl border px-3 py-2 text-sm"
                                  placeholder="RBS"
                                />
                              </div>
                            </div>
                            <ChiefComplaintField
                              additionalOptions={complaintOptions}
                              initialValue={activeVisit.chiefComplaint}
                              disabled={!editable("chiefComplaint")}
                            />
                            <div className="space-y-3 rounded-lg border border-teal-200 bg-teal-50/30 p-4">
                              <h3 className="font-bold text-teal-800">
                                Nurse Notes
                              </h3>
                              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                                Notes{" "}
                                <span className="text-xs font-normal text-slate-500">
                                  Nurse
                                </span>
                                <textarea
                                  name="intakeNotes"
                                  defaultValue={activeVisit.intakeNotes}
                                  disabled={!editable("intakeNotes")}
                                  className="min-h-20 rounded-xl border p-3 font-normal"
                                />
                              </label>
                              {currentUser?.role !== UserRole.DOCTOR ? (
                                <Button
                                  type="submit"
                                  name="intakeReady"
                                  value="true"
                                  variant="outline"
                                >
                                  Ready for doctor / Notify doctor
                                </Button>
                              ) : null}
                              {activeVisit.readyForDoctorAt ? (
                                <p className="text-xs font-semibold text-teal-700">
                                  Doctor notified: intake ready
                                </p>
                              ) : null}
                            </div>
                            <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/20 p-4">
                              <h3 className="font-bold text-blue-800">
                                Doctor Assessment
                              </h3>
                              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                                Progress Notes / Medical History{" "}
                                <span className="text-xs font-normal text-slate-500">
                                  Doctor
                                </span>
                                <textarea
                                  id="progressNotes"
                                  disabled={!isDoctor}
                                  name="progressNotes"
                                  defaultValue={activeVisit.progressNotes}
                                  className="h-24 rounded-xl border bg-yellow-50/70 px-3 py-2 font-normal"
                                />
                              </label>
                              {isDoctor ? (
                                <Button
                                  type="submit"
                                  name="doctorSection"
                                  value="progressNotes"
                                  variant="outline"
                                >
                                  <CheckCircle2 className="h-4 w-4" /> Progress
                                  notes done
                                </Button>
                              ) : null}
                              {activeVisit.progressNotesDoneAt ? (
                                <p className="text-xs font-semibold text-teal-700">
                                  Progress notes completed by doctor
                                </p>
                              ) : null}
                              <DiagnosisField
                                diseases={diseaseOptions.map((d) => ({
                                  id: d.id,
                                  name:
                                    activeVisit.diagnoses.find(
                                      (s) => s.diseaseId === d.id,
                                    )?.diseaseName ?? d.name,
                                  isActive: d.isActive,
                                }))}
                                selections={activeVisit.diagnoses}
                                initialValue={activeVisit.diagnosis}
                                initialNotes={activeVisit.diagnosisNotes}
                                physicalExam={activeVisit.physicalExam}
                                structured={activeVisit.diagnosesStructured}
                                disabled={!isDoctor}
                              />
                              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                                Treatment{" "}
                                <span className="text-xs font-normal text-slate-500">
                                  Doctor
                                </span>
                                <textarea
                                  id="treatmentPlan"
                                  disabled={!isDoctor}
                                  name="treatmentPlan"
                                  defaultValue={activeVisit.treatmentPlan}
                                  className="h-24 rounded-xl border bg-yellow-50/70 px-3 py-2 font-normal disabled:bg-slate-50"
                                />
                              </label>
                              {isDoctor ? (
                                <Button
                                  type="submit"
                                  name="doctorSection"
                                  value="treatmentPlan"
                                  variant="outline"
                                >
                                  <CheckCircle2 className="h-4 w-4" /> Treatment
                                  done
                                </Button>
                              ) : null}
                              {activeVisit.treatmentDoneAt ? (
                                <p className="text-xs font-semibold text-teal-700">
                                  Treatment completed by doctor
                                </p>
                              ) : null}
                            </div>
                          </section>

                          <section className="space-y-4">
                            <div className="rounded-xl border bg-slate-50/70 px-4 py-3">
                              <p className="text-sm font-semibold text-slate-700">
                                Visit requests
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {activeVisit.requests.length ? (
                                  activeVisit.requests.map((request) => (
                                    <Badge
                                      key={request.id}
                                      className="bg-blue-50 text-blue-700"
                                    >
                                      {request.label}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-slate-500">
                                    No requests linked yet.
                                  </span>
                                )}
                              </div>
                            </div>

                            {!activeVisitSurveyComplete ? (
                              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800">
                                Complete the Client Satisfaction Measurement
                                Survey before marking this appointment as
                                completed.
                              </div>
                            ) : null}
                            {medicineBlockMessage ? (
                              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-800">
                                {medicineBlockMessage}
                              </div>
                            ) : null}

                            <div className="flex flex-wrap gap-2">
                              <SatisfactionSurveyModal
                                patientId={patient.id}
                                visitId={activeVisit.id}
                                patientSex={patient.gender}
                                patientAge={patient.age}
                                serviceAvailed={getAvailedServiceLabels({ ...activeVisit, status: VisitStatus.COMPLETED }).join(", ")}
                                agencyName={
                                  patient.agency === "Not provided"
                                    ? ""
                                    : patient.agency
                                }
                                survey={activeVisit.satisfactionSurvey}
                                disabled={medicineDecisionPending}
                                disabledReason={medicineDecisionPendingMessage}
                              />
                              <Button type="submit">
                                <Save className="h-4 w-4" /> Save Visit
                              </Button>
                              {activeVisit.statusCode !==
                                VisitStatus.COMPLETED &&
                              activeVisit.statusCode !==
                                VisitStatus.CANCELLED ? (
                                <Button
                                  type="submit"
                                  name="visitIntent"
                                  value="complete"
                                  variant="outline"
                                  disabled={!activeVisitCompletionReady}
                                  title={
                                    !activeVisitCompletionReady
                                      ? medicineBlockMessage ||
                                        "Complete the Client Satisfaction Measurement Survey first."
                                      : undefined
                                  }
                                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                >
                                  <CheckCircle2 className="h-4 w-4" /> Mark as
                                  completed
                                </Button>
                              ) : null}
                            </div>
                          </section>
                        </AutosaveForm>
                        <div
                          id="treatment-actions"
                          className="mt-5 border-t px-1 py-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <h3 className="text-sm font-black text-slate-900">
                                Treatment Actions
                              </h3>
                              <p className="text-sm text-slate-500">
                                Create requests or schedule a follow-up for this appointment.
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <FollowUpScheduleModal
                                action={scheduleFollowUpAction}
                                patientId={patient.id}
                                visitId={activeVisit.id}
                                disabled={medicineDecisionPending}
                                disabledReason={medicineDecisionPendingMessage}
                              />
                              {!serviceCancelled("MEDICINES") ? <MedicineRequestModal
                                action={requestMedicineAction}
                                patientId={patient.id}
                                visitId={activeVisit.id}
                                inventoryOptions={inventoryOptions}
                              /> : null}
                              {!serviceCancelled("REFERRAL") ? <ReferralScheduleModal referralReason={activeVisit.referralReason}
                                action={scheduleReferralAction}
                                patientId={patient.id}
                                visitId={activeVisit.id}
                              /> : null}
                              {!serviceCancelled("VACCINATION") ? <VaccinationRecordModal
                                action={addVaccinationRecordAction}
                                patientId={patient.id}
                                visitId={activeVisit.id}
                                vaccines={vaccineOptions}
                              /> : null}
                              {!serviceCancelled("VACCINATION") ? <VaccineRequestModal
                                action={requestVaccineAction}
                                patientId={patient.id}
                                visitId={activeVisit.id}
                                vaccines={vaccineOptions}
                              /> : null}
                            </div>
                          </div>
                        </div>
                        {activeVisit.followUps.length ? (
                          <section
                            id="follow-ups"
                            className="mt-5 border-t pt-4"
                          >
                            <h3 className="text-sm font-bold">Follow-ups</h3>
                            {activeVisit.followUps.map((followUp) => (
                              <div key={followUp.id} className="py-3">
                                <p className="text-sm font-semibold">
                                  {followUp.scheduledFor}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {followUp.status}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm">
                                  {followUp.remarks}
                                </p>
                              </div>
                            ))}
                          </section>
                        ) : null}
                        {activeVisit.referrals.length ? (
                          <section
                            id="referrals"
                            className="mt-5 border-t pt-4"
                          >
                            <h3 className="text-sm font-bold text-slate-900">
                              Referrals
                            </h3>
                            <div className="divide-y">
                              {activeVisit.referrals.map((referral) => (
                                <div key={referral.id} className="py-3">
                                  <p className="text-sm font-semibold">
                                    {referral.referredTo || "Referral"}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {referral.scheduledFor}
                                  </p>
                                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                                    <span className="font-semibold">
                                      Reason for referral:{" "}
                                    </span>
                                    {referral.reasonForReferral ||
                                      "No reason recorded"}
                                  </p>
                                  {referral.remarks ? (
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-500">
                                      {referral.remarks}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </section>
                        ) : null}
                      </>
                    )}
                  </CardContent>
                </Card>
              ),
            },
            ...[
              {
                id: "history",
                label: "HISTORY",
                content: (
                  <VisitHistoryViewer
                    visits={historicalVisits}
                    patientId={patient.id}
                    canDeleteAppointments={currentUser?.role === UserRole.ADMIN}
                  />
                ),
              },
              {
                id: "labs",
                label: "LABORATORY",
                content: (
                  <LabResultsPanel patientId={patient.id} visit={activeVisit} />
                ),
              },
              {
                id: "vaccinations",
                label: "VACCINATION",
                content: (
                  <section
                    id="vaccinations"
                    className="min-w-0 space-y-4 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-bold">Vaccination records</h3>
                      {!serviceCancelled("VACCINATION") ? <VaccinationRecordModal
                        action={addVaccinationRecordAction}
                        patientId={patient.id}
                        visitId={activeVisit.id}
                        vaccines={vaccineOptions}
                      /> : null}
                    </div>
                    <div className="divide-y">
                      {activeVisit.vaccinations.map((record) => (
                        <div key={record.id} className="py-3">
                          <p className="text-sm font-semibold">
                            {record.vaccine}
                          </p>
                          <p className="text-xs text-slate-500">
                            {[
                                record.dose,
                                record.dateGiven ? `Given ${record.dateGiven}` : "",
                              record.givenBy,
                              record.nextDose
                                ? `Next dose ${record.nextDose}`
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" / ")}
                          </p>
                          {record.remarks ? (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                              {record.remarks}
                            </p>
                          ) : null}
                        </div>
                      ))}
                      {!activeVisit.vaccinations.length ? (
                        <p className="py-6 text-sm text-slate-500">
                          No vaccines administered during this visit yet.
                        </p>
                      ) : null}
                    </div>
                  </section>
                ),
              },
              {
                id: "medicines",
                label: "MEDICINES",
                content: (
                  <Card id="medicines">
                    <CardHeader>
                      <CardTitle>Medicine Request History</CardTitle>
                      {!activeVisit.requests.some((request) => request.type === "MEDICINES" && request.cancellation) ? <MedicineRequestModal
                        action={requestMedicineAction}
                        patientId={patient.id}
                        visitId={activeVisit.id}
                        inventoryOptions={inventoryOptions}
                      /> : <p className="text-sm text-slate-500">Provision of Medicine was cancelled for this visit.</p>}
                    </CardHeader>
                    <CardContent>
                      <PatientMedicineHistory
                        visits={patient.visitHistory}
                        patientId={patient.id}
                        canReceive={canManageVisits}
                      />
                    </CardContent>
                  </Card>
                ),
              },
            ].filter(
              (tab) =>
                activeVisit.statusCode !== VisitStatus.QUEUED ||
                tab.id === "history",
            ),
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
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Status
                </p>
                <Badge className="mt-1 bg-blue-50 text-blue-700">
                  {activeVisit.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Time in
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {activeVisit.timeIn}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Assigned staff
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {activeVisit.nurseOnDuty || "Not assigned"}
                </p>
              </div>
              <div className="md:col-span-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Visit requests
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeVisit.requests.map((request) => (
                    <Badge
                      key={request.id}
                      className="bg-blue-50 text-blue-700"
                    >
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
                  content: (
                    <VisitHistoryViewer
                      visits={historicalVisits}
                      patientId={patient.id}
                      canDeleteAppointments={
                        currentUser?.role === UserRole.ADMIN
                      }
                    />
                  ),
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
              content: (
                <VisitHistoryViewer
                  visits={historicalVisits}
                  patientId={patient.id}
                  canDeleteAppointments={currentUser?.role === UserRole.ADMIN}
                />
              ),
            },
          ]}
        />
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            No visit has been started for this patient yet. Use{" "}
            <span className="font-semibold text-slate-700">
              New Appointment
            </span>{" "}
            to begin charting.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
