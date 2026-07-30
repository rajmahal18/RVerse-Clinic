"use client";

import Link from "next/link";
import { ArrowUpDown, Filter, RotateCcw } from "lucide-react";
import { PatientGender, RequestType, VisitStatus } from "@prisma/client";
import type { PatientFilterOptions, PatientTableFilters } from "@/lib/patient-view";
import { Button } from "@/components/ui/button";

type PatientFilterBarProps = {
  filters: PatientTableFilters;
  options: PatientFilterOptions;
  searchQuery?: string;
};

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active visits" },
  { value: "NO_VISIT", label: "No visit yet" },
  { value: VisitStatus.QUEUED, label: "Queued" },
  { value: VisitStatus.IN_PROGRESS, label: "In progress" },
  { value: VisitStatus.FOR_FOLLOW_UP, label: "For follow up" },
  { value: VisitStatus.COMPLETED, label: "Completed" },
  { value: VisitStatus.CANCELLED, label: "Cancelled" },
];

const requestOptions = [
  { value: "", label: "All requests" },
  { value: RequestType.CONSULTATION, label: "Consultation" },
  { value: RequestType.MEDICINES, label: "Medicine" },
  { value: RequestType.VACCINATION, label: "Vaccination" },
  { value: RequestType.REFERRAL, label: "Referral" },
  { value: RequestType.REGULAR_MEDICAL_CERTIFICATE, label: "Medical Certificate" },
  { value: RequestType.CS_211_MEDICAL_CERTIFICATE, label: "CS 211" },
  { value: RequestType.EMERGENCY, label: "Emergency" },
  { value: RequestType.FIRST_AID_KIT, label: "First Aid Kit" },
];

const genderOptions = [
  { value: "", label: "All genders" },
  { value: PatientGender.MALE, label: "Male" },
  { value: PatientGender.FEMALE, label: "Female" },
];

const ageOptions = [
  { value: "", label: "All ages" },
  { value: "18_29", label: "18-29" },
  { value: "30_44", label: "30-44" },
  { value: "45_59", label: "45-59" },
  { value: "60_plus", label: "60+" },
];

const lastVisitOptions = [
  { value: "", label: "Any last visit" },
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "This month" },
];

const sortOptions = [
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "last_visit_desc", label: "Last visit newest" },
  { value: "last_visit_asc", label: "Last visit oldest" },
  { value: "status_priority", label: "Status priority" },
  { value: "age_desc", label: "Age oldest" },
  { value: "age_asc", label: "Age youngest" },
];

function SelectField({
  label,
  name,
  value,
  children,
  className = "",
}: {
  label: string;
  name: string;
  value?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid min-w-0 gap-1 text-xs font-bold uppercase tracking-wide text-slate-500 sm:min-w-[9.5rem] sm:flex-1 ${className}`}>
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        className="h-10 min-w-0 rounded-xl border bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:ring-2 focus:ring-primary/30"
      >
        {children}
      </select>
    </label>
  );
}

export function PatientFilterBar({ filters, options, searchQuery }: PatientFilterBarProps) {
  return (
    <form action="/patients" onChange={(event) => event.currentTarget.requestSubmit()} className="mb-4 border bg-white px-3 py-3 shadow-sm">
      {searchQuery ? <input type="hidden" name="q" value={searchQuery} /> : null}
      <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)] items-end gap-x-2 gap-y-2 sm:flex sm:flex-wrap">
        <div className="flex h-10 items-center justify-center text-slate-600 sm:w-10" aria-label="Filters">
          <Filter className="h-4 w-4 text-primary" />
        </div>

        <SelectField label="Status" name="status" value={filters.status} className="col-start-2">
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>

        <SelectField label="Last Visit" name="lastVisit" value={filters.lastVisit} className="col-start-3">
          {lastVisitOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>

        <SelectField label="Request" name="request" value={filters.request} className="col-start-2">
          {requestOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>

        <SelectField label="Office" name="agency" value={filters.agency} className="col-start-3">
          <option value="">All offices</option>
          {options.agencies.map((agency) => (
            <option key={agency} value={agency}>
              {agency}
            </option>
          ))}
        </SelectField>

        <SelectField label="Gender" name="gender" value={filters.gender} className="col-start-2">
          {genderOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>

        <SelectField label="Age" name="ageGroup" value={filters.ageGroup} className="col-start-3">
          {ageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>

        <label className="col-start-2 grid min-w-0 gap-1 text-xs font-bold uppercase tracking-wide text-slate-500 sm:min-w-[11rem] sm:flex-[2_1_16rem]">
          Sort
          <span className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              name="sort"
              defaultValue={filters.sort ?? "name_asc"}
              className="h-10 w-full rounded-xl border bg-white pl-9 pr-3 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:ring-2 focus:ring-primary/30"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </span>
        </label>

        <Button asChild variant="outline" size="sm" className="col-start-3 h-10">
          <Link href={searchQuery ? `/patients?q=${encodeURIComponent(searchQuery)}` : "/patients"}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Link>
        </Button>
      </div>
    </form>
  );
}
