import { notFound } from "next/navigation";
import { Plus, Printer, Save } from "lucide-react";
import { requestTypes, visitHistory } from "@/data/clinic";
import { getPatientProfile } from "@/lib/patient-view";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tabs = [
  "Patient Information",
  "Patient's Chart",
  "Medical Certificate and Referral",
  "Vaccination",
];

export async function PatientProfile({ id }: { id: string }) {
  const patient = await getPatientProfile(id);

  if (!patient) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase">
            {patient.lastName}, {patient.firstName} {patient.middleName}
          </h2>
          <p className="text-slate-600">
            {patient.age}/ {patient.gender} · {patient.birthDate}
          </p>
          <p className="text-sm text-slate-500">Registration date: {patient.createdAt}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="icon" className="rounded-full bg-rose-500 hover:bg-rose-600">
            <Plus className="h-5 w-5" />
          </Button>
          <Button variant="accent">
            <Plus className="h-4 w-4" /> New Request
          </Button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-thin border-b">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            className={`whitespace-nowrap rounded-t-xl px-4 py-3 text-sm font-bold ${
              index === 1 ? "bg-slate-900 text-white" : "bg-white text-slate-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="grid gap-5 xl:grid-cols-[1fr_1.25fr]">
            <section className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <input className="rounded-xl border bg-white px-3 py-2" defaultValue={patient.createdAt} />
                <select className="rounded-xl border bg-white px-3 py-2" defaultValue={patient.request}>
                  <option>{patient.request}</option>
                  {requestTypes.map((requestType) => (
                    <option key={requestType}>{requestType}</option>
                  ))}
                </select>
              </div>
              {["Chief Complaint", "Diagnosis", "Progress Notes/ Medical History", "Treatment/Plan"].map((label) => (
                <label key={label} className="block">
                  <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
                  <textarea className="h-20 w-full rounded-xl border bg-yellow-50/80 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30" />
                </label>
              ))}
              <div>
                <p className="mb-2 text-sm font-bold text-slate-700">Vital Signs</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {["BP", "T", "PR", "RR", "RBS"].map((vital) => (
                    <input key={vital} className="rounded-xl border bg-yellow-50 px-3 py-2" placeholder={vital} />
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="accent">
                  <Save className="h-4 w-4" /> Save
                </Button>
                <Button>Completed</Button>
              </div>
            </section>
            <section className="space-y-4">
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle>Medicines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_80px_90px_90px_auto]">
                    <select className="rounded-xl border px-3 py-2">
                      <option>Paracetamol 500mg</option>
                      <option>Amoxicillin 500mg</option>
                    </select>
                    <input className="rounded-xl border px-3 py-2" placeholder="Qty" />
                    <input className="rounded-xl border px-3 py-2" placeholder="In a day" />
                    <input className="rounded-xl border px-3 py-2" placeholder="Duration" />
                    <Button variant="accent" size="sm">
                      Add in
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          {["Item", "Frequency", "Duration", "Qty", "Status"].map((header) => (
                            <th className="px-3 py-2 text-left" key={header}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-3">Paracetamol</td>
                          <td>3x/day</td>
                          <td>3 days</td>
                          <td>9</td>
                          <td>
                            <Badge className="bg-amber-50 text-amber-700">Requested</Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <Button size="sm">Request Medicine</Button>
                </CardContent>
              </Card>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="shadow-none">
                  <CardContent className="space-y-3 p-4">
                    <input className="w-full rounded-xl border bg-yellow-50 px-3 py-2" placeholder="Reason for Referral" />
                    <input className="w-full rounded-xl border bg-yellow-50 px-3 py-2" placeholder="Referred to" />
                    <textarea className="h-24 w-full rounded-xl border bg-yellow-50 px-3 py-2" placeholder="Other/s/Remarks" />
                    <Button size="sm">
                      <Printer className="h-4 w-4" /> Print Referral Form
                    </Button>
                  </CardContent>
                </Card>
                <Card className="shadow-none">
                  <CardContent className="space-y-3 p-4">
                    <input className="w-full rounded-xl border bg-yellow-50 px-3 py-2" placeholder="Follow up on" />
                    <textarea className="h-32 w-full rounded-xl border bg-yellow-50 px-3 py-2" placeholder="Remarks" />
                    <Button size="sm" variant="outline">
                      <Printer className="h-4 w-4" /> Print Medical Certificate
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Assessment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  {Object.keys(visitHistory[0]).map((key) => (
                    <th key={key} className="px-3 py-2 text-left capitalize">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visitHistory.map((visit, index) => (
                  <tr key={index} className="border-b">
                    {Object.values(visit).map((value, valueIndex) => (
                      <td className="px-3 py-3" key={valueIndex}>
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
