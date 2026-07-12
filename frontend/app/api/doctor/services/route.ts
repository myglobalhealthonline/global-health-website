import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const locale =
    request.nextUrl.searchParams.get("locale") ??
    request.cookies.get("gh_locale")?.value;
  const path = locale
    ? `/api/doctor/services?locale=${encodeURIComponent(locale)}`
    : "/api/doctor/services";
  return forwardToBackend(request, path, "GET");
}

export async function POST(request: NextRequest) {
  return forwardToBackend(request, "/api/doctor/services", "POST");
}
