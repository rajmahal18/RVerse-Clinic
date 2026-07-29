import { ShieldPlus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";

export default function EmergencyPage() {
  return (
    <AppShell>
      <PageHeader title="Emergency Cases" />
      <section className="border bg-white px-4 py-10 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-rose-50 text-rose-700">
          <ShieldPlus className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-black text-slate-900">No emergency cases recorded</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Emergency visits will appear here when a patient visit is tagged for emergency medical services.
        </p>
      </section>
    </AppShell>
  );
}
