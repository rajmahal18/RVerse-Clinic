"use client";

import { useId, type ReactNode } from "react";
import { useRetainedViewState } from "@/components/navigation/view-retention";
import { Activity, BarChart3, ClipboardList, UsersRound } from "lucide-react";
import type {
  ComplaintInsight,
  ServiceInsight,
} from "@/lib/dashboard-insights";

export function PatientInsightPanels({
  services,
  complaints,
  visitCount,
  demographics,
}: {
  services: ServiceInsight[];
  complaints: ComplaintInsight[];
  visitCount: number;
  demographics: ReactNode;
}) {
  const [savedTab, setTab] = useRetainedViewState("patient-insight-tab", "activity");
  const tab = savedTab === "demographics" ? "demographics" : "activity";
  const id = useId();
  return (
    <section className="mt-4 min-w-0 border-y border-slate-200 bg-white md:mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 md:px-5">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950">
          <Activity className="h-5 w-5 text-primary" />
          Patient Insights
        </h3>
        <span className="text-xs text-slate-500">
          All recorded visits · {visitCount.toLocaleString()} visits
        </span>
      </div>
      <div
        role="tablist"
        aria-label="Patient insights"
        className="flex overflow-x-auto border-b px-4 md:px-5"
      >
        {[
          { key: "activity", label: "Services & complaints", icon: BarChart3 },
          { key: "demographics", label: "Demographics", icon: UsersRound },
        ].map(({ key, label, icon: Icon }, index) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`${id}-${key}-tab`}
            aria-controls={`${id}-${key}`}
            aria-selected={tab === key}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? "activity"
                  : event.key === "End"
                    ? "demographics"
                    : index === 0
                      ? "demographics"
                      : "activity";
              setTab(next);
              document.getElementById(`${id}-${next}-tab`)?.focus();
            }}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${tab === key ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      <div
        id={`${id}-activity`}
        role="tabpanel"
        aria-labelledby={`${id}-activity-tab`}
        hidden={tab !== "activity"}
      >
        <p className="px-4 pt-4 text-xs leading-5 text-slate-500 md:px-5">
          Counts are per visit. A visit may include multiple services or
          complaints. Cancelled and deleted records are excluded.
        </p>
        <div className="grid min-w-0 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="min-w-0 border-b p-4 md:p-5 xl:border-b-0 xl:border-r">
            <h4 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <BarChart3 className="h-4 w-4 text-teal-600" />
              Most availed services
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Services received, ranked by number of visits.
            </p>
            {services.length ? (
              <ol className="mt-3 divide-y divide-slate-100">
                {services.map((service, index) => (
                  <li key={service.label} className="py-3">
                    <div className="flex items-start gap-2 text-sm">
                      <span className="w-5 shrink-0 text-xs leading-5 tabular-nums text-slate-400">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 break-words font-medium text-slate-700">
                        {service.label}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                        {service.visits.toLocaleString()}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          {service.visits === 1 ? "visit" : "visits"}
                        </span>
                      </span>
                    </div>
                    <div className="ml-7 mt-2 h-1.5 overflow-hidden rounded-full bg-teal-50">
                      <div
                        className="h-full rounded-full bg-teal-500"
                        style={{
                          width: `${(service.visits / services[0].visits) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-8 text-sm text-slate-500">
                No availed services recorded.
              </p>
            )}
          </div>
          <div className="min-w-0 p-4 md:p-5">
            <h4 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ClipboardList className="h-4 w-4 text-indigo-500" />
              Top 10 chief complaints
            </h4>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>Gender breakdown per complaint.</span>
              <span className="flex gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-pink-400" />
                  Female
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-teal-500" />
                  Male
                </span>
              </span>
            </div>
            {complaints.length ? (
              <ol className="mt-3 divide-y divide-slate-100">
                {complaints.map((complaint, index) => {
                  const maximum = Math.max(
                    complaint.female,
                    complaint.male,
                    complaint.unspecified,
                  );
                  const leaders = [
                    { label: "Female", value: complaint.female },
                    { label: "Male", value: complaint.male },
                    { label: "Unspecified", value: complaint.unspecified },
                  ].filter((gender) => gender.value === maximum);
                  return (
                    <li key={complaint.label} className="py-3">
                      <div className="flex items-start gap-2 text-sm">
                        <span className="w-5 shrink-0 text-xs leading-5 tabular-nums text-slate-400">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 break-words font-semibold text-slate-800">
                          {complaint.label}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {complaint.visits.toLocaleString()}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            {complaint.visits === 1 ? "visit" : "visits"}
                          </span>
                        </span>
                      </div>
                      <div className="ml-7 mt-2">
                        <div
                          className="flex h-1.5 overflow-hidden rounded-full bg-slate-100"
                          aria-hidden="true"
                        >
                          <span
                            className="bg-pink-400"
                            style={{
                              width: `${(complaint.female / complaint.visits) * 100}%`,
                            }}
                          />
                          <span
                            className="bg-teal-500"
                            style={{
                              width: `${(complaint.male / complaint.visits) * 100}%`,
                            }}
                          />
                          <span
                            className="bg-slate-400"
                            style={{
                              width: `${(complaint.unspecified / complaint.visits) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs">
                          <span className="text-slate-500">
                            Female {complaint.female} · Male {complaint.male}
                            {complaint.unspecified
                              ? ` · Unspecified ${complaint.unspecified}`
                              : ""}
                          </span>
                          <span
                            className={`font-medium ${leaders.length > 1 ? "text-slate-600" : leaders[0].label === "Female" ? "text-pink-700" : leaders[0].label === "Male" ? "text-teal-700" : "text-slate-600"}`}
                          >
                            {leaders.length > 1
                              ? `Tie: ${leaders.map((gender) => gender.label).join(" / ")}`
                              : leaders[0].label === "Unspecified"
                                ? "Most records: unspecified"
                                : `Most common: ${leaders[0].label}`}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="py-8 text-sm text-slate-500">
                No chief complaints recorded.
              </p>
            )}
          </div>
        </div>
      </div>
      <div
        id={`${id}-demographics`}
        role="tabpanel"
        aria-labelledby={`${id}-demographics-tab`}
        hidden={tab !== "demographics"}
      >
        {demographics}
      </div>
    </section>
  );
}
