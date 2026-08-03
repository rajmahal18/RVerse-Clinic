import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarClock, MapPin, Phone, Stethoscope, Syringe, UserRound, XCircle, type LucideIcon } from "lucide-react";
import { VisitStatus } from "@prisma/client";
import type { PatientTableRow } from "@/lib/patient-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CsrfField } from "@/components/security/csrf-field";
import { cn } from "@/lib/utils";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

type PatientTableProps = {
  rows: PatientTableRow[];
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  pageSize?: number;
  basePath?: string;
  searchQuery?: string;
  queryParams?: Record<string, string | undefined>;
  cancelVisitAction?: ServerFormAction;
  cancelRedirectTo?: string;
  pageParamName?: string;
  visitDateLabel?: string;
  detailColumnLabel?: string;
  hideContactColumn?: boolean;
  emptyState?: string;
  embedded?: boolean;
};

function buildPageHref(
  basePath: string,
  page: number,
  searchQuery?: string,
  queryParams?: Record<string, string | undefined>,
  pageParamName = "page"
) {
  const params = new URLSearchParams({ [pageParamName]: String(page) });

  Object.entries(queryParams ?? {}).forEach(([key, value]) => {
    if (value?.trim()) {
      params.set(key, value.trim());
    }
  });

  if (searchQuery?.trim()) {
    params.set("q", searchQuery.trim());
  }

  return `${basePath}?${params.toString()}`;
}

function formatPatientName(patient: PatientTableRow) {
  const middleInitial = patient.middleName.trim() ? ` ${patient.middleName.trim().charAt(0).toUpperCase()}.` : "";
  return `${patient.lastName}, ${patient.firstName}${middleInitial}`;
}

function statusTone(status: string) {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "Cancelled") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (status === "For follow up") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "In progress") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (status === "Queued") return "bg-violet-50 text-violet-700 ring-violet-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function InfoLine({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-slate-600">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

function GenderBadge({ gender }: { gender: string }) {
  if (gender === "Male") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-black text-blue-700 ring-1 ring-blue-200">
        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
        Male
      </span>
    );
  }

  if (gender === "Female") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-pink-50 px-2 py-0.5 text-xs font-black text-pink-700 ring-1 ring-pink-200">
        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
        Female
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center rounded-full bg-violet-50 px-2 py-0.5 text-xs font-black text-violet-700 ring-1 ring-violet-200">
      {gender}
    </span>
  );
}

function RecordDetails({ patient }: { patient: PatientTableRow }) {
  if (!patient.recordSummary) {
    return null;
  }
  const Icon = patient.recordIcon === "calendar" ? CalendarClock : Syringe;

  return (
    <div className="grid gap-1 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-left lg:bg-white lg:px-0 lg:py-0 lg:border-0">
      <div className="flex min-w-0 items-start gap-2 lg:items-center">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-slate-900">{patient.recordSummary}</p>
          {patient.recordMeta ? <p className="mt-0.5 break-words text-xs font-semibold text-emerald-800 lg:line-clamp-2">{patient.recordMeta}</p> : null}
        </div>
      </div>
      {patient.recordNote ? <p className="break-words text-xs text-slate-600 lg:line-clamp-2">{patient.recordNote}</p> : null}
    </div>
  );
}

