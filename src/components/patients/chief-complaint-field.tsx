"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const complaints = [
  "Abdominal Pain",
  "Allergy",
  "Back Pain",
  "Body Malaise / Weakness",
  "Blood Pressure Check",
  "Blood Sugar Check",
  "Chest Pain",
  "Colds",
  "Constipation",
  "Cough",
  "Blurred Vision",
  "Dizziness",
  "Fever / Chills / Sweating",
  "Headache",
  "History of Asthma",
  "History of Anemia",
  "History of Acid Reflux / GERD",
  "History of BPH / Prostate Condition",
  "History of CKD / Kidney Failure",
  "History of Diabetes Mellitus",
  "History of Fatty Liver",
  "History of Hypertension",
  "History of Hyperlipidemia",
  "History of Hypocalcemia",
  "History of Liver Cirrhosis",
  "History of Neck Mass",
  "History of Stroke",
  "History of UTI",
  "History of URTI / LRTI",
  "Increased Blood Pressure",
  "Increased Blood Sugar",
  "Joint Pain",
  "Loose Bowel Movement (LBM)",
  "Numbness",
  "Nausea and Vomiting",
  "Palpitation",
  "Postpartum Concern",
  "Shortness of Breath",
  "Stomachache / Hyperacidity",
  "Tender Neck",
  "Toothache",
  "Vertigo",
] as const;

function parseInitial(value: string) {
  const parts = value.split(";").map((item) => item.trim()).filter(Boolean);
  const selected = parts.filter((item) => complaints.includes(item as (typeof complaints)[number]));
  const otherEntry = parts.find((item) => item.startsWith("Other:"));
  const unstructured = parts.filter(
    (item) => !complaints.includes(item as (typeof complaints)[number]) && !item.startsWith("Other:")
  );
  return { selected, other: otherEntry?.slice(6).trim() || unstructured.join("; ") };
}

export function ChiefComplaintField({ initialValue = "" }: { initialValue?: string }) {
  const initial = useMemo(() => parseInitial(initialValue), [initialValue]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [otherSelected, setOtherSelected] = useState(Boolean(initial.other));
  const [other, setOther] = useState(initial.other);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  const value = [...selected, ...(otherSelected && other.trim() ? [`Other: ${other.trim()}`] : [])].join("; ");
  const visibleComplaints = complaints.filter((complaint) => complaint.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => { const id = window.setTimeout(() => setSearch(searchDraft.trim()), 250); return () => window.clearTimeout(id); }, [searchDraft]);

  function toggle(complaint: string) {
    setSelected((current) => current.includes(complaint) ? current.filter((item) => item !== complaint) : [...current, complaint]);
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name="chiefComplaint" value={value} />
      <span className="text-sm font-semibold text-slate-700">Chief complaint</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-20 w-full items-center justify-between gap-3 rounded-xl border bg-yellow-50/70 px-3 py-3 text-left text-sm outline-none transition hover:border-primary/40 focus:ring-2 focus:ring-primary/30"
      >
        <span className={value ? "text-slate-800" : "text-slate-500"}>
          {value || "Select one or more complaints"}
        </span>
        <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="chief-complaint-title"
            className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl sm:border"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3">
              <div>
                <h2 id="chief-complaint-title" className="text-lg font-black text-slate-900">Chief Complaint</h2>
                <p className="text-sm text-slate-500">Select all complaints that apply.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close complaints">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-28 sm:pb-5">
              <div className="mb-3">
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    className="h-11 w-full rounded-xl border pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Search complaints"
                    aria-label="Search complaints"
                  />
                </label>
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {visibleComplaints.map((complaint) => (
                  <label key={complaint} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <input type="checkbox" checked={selected.includes(complaint)} onChange={() => toggle(complaint)} className="h-5 w-5 shrink-0 rounded accent-primary" />
                    {complaint}
                  </label>
                ))}
              </div>
              {visibleComplaints.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No complaints match “{search}”.</p>
              ) : null}
              <div className="mt-2 rounded-xl bg-slate-50 p-3">
                <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={otherSelected} onChange={(event) => setOtherSelected(event.target.checked)} className="h-5 w-5 rounded accent-primary" />
                  Other
                </label>
                {otherSelected ? (
                  <label className="mt-2 grid gap-2 text-sm font-semibold text-slate-700">
                    Please specify
                    <input value={other} onChange={(event) => setOther(event.target.value)} className="h-10 rounded-xl border bg-white px-3 font-normal" autoFocus />
                  </label>
                ) : null}
              </div>
            </div>
            <div className="border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button type="button" className="w-full sm:w-auto" onClick={() => setOpen(false)} disabled={otherSelected && !other.trim()}>
                Apply complaints ({selected.length + (otherSelected && other.trim() ? 1 : 0)})
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
