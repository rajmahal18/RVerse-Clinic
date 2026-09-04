import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, UserRole } from "@prisma/client";

const itemRequestRoles: UserRole[] = [UserRole.ADMIN, UserRole.DOCTOR_NURSE, UserRole.PHARMACIST, UserRole.SUPPLY_OFFICER];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!itemRequestRoles.includes(user.role)) {
    return NextResponse.json({ count: 0 });
  }
  const clinicRequestWhere: Prisma.MedicineRequestWhereInput = {
    OR: [
      { visit: { patient: { clinicId: user.clinicId } } },
      { inventoryItem: { clinicId: user.clinicId } },
    ],
  };
  const count = await prisma.medicineRequest.count({
    where: { AND: [clinicRequestWhere, { status: { in: ["REQUESTED", "APPROVED"] } }] },
  });
  return NextResponse.json({ count });
}
