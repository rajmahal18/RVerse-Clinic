import { prisma } from "@/lib/prisma";

export type ActivityLogRow = {
  id: string;
  module: string;
  action: string;
  status: string;
  entityType: string;
  entityId: string;
  description: string;
  user: string;
  createdAt: string;
  metadata: unknown;
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export async function getActivityLogRows(module?: string, status?: string): Promise<ActivityLogRow[]> {
  const logs = await prisma.activityLog.findMany({
    where: {
      ...(module ? { module } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    module: log.module,
    action: log.action,
    status: log.status,
    entityType: log.entityType ?? "-",
    entityId: log.entityId ?? "-",
    description: log.description,
    user: log.user?.name ?? log.user?.email ?? "System",
    createdAt: formatDateTime(log.createdAt),
    metadata: log.metadata,
  }));
}
