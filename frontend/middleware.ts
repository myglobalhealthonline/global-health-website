import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const redirectMap: Record<string, string> = {
  "/terms-and-conditions": "/term-and-conditions",
  "/privacy-policy": "/privacy",
  "/refund-policy": "/return-and-refund-policy",
  "/gdpr-compliance": "/privacy",
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const redirectTarget = redirectMap[pathname];

  if (redirectTarget) {
    const url = request.nextUrl.clone();
    url.pathname = redirectTarget;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/terms-and-conditions",
    "/privacy-policy",
    "/refund-policy",
    "/gdpr-compliance",
  ],
};
