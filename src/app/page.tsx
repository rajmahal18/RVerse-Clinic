import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, UsersRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queues } from "@/data/clinic";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const patientCount = await prisma.patient.count();

  return (
    <AppShell>
      <PageHeader title="Dashboard" eyebrow="Home / Dashboard" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-teal-600 to-teal-500 text-white">
          <CardHeader>
            <CardTitle>Clinic Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black">84</p>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-amber-500" /> Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black">18</p>
            <p className="text-sm text-muted-foreground">patients in queue</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {queues.map((queue) => {
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
            <FileText className="h-5 w-5 text-primary" /> Design Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <p>Layout follows the original dashboard, patient records, request, chart, vaccination, certificate/referral, and print sections.</p>
          <p>Tables are horizontally scrollable on mobile to avoid broken layouts.</p>
          <p>Database and PWA foundations are prepared, but business logic is intentionally deferred.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
