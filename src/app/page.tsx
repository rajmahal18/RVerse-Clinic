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
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-teal-600 to-teal-500 text-white">
          <CardHeader>
            <CardTitle>Clinic Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black">{monthlyInteractionCount.toLocaleString()}</p>
            <p className="text-sm text-teal-50">total patient interactions this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-primary" /> Patient Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black">{patientCount.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">registered patients</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {queueCards.map((queue) => {
          const Icon = queue.icon;

          return (
            <Link
              key={queue.title}
              href={queue.href}
              className="group rounded-3xl border bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${queue.tone}`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-500">{queue.title}</p>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-4xl font-black">{queue.count}</span>
                <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
      <DashboardAnalytics />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Clinic Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <p>Monitor patient records, queue activity, vaccination, and reporting from one workspace.</p>
          <p>Queue and records tables stay scrollable on smaller screens so details remain readable.</p>
          <p>Use the dashboard as a quick entry point for day-to-day clinic work and status checking.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
