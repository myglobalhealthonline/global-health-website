import type { NextRequest } from "next/server";
import { forwardStream } from "@/lib/server/proxy-stream";

export const dynamic = "force-dynamic";

// Admin download of a doctor-uploaded signed confidentiality agreement.
export async function GET(request: NextRequest) {
  return forwardStream(request, "/api/admin/confidentiality-signed/download");
}