export function PatientTable({
  rows,
  currentPage = 1,
  totalPages = 1,
  totalCount = rows.length,
  pageSize = rows.length,
  basePath = "/patients",
  searchQuery,
  queryParams,
  cancelVisitAction,
  cancelRedirectTo = basePath,
  pageParamName = "page",
  visitDateLabel = "Last visit",
  detailColumnLabel = "Request",
  hideContactColumn = false,
  emptyState = "No patient records found for this view yet.",
  embedded = false,
}: PatientTableProps) {
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount);
  const pageNumbers = Array.from(
    new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter((page) => page >= 1 && page <= totalPages))
  );
  const canCancelVisit = (patient: PatientTableRow) =>
    Boolean(
      cancelVisitAction &&
        patient.latestVisitId &&
        (patient.statusCode === VisitStatus.QUEUED || patient.statusCode === VisitStatus.IN_PROGRESS)
    );

  return (
    <div className={cn("overflow-hidden bg-white", embedded ? "" : "rounded-2xl border shadow-soft")}>
      <div className="divide-y-8 divide-slate-100 bg-slate-100 lg:hidden">
        {rows.map((patient) => (
          <div key={patient.id} className="border-y border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Link href={`/patients/${patient.id}`} className="block w-full text-left transition active:bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-black uppercase text-slate-950">
                    {formatPatientName(patient)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
                    <GenderBadge gender={patient.gender} />
                    <InfoLine icon={UserRound}>{patient.age} yrs / DOB {patient.birthDate}</InfoLine>
                    <InfoLine icon={Phone}>{patient.contact}</InfoLine>
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
              </div>
              <div className="mt-3 grid gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <RecordDetails patient={patient} />
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-blue-50 text-blue-700">{patient.request}</Badge>
                  <Badge className={statusTone(patient.status)}>{patient.status}</Badge>
                  {patient.isCarriedOverQueue ? (
                    <Badge className="bg-amber-50 text-amber-700 ring-amber-200">Queued from previous day</Badge>
                  ) : null}
                </div>
                <InfoLine icon={CalendarClock}>{visitDateLabel}: {patient.latestVisitDay || patient.latestVisitAt}</InfoLine>
                <span className="text-xs font-semibold text-slate-500">Time in: {patient.latestVisitAt}</span>
              </div>
              <div className="mt-3 grid gap-1 text-xs font-semibold">
                <InfoLine icon={MapPin}>{patient.address}</InfoLine>
                <InfoLine icon={BriefcaseBusiness}>{patient.agency} / {patient.designation}</InfoLine>
              </div>
            </Link>
            {canCancelVisit(patient) ? (
              <form action={cancelVisitAction} className="mt-3 border-t border-slate-100 pt-3">
                <CsrfField />
                <input type="hidden" name="patientId" value={patient.id} />
                <input type="hidden" name="visitId" value={patient.latestVisitId} />
                <input type="hidden" name="redirectTo" value={cancelRedirectTo} />
                <Button type="submit" variant="outline" size="sm" className="w-full border-rose-200 text-rose-700 hover:bg-rose-50">
                  <XCircle className="h-4 w-4" /> Cancel Appointment
                </Button>
              </form>
            ) : null}
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="bg-white px-4 py-10 text-center text-sm text-slate-500">
            {emptyState}
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto scrollbar-thin lg:block">
        <table className="min-w-[1120px] w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {[
                "Patient",
                "Profile",
                hideContactColumn ? null : "Contact",
                "Office",
                "Latest Visit",
                detailColumnLabel,
                "",
              ].filter((header): header is string => header !== null).map((header) => (
                <th key={header} className="px-4 py-3 font-bold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((patient) => (
              <tr key={patient.id} className="group hover:bg-slate-50">
                <td className={cn("align-top", hideContactColumn ? "w-[22%]" : "w-[25%]")}>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-4 text-slate-950 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    <p className="font-black uppercase leading-5">{formatPatientName(patient)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <GenderBadge gender={patient.gender} />
                      <span className="text-xs font-semibold text-slate-500">{patient.middleName || "No middle name"}</span>
                    </div>
                  </Link>
                </td>
                <td className={cn("align-top", hideContactColumn ? "w-[13%]" : "w-[16%]")}>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    <div className="grid gap-1.5 text-xs font-semibold">
                      <InfoLine icon={UserRound}>{patient.age} yrs</InfoLine>
                      <span className="text-slate-500">DOB {patient.birthDate}</span>
                      <span className="text-slate-500">BMI {patient.bmi ? patient.bmi.toFixed(1) : "N/A"}</span>
                    </div>
                  </Link>
                </td>
                {hideContactColumn ? null : (
                  <td className="w-[18%] align-top">
                    <Link href={`/patients/${patient.id}`} className="block px-4 py-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                      <div className="grid gap-1.5 text-xs font-semibold">
                        <InfoLine icon={Phone}>{patient.contact}</InfoLine>
                        <InfoLine icon={MapPin}>{patient.address}</InfoLine>
                      </div>
                    </Link>
                  </td>
                )}
                <td className={cn("align-top", hideContactColumn ? "w-[14%]" : "w-[16%]")}>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    <p className="font-bold leading-5 text-slate-800">{patient.agency}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{patient.designation}</p>
                  </Link>
                </td>
                <td className={cn("align-top", hideContactColumn ? "w-[16%]" : "w-[16%]")}>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    <div className="grid gap-2">
                      <Badge className={statusTone(patient.status)}>{patient.status}</Badge>
                      {patient.isCarriedOverQueue ? (
                        <Badge className="bg-amber-50 text-amber-700 ring-amber-200">Queued from previous day</Badge>
                      ) : null}
                      <InfoLine icon={CalendarClock}>{visitDateLabel}: {patient.latestVisitDay || patient.latestVisitAt}</InfoLine>
                      <span className="text-xs font-semibold text-slate-500">Time in: {patient.latestVisitAt}</span>
                      {patient.latestVisitOut ? <span className="text-xs font-semibold text-slate-500">Out: {patient.latestVisitOut}</span> : null}
                    </div>
                  </Link>
                </td>
                <td className={cn("align-top", hideContactColumn ? "w-[28%]" : "w-[16%]")}>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    {patient.recordSummary ? (
                      <div className={cn("grid gap-2", hideContactColumn ? "max-w-none" : "max-w-[16rem]")}>
                        <RecordDetails patient={patient} />
                        <Badge className="w-fit max-w-full whitespace-normal bg-blue-50 text-blue-700">{patient.request}</Badge>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <Stethoscope className="mt-1 h-4 w-4 shrink-0 text-blue-500" />
                        <Badge className="max-w-[12rem] whitespace-normal bg-blue-50 text-blue-700">{patient.request}</Badge>
                      </div>
                    )}
                  </Link>
                </td>
                <td className="w-12 align-top">
                  <div className="flex items-start justify-end gap-2 px-4 py-4">
                    {canCancelVisit(patient) ? (
                      <form action={cancelVisitAction}>
                        <CsrfField />
                        <input type="hidden" name="patientId" value={patient.id} />
                        <input type="hidden" name="visitId" value={patient.latestVisitId} />
                        <input type="hidden" name="redirectTo" value={cancelRedirectTo} />
                        <Button
                          type="submit"
                          variant="outline"
                          size="icon"
                          aria-label={`Cancel appointment for ${patient.lastName}, ${patient.firstName}`}
                          className="h-9 w-9 border-rose-200 text-rose-700 hover:bg-rose-50"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </form>
                    ) : null}
                    <Link
                      href={`/patients/${patient.id}`}
                      aria-label={`Open patient record for ${patient.lastName}, ${patient.firstName}`}
                      className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition group-hover:translate-x-1 group-hover:text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={hideContactColumn ? 6 : 7} className="px-4 py-10 text-center text-sm text-slate-500">
                  {emptyState}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">
          Showing <span className="font-bold text-slate-700">{startItem}</span> to{" "}
          <span className="font-bold text-slate-700">{endItem}</span> of{" "}
          <span className="font-bold text-slate-700">{totalCount}</span> patients
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" disabled={currentPage <= 1}>
            <Link
              aria-disabled={currentPage <= 1}
              href={currentPage <= 1 ? basePath : buildPageHref(basePath, currentPage - 1, searchQuery, queryParams, pageParamName)}
            >
              Previous
            </Link>
          </Button>
          {pageNumbers.map((page) => (
            <Button key={page} asChild variant={page === currentPage ? "default" : "outline"} size="sm">
              <Link href={buildPageHref(basePath, page, searchQuery, queryParams, pageParamName)}>{page}</Link>
            </Button>
          ))}
          <Button asChild variant="outline" size="sm" disabled={currentPage >= totalPages}>
            <Link
              aria-disabled={currentPage >= totalPages}
              href={currentPage >= totalPages ? basePath : buildPageHref(basePath, currentPage + 1, searchQuery, queryParams, pageParamName)}
            >
              Next
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
