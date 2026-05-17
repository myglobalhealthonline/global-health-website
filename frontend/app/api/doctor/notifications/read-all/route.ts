import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return forwardToBackend(
    request,
    "/api/doctor/notifications/read-all",
    "POST",
  );
}
