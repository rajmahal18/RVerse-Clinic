"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { assertValidCsrfToken } from "@/lib/csrf";
import { cancelVisitService } from "@/lib/visit-cancellation";

export async function cancelServiceAction(data: FormData) {
  try {
    await assertValidCsrfToken(data);
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in to continue.");
    const patientId = String(data.get("patientId") ?? "");
    const result = await cancelVisitService(user, {
      patientId,
      visitId: String(data.get("visitId") ?? ""),
      serviceId: String(data.get("serviceId") ?? ""),
      reason: String(data.get("reason") ?? ""),
      entireVisit: data.get("scope") === "visit",
    });
    revalidatePath(`/patients/${patientId}`);
    revalidatePath("/todays-patients");
    revalidatePath("/item-requests");
    revalidatePath("/reports", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/patients");
    return {
      ok: true,
      message: result.closedWithoutService
        ? "Visit closed — no service provided."
        : "Cancellation recorded.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to cancel. Please try again.",
    };
  }
}
