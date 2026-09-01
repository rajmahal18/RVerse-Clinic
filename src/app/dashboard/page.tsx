import Link from "next/link";
import { ArrowRight, CalendarClock, ClipboardList, FileText, ShieldPlus, Syringe, UsersRound, Activity, PackageCheck, Pill } from "lucide-react";
import { RequestType, VisitStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDayRange, getMonthRange } from "@/lib/date-time";
import { canAccessPath, isAppRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = getDayRange();
  const month = getMonthRange();
  const currentUser = await getCurrentUser();
  const clinicRequestWhere = currentUser
    ? {
        OR: [
          { visit: { patient: { clinicId: currentUser.clinicId } } },
          { inventoryItem: { clinicId: currentUser.clinicId } },
        ],
      }
    : { id: "__unauthenticated__" };
  const [
    patientCount,
    monthlyInteractionCount,
    todaysPatientCount,
    completedTodayCount,
    followUpCount,
    vaccinationCount,
    emergencyCount,
    pendingItemRequestCount,
    lowStockItems,
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
        OR: [
          {
            timeIn: {
              gte: today.start,
              lt: today.end,
            },
          },
          {
            timeIn: {
              lt: today.start,
            },
            status: {
              in: [VisitStatus.QUEUED, VisitStatus.IN_PROGRESS],
            },
          },
        ],
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
    prisma.medicineRequest.count({ where: { AND: [clinicRequestWhere, { status: { in: ["REQUESTED", "APPROVED"] } }] } }),
    prisma.inventoryItem.findMany({
      where: { clinicId: currentUser?.clinicId ?? "__unauthenticated__" },
      select: { stock: true, reorderLevel: true },
    }),
  ]);
  const role = isAppRole(currentUser?.role) ? currentUser.role : "RECORDS";
  const canViewPatients = canAccessPath(role, "/patients");
  const lowStockCount = lowStockItems.filter((item) => item.stock <= item.reorderLevel).length;
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
    {
      title: "Pending Item Requests",
      count: pendingItemRequestCount,
      tone: "bg-indigo-50 text-indigo-700",
      href: "/item-requests",
      icon: PackageCheck,
    },
    {
      title: "Low Stock Items",
      count: lowStockCount,
      tone: "bg-orange-50 text-orange-700",
      href: "/inventory",
      icon: Pill,
    },
  ].filter((queue) => canAccessPath(role, queue.href));

  return (
    <AppShell>
      <PageHeader title="Dashboard" eyebrow="Home / Dashboard" />
      {canViewPatients ? (
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
      ) : (
        <div className="grid grid-cols-2 gap-2 md:gap-4">
          <Card className="bg-gradient-to-br from-indigo-600 to-indigo-500 text-white">
            <CardHeader className="p-3 pb-1 md:p-5 md:pb-2">
              <CardTitle className="text-sm md:text-lg">Item Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-5 md:pt-0">
              <p className="text-2xl font-black md:text-4xl">{pendingItemRequestCount.toLocaleString()}</p>
              <p className="text-xs text-indigo-50 md:text-sm">pending approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-1 md:p-5 md:pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm md:gap-2 md:text-lg">
                <Pill className="h-4 w-4 text-primary md:h-5 md:w-5" /> Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-5 md:pt-0">
              <p className="text-2xl font-black md:text-4xl">{lowStockCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground md:text-sm">low stock items</p>
            </CardContent>
          </Card>
        </div>
      )}
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
      {canViewPatients ? <DashboardAnalytics /> : null}
      <Card className="mt-3 md:mt-6">
        <CardHeader className="p-4 pb-2 md:p-5 md:pb-2">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <FileText className="h-5 w-5 text-primary" /> Clinic Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 p-4 pt-0 text-sm text-slate-600 md:grid-cols-3 md:gap-3 md:p-5 md:pt-0">
          {canViewPatients ? (
            <>
              <p>Monitor patient records, queue activity, vaccination, and reporting from one workspace.</p>
              <p>Queue and records tables stay scrollable on smaller screens so details remain readable.</p>
              <p>Use the dashboard as a quick entry point for day-to-day clinic work and status checking.</p>
            </>
          ) : (
            <>
              <p>Monitor item requests and inventory stock status from the dashboard.</p>
              <p>Use the request queue for approval and release decisions.</p>
              <p>Open inventory to review medicine, vaccine, supply, and equipment records.</p>
            </>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
