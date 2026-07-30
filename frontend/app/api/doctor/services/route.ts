import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Doctor's own saved language, not the shared gh_locale cookie (the public
  // site rewrites that one — see lib/i18n/get-portal-locale.ts).
  const locale = request.nextUrl.searchParams.get("locale") ?? (await getPortalLocale());
  const path = locale
    ? `/api/doctor/services?locale=${encodeURIComponent(locale)}`
    : "/api/doctor/services";
  return forwardToBackend(request, path, "GET");
}

export async function POST(request: NextRequest) {
  return forwardToBackend(request, "/api/doctor/services", "POST");
}
