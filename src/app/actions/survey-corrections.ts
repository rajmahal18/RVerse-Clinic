"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { assertValidCsrfToken } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { ccQuestions, sqdQuestions, scale } from "@/lib/survey-questions";

export async function correctSurveyAnswerAction(formData: FormData) {
  try {
    await assertValidCsrfToken(formData);
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN")
      throw new Error("Only administrators can correct survey answers.");
    const surveyId = String(formData.get("surveyId") ?? "");
    const question = String(formData.get("question") ?? "");
    const answer = String(formData.get("answer") ?? "");
    const previousAnswer = String(formData.get("previousAnswer") ?? "");
    const reason = String(formData.get("reason") ?? "").trim();
    const cc = ccQuestions.find(([key]) => key === question);
    if (!cc && !sqdQuestions.some(([key]) => key === question))
      throw new Error("Select a valid survey question.");
    if (!(cc?.[2] ?? scale).some((option) => option === answer))
      throw new Error("Select a valid answer.");
    if (!reason || reason.length > 1000)
      throw new Error("Enter a correction reason of up to 1,000 characters.");
    if (answer === previousAnswer)
      throw new Error("Select a different answer.");
    await prisma.$transaction(async (tx) => {
      const initial = await tx.clientSatisfactionSurvey.findFirst({ where: { id: surveyId, visit: { patient: { clinicId: user.clinicId, deletedAt: null }, deletedAt: null } }, select: { visitId: true } });
      if (!initial) throw new Error("Survey not found.");
      await tx.$queryRaw`SELECT id FROM "Visit" WHERE id = ${initial.visitId} FOR UPDATE`;
      const survey = await tx.clientSatisfactionSurvey.findFirst({
        where: {
          id: surveyId,
          visit: {
            deletedAt: null,
            status: { not: "CANCELLED" },
            patient: { clinicId: user.clinicId, deletedAt: null },
          },
        },
        include: { visit: { include: { patient: true } } },
      });
      if (!survey) throw new Error("Survey not found.");
      const updated = await tx.clientSatisfactionSurvey.updateMany({
        where: { id: surveyId, [question]: previousAnswer },
        data: { [question]: answer },
      });
      if (updated.count !== 1)
        throw new Error(
          "This answer has changed. Refresh the report before editing again.",
        );
      await tx.visit.update({ where: { id: survey.visitId }, data: { updatedAt: new Date() } });
      await tx.activityLog.create({
        data: {
          clinicId: user.clinicId,
          userId: user.id,
          module: "Client Satisfaction",
          action: "Correct survey answer",
          entityType: "ClientSatisfactionSurvey",
          entityId: surveyId,
          description: `Corrected ${question.toUpperCase()} for ${survey.visit.patient.lastName}, ${survey.visit.patient.firstName}: ${previousAnswer} → ${answer}. Reason: ${reason}`,
          metadata: {
            patientId: survey.visit.patientId,
            visitId: survey.visitId,
            question,
            changes: { [question]: { before: previousAnswer, after: answer } },
            reason,
          },
        },
      });
    });
    revalidatePath("/reports", "layout");
    revalidatePath("/patients", "layout");
    revalidatePath("/activity-logs");
    return {
      ok: true,
      message: "Answer corrected. The change was recorded in Activity Logs.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to correct the answer.",
    };
  }
}
