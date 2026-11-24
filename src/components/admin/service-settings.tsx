
import { FormFeedback } from "@/components/ui/form-feedback";
import { RequestType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requestTypeLabels } from "@/lib/clinic-services";
import { setClinicServiceAction } from "@/app/actions/record-management";
import { CsrfField } from "@/components/security/csrf-field";
import { Button } from "@/components/ui/button";

export async function ServiceSettings({ clinicId }: { clinicId: string }) {
  const settings = await prisma.clinicServiceSetting.findMany({
    where: { clinicId },
  });
  return (
    <section className="min-w-0 border bg-white p-4">
      <h3 className="font-bold">Services Requested</h3>
      <p className="my-2 text-sm text-slate-500">
        Inactive services are hidden from new requests. Existing visit records
        and labels are retained.
      </p>
      <div className="divide-y">
        {Object.values(RequestType).map((type) => {
          const active =
            settings.find((s) => s.type === type)?.isActive ?? true;
          return (
            <details key={type} className="py-3">
              <summary className="cursor-pointer text-sm font-semibold">
                {requestTypeLabels[type]}{" "}
                <span
                  className={
                    active ? "ml-2 text-emerald-700" : "ml-2 text-slate-500"
                  }
                >
                  {active ? "Active" : "Inactive"}
                </span>
              </summary>
              <form
                action={setClinicServiceAction}
                className="mt-3 flex flex-wrap gap-2"
              >
      <FormFeedback />
                <CsrfField />
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="isActive" value={String(!active)} />
                <input
                  name="reason"
                  required
                  maxLength={1000}
                  aria-label={`Reason for ${active ? "deactivating" : "activating"} ${requestTypeLabels[type]}`}
                  placeholder="Reason"
                  className="h-11 min-w-0 flex-1 rounded-lg border px-3 text-sm"
                />
                <Button type="submit" variant="outline">
                  {active ? "Deactivate" : "Activate"} service
                </Button>
              </form>
            </details>
          );
        })}
      </div>
    </section>
  );
}
