"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, ShieldCheck } from "lucide-react";
import { PortalDialog } from "@/components/PortalDialog";
import { Btn } from "@/components/portal-atoms";

type Insurance = {
  verificationStatus: string;
  /** Which kind of cover is being verified. INSURANCE is the legacy flow; the
   *  other three come from the booking form's cover picker and are checked by
   *  us rather than by an insurer. Absent on orders parked before this field
   *  existed — treated as insurance. */
  source?: "INSURANCE" | "MEMBERSHIP" | "CORPORATE" | "PUBLIC_PLAN";
  companyId: string | null;
  companyName: string | null;
  policyNumber: string | null;
  insurancePriceCents: number | null;
};

type Props = {
  orderId: string;
  currencyCode: string;
  insurance: Insurance;
};

function money(cents: number | null, currency: string): string {
  if (cents == null) return "—";
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

/**
 * Admin insurance card-verification panel. Shows the (decrypted) card number so
 * the admin can check it with the insurer, then records the verdict:
 *   Verified     → patient is sent a payment link at the insurance price.
 *   Not verified → order re-priced to standard, patient sent a "couldn't verify"
 *                  payment link for the same doctor + slot.
 */
export function InsuranceVerifyPanel({ orderId, currencyCode, insurance }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);

  const status = insurance.verificationStatus;
  const isPending = status === "PENDING";
  const source = insurance.source ?? "INSURANCE";
  const COVER_LABEL: Record<string, { title: string; provider: string; price: string }> = {
    INSURANCE: { title: "Insurance verification", provider: "Company", price: "Insurance price" },
    MEMBERSHIP: { title: "Membership verification", provider: "Membership", price: "Member price" },
    CORPORATE: { title: "Corporate cover verification", provider: "Employer", price: "Covered price" },
    PUBLIC_PLAN: { title: "Health plan verification", provider: "Plan", price: "Plan price" },
  };
  const labels = COVER_LABEL[source] ?? COVER_LABEL.INSURANCE;

  function decide(decision: "VERIFIED" | "REJECTED") {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${orderId}/insurance-verification`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.message ?? "Failed to record decision");
        return;
      }
      router.refresh();
    });
  }

  const statusLabel =
    status === "PENDING"
      ? "Awaiting verification"
      : status === "VERIFIED"
        ? "Verified — payment link sent"
        : "Not verified — standard-price link sent";
  const statusColor =
    status === "PENDING" ? "#B45309" : status === "VERIFIED" ? "#047857" : "#B91C1C";

  return (
    <div
      className="rounded-[12px] border p-4"
      style={{ borderColor: "var(--portal-border, #E5E5E3)", background: "var(--portal-surface-2, #FAFAF9)" }}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4" style={{ color: "#1B4D3E" }} aria-hidden />
        <h3 className="m-0 text-sm font-bold" style={{ color: "var(--portal-text-1, #0F2E25)" }}>
          {labels.title}
        </h3>
        <span className="ml-auto text-xs font-semibold" style={{ color: statusColor }}>
          {statusLabel}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] uppercase tracking-wide" style={{ color: "var(--portal-text-3, #737373)" }}>
            {labels.provider}
          </dt>
          <dd className="m-0 font-medium">{insurance.companyName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide" style={{ color: "var(--portal-text-3, #737373)" }}>
            Card / policy number
          </dt>
          <dd className="m-0 font-mono font-medium">{insurance.policyNumber ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide" style={{ color: "var(--portal-text-3, #737373)" }}>
            {labels.price}
          </dt>
          <dd className="m-0 font-medium">{money(insurance.insurancePriceCents, currencyCode)}</dd>
        </div>
      </dl>

      {isPending ? (
        <>
          <p className="mt-3 text-xs" style={{ color: "var(--portal-text-3, #737373)" }}>
            {source === "INSURANCE"
              ? "Verify the card number with the insurer, then choose an outcome."
              : "Check the card number against the provider's records, then choose an outcome."}{" "}
            The patient is only charged after you decide — the time slot is reserved until then.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => decide("VERIFIED")}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
              Card verified
            </button>
            <button
              type="button"
              onClick={() => setConfirmReject(true)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              <X className="size-3" />
              Card not verified
            </button>
          </div>
        </>
      ) : null}

      {error ? <p className="mt-2 text-[11px] text-rose-700">{error}</p> : null}

      <PortalDialog
        open={confirmReject}
        onClose={() => setConfirmReject(false)}
        title="Card not verified"
        danger
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmReject(false)}>
              Go back
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                setConfirmReject(false);
                decide("REJECTED");
              }}
            >
              Send standard-price link
            </Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
          The cover will be removed and the order re-priced to the standard price for
          the same doctor and time. The patient is emailed &amp; WhatsApp&rsquo;d a payment link and
          told their card couldn&rsquo;t be verified. This can&rsquo;t be undone.
        </p>
      </PortalDialog>
    </div>
  );
}
