import { RequestType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requestTypeLabels } from "@/lib/clinic-services";

export async function clinicServiceOptions(
  clinicId: string,
  existing: string[] = [],
) {
  const settings = await prisma.clinicServiceSetting.findMany({
    where: { clinicId, isActive: false },
  });
  const inactive = new Set(settings.map((s) => s.type));
  return Object.values(RequestType)
    .filter((type) => !inactive.has(type) || existing.includes(type))
    .map((value) => ({
      value,
      isActive: !inactive.has(value),
      label:
        requestTypeLabels[value] +
        (inactive.has(value) ? " (inactive for new visits)" : ""),
    }));
}

export async function requireAvailableServices(
  clinicId: string,
  types: RequestType[],
  existing: RequestType[] = [],
) {
  const newTypes = types.filter((type) => !existing.includes(type));
  if (!newTypes.length) return;
  const inactive = await prisma.clinicServiceSetting.findMany({
    where: {
      clinicId,
      isActive: false,
      type: { in: newTypes },
    },
  });
  if (inactive.length)
    throw new Error(
      "A selected service is inactive for new requests. Refresh the services list.",
    );
}

export async function requireServiceForVisit(
  clinicId: string,
  visitId: string,
  type: RequestType,
) {
  const existing = await prisma.visitRequest.findMany({
    where: { visitId },
    select: { type: true },
  });
  await requireAvailableServices(
    clinicId,
    [type],
    existing.map((r) => r.type),
  );
}
