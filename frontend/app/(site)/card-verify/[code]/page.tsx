import type { Metadata } from "next";
import { ShieldCheck, ShieldX } from "lucide-react";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";

export const metadata: Metadata = {
  title: "Corporate card verification",
  description: "Verify a Global Health corporate benefit card.",
};

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
): Promise<{ ok: true; data: CardData } | { ok: false; message: string }> {
  const backend = getBackendOrigin();
  if (!backend) return { ok: false, message: "Service unavailable" };
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
        message: res.status === 404 ? (json.message ?? "Card not found") : "Could not verify the card",
      };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, message: "Could not verify the card" };
  }
}

export default async function CardVerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const result = await fetchCard(code);
  const isValid = result.ok && result.data.valid;

  return (
    <>
      <GH2FlowHeader
        title="Corporate card verification"
        subtitle="Authenticate a Global Health corporate benefit card"
        activeStep={1}
        steps={["Verify"]}
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
                    {isValid ? "Card valid" : `Card ${result.data.status.toLowerCase()}`}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {isValid
                      ? "This corporate benefit card is active and authentic."
                      : "This card is authentic but no longer grants corporate benefits."}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <Row label="Card number" value={result.data.cardNumber} mono />
                <Row label="Member" value={result.data.memberName} />
                <Row label="Company" value={result.data.companyName} />
                <Row label="Plan" value={result.data.planName} />
                <Row
                  label="Member type"
                  value={result.data.memberType === "EMPLOYEE" ? "Employee" : "Beneficiary"}
                />
                <Row label="Status" value={result.data.status} />
                <Row label="Valid" value={`${result.data.validFrom} → ${result.data.validUntil}`} />
              </div>

              <p className="mt-6 text-xs text-[var(--color-text-muted)]">
                Match the card number above with the one on the member&apos;s digital card.
              </p>
            </div>
          ) : (
            <div className="gh-card p-8">
              <div className="flex items-center gap-3">
                <ShieldX className="size-8 text-red-600" aria-hidden />
                <div>
                  <p className="text-lg font-bold text-[var(--color-text-primary)]">
                    Card not found
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {result.message}. Check that the card number is correct.
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
