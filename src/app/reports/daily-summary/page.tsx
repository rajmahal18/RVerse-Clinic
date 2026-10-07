import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PrintActions } from "@/components/clinic-forms/print-actions";
import { CsrfField } from "@/components/security/csrf-field";
import { ActionAlert } from "@/components/ui/action-alert";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildDailySummary, readDailySummary, validSummaryDate } from "@/lib/daily-summary";
import { formatDateKey, formatDateTime } from "@/lib/date-time";
import { submitDailySummaryAction } from "@/app/actions/workflow";

export default async function DailySummaryPage({ searchParams }: { searchParams: Promise<{ date?: string; submission?: string; error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "DOCTOR_NURSE", "RECORDS"].includes(user.role)) redirect("/reports");
  const params = await searchParams;
  let date = formatDateKey(new Date());
  try { date = validSummaryDate(params.date || date); } catch { /* Use today's date for malformed filters. */ }
  const submission = params.submission ? await prisma.activityLog.findFirst({ where: { id: params.submission, clinicId: user.clinicId, module: "Daily Summary", action: "Submit daily summary", status: "SUCCESS" } }) : null;
  if (params.submission && !submission) notFound();
  const snapshot = submission ? readDailySummary(submission.metadata) : null;
  if (submission && !snapshot) notFound();
  const summary = snapshot ?? await buildDailySummary(user.clinicId, date);
  const recent = await prisma.activityLog.findMany({ where: { clinicId: user.clinicId, module: "Daily Summary", action: "Submit daily summary", status: "SUCCESS" }, orderBy: { createdAt: "desc" }, take: 14 });
  const ready = summary.rows.length > 0 && summary.rows.every(row => row.status === "completed");
  return <AppShell>
    <div className="daily-summary-screen space-y-4">
      <div className="no-print"><PageHeader title="Daily patient summary" /><ActionAlert error={params.error} />
        <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
          <form action="/reports/daily-summary" className="flex flex-wrap items-end gap-2"><label className="grid gap-1 text-sm font-semibold">Clinic date<input type="date" name="date" defaultValue={summary.date} max={formatDateKey(new Date())} className="h-10 rounded-lg border bg-white px-3" required /></label><Button variant="outline">Preview</Button></form>
          {user.role !== "RECORDS" && !submission ? <form action={submitDailySummaryAction}><CsrfField /><input type="hidden" name="date" value={summary.date} /><Button disabled={!ready}>Submit to records</Button></form> : null}
        </div>
        {!submission ? <p className="mt-2 text-sm text-slate-500">Submit after all visits for the day are completed. Records receives a notification and a saved printable version.</p> : null}
      </div>
      <section className="daily-summary-paper bg-white p-4 sm:p-6">
        <h1 className="text-xl font-bold text-slate-900">Daily patient summary</h1><p className="mt-1 text-sm text-slate-600">{summary.date} · {summary.rows.length} patient visits · {submission ? "Submitted" : "Draft"}</p>
        {submission ? <p className="mt-1 text-xs text-slate-500">Submitted {formatDateTime(submission.createdAt)}</p> : null}
        <div className="mt-5 space-y-0 sm:hidden">{summary.rows.map((row, index) => <article key={`${row.patientId}:${index}`} className="border-b py-3"><Link href={`/patients/${row.patientId}`} className="font-semibold text-teal-700">{row.name}</Link><p className="text-xs text-slate-500">{row.patientNumber} · {row.time} · {row.status}</p><p className="mt-1 break-words text-sm">{row.services}</p><details className="mt-1 text-sm"><summary className="cursor-pointer text-slate-500">Diagnosis</summary>{row.diagnosis || "No diagnosis recorded"}</details></article>)}</div>
        <table className="daily-patient-report-table mt-5 hidden w-full table-fixed text-left text-sm sm:table"><thead><tr className="border-b text-xs uppercase text-slate-500">{["Patient", "Time", "Services", "Status"].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{summary.rows.map((row, index) => <tr key={`${row.patientId}:${index}`} className="border-b align-top"><td className="break-words p-2"><Link href={`/patients/${row.patientId}`} className="font-semibold text-teal-700">{row.name}</Link><p className="text-xs text-slate-500">{row.patientNumber}</p><details className="no-print mt-1"><summary className="cursor-pointer text-xs text-slate-500">Diagnosis</summary>{row.diagnosis || "No diagnosis recorded"}</details></td><td className="p-2">{row.time}</td><td className="break-words p-2">{row.services}</td><td className="break-words p-2">{row.status}</td></tr>)}</tbody></table>
        {!summary.rows.length ? <p className="py-8 text-center text-sm text-slate-500">No visits for this date.</p> : null}
      </section>
      {submission ? <PrintActions filename={`Daily-patient-summary-${summary.date}`} /> : null}
      <section className="no-print border-t pt-4"><h2 className="text-sm font-bold">Submitted summaries</h2><div className="mt-2 divide-y">{recent.map(log => <Link key={log.id} href={`/reports/daily-summary?submission=${log.id}`} className="block py-3 text-sm text-teal-700">{log.description}<span className="mt-1 block text-xs text-slate-500">{formatDateTime(log.createdAt)}</span></Link>)}</div>{!recent.length ? <p className="mt-2 text-sm text-slate-500">No summaries submitted yet.</p> : null}</section>
    </div>
  </AppShell>;
}
