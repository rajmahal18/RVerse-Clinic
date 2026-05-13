import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return <AppShell><PageHeader title="Settings" eyebrow="Home / Settings" /><Card><CardHeader><CardTitle>System Settings</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm text-slate-600 md:grid-cols-2"><p>Future: users, roles, clinic profile, print headers, backup, LAN/cloud mode.</p><p>Prepared for local PostgreSQL and later PWA/offline support.</p></CardContent></Card></AppShell>;
}
