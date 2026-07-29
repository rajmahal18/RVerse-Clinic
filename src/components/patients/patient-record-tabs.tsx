"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type PatientRecordTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export function PatientRecordTabs({ tabs, defaultTabId }: { tabs: PatientRecordTab[]; defaultTabId?: string }) {
  const [activeTab, setActiveTab] = useState(defaultTabId ?? tabs[0]?.id ?? "");
  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <section className="space-y-4">
      <div className="overflow-x-auto scrollbar-thin rounded-2xl border bg-white p-1 shadow-soft">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const active = tab.id === selectedTab?.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "h-10 rounded-xl px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
                  active && "bg-primary text-white shadow-soft hover:bg-primary hover:text-white"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>{selectedTab?.content}</div>
    </section>
  );
}
