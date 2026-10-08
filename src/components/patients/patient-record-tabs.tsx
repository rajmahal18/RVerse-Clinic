"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type PatientRecordTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export function PatientRecordTabs({ tabs, defaultTabId }: { tabs: PatientRecordTab[]; defaultTabId?: string }) {
  const [activeTab, setActiveTab] = useState(defaultTabId ?? tabs[0]?.id ?? "");
  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  useEffect(() => {
    function jump() {
      const query = new URLSearchParams(window.location.search);
      const section = query.get("section");
      const requested =
        defaultTabId === "history"
          ? "history"
          : query.get("tab") ||
            (section === "medicines"
              ? "medicines"
              : section === "vaccinations"
                ? "vaccinations"
                : defaultTabId);
      if (requested && tabs.some((tab) => tab.id === requested))
        setActiveTab(requested);
      const target = query.get("section") || window.location.hash.slice(1);
      if (target)
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const element =
              document.getElementById(target) ||
              document.getElementById(`tab-${target}`);
            if (!element) return;
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.animate(
              [
                { backgroundColor: "#ccfbf1" },
                { backgroundColor: "transparent" },
              ],
              { duration: 1800 },
            );
            if (
              element instanceof HTMLInputElement ||
              element instanceof HTMLTextAreaElement
            )
              element.focus({ preventScroll: true });
          }),
        );
    }
    jump();
    window.addEventListener("hashchange", jump);
    return () => window.removeEventListener("hashchange", jump);
  }, [tabs, defaultTabId]);

  return (
    <section className="min-w-0 space-y-4 pb-8">
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

      <div id={`tab-${selectedTab?.id}`} className="min-w-0">
        {selectedTab?.content}
      </div>
    </section>
  );
}
