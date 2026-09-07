import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/**
 * PR-2: the formal GDPR erasure request, which an admin reviews in
 * /admin data-deletion. Distinct from the self-service 30-day account
 * deletion on the same page — that one is scheduled automatically and the
 * patient can cancel it; this one is a reviewed request that can be
 * rejected, or completed by anonymising records the clinic must retain.
 *
 * GET lists the caller's own requests, POST creates one. The backend scopes
 * both to the session's own PatientProfile and rate-limits POST to 3 per 24h.
 */
export async function GET(request: NextRequest) {
  return forwardToBackend(request, "/api/account/data-deletion", "GET");
}

export async function POST(request: NextRequest) {
  return forwardToBackend(request, "/api/account/data-deletion", "POST");
}
