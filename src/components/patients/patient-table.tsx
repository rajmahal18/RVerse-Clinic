import Link from "next/link";
import { Eye } from "lucide-react";
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
};

function buildPageHref(basePath: string, page: number) {
  return `${basePath}?page=${page}`;
}

export function PatientTable({
  rows,
  currentPage = 1,
  totalPages = 1,
  totalCount = rows.length,
  pageSize = rows.length,
  basePath = "/patients",
}: PatientTableProps) {
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount);
  const pageNumbers = Array.from(
    new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter((page) => page >= 1 && page <= totalPages))
  );

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-soft">
      <div className="overflow-x-auto scrollbar-thin">
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
                "Action",
              ].map((header) => (
                <th key={header} className="px-4 py-3 font-bold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((patient) => (
              <tr key={patient.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold">{patient.lastName}</td>
                <td className="px-4 py-3">{patient.firstName}</td>
                <td className="px-4 py-3">{patient.middleName}</td>
                <td className="px-4 py-3">{patient.age}</td>
                <td className="px-4 py-3">{patient.birthDate}</td>
                <td className="px-4 py-3">{patient.gender}</td>
                <td className="px-4 py-3">{patient.address}</td>
                <td className="px-4 py-3">{patient.contact}</td>
                <td className="px-4 py-3">{patient.agency}</td>
                <td className="px-4 py-3">{patient.designation}</td>
                <td className="px-4 py-3">
                  <Badge className="bg-blue-50 text-blue-700">{patient.request}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/patients/${patient.id}`}>
                      <Eye className="h-4 w-4" /> View
                    </Link>
                  </Button>
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
              href={currentPage <= 1 ? basePath : buildPageHref(basePath, currentPage - 1)}
            >
              Previous
            </Link>
          </Button>
          {pageNumbers.map((page) => (
            <Button key={page} asChild variant={page === currentPage ? "default" : "outline"} size="sm">
              <Link href={buildPageHref(basePath, page)}>{page}</Link>
            </Button>
          ))}
          <Button asChild variant="outline" size="sm" disabled={currentPage >= totalPages}>
            <Link
              aria-disabled={currentPage >= totalPages}
              href={currentPage >= totalPages ? basePath : buildPageHref(basePath, currentPage + 1)}
            >
              Next
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
