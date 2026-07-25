import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

// Doctor B: inbox of cross-border requests awaiting a decision.
export async function GET(request: NextRequest) {
  return forwardToBackend(request, "/api/doctor/cross-border-rx", "GET");
}
