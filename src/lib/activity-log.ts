import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const duplicateWindowMs = 10_000;

type ActivityLogInput = {
  clinicId?: string | null;
  userId?: string | null;
  module: string;
  action: string;
  status?: "SUCCESS" | "FAILED";
  entityType?: string | null;
  entityId?: string | null;
  description: string;
  metadata?: Prisma.InputJsonValue;
};

function buildDuplicateKey(input: ActivityLogInput, userId: string | null) {
  const metadata = input.metadata ?? Prisma.JsonNull;

  return [
    input.clinicId ?? "",
    userId ?? "",
    input.module,
    input.action,
    input.status ?? "SUCCESS",
    input.entityType ?? "",
    input.entityId ?? "",
    input.description,
    JSON.stringify(metadata),
  ].join("|");
}

export async function writeActivityLog(input: ActivityLogInput) {
  try {
    const currentUser = input.userId ? null : await getCurrentUser();
    const userId = input.userId ?? currentUser?.id ?? null;
    const status = input.status ?? "SUCCESS";
    const metadata = input.metadata ?? Prisma.JsonNull;
    const duplicateKey = buildDuplicateKey(input, userId);
    const recentDuplicateThreshold = new Date(Date.now() - duplicateWindowMs);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('activity_log'), hashtext(${duplicateKey}))`;

      const existingLog = await tx.activityLog.findFirst({
        where: {
          clinicId: input.clinicId ?? null,
          userId,
          module: input.module,
          action: input.action,
          status,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          description: input.description,
          metadata: { equals: metadata },
          createdAt: { gte: recentDuplicateThreshold },
        },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });

      if (existingLog) {
        return;
      }

      await tx.activityLog.create({
        data: {
          clinicId: input.clinicId ?? null,
          userId,
          module: input.module,
          action: input.action,
          status,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          description: input.description,
          metadata,
        },
      });
    });
  } catch (error) {
    console.error("Activity log write failed", error);
  }
}
