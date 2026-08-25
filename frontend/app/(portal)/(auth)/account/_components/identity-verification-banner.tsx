"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { AdminCard } from "@/components/portal-atoms";
import {
  fetchIdentityVerification,
  type IdentityVerificationData,
} from "@/lib/api/account-profile-api";

export type IdentityVerificationBannerCopy = {
  title: string;
  body: string;
  bodyRequested: string;
  bodyPending: string;
  bodyRejected: string;
};

/**
 * Dashboard prompt pointing a patient at their identity verification.
 *
 * Deliberately mirrors the "Verify your email" card above it — same AdminCard,
 * same chevron affordance — because it is the same kind of ask and the patient
 * should not have to learn a second pattern.
 *
 * Renders nothing unless the server says this patient is in scope, and nothing
 * once they are verified. Scope is a server decision, never guessed from an
 * address here.
 */
export function IdentityVerificationBanner({
  copy,
}: {
  copy: IdentityVerificationBannerCopy;
}) {
  const [data, setData] = useState<IdentityVerificationData | null>(null);

  useEffect(() => {
    void fetchIdentityVerification().then((res) => {
      if (res.ok) setData(res.data.identityVerification);
    });
  }, []);

  if (!data?.relevant || data.status === "VERIFIED") return null;

  // PENDING is not an ask — it is a reassurance that the ball is with us.
  // Colour it neutral so it does not sit there nagging for something the
  // patient has already done.
  const isPending = data.status === "PENDING";
  const accent = isPending ? "var(--portal-muted)" : "var(--portal-warning-text)";

  const body = isPending
    ? copy.bodyPending
    : data.status === "REJECTED"
      ? copy.bodyRejected
      : data.requestedAt
        ? copy.bodyRequested
        : copy.body;

  return (
    <div className="mt-6">
      <Link
        href="/account/profile?tab=verification"
        className="block transition hover:shadow-[var(--portal-shadow-hover)]"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <AdminCard style={{ borderLeft: `3px solid ${accent}` }}>
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-5 shrink-0" style={{ color: accent }} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--portal-text)]">{copy.title}</p>
              <p className="mt-1 text-portal-compact text-[var(--portal-muted)]">{body}</p>
            </div>
            <ChevronRight
              className="size-5 shrink-0 text-[var(--portal-muted)]"
              aria-hidden
            />
          </div>
        </AdminCard>
      </Link>
    </div>
  );
}
