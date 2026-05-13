import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME?.trim() || "gh_admin_session";
const PUBLIC_FILE = /\.(.*)$/;

/**
 * Admin gate. Full session verification (JWT signature, expiry, role) runs in
 * `apps/web/app/(admin)/admin/layout.tsx` because the Edge proxy cannot reach
 * the database. Here we only redirect when there is no session cookie at all,
 * to avoid a flash of the admin shell for unauthenticated users.
 *
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (and the exported function
 * from `middleware` to `proxy`). See https://nextjs.org/docs/messages/middleware-to-proxy.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") return NextResponse.next();

    const hasSessionCookie = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
    if (!hasSessionCookie) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
