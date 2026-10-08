import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditVisitField, visitFields } from "@/lib/visit-fields";
import { saveFormDraftAction } from "@/app/actions/workflow";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({}, { status: 401 });
  const visitId = request.nextUrl.searchParams.get("visitId") ?? "";
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const visit = await prisma.visit.findFirst({
    where: {
      id: visitId,
      deletedAt: null,
      patient: { clinicId: user.clinicId },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
  });
  if (!visit) return NextResponse.json({}, { status: 404 });
  const draft = await prisma.formDraft.findUnique({
    where: { userId_visitId_key: { userId: user.id, visitId, key } },
  });
  const values = (draft?.values ?? {}) as Record<string, string[]>;
  if (user.role !== "ADMIN" && user.role !== "DOCTOR") delete values.diagnosisSelections;
  if (key === "visit")
    for (const field of visitFields) {
      if (
        !canEditVisitField(
          user.role,
          field,
          Array.isArray(visit.doctorLockedFields)
            ? (visit.doctorLockedFields as string[])
            : [],
        )
      )
        delete values[field];
    }
  const editableFields = visitFields.filter((field) =>
    canEditVisitField(
      user.role,
      field,
      Array.isArray(visit.doctorLockedFields)
        ? (visit.doctorLockedFields as string[])
        : [],
    ),
  );
  return NextResponse.json(
    {
      values,
      editableFields,
      userId: user.id,
      updatedAt: draft?.updatedAt.toISOString() ?? null,
      visitUpdatedAt: visit.updatedAt.toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const result = await saveFormDraftAction(await request.formData());
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
