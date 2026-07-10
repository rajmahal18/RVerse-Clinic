import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!await getCurrentUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const count = await prisma.medicineRequest.count({ where: { status: "REQUESTED" } });
  return NextResponse.json({ count });
}
