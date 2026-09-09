import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/** Typeahead for the manual-booking form: list distinct patients already
 *  matching a name or email. Forwards the admin's cookies to the
 *  backend so the lookup runs under the admin session. */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") ?? "";
  const q = request.nextUrl.searchParams.get("q");
  const params = new URLSearchParams(q !== null ? { q } : { email });
  return forwardToBackend(
    request,
    `/api/admin/patients/by-email?${params}`,
    "GET",
  );
}
