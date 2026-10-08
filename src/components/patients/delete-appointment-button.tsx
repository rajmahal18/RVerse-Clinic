"use client";
import { Trash2 } from "lucide-react";
import { deleteAppointmentAction } from "@/app/actions/workflow";
import { CsrfField } from "@/components/security/csrf-field";
import { Button } from "@/components/ui/button";
export function DeleteAppointmentButton({
  patientId,
  visitId,
}: {
  patientId: string;
  visitId: string;
}) {
  return (
    <form
      action={deleteAppointmentAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Delete this appointment? It will be removed from the queue and retained for recovery.",
          )
        )
          event.preventDefault();
      }}
    >
      <CsrfField />
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="visitId" value={visitId} />
      <Button type="submit" variant="outline" className="text-rose-700">
        <Trash2 className="h-4 w-4" /> Delete appointment
      </Button>
    </form>
  );
}
