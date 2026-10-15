import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Readiness timeout")), 3000);
      }),
    ]);
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  } finally {
    if (timer) clearTimeout(timer);
  }
}
