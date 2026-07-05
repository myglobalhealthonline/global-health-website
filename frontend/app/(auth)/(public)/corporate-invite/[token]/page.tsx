import type { Metadata } from "next";
import React from "react";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { GH2AuthShell } from "@/components/sections/GH2PagePrimitives";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { CorporateInviteForm, type InviteInfo } from "./ui";

export const metadata: Metadata = {
  title: "Corporate invitation",
  description: "Activate your corporate health benefits.",
};

export const dynamic = "force-dynamic";

type LookupResult =
  | { state: "ok"; invite: InviteInfo }
  | { state: "invalid"; message: string };

async function lookupInvite(
  token: string,
  messages: { serviceUnavailable: string; linkInvalid: string },
): Promise<LookupResult> {
  const backend = getBackendOrigin();
  if (!backend) return { state: "invalid", message: messages.serviceUnavailable };
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
        message: safe ? (json.message ?? messages.linkInvalid) : messages.serviceUnavailable,
      };
    }
    return { state: "ok", invite: json.data };
  } catch {
    return { state: "invalid", message: messages.serviceUnavailable };
  }
}

export default async function CorporateInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { auth } = loadLocaleBundle(await getPageLocale());
  const t = auth.corporateInvite;
  const result = await lookupInvite(token, {
    serviceUnavailable: t.serviceUnavailable,
    linkInvalid: t.linkInvalid,
  });

  return (
    <GH2AuthShell
      eyebrow={t.eyebrow}
      title={t.titleTop}
      accent={t.accent}
      body={t.body}
    >
      {result.state === "invalid" ? (
        <div className="text-center">
          <h1
            className="font-extrabold tracking-[-0.04em]"
            style={{ fontSize: "clamp(1.5rem,3vw,2rem)", lineHeight: 1.1, color: "#0D3A28" } as React.CSSProperties}
          >
            {t.invalidTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "#7A9A83" }}>
            {result.message}
          </p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "#7A9A83" }}>
            {t.invalidAsk}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 text-center">
            <h1
              className="font-extrabold tracking-[-0.04em]"
              style={{ fontSize: "clamp(1.5rem,3vw,2rem)", lineHeight: 1.1, color: "#0D3A28" } as React.CSSProperties}
            >
              {t.welcome.replace("{name}", result.invite.firstName)}
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "#7A9A83" }}>
              {t.invitedBy.replace("{company}", result.invite.companyName)}
              {result.invite.type === "BENEFICIARY" ? t.asBeneficiary : ""}. {t.accountUses}{" "}
              <strong>{result.invite.maskedEmail}</strong>.
            </p>
          </div>
          <CorporateInviteForm token={token} invite={result.invite} i18n={t} />
        </>
      )}
    </GH2AuthShell>
  );
}
