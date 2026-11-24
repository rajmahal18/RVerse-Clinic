import type { RequestType } from "@prisma/client";

// Additive metadata in the existing remarks field: older rows remain active and no
// schema migration or new VisitStatus enum value is required by a live deployment.
const prefix = "[CLINIC_SERVICE_CANCELLED_V1]";
export const serviceCancellationPrefix = prefix;
export const activeServiceWhere = {
  OR: [{ remarks: null }, { NOT: { remarks: { startsWith: prefix } } }],
};
export type ServiceCancellation = {
  reason: string;
  by: string;
  userId: string;
  at: string;
  previousRemarks: string | null;
};
export type ServiceStateSource = {
  type?: RequestType;
  remarks?: string | null;
  cancellation?: ServiceCancellation | null;
};
export function serviceCancellation(
  service: ServiceStateSource,
): ServiceCancellation | null {
  if (service.cancellation) return service.cancellation;
  if (!service.remarks?.startsWith(prefix)) return null;
  try {
    const data = JSON.parse(service.remarks.slice(prefix.length));
    return typeof data.reason === "string" &&
      typeof data.by === "string" &&
      typeof data.userId === "string" &&
      typeof data.at === "string" &&
      Number.isFinite(new Date(data.at).getTime())
      ? data
      : null;
  } catch {
    return null;
  }
}
export function cancellationRemarks(data: ServiceCancellation) {
  return prefix + JSON.stringify(data);
}
export function activeServices<T extends ServiceStateSource>(requests: T[]) {
  return requests.filter((request) => !serviceCancellation(request));
}
export function closedWithoutService(visit: {
  status: string;
  requests: ServiceStateSource[];
}) {
  return (
    visit.status === "COMPLETED" &&
    visit.requests.length > 0 &&
    visit.requests.every((request) => Boolean(serviceCancellation(request)))
  );
}
export const closedWithoutServiceLabel = "Closed — no service provided";
