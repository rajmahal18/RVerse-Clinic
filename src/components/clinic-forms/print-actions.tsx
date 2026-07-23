"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintActions({ filename }: { filename: string }) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3 shadow-soft">
      <p className="min-w-0 flex-1 text-sm text-slate-600">
        Suggested filename: <span className="font-semibold text-slate-900">{filename}.pdf</span>
      </p>
      <Button
        type="button"
        onClick={() => {
          const previousTitle = document.title;
          document.title = filename;
          window.print();
          window.setTimeout(() => {
            document.title = previousTitle;
          }, 500);
        }}
      >
        <Printer className="h-4 w-4" /> Print / Save PDF
      </Button>
    </div>
  );
}
