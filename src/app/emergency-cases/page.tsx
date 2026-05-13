import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function EmergencyPage() {
  return <AppShell><PageHeader title="Medical Emergency Cases" eyebrow="Home / Medical Emergency Cases" /><Card><CardContent className="p-8 text-center text-slate-500">Emergency case triage board placeholder. Future logic: priority, chief complaint, vitals, assigned staff, and outcome.</CardContent></Card></AppShell>;
}
