import { Activity, PieChart, UsersRound } from "lucide-react";
import { PatientGender } from "@prisma/client";
import { calculateAgeInAppTimeZone } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";

type Segment = {
  label: string;
  value: number;
  color: string;
  trackColor: string;
};

const radialCircumference = 2 * Math.PI * 42;

function calculateAge(birthDate: Date) {
  return calculateAgeInAppTimeZone(birthDate);
}

function GenderChart({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let currentOffset = 0;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-1 md:gap-4 md:py-2">
      <div className="relative h-32 w-32 md:h-44 md:w-44">
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
            <p className="text-2xl font-black text-slate-900 md:text-3xl">{total}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 md:text-xs md:tracking-[0.24em]">
              Profiles
            </p>
          </div>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 md:gap-3">
        {segments.map((segment) => {
          const percentage = total ? Math.round((segment.value / total) * 100) : 0;

          return (
            <div
              key={segment.label}
              className="rounded-xl border border-slate-200 px-3 py-2 md:rounded-2xl md:px-4 md:py-3"
              style={{ backgroundColor: segment.trackColor }}
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                <p className="text-sm font-semibold text-slate-700">{segment.label}</p>
              </div>
              <div className="mt-1 flex items-end justify-between md:mt-2">
                <span className="text-xl font-black text-slate-900 md:text-2xl">{segment.value}</span>
                <span className="text-xs font-semibold text-slate-500 md:text-sm">{percentage}%</span>
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
    <section className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white md:mt-6 md:rounded-[28px]">
      <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f0fdfa,white_40%,#fff7ed)] px-4 py-4 md:px-6 md:py-5">
        <p className="text-sm font-semibold text-primary">Patient Insights</p>
        <div className="mt-1 flex flex-col gap-2 md:mt-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-950 md:text-2xl">Patient profile and activity summary</h3>
            <p className="mt-1 hidden max-w-2xl text-sm text-slate-600 sm:block">
              Review key demographics and service activity from one section of the dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="border-b border-slate-200 p-4 xl:border-b-0 xl:border-r xl:p-6">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            <h4 className="text-base font-bold text-slate-900 md:text-lg">Gender Distribution</h4>
          </div>
          <p className="mt-1 hidden text-sm text-slate-500 sm:block">Current patient profile split based on registered records.</p>
          <GenderChart segments={genderSegments} />
        </div>

        <div className="p-4 xl:p-6">
          <div className="grid gap-3 md:gap-4">
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <div className="rounded-xl bg-slate-50 px-3 py-3 md:rounded-3xl md:px-4 md:py-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <UsersRound className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Average Age</span>
                </div>
                <p className="mt-2 text-2xl font-black text-slate-950 md:mt-3 md:text-3xl">{averageAge}</p>
                <p className="text-xs text-slate-500 md:text-sm">average years old</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-3 md:rounded-3xl md:px-4 md:py-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Activity className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold">Top Service</span>
                </div>
                <p className="mt-2 text-base font-black text-slate-950 md:mt-3 md:text-xl">Awaiting records</p>
                <p className="text-xs text-slate-500 md:text-sm">Needs visit data</p>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-3 md:rounded-3xl md:px-4 md:py-4">
              <p className="text-sm font-semibold text-slate-500">Priority Service Views</p>
              <div className="mt-3 grid gap-2 md:mt-4 md:gap-3">
                {[
                  "Daily patient volume trend",
                  "Top requested services",
                  "Status flow: queued, in progress, follow up",
                ].map((item, index) => (
                  <div key={item} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700 md:h-8 md:w-8 md:rounded-2xl md:text-sm">
                        0{index + 1}
                      </span>
                      <p className="min-w-0 text-sm font-semibold text-slate-700">{item}</p>
                    </div>
                    <span className="hidden rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 sm:inline-flex">Live View</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-3 md:rounded-3xl md:px-4 md:py-4">
              <p className="text-sm font-semibold text-slate-500">Registered Patient Base</p>
              <div className="mt-3 space-y-2 md:mt-4 md:space-y-3">
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
