import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * Inline counterpart to `setPhiAccessReason` (admin/_components/phi-reason-actions.ts).
 * That one is a `<form action>` server action built for the full-page
 * `PhiReasonGate` redirect flow. Callers that need the same 15-minute
 * `gh_phi_reason` cookie without leaving the page they're on (e.g. the manual
 * booking form's identity prefill, which must never navigate the admin away
 * mid-booking) POST here instead and get a plain JSON response back.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { reason?: string } | null;
  const reason = (body?.reason ?? "").trim();
  if (reason.length < 5 || reason.length > 300) {
    return NextResponse.json(
      { ok: false, message: "Reason must be between 5 and 300 characters" },
      { status: 400 },
    );
  }
  (await cookies()).set("gh_phi_reason", reason, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });
  return NextResponse.json({ ok: true });
}
