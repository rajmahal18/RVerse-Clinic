import { Activity, PieChart, UsersRound } from "lucide-react";
import { PatientGender } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Segment = {
  label: string;
  value: number;
  color: string;
  trackColor: string;
};

const radialCircumference = 2 * Math.PI * 42;

function calculateAge(birthDate: Date) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function GenderChart({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let currentOffset = 0;

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-2">
      <div className="relative h-44 w-44">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          {segments.map((segment) => {
            const dashLength = total ? (segment.value / total) * radialCircumference : 0;
            const strokeDasharray = `${dashLength} ${radialCircumference - dashLength}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += dashLength;

            return (
              <circle
                key={segment.label}
                cx="60"
                cy="60"
                r="42"
                fill="none"
                stroke={segment.color}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
              />
            );
          })}
          <circle cx="60" cy="60" r="24" fill="white" />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-3xl font-black text-slate-900">{total}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Profiles
            </p>
          </div>
        </div>
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        {segments.map((segment) => {
          const percentage = total ? Math.round((segment.value / total) * 100) : 0;

          return (
            <div
              key={segment.label}
              className="rounded-2xl border border-slate-200 px-4 py-3"
              style={{ backgroundColor: segment.trackColor }}
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                <p className="text-sm font-semibold text-slate-700">{segment.label}</p>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-2xl font-black text-slate-900">{segment.value}</span>
                <span className="text-sm font-semibold text-slate-500">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export async function DashboardAnalytics() {
  const patients = await prisma.patient.findMany({
    select: {
      birthDate: true,
      gender: true,
    },
  });

  const totalPatients = patients.length;
  const femaleCount = patients.filter((patient) => patient.gender === PatientGender.FEMALE).length;
  const maleCount = patients.filter((patient) => patient.gender === PatientGender.MALE).length;
  const averageAge = totalPatients
    ? Math.round(patients.reduce((sum, patient) => sum + calculateAge(patient.birthDate), 0) / totalPatients)
    : 0;

  const genderSegments: Segment[] = [
    {
      label: "Female",
      value: femaleCount,
      color: "#f472b6",
      trackColor: "#fce7f3",
    },
    {
      label: "Male",
      value: maleCount,
      color: "#14b8a6",
      trackColor: "#ccfbf1",
    },
  ].filter((segment) => segment.value > 0 || totalPatients === 0);

  return (
    <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f0fdfa,white_40%,#fff7ed)] px-5 py-5 md:px-6">
        <p className="text-sm font-semibold text-primary">Patient Insights</p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-950 md:text-2xl">Patient profile and activity summary</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Review key demographics and service activity from one section of the dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="border-b border-slate-200 p-5 xl:border-b-0 xl:border-r xl:p-6">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            <h4 className="text-lg font-bold text-slate-900">Gender Distribution</h4>
          </div>
          <p className="mt-1 text-sm text-slate-500">Current patient profile split based on registered records.</p>
          <GenderChart segments={genderSegments} />
        </div>

        <div className="p-5 xl:p-6">
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <UsersRound className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Average Age</span>
                </div>
                <p className="mt-3 text-3xl font-black text-slate-950">{averageAge}</p>
                <p className="text-sm text-slate-500">years old across active profiles</p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Activity className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold">Top Service</span>
                </div>
                <p className="mt-3 text-xl font-black text-slate-950">Awaiting records</p>
                <p className="text-sm text-slate-500">Service rankings will appear as visit data is recorded.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-4">
              <p className="text-sm font-semibold text-slate-500">Priority Service Views</p>
              <div className="mt-4 grid gap-3">
                {[
                  "Daily patient volume trend",
                  "Top requested services",
                  "Status flow: queued, in progress, follow up",
                ].map((item, index) => (
                  <div key={item} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-700">
                        0{index + 1}
                      </span>
                      <p className="text-sm font-semibold text-slate-700">{item}</p>
                    </div>
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">Live View</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-500">Registered Patient Base</p>
              <div className="mt-4 space-y-3">
                {[
                  { label: "Female", value: femaleCount, color: "from-pink-500 to-rose-400" },
                  { label: "Male", value: maleCount, color: "from-teal-500 to-cyan-400" },
                ].map((item) => {
                  const percentage = totalPatients ? Math.round((item.value / totalPatients) * 100) : 0;

                  return (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-slate-700">{item.label}</span>
                        <span className="text-slate-500">{item.value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
