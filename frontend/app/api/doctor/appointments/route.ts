import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/** Doctor-initiated manual booking (walk-in / phone-in). The list view is
 *  fetched server-side in `lib/api/doctor-api.ts`, so only POST is proxied. */
export async function POST(request: NextRequest) {
  return forwardToBackend(request, "/api/doctor/appointments", "POST");
}
