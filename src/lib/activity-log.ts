import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function writeActivityLog(input: ActivityLogInput) {
  try {
    const currentUser = input.userId ? null : await getCurrentUser();

    await prisma.activityLog.create({
      data: {
        clinicId: input.clinicId ?? null,
        userId: input.userId ?? currentUser?.id ?? null,
        module: input.module,
        action: input.action,
        status: input.status ?? "SUCCESS",
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        description: input.description,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error("Activity log write failed", error);
  }
}
