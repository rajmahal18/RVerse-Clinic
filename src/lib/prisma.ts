import { PrismaClient } from "@prisma/client";
import { archiveFilter } from "@/lib/archive-filter";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  const client = new PrismaClient();
  client.$use(archiveFilter);
  return client;
}
export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
