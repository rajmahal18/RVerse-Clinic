import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardPlus, Pencil, Save, Syringe } from "lucide-react";
import { RequestType, VisitStatus } from "@prisma/client";
import {
  addVaccinationRecordAction,
  createVisitAction,
  dispenseMedicineAction,
  requestMedicineAction,
  scheduleFollowUpAction,
  updateVisitAction,
  updateVisitStatusAction,
} from "@/app/actions/workflow";
import { getInventoryOptions, getPatientWorkflowProfile } from "@/lib/patient-view";
import { NewVisitModal } from "@/components/patients/new-visit-modal";
import { PatientRecordTabs } from "@/components/patients/patient-record-tabs";
import { VisitStatusModal } from "@/components/patients/visit-status-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const requestOptions = [
  { value: RequestType.CONSULTATION, label: "Consultation" },
  { value: RequestType.MEDICINES, label: "Medicines" },
  { value: RequestType.CS_211_MEDICAL_CERTIFICATE, label: "CS 211 Medical Certificate" },
  { value: RequestType.REGULAR_MEDICAL_CERTIFICATE, label: "Regular Medical Certificate" },
  { value: RequestType.VACCINATION, label: "Vaccination" },
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
  const latestVisit = patient.latestVisit;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase">
            {patient.lastName}, {patient.firstName} {patient.middleName}
          </h2>
          <p className="text-slate-600">
            {patient.age} / {patient.gender} / {patient.birthDate}
          </p>
          <p className="text-sm text-slate-500">Registered: {patient.createdAt}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/patients/${patient.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit Patient
            </Link>
          </Button>
          <NewVisitModal
            action={createVisitAction}
            patientId={patient.id}
            requestOptions={requestOptions}
            defaultRequestType={RequestType.CONSULTATION}
          />
        </div>
      </div>

      <section className="rounded-2xl border bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Patient Information</h3>
            <p className="text-sm text-slate-500">Basic profile details and current visit status.</p>
          </div>
          {latestVisit ? (
            <VisitStatusModal
              action={updateVisitStatusAction}
              patientId={patient.id}
              visitId={latestVisit.id}
              currentStatus={latestVisit.status}
              currentStatusCode={latestVisit.statusCode}
              statusOptions={statusOptions}
            />
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
          ].map((item) => (
            <div key={item.label} className="px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-800">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {latestVisit ? (
        <PatientRecordTabs
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
              <form action={updateVisitAction} className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
                <input type="hidden" name="patientId" value={patient.id} />
                <input type="hidden" name="visitId" value={latestVisit.id} />
                <section className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Time in
                      <input value={latestVisit.timeIn} readOnly className="rounded-xl border bg-slate-50 px-3 py-2 font-normal" />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Request
                      <select
                        name="requestType"
                        defaultValue={latestVisit.requests[0]?.type ?? RequestType.CONSULTATION}
                        className="rounded-xl border px-3 py-2 font-normal"
                      >
                        {requestOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Status
                      <select name="status" defaultValue={latestVisit.statusCode} className="rounded-xl border px-3 py-2 font-normal">
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Assigned staff
                    <input name="nurseOnDuty" defaultValue={latestVisit.nurseOnDuty} className="rounded-xl border px-3 py-2 font-normal" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Chief complaint
                    <textarea name="chiefComplaint" defaultValue={latestVisit.chiefComplaint} className="h-24 rounded-xl border bg-yellow-50/70 px-3 py-2 font-normal" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Diagnosis
                    <textarea name="diagnosis" defaultValue={latestVisit.diagnosis} className="h-24 rounded-xl border bg-yellow-50/70 px-3 py-2 font-normal" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Progress notes / medical history
                    <textarea name="progressNotes" defaultValue={latestVisit.progressNotes} className="h-24 rounded-xl border bg-yellow-50/70 px-3 py-2 font-normal" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Treatment plan
                    <textarea name="treatmentPlan" defaultValue={latestVisit.treatmentPlan} className="h-24 rounded-xl border bg-yellow-50/70 px-3 py-2 font-normal" />
                  </label>
                </section>

                <section className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">Vital signs</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      <input name="bloodPressure" defaultValue={latestVisit.bloodPressure} className="rounded-xl border px-3 py-2 text-sm" placeholder="BP" />
                      <input name="temperature" defaultValue={latestVisit.temperature} className="rounded-xl border px-3 py-2 text-sm" placeholder="Temp" />
                      <input name="pulseRate" defaultValue={latestVisit.pulseRate} className="rounded-xl border px-3 py-2 text-sm" placeholder="PR" />
                      <input name="respiratoryRate" defaultValue={latestVisit.respiratoryRate} className="rounded-xl border px-3 py-2 text-sm" placeholder="RR" />
                      <input name="rbs" defaultValue={latestVisit.rbs} className="rounded-xl border px-3 py-2 text-sm" placeholder="RBS" />
                    </div>
                  </div>

                  <div className="rounded-3xl border bg-slate-50 px-4 py-4">
                    <p className="text-sm font-semibold text-slate-700">Visit requests</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {latestVisit.requests.length ? (
                        latestVisit.requests.map((request) => (
                          <Badge key={request.id} className="bg-blue-50 text-blue-700">
                            {request.label}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No requests linked yet.</span>
                      )}
                    </div>
                  </div>

                  <Button type="submit">
                    <Save className="h-4 w-4" /> Save Visit
                  </Button>
                </section>
              </form>
            </CardContent>
          </Card>
              ),
            },
            {
              id: "medicines",
              label: "Medicines",
              content: (
              <Card>
                <CardHeader>
                  <CardTitle>Medicine Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form action={requestMedicineAction} className="grid gap-3 md:grid-cols-[1fr_90px_120px_120px_auto]">
                    <input type="hidden" name="patientId" value={patient.id} />
                    <input type="hidden" name="visitId" value={latestVisit.id} />
                    <select name="itemName" className="rounded-xl border px-3 py-2 text-sm">
                      {inventoryOptions.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name} ({item.stock} {item.unit})
                        </option>
                      ))}
                    </select>
                    <input name="quantity" type="number" min="1" className="rounded-xl border px-3 py-2 text-sm" placeholder="Qty" />
                    <input name="frequency" className="rounded-xl border px-3 py-2 text-sm" placeholder="Frequency" />
                    <input name="duration" className="rounded-xl border px-3 py-2 text-sm" placeholder="Duration" />
                    <Button type="submit" size="sm">
                      <ClipboardPlus className="h-4 w-4" /> Add
                    </Button>
                  </form>

                  <div className="overflow-x-auto">
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
                        {latestVisit.medicines.map((medicine) => (
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
                        {latestVisit.medicines.length === 0 ? (
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
              <Card>
                <CardHeader>
                  <CardTitle>Assessment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-[840px] w-full text-sm">
                      <thead className="bg-slate-100 text-slate-500">
                        <tr>
                          {["Date", "Status", "Request", "Chief Complaint", "Diagnosis", "Assigned Staff"].map((header) => (
                            <th key={header} className="px-3 py-2 text-left">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {patient.visitHistory.map((visit) => (
                          <tr key={visit.id} className="border-b">
                            <td className="px-3 py-3">{visit.timeIn}</td>
                            <td className="px-3 py-3">{visit.status}</td>
                            <td className="px-3 py-3">{visit.requests.map((request) => request.label).join(", ") || "-"}</td>
                            <td className="px-3 py-3">{visit.chiefComplaint || "-"}</td>
                            <td className="px-3 py-3">{visit.diagnosis || "-"}</td>
                            <td className="px-3 py-3">{visit.nurseOnDuty || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
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
                    <input type="hidden" name="visitId" value={latestVisit.id} />
                    <input name="scheduledFor" type="datetime-local" className="rounded-xl border px-3 py-2 text-sm" />
                    <textarea name="remarks" className="h-24 rounded-xl border px-3 py-2 text-sm" placeholder="Follow-up notes" />
                    <Button type="submit">Schedule Follow-up</Button>
                  </form>
                  <div className="space-y-3">
                    {latestVisit.followUps.map((followUp) => (
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
                    {latestVisit.followUps.length === 0 ? (
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
                  <form action={addVaccinationRecordAction} className="grid gap-3">
                    <input type="hidden" name="patientId" value={patient.id} />
                    <input type="hidden" name="visitId" value={latestVisit.id} />
                    <input name="vaccine" className="rounded-xl border px-3 py-2 text-sm" placeholder="Vaccine name" />
                    <input name="givenBy" className="rounded-xl border px-3 py-2 text-sm" placeholder="Given by" />
                    <input name="nextDose" type="date" className="rounded-xl border px-3 py-2 text-sm" />
                    <textarea name="remarks" className="h-24 rounded-xl border px-3 py-2 text-sm" placeholder="Vaccination remarks" />
                    <Button type="submit">
                      <Syringe className="h-4 w-4" /> Save Vaccination
                    </Button>
                  </form>
                  <div className="space-y-3">
                    {latestVisit.vaccinations.map((record) => (
                      <div key={record.id} className="rounded-2xl border px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">{record.vaccine}</p>
                        <p className="text-sm text-slate-500">
                          {record.givenBy || "Clinic staff"}
                          {record.nextDose ? ` / Next dose: ${record.nextDose}` : ""}
                        </p>
                        {record.remarks ? <p className="mt-1 text-sm text-slate-500">{record.remarks}</p> : null}
                      </div>
                    ))}
                    {latestVisit.vaccinations.length === 0 ? (
                      <p className="text-sm text-slate-500">No vaccination records saved for this visit.</p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
              ),
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
