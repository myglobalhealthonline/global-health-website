import type { NextRequest } from "next/server";
import { forwardStream } from "@/lib/server/proxy-stream";

export const dynamic = "force-dynamic";

// GET = list own signed uploads, POST = upload a signed copy (multipart).
export async function GET(request: NextRequest) {
  return forwardStream(request, "/api/doctor/confidentiality-agreement/signed");
}

export async function POST(request: NextRequest) {
  return forwardStream(request, "/api/doctor/confidentiality-agreement/signed");
}
