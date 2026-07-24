import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return forwardToBackend(request, "/api/doctor/booking-options", "GET");
}
