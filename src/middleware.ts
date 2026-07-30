import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyMiddlewareSession } from "@/lib/auth-edge";
import { CSRF_COOKIE_NAME } from "@/lib/csrf-constants";
import { canAccessPath, getRoleHome, isAppRole } from "@/lib/rbac";
import { AUTH_COOKIE_SECURE } from "@/lib/security-config";

const PUBLIC_PATHS = ["/", "/login"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifyMiddlewareSession(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const role = isAppRole(session?.role) ? session.role : null;

  if (!isPublicPath(pathname) && !role) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!isPublicPath(pathname) && role && !canAccessPath(role, pathname)) {
    const homeUrl = new URL(getRoleHome(role), request.url);
    homeUrl.searchParams.set("error", "You do not have access to that page.");
    return NextResponse.redirect(homeUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-clinic-pathname", pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (!request.cookies.get(CSRF_COOKIE_NAME)?.value) {
    response.cookies.set(CSRF_COOKIE_NAME, crypto.randomUUID(), {
      httpOnly: false,
      sameSite: "lax",
      secure: AUTH_COOKIE_SECURE,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
