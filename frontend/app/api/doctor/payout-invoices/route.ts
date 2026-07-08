import type { NextRequest } from "next/server";
import { forwardStream } from "@/lib/server/proxy-stream";

export const dynamic = "force-dynamic";

// GET = list own uploads, POST = upload a new invoice (multipart).
export async function GET(request: NextRequest) {
  return forwardStream(request, "/api/doctor/payout-invoices");
}

export async function POST(request: NextRequest) {
  return forwardStream(request, "/api/doctor/payout-invoices");
}
