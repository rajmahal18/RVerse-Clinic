import { cookies } from "next/headers";
import { headers } from "next/headers";
import { CSRF_COOKIE_NAME, CSRF_FIELD_NAME } from "@/lib/csrf-constants";
import { AUTH_COOKIE_SECURE, TRUST_PROXY_HEADERS } from "@/lib/security-config";

function isSameOriginRequest(originOrReferer: string | null, host: string | null, protocol: string) {
  if (!originOrReferer || !host) {
    return false;
  }

  try {
    const url = new URL(originOrReferer);
    return url.host === host && url.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}

export async function assertValidCsrfToken(formData: FormData) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const formToken = String(formData.get(CSRF_FIELD_NAME) ?? "");

  if (cookieToken && formToken && cookieToken === formToken) {
    return;
  }

  const protocol =
    (TRUST_PROXY_HEADERS
      ? headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim()
      : null) || (AUTH_COOKIE_SECURE ? "https" : "http");
  const host =
    (TRUST_PROXY_HEADERS
      ? headerStore.get("x-forwarded-host")?.split(",")[0]?.trim()
      : null) || headerStore.get("host");
  const origin = headerStore.get("origin");
  const referer = headerStore.get("referer");

  if (!isSameOriginRequest(origin, host, protocol) && !isSameOriginRequest(referer, host, protocol)) {
    throw new Error("The form session expired. Refresh the page and try again.");
  }
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: AUTH_COOKIE_SECURE,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  };
}
