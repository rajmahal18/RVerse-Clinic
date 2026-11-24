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
  const savedValues = (draft?.values ?? {}) as Record<string, string[]>;
  const survey = key === "survey" ? await prisma.clientSatisfactionSurvey.findUnique({ where: { visitId }, select: { updatedAt: true } }) : null;
  const surveyVersion = survey?.updatedAt.toISOString() ?? "";
  const outdatedSurvey = key === "survey" && (
    savedValues.surveyVersion ? savedValues.surveyVersion[0] !== surveyVersion : Boolean(survey && draft && draft.updatedAt < survey.updatedAt)
  );
  const values = outdatedSurvey ? {} : savedValues;
  const removedRequestTypes = key === "visit"
    ? (await prisma.visitRequest.findMany({ where: { visitId, deletedAt: { not: null } }, select: { type: true } })).map(request => request.type)
    : [];
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
      removedRequestTypes,
      editableFields,
      userId: user.id,
      updatedAt: draft?.updatedAt.toISOString() ?? null,
      visitUpdatedAt: visit.updatedAt.toISOString(),
      surveyUpdatedAt: surveyVersion || null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const result = await saveFormDraftAction(await request.formData());
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
