import Link from "next/link";
import { ArrowRight, CalendarClock, ClipboardList, FileText, ShieldPlus, Syringe, UsersRound, Activity } from "lucide-react";
import { RequestType, VisitStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

function getDayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);

  return { start, end };
}

export default async function DashboardPage() {
  const today = getDayRange();
  const month = getMonthRange();
  const [
    patientCount,
    monthlyInteractionCount,
    todaysPatientCount,
    completedTodayCount,
    followUpCount,
    vaccinationCount,
    emergencyCount,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.visit.count({
      where: {
        timeIn: {
          gte: month.start,
          lt: month.end,
        },
      },
    }),
    prisma.visit.count({
      where: {
        timeIn: {
          gte: today.start,
          lt: today.end,
        },
      },
    }),
    prisma.visit.count({
      where: {
        status: VisitStatus.COMPLETED,
        timeIn: {
          gte: today.start,
          lt: today.end,
        },
      },
    }),
    prisma.followUp.count({
      where: {
        status: "SCHEDULED",
      },
    }),
    prisma.vaccinationRecord.count(),
    prisma.visit.count({
      where: {
        requests: {
          some: {
            type: RequestType.EMERGENCY,
          },
        },
      },
    }),
  ]);
  const queueCards = [
    {
      title: "Today's Patient",
      count: todaysPatientCount,
      tone: "bg-teal-50 text-teal-700",
      href: "/todays-patients",
      icon: CalendarClock,
    },
    {
      title: "Completed Today",
      count: completedTodayCount,
      tone: "bg-emerald-50 text-emerald-700",
      href: "/todays-patients",
      icon: Activity,
    },
    {
      title: "For Follow up",
      count: followUpCount,
      tone: "bg-amber-50 text-amber-700",
      href: "/follow-ups",
      icon: ClipboardList,
    },
    {
      title: "Vaccination Records",
      count: vaccinationCount,
      tone: "bg-blue-50 text-blue-700",
      href: "/vaccination",
      icon: Syringe,
    },
    {
      title: "Emergency Cases",
      count: emergencyCount,
      tone: "bg-rose-50 text-rose-700",
      href: "/emergency-cases",
      icon: ShieldPlus,
    },
  ];

  return (
    <AppShell>
      <PageHeader title="Dashboard" eyebrow="Home / Dashboard" />
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        <Card className="bg-gradient-to-br from-teal-600 to-teal-500 text-white">
          <CardHeader className="p-3 pb-1 md:p-5 md:pb-2">
            <CardTitle className="text-sm md:text-lg">Clinic Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-5 md:pt-0">
            <p className="text-2xl font-black md:text-4xl">{monthlyInteractionCount.toLocaleString()}</p>
            <p className="text-xs text-teal-50 md:text-sm">interactions this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1 md:p-5 md:pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm md:gap-2 md:text-lg">
              <UsersRound className="h-4 w-4 text-primary md:h-5 md:w-5" /> Patient Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-5 md:pt-0">
            <p className="text-2xl font-black md:text-4xl">{patientCount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground md:text-sm">registered patients</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 md:mt-6 md:gap-4 xl:grid-cols-5">
        {queueCards.map((queue) => {
          const Icon = queue.icon;

          return (
            <Link
              key={queue.title}
              href={queue.href}
              className="group flex items-center gap-3 rounded-xl border bg-white p-3 shadow-soft transition hover:-translate-y-1 hover:shadow-xl sm:block sm:rounded-2xl md:p-5"
            >
              <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:mb-4 md:h-12 md:w-12 md:rounded-2xl ${queue.tone}`}>
                <Icon className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-500">{queue.title}</p>
                <div className="flex items-end justify-between gap-3 sm:mt-2">
                  <span className="text-2xl font-black md:text-4xl">{queue.count}</span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <DashboardAnalytics />
      <Card className="mt-3 md:mt-6">
        <CardHeader className="p-4 pb-2 md:p-5 md:pb-2">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <FileText className="h-5 w-5 text-primary" /> Clinic Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 p-4 pt-0 text-sm text-slate-600 md:grid-cols-3 md:gap-3 md:p-5 md:pt-0">
          <p>Monitor patient records, queue activity, vaccination, and reporting from one workspace.</p>
          <p>Queue and records tables stay scrollable on smaller screens so details remain readable.</p>
          <p>Use the dashboard as a quick entry point for day-to-day clinic work and status checking.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
