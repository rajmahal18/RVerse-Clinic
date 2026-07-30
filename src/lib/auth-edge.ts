import { AUTH_COOKIE_NAME } from "@/lib/auth-constants";

function getAuthSecret() {
  return process.env.AUTH_SECRET || process.env.DATABASE_URL || "clinic-system-layout-dev-secret";
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64Url(bytes: ArrayBuffer) {
  let binary = "";
  const values = new Uint8Array(bytes);

  values.forEach((value) => {
    binary += String.fromCharCode(value);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

type MiddlewareSession = {
  exp: number;
  role?: string;
  userId?: string;
  email?: string;
  sessionVersion?: number;
};

export async function verifyMiddlewareSession(token: string | undefined): Promise<MiddlewareSession | null> {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expectedSignature = bytesToBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload)));

  if (expectedSignature !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as {
      exp?: number;
      role?: string;
      userId?: string;
      email?: string;
      sessionVersion?: number;
    };

    if (typeof payload.exp !== "number" || typeof payload.sessionVersion !== "number" || payload.exp <= Date.now()) {
      return null;
    }

    return {
      exp: payload.exp,
      role: payload.role,
      userId: payload.userId,
      email: payload.email,
      sessionVersion: payload.sessionVersion,
    };
  } catch {
    return null;
  }
}

export { AUTH_COOKIE_NAME };
