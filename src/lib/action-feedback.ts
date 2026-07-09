import { Prisma } from "@prisma/client";

export function appendActionFeedback(path: string, type: "error" | "message", message: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);

  params.set(type, message);

  return `${pathname}?${params.toString()}`;
}

export function getActionErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "A record with the same value already exists.";
    }

    if (error.code === "P2025") {
      return "The selected record was not found.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The action could not be completed.";
}
