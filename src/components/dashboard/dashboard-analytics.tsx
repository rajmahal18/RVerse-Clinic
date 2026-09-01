import { PieChart, UsersRound } from "lucide-react";
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
              className="rounded-xl border border-slate-200 px-3 py-2 md:px-4 md:py-3"
              style={{ backgroundColor: segment.trackColor }}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
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
    <section className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white md:mt-6">
      <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 md:px-5 md:py-4">
        <p className="text-sm font-semibold text-primary">Patient Insights</p>
        <h3 className="mt-0.5 text-lg font-black tracking-tight text-slate-950">Patient demographics</h3>
        <p className="mt-1 text-sm text-slate-500">Based on currently registered patient profiles.</p>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.15fr)]">
        <div className="border-b border-slate-200 p-4 lg:border-b-0 lg:border-r lg:p-5">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            <h4 className="text-base font-bold text-slate-900">Gender distribution</h4>
          </div>
          <GenderChart segments={genderSegments} />
        </div>

        <div className="p-4 lg:p-5">
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            <h4 className="text-base font-bold text-slate-900">Profile snapshot</h4>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border">
            <div className="grid grid-cols-2 divide-x border-b">
              <div className="px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Average age</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{averageAge}</p>
                <p className="text-xs text-slate-500">years old</p>
              </div>
              <div className="px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Patient profiles</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{totalPatients}</p>
                <p className="text-xs text-slate-500">registered</p>
              </div>
            </div>
            <div className="divide-y">
              {[
                { label: "Female", value: femaleCount, color: "bg-pink-400" },
                { label: "Male", value: maleCount, color: "bg-teal-500" },
              ].map((item) => {
                const percentage = totalPatients ? Math.round((item.value / totalPatients) * 100) : 0;
                return (
                  <div key={item.label} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-slate-700">{item.label}</span>
                      <span className="font-bold text-slate-900">{item.value} <span className="font-normal text-slate-400">({percentage}%)</span></span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
