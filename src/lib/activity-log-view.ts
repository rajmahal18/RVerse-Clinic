import { prisma } from "@/lib/prisma";
import {
  formatDateGroupLabel,
  formatDateKey,
  formatDateTimeWithZone,
  getDateInputRange,
  getDayRange,
  shiftDays,
} from "@/lib/date-time";

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

export type ActivityLogGroup = {
  dateKey: string;
  label: string;
  logs: ActivityLogRow[];
};

export type ActivityLogSummary = {
  total: number;
  failed: number;
  signIns: number;
  patientRecordChanges: number;
};

export type ActivityLogResult = {
  groups: ActivityLogGroup[];
  summary: ActivityLogSummary;
  from: string;
  to: string;
  range: string;
};

type ActivityLogFilters = {
  module?: string;
  status?: string;
  range?: string;
  from?: string;
  to?: string;
};

function getActivityLogDateRange(filters: ActivityLogFilters) {
  const range = filters.range === "7d" || filters.range === "30d" || filters.range === "custom" ? filters.range : "today";
  const today = getDayRange();

  if (range === "custom" && filters.from && filters.to) {
    const fromRange = getDateInputRange(filters.from);
    const toRange = getDateInputRange(filters.to);

    return {
      start: fromRange.start,
      end: toRange.end,
      from: formatDateKey(fromRange.start),
      to: formatDateKey(shiftDays(toRange.end, -1)),
      range,
    };
  }

  if (range === "7d" || range === "30d") {
    const days = range === "7d" ? 7 : 30;
    const start = shiftDays(today.start, -(days - 1));

    return {
      start,
      end: today.end,
      from: formatDateKey(start),
      to: formatDateKey(shiftDays(today.end, -1)),
      range,
    };
  }

  return {
    start: today.start,
    end: today.end,
    from: formatDateKey(today.start),
    to: formatDateKey(shiftDays(today.end, -1)),
    range: "today",
  };
}

export async function getActivityLogData(filters: ActivityLogFilters = {}): Promise<ActivityLogResult> {
  const dateRange = getActivityLogDateRange(filters);
  const logs = await prisma.activityLog.findMany({
    where: {
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      createdAt: {
        gte: dateRange.start,
        lt: dateRange.end,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 500,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const rows = logs.map((log) => ({
    id: log.id,
    module: log.module,
    action: log.action,
    status: log.status,
    entityType: log.entityType ?? "-",
    entityId: log.entityId ?? "-",
    description: log.description,
    user: log.user?.name ?? log.user?.email ?? "System",
    createdAt: formatDateTimeWithZone(log.createdAt),
    metadata: log.metadata,
  }));
  const groupMap = new Map<string, ActivityLogGroup>();

  logs.forEach((log, index) => {
    const dateKey = formatDateKey(log.createdAt);
    const group = groupMap.get(dateKey) ?? {
      dateKey,
      label: formatDateGroupLabel(log.createdAt),
      logs: [],
    };

    group.logs.push(rows[index]);
    groupMap.set(dateKey, group);
  });

  return {
    groups: Array.from(groupMap.values()),
    summary: {
      total: rows.length,
      failed: rows.filter((log) => log.status === "FAILED").length,
      signIns: rows.filter((log) => log.module === "Authentication" && log.action === "Sign in").length,
      patientRecordChanges: rows.filter((log) => log.module === "Patient Records").length,
    },
    from: dateRange.from,
    to: dateRange.to,
    range: dateRange.range,
  };
}
