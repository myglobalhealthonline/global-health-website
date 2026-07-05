import type { Metadata } from "next";
import React from "react";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { GH2AuthShell } from "@/components/sections/GH2PagePrimitives";
import { CorporateInviteForm, type InviteInfo } from "./ui";

export const metadata: Metadata = {
  title: "Corporate invitation",
  description: "Activate your corporate health benefits.",
};

export const dynamic = "force-dynamic";

type LookupResult =
  | { state: "ok"; invite: InviteInfo }
  | { state: "invalid"; message: string };

async function lookupInvite(token: string): Promise<LookupResult> {
  const backend = getBackendOrigin();
  if (!backend) return { state: "invalid", message: "Service unavailable — try again later." };
  try {
    const response = await fetch(
      `${backend}/api/corporate/invites/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    const json = (await response.json()) as {
      ok?: boolean;
      message?: string;
      data?: InviteInfo;
    };
    if (!response.ok || !json.ok || !json.data) {
      // 404/410 carry clean user-facing copy from the backend; anything
      // else (5xx) may carry internals that don't belong on a public page.
      const safe = response.status === 404 || response.status === 410;
      return {
        state: "invalid",
        message: safe
          ? (json.message ?? "This invitation link is not valid.")
          : "Service unavailable — try again later.",
      };
    }
    return { state: "ok", invite: json.data };
  } catch {
    return { state: "invalid", message: "Service unavailable — try again later." };
  }
}

export default async function CorporateInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await lookupInvite(token);

  return (
    <GH2AuthShell
      eyebrow="Corporate benefits"
      title="Your company covers"
      accent="your care."
      body="Activate your membership to unlock corporate health benefits — consultations, discounts, and your digital benefit card."
    >
      {result.state === "invalid" ? (
        <div className="text-center">
          <h1
            className="font-extrabold tracking-[-0.04em]"
            style={{ fontSize: "clamp(1.5rem,3vw,2rem)", lineHeight: 1.1, color: "#0D3A28" } as React.CSSProperties}
          >
            Invitation unavailable
          </h1>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "#7A9A83" }}>
            {result.message}
          </p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "#7A9A83" }}>
            Ask your company admin to send a new invitation.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 text-center">
            <h1
              className="font-extrabold tracking-[-0.04em]"
              style={{ fontSize: "clamp(1.5rem,3vw,2rem)", lineHeight: 1.1, color: "#0D3A28" } as React.CSSProperties}
            >
              Welcome, {result.invite.firstName}
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "#7A9A83" }}>
              {result.invite.companyName} invited you to join their corporate health plan
              {result.invite.type === "BENEFICIARY" ? " as a beneficiary" : ""}. Your account uses{" "}
              <strong>{result.invite.maskedEmail}</strong>.
            </p>
          </div>
          <CorporateInviteForm token={token} invite={result.invite} />
        </>
      )}
    </GH2AuthShell>
  );
}
