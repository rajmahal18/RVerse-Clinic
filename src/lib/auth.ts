import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { AUTH_COOKIE_NAME } from "@/lib/auth-constants";
import { AUTH_COOKIE_SECURE } from "@/lib/security-config";
import { prisma } from "@/lib/prisma";

const SESSION_DAYS = 7;

type SessionPayload = {
  userId: string;
  email: string;
  role: string;
  sessionVersion: number;
  exp: number;
};

function getAuthSecret() {
  return process.env.AUTH_SECRET || process.env.DATABASE_URL || "clinic-system-layout-dev-secret";
}

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getAuthSecret()).update(encodedPayload).digest("base64url");
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const encodedPayload = encodePayload({ ...payload, exp });
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;

    if (!payload.userId || !payload.email || typeof payload.sessionVersion !== "number" || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: AUTH_COOKIE_SECURE,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: session.userId,
      email: session.email,
      sessionVersion: session.sessionVersion,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}
