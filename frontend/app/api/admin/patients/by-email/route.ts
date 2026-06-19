import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/** Typeahead for the manual-booking form: list distinct patients already
 *  associated with an exact email. Forwards the admin's cookies to the
 *  backend so the lookup runs under the admin session. */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") ?? "";
  return forwardToBackend(
    request,
    `/api/admin/patients/by-email?email=${encodeURIComponent(email)}`,
    "GET",
  );
}
