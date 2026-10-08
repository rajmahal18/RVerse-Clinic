"use client";
import { Download, Printer } from "lucide-react";
import { reportCsv, type ReportSection } from "@/lib/monthly-reports";
export function ReportExport({
  title,
  month,
  sections,
  filename,
}: {
  title: string;
  month: string;
  sections: ReportSection[];
  filename: string;
}) {
  return (
    <div className="no-print flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => {
          const blob = new Blob([reportCsv(title, month, sections)], {
            type: "text/csv;charset=utf-8",
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${filename}.csv`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
        className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700"
      >
        <Download className="h-4 w-4" /> CSV
      </button>
      <button
        type="button"
        onClick={() => {
          const previous = document.title;
          document.title = filename;
          window.print();
          setTimeout(() => {
            document.title = previous;
          }, 500);
        }}
        className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
      >
        <Printer className="h-4 w-4" /> Print / PDF
      </button>
    </div>
  );
}
