import Link from "next/link";
import { Pill, ShoppingBag, ChevronRight } from "lucide-react";
import { fetchPatientPrescriptions } from "@/lib/api/prescriptions-api";
import { AdminCard, Btn, PageHeader, Pill as PillBadge, SectionHeader } from "@/components/portal-atoms";
import type { PillTone } from "@/components/portal-atoms";
import { formatAppDate } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";

export const dynamic = "force-dynamic";

function paymentTone(status: string): PillTone {
  if (status === "PAID") return "published";
  if (status === "FAILED" || status === "CANCELED") return "inactive";
  if (status === "PROCESSING" || status === "REQUIRES_ACTION") return "pending";
  if (status === "REFUNDED") return "neutral";
  return "neutral";
}

export default async function AccountPrescriptionsPage() {
  const result = await fetchPatientPrescriptions();
  const issued = result.ok ? result.data.issued : [];
  const orders = result.ok ? result.data.orders : [];
  const unavailable = result.ok ? null : result.message;

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Prescriptions"
        description="Clinical scripts your doctor has issued, plus any online prescription products you've ordered."
      />

      {unavailable ? (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {unavailable}
        </div>
      ) : null}

      {/* ── Issued by your doctor (clinical) ────────────────────── */}
      <AdminCard padding={0} className="mb-4">
        <SectionHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Pill className="size-4" aria-hidden /> Issued by your doctor
            </span>
          }
          description="Scripts written during a signed consultation. Read-only history."
        />
        <div className="p-5">
          {issued.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No prescriptions issued yet. After a consultation, scripts your
              doctor writes will appear here.
            </p>
          ) : (
            <ul className="grid gap-3">
              {issued.map((p) => (
                <li
                  key={p.id}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold text-[var(--color-text-primary)]">
                        {p.drugName}
                        {p.dose ? (
                          <span className="ml-2 font-normal text-[var(--color-text-muted)]">
                            · {p.dose}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {[
                          p.frequency,
                          p.durationDays != null
                            ? `${p.durationDays} day(s)`
                            : null,
                          p.refills > 0
                            ? `${p.refills} refill${p.refills === 1 ? "" : "s"}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                      {p.instructions ? (
                        <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--color-text-body)]">
                          {p.instructions}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                        Issued by {p.doctorName} on{" "}
                        {formatAppDate(p.consultationSignedAt ?? p.createdAt)}
                      </p>
                    </div>
                    <Btn
                      href="/account/bookings"
                      variant="secondary"
                      size="sm"
                      iconRight={<ChevronRight className="size-3.5" />}
                    >
                      View booking
                    </Btn>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AdminCard>

      {/* ── Online prescription orders ──────────────────────────── */}
      <AdminCard padding={0}>
        <SectionHeader
          title={
            <span className="inline-flex items-center gap-2">
              <ShoppingBag className="size-4" aria-hidden /> Online orders
            </span>
          }
          description="Online prescription products you've ordered — like health tests, but for medication."
          right={
            <Btn href="/" variant="primary" size="sm">
              Order new
            </Btn>
          }
        />
        <div className="p-5">
          {orders.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No online prescription orders yet.{" "}
              <Link
                href="/"
                className="font-semibold text-[var(--color-brand-primary)] hover:underline"
              >
                Browse products →
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {orders.map((o) => (
                <li
                  key={o.appointmentId}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {o.serviceName || o.consultationType}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span>Ordered {formatAppDate(o.createdAt)}</span>
                      <span>· {o.countryCode.toUpperCase()}</span>
                      <PillBadge tone={paymentTone(o.paymentStatus)}>
                        {o.paymentStatus.toLowerCase()}
                      </PillBadge>
                      {o.amountCents != null ? (
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {formatPrice(o.amountCents, o.currencyCode)}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <Btn
                    href="/account/bookings"
                    variant="secondary"
                    size="sm"
                    iconRight={<ChevronRight className="size-3.5" />}
                  >
                    Open
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AdminCard>
    </>
  );
}
