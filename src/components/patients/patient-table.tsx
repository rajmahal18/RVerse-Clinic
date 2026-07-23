import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PatientTableRow } from "@/lib/patient-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PatientTableProps = {
  rows: PatientTableRow[];
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  pageSize?: number;
  basePath?: string;
  searchQuery?: string;
};

function buildPageHref(basePath: string, page: number, searchQuery?: string) {
  const params = new URLSearchParams({ page: String(page) });

  if (searchQuery?.trim()) {
    params.set("q", searchQuery.trim());
  }

  return `${basePath}?${params.toString()}`;
}

function formatPatientName(patient: PatientTableRow) {
  const middleInitial = patient.middleName.trim() ? ` ${patient.middleName.trim().charAt(0).toUpperCase()}.` : "";
  return `${patient.lastName}, ${patient.firstName}${middleInitial}`;
}

export function PatientTable({
  rows,
  currentPage = 1,
  totalPages = 1,
  totalCount = rows.length,
  pageSize = rows.length,
  basePath = "/patients",
  searchQuery,
}: PatientTableProps) {
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount);
  const pageNumbers = Array.from(
    new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter((page) => page >= 1 && page <= totalPages))
  );

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-soft">
      <div className="divide-y-8 divide-slate-100 bg-slate-100 lg:hidden">
        {rows.map((patient) => (
          <Link
            key={patient.id}
            href={`/patients/${patient.id}`}
            className="block w-full border-y border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition active:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-black uppercase text-slate-950">
                  {formatPatientName(patient)}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {patient.age} yrs / {patient.gender} / {patient.birthDate}
                </p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="bg-blue-50 text-blue-700">{patient.request}</Badge>
              <Badge className="bg-slate-100 text-slate-700">{patient.status}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <p className="min-w-0">
                <span className="block text-xs font-bold uppercase text-slate-400">Contact</span>
                <span className="block truncate text-slate-700">{patient.contact}</span>
              </p>
              <p className="min-w-0">
                <span className="block text-xs font-bold uppercase text-slate-400">Agency</span>
                <span className="block truncate text-slate-700">{patient.agency}</span>
              </p>
            </div>
          </Link>
        ))}
        {rows.length === 0 ? (
          <p className="bg-white px-4 py-10 text-center text-sm text-slate-500">
            No patient records found for this view yet.
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto scrollbar-thin lg:block">
        <table className="min-w-[1050px] w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {[
                "Last Name",
                "First Name",
                "Middle",
                "Age",
                "Date of Birth",
                "Gender",
                "Address",
                "Contact number",
                "Agency",
                "Designation",
                "Request",
                "",
              ].map((header) => (
                <th key={header} className="px-4 py-3 font-bold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((patient) => (
              <tr key={patient.id} className="group hover:bg-slate-50">
                <td className="font-bold">
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-3 text-slate-950 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    {patient.lastName}
                  </Link>
                </td>
                <td>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    {patient.firstName}
                  </Link>
                </td>
                <td>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    {patient.middleName}
                  </Link>
                </td>
                <td>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    {patient.age}
                  </Link>
                </td>
                <td>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    {patient.birthDate}
                  </Link>
                </td>
                <td>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    {patient.gender}
                  </Link>
                </td>
                <td>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    {patient.address}
                  </Link>
                </td>
                <td>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    {patient.contact}
                  </Link>
                </td>
                <td>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    {patient.agency}
                  </Link>
                </td>
                <td>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    {patient.designation}
                  </Link>
                </td>
                <td>
                  <Link href={`/patients/${patient.id}`} className="block px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30">
                    <Badge className="bg-blue-50 text-blue-700">{patient.request}</Badge>
                  </Link>
                </td>
                <td>
                  <Link
                    href={`/patients/${patient.id}`}
                    aria-label={`Open patient record for ${patient.lastName}, ${patient.firstName}`}
                    className="grid place-items-center px-4 py-3 text-slate-400 transition group-hover:translate-x-1 group-hover:text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-sm text-slate-500">
                  No patient records found for this view yet.
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
              href={currentPage <= 1 ? basePath : buildPageHref(basePath, currentPage - 1, searchQuery)}
            >
              Previous
            </Link>
          </Button>
          {pageNumbers.map((page) => (
            <Button key={page} asChild variant={page === currentPage ? "default" : "outline"} size="sm">
              <Link href={buildPageHref(basePath, page, searchQuery)}>{page}</Link>
            </Button>
          ))}
          <Button asChild variant="outline" size="sm" disabled={currentPage >= totalPages}>
            <Link
              aria-disabled={currentPage >= totalPages}
              href={currentPage >= totalPages ? basePath : buildPageHref(basePath, currentPage + 1, searchQuery)}
            >
              Next
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
