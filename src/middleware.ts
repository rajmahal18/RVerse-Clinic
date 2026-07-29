import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyMiddlewareSession } from "@/lib/auth-edge";
import { canAccessPath, getRoleHome, isAppRole } from "@/lib/rbac";

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

  if (pathname === "/login" && role) {
    return NextResponse.redirect(new URL(getRoleHome(role), request.url));
  }

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

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
