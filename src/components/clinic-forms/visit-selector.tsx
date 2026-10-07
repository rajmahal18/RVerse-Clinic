import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";

type VisitOption = { id: string; date: string; timeIn: string; status: string };

export function FormVisitSelector({ action, visits, selectedVisitId }: {
  action: string;
  visits: VisitOption[];
  selectedVisitId?: string;
}) {
  if (!visits.length) return null;

  return (
    <form action={action} method="get" className="no-print flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
      <label className="grid min-w-0 flex-1 gap-1 text-sm font-semibold text-slate-700">
        <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-primary" /> Visit for this form</span>
        <select name="visitId" defaultValue={selectedVisitId} className="h-10 w-full min-w-0 max-w-full rounded-lg border bg-white px-3 font-normal">
          {[...visits].reverse().map(visit => (
            <option key={visit.id} value={visit.id}>{visit.date} · {visit.timeIn} · {visit.status}</option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="outline" className="shrink-0">View visit</Button>
    </form>
  );
}
