import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { ShieldCheck, ShieldX } from "lucide-react";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale(); const card = getCommonLocale(locale).cardVerify;
  return buildPublicMetadata({ path: "/card-verify", title: card.title, description: card.subtitle, locale, kind: "corporate", subtitle: card.step, noindex: true });
}

export const dynamic = "force-dynamic";

type CardData = {
  cardNumber: string;
  memberType: "EMPLOYEE" | "BENEFICIARY";
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  validFrom: string;
  validUntil: string;
  valid: boolean;
  memberName: string;
  companyName: string;
  planName: string;
};

async function fetchCard(
  code: string,
  fallbackMessage: string,
): Promise<{ ok: true; data: CardData } | { ok: false; message: string }> {
  const backend = getBackendOrigin();
  if (!backend) return { ok: false, message: fallbackMessage };
  try {
    const res = await fetch(
      `${backend}/api/corporate/card-verify/${encodeURIComponent(code)}`,
      { cache: "no-store" },
    );
    const json = (await res.json()) as { ok?: boolean; message?: string; data?: CardData };
    if (!res.ok || !json.ok || !json.data) {
      // Surface the backend message only for the expected 404 — anything
      // else (5xx) may carry internals that don't belong on a public page.
      return {
        ok: false,
        message: res.status === 404 ? (json.message ?? fallbackMessage) : fallbackMessage,
      };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, message: fallbackMessage };
  }
}

export default async function CardVerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const t = getCommonLocale(await getPageLocale()).cardVerify;
  const result = await fetchCard(code, t.couldNotVerify);
  const isValid = result.ok && result.data.valid;

  return (
    <>
      <GH2FlowHeader
        title={t.title}
        subtitle={t.subtitle}
        activeStep={1}
        steps={[t.step]}
      />
      <section className="bg-[var(--color-background-soft)] px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-lg">
          {result.ok ? (
            <div className="gh-card p-8">
              <div className="mb-6 flex items-center gap-3">
                {isValid ? (
                  <ShieldCheck className="size-8 text-emerald-600" aria-hidden />
                ) : (
                  <ShieldX className="size-8 text-amber-600" aria-hidden />
                )}
                <div>
                  <p className="text-lg font-bold text-[var(--color-text-primary)]">
                    {isValid
                      ? t.valid
                      : result.data.status === "SUSPENDED"
                        ? t.statusSuspended
                        : t.statusExpired}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {isValid ? t.validBody : t.inactiveBody}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <Row label={t.cardNumber} value={result.data.cardNumber} mono />
                <Row label={t.member} value={result.data.memberName} />
                <Row label={t.company} value={result.data.companyName} />
                <Row label={t.plan} value={result.data.planName} />
                <Row
                  label={t.memberType}
                  value={result.data.memberType === "EMPLOYEE" ? t.employee : t.beneficiary}
                />
                <Row label={t.status} value={result.data.status} />
                <Row label={t.validRange} value={`${result.data.validFrom} → ${result.data.validUntil}`} />
              </div>

              <p className="mt-6 text-xs text-[var(--color-text-muted)]">{t.matchNote}</p>
            </div>
          ) : (
            <div className="gh-card p-8">
              <div className="flex items-center gap-3">
                <ShieldX className="size-8 text-red-600" aria-hidden />
                <div>
                  <p className="text-lg font-bold text-[var(--color-text-primary)]">
                    {t.notFound}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {result.message}. {t.checkNumber}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--color-border)] pb-2">
      <span className="font-semibold text-[var(--color-text-muted)]">{label}</span>
      <span
        className={`text-right text-[var(--color-text-primary)] ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
