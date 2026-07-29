import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronDown, ClipboardPlus, FileText, Pencil, PlayCircle, Plus, Save, Syringe, UserRound } from "lucide-react";
import { RequestType, UserRole, VisitStatus } from "@prisma/client";
import {
  addVaccinationRecordAction,
  addVaccineOptionAction,
  completeVisitAction,
  createVisitAction,
  dispenseMedicineAction,
  requestMedicineAction,
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
import { VaccinationFields } from "@/components/patients/vaccination-fields";
import { MedicineScheduleFields } from "@/components/patients/medicine-schedule-fields";
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

export async function PatientProfile({ id }: { id: string }) {
  const patient = await getPatientWorkflowProfile(id);

  if (!patient) {
    notFound();
  }

  const inventoryOptions = await getInventoryOptions(patient.clinicId);
  const vaccineOptions = await getVaccineOptions(patient.clinicId);
  const currentUser = await getCurrentUser();
  const canManageVisits = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.DOCTOR_NURSE;
  const latestVisit = patient.latestVisit;
  const activeVisit = latestVisit && latestVisit.statusCode !== VisitStatus.COMPLETED && latestVisit.statusCode !== VisitStatus.CANCELLED
    ? latestVisit
    : null;
  const historicalVisits = activeVisit
    ? patient.visitHistory.filter((visit) => visit.id !== activeVisit.id)
    : patient.visitHistory;

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
          <Button asChild variant="outline">
            <Link href={`/patients/${patient.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit Patient
            </Link>
          </Button>
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
              statusOptions={statusOptions}
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
            { label: "Address", value: patient.address },
            { label: "Contact", value: patient.contact },
            { label: "Agency", value: patient.agency },
            { label: "Designation", value: patient.designation },
            { label: "Civil Status", value: patient.civilStatus },
            { label: "Height", value: patient.heightCm ? `${patient.heightCm.toFixed(1)} cm` : "Not provided" },
            { label: "Weight", value: patient.weightKg ? `${patient.weightKg.toFixed(1)} kg` : "Not provided" },
            { label: "BMI", value: patient.bmi ? patient.bmi.toFixed(1) : "Not available" },
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
              label: "Current Visit",
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
                      <input type="hidden" name="patientId" value={patient.id} />
                      <input type="hidden" name="visitId" value={activeVisit.id} />
                      <Button type="submit" size="lg" className="h-12">
                        <PlayCircle className="h-5 w-5" /> Start Visit
                      </Button>
                    </form>
                  </section>
                </div>
              ) : (
              <form action={updateVisitAction} className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
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
                        {statusOptions.map((option) => (
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
                  <ChiefComplaintField initialValue={activeVisit.chiefComplaint} />
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Diagnosis
                    <textarea name="diagnosis" defaultValue={activeVisit.diagnosis} className="h-24 rounded-xl border bg-yellow-50/70 px-3 py-2 font-normal" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Progress notes / medical history
                    <textarea name="progressNotes" defaultValue={activeVisit.progressNotes} className="h-24 rounded-xl border bg-yellow-50/70 px-3 py-2 font-normal" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Treatment plan
                    <textarea name="treatmentPlan" defaultValue={activeVisit.treatmentPlan} className="h-24 rounded-xl border bg-yellow-50/70 px-3 py-2 font-normal" />
                  </label>
                </section>

                <section className="space-y-4">
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

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit">
                      <Save className="h-4 w-4" /> Save Visit
                    </Button>
                    {activeVisit.statusCode !== VisitStatus.COMPLETED && activeVisit.statusCode !== VisitStatus.CANCELLED ? (
                      <Button type="submit" formAction={completeVisitAction} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                        <CheckCircle2 className="h-4 w-4" /> Mark as completed
                      </Button>
                    ) : null}
                  </div>
                </section>
              </form>
              )}
            </CardContent>
          </Card>
              ),
            },
            ...(activeVisit.statusCode === VisitStatus.QUEUED ? [] : [
            {
              id: "medicines",
              label: "Medicines",
              content: (
              <Card>
                <CardHeader>
                  <CardTitle>Medicine Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form action={requestMedicineAction} className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_90px_minmax(170px,220px)_minmax(150px,200px)_auto]">
                    <input type="hidden" name="patientId" value={patient.id} />
                    <input type="hidden" name="visitId" value={activeVisit.id} />
                    <label className="grid gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Medicine
                      <select name="inventoryItemId" className="h-10 min-w-0 rounded-xl border px-3 text-sm font-normal normal-case tracking-normal text-slate-800">
                        {inventoryOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}{item.dosage ? ` ${item.dosage}` : ""}{item.brandName ? ` · ${item.brandName}` : ""} · exp {item.expirationDate ? item.expirationDate.toISOString().slice(0, 10) : "N/A"} ({item.stock} {item.unit})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Quantity
                      <input name="quantity" type="number" min="1" step="1" required className="h-10 rounded-xl border px-3 text-sm font-normal" placeholder="Qty" />
                    </label>
                    <MedicineScheduleFields />
                    <Button type="submit" size="sm" className="mt-6 h-10 sm:col-span-2 xl:col-span-1">
                      <ClipboardPlus className="h-4 w-4" /> Add
                    </Button>
                  </form>

                  <div className="space-y-3 lg:hidden">
                    {activeVisit.medicines.map((medicine) => (
                      <div key={medicine.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-900">{medicine.itemName}</p>
                            <p className="mt-0.5 text-sm text-slate-500">Qty {medicine.quantity} / {medicine.frequency || "-"} / {medicine.duration || "-"}</p>
                          </div>
                          <Badge className={medicine.status === "RELEASED" ? "shrink-0 bg-emerald-50 text-emerald-700" : "shrink-0 bg-amber-50 text-amber-700"}>
                            {medicine.status}
                          </Badge>
                        </div>
                        <div className="mt-3 border-t pt-3">
                          {medicine.status === "RELEASED" ? (
                            <span className="text-xs text-slate-500">Released by {medicine.releasedBy || "Clinic staff"}</span>
                          ) : (
                            <form action={dispenseMedicineAction} className="grid gap-2">
                              <input type="hidden" name="patientId" value={patient.id} />
                              <input type="hidden" name="medicineRequestId" value={medicine.id} />
                              <input name="releasedBy" className="h-10 rounded-xl border px-3 text-sm" placeholder="Released by" />
                              <Button size="sm" type="submit">Dispense</Button>
                            </form>
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
                          {["Item", "Frequency", "Duration", "Qty", "Status", "Action"].map((header) => (
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
                            <td className="px-3 py-3">
                              <Badge className={medicine.status === "RELEASED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
                                {medicine.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-3">
                              {medicine.status === "RELEASED" ? (
                                <span className="text-xs text-slate-500">
                                  Released by {medicine.releasedBy || "Clinic staff"}
                                </span>
                              ) : (
                                <form action={dispenseMedicineAction} className="flex flex-wrap gap-2">
                                  <input type="hidden" name="patientId" value={patient.id} />
                                  <input type="hidden" name="medicineRequestId" value={medicine.id} />
                                  <input name="releasedBy" className="w-28 rounded-xl border px-2 py-1 text-xs" placeholder="Released by" />
                                  <Button size="sm" type="submit">Dispense</Button>
                                </form>
                              )}
                            </td>
                          </tr>
                        ))}
                        {activeVisit.medicines.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
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
            {
              id: "history",
              label: "History",
              content: (
                <VisitHistoryViewer visits={historicalVisits} />
              ),
            },
            {
              id: "follow-ups",
              label: "Follow-ups",
              content: (
              <Card>
                <CardHeader>
                  <CardTitle>Follow-up Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form action={scheduleFollowUpAction} className="grid gap-3">
                    <input type="hidden" name="patientId" value={patient.id} />
                    <input type="hidden" name="visitId" value={activeVisit.id} />
                    <input name="scheduledFor" type="datetime-local" className="rounded-xl border px-3 py-2 text-sm" />
                    <textarea name="remarks" className="h-24 rounded-xl border px-3 py-2 text-sm" placeholder="Follow-up notes" />
                    <Button type="submit">Schedule Follow-up</Button>
                  </form>
                  <div className="space-y-3">
                    {activeVisit.followUps.map((followUp) => (
                      <div key={followUp.id} className="rounded-2xl border px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{followUp.scheduledFor}</p>
                            <p className="text-sm text-slate-500">{followUp.remarks || "No remarks"}</p>
                          </div>
                          <Badge className="bg-amber-50 text-amber-700">{followUp.status}</Badge>
                        </div>
                      </div>
                    ))}
                    {activeVisit.followUps.length === 0 ? (
                      <p className="text-sm text-slate-500">No follow-up schedule created yet.</p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
              ),
            },
            {
              id: "vaccination",
              label: "Vaccination",
              content: (
              <Card>
                <CardHeader>
                  <CardTitle>Vaccination Records</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <details className="rounded-xl border border-dashed bg-slate-50 px-3 py-2">
                    <summary className="cursor-pointer text-sm font-bold text-primary">Add vaccine to catalog</summary>
                    <form action={addVaccineOptionAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input type="hidden" name="patientId" value={patient.id} />
                      <input type="hidden" name="clinicId" value={patient.clinicId} />
                      <input name="vaccineName" required className="h-10 min-w-0 flex-1 rounded-xl border bg-white px-3 text-sm" placeholder="New vaccine name" />
                      <Button type="submit" size="sm"><Plus className="h-4 w-4" /> Save for future</Button>
                    </form>
                  </details>
                  <form action={addVaccinationRecordAction} className="grid gap-3">
                    <input type="hidden" name="patientId" value={patient.id} />
                    <input type="hidden" name="visitId" value={activeVisit.id} />
                    <VaccinationFields vaccines={vaccineOptions} />
                    <input name="givenBy" className="rounded-xl border px-3 py-2 text-sm" placeholder="Given by" />
                    <input name="nextDose" type="date" className="rounded-xl border px-3 py-2 text-sm" />
                    <textarea name="remarks" className="h-24 rounded-xl border px-3 py-2 text-sm" placeholder="Vaccination remarks" />
                    <Button type="submit">
                      <Syringe className="h-4 w-4" /> Save Vaccination
                    </Button>
                  </form>
                  <div className="space-y-3">
                    {activeVisit.vaccinations.map((record) => (
                      <div key={record.id} className="rounded-2xl border px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">{record.vaccine}</p>
                        <p className="text-sm text-slate-500">
                          {record.givenBy || "Clinic staff"}
                          {record.dose ? ` / ${record.dose}` : ""}
                          {record.nextDose ? ` / Next dose: ${record.nextDose}` : ""}
                        </p>
                        {record.remarks ? <p className="mt-1 text-sm text-slate-500">{record.remarks}</p> : null}
                      </div>
                    ))}
                    {activeVisit.vaccinations.length === 0 ? (
                      <p className="text-sm text-slate-500">No vaccination records saved for this visit.</p>
                    ) : null}
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
                  label: "Visit History",
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
              label: "Visit History",
              content: <VisitHistoryViewer visits={historicalVisits} />,
            },
          ]}
        />
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            No visit has been started for this patient yet. Use <span className="font-semibold text-slate-700">New Visit</span> to begin charting.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

