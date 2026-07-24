import type { NextRequest } from "next/server";
import { forwardStream } from "@/lib/server/proxy-stream";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return forwardStream(request, "/api/doctor/confidentiality-agreement/signed/download");
}
