import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/** Live code check for the manual-booking form. Staff-facing, so the backend
 *  returns the real refusal reason here — unlike the public
 *  `/api/coupons/check`, which deliberately collapses them. Forwards the
 *  admin's cookies so the lookup runs under their session. */
export async function POST(request: NextRequest) {
  return forwardToBackend(request, "/api/admin/coupons/validate", "POST");
}
