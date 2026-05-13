import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return <AppShell><PageHeader title="Reports" eyebrow="Home / Reports" /><div className="grid gap-4 md:grid-cols-3">{['Assessment Sheet','Medicine Log','Vaccination Sheet'].map((r)=><Card key={r}><CardHeader><CardTitle>{r}</CardTitle></CardHeader><CardContent className="text-sm text-slate-500">Print/export placeholder for {r.toLowerCase()}.</CardContent></Card>)}</div></AppShell>;
}
