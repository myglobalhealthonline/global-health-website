import Link from "next/link";
import { Pill, ShoppingBag, ChevronRight } from "lucide-react";
import { fetchPatientPrescriptions } from "@/lib/api/prescriptions-api";
import { AdminCard, Btn, PageHeader, Pill as PillBadge, SectionHeader } from "@/components/portal-atoms";
import type { PillTone } from "@/components/portal-atoms";
import { formatAppDate } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

function paymentTone(status: string): PillTone {
  if (status === "PAID") return "published";
  if (status === "FAILED" || status === "CANCELED") return "inactive";
  if (status === "PROCESSING" || status === "REQUIRES_ACTION") return "pending";
  if (status === "REFUNDED") return "neutral";
  return "neutral";
}

export default async function AccountPrescriptionsPage() {
  const [result, locale] = await Promise.all([
    fetchPatientPrescriptions(),
    getPageLocale(),
  ]);
  const { account: a } = loadLocaleBundle(locale);
  const issued = result.ok ? result.data.issued : [];
  const orders = result.ok ? result.data.orders : [];
  const unavailable = result.ok ? null : result.message;

  return (
    <>
      <PageHeader
        eyebrow={a.prescriptions.breadcrumb}
        title={a.prescriptions.title}
        description={a.prescriptions.subtitle}
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
              <Pill className="size-4" aria-hidden /> {a.prescriptions.issuedByDoctor}
            </span>
          }
          description={a.prescriptions.issuedByDoctorHint}
        />
        <div className="p-5">
          {issued.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              {a.prescriptions.noPrescriptions}
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
                            ? `${p.durationDays} ${a.prescriptions.days}`
                            : null,
                          p.refills > 0
                            ? `${p.refills} ${p.refills === 1 ? a.prescriptions.refill : a.prescriptions.refills}`
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
                        {a.prescriptions.issuedBy
                          .replace("{doctor}", p.doctorName)
                          .replace("{date}", formatAppDate(p.consultationSignedAt ?? p.createdAt))}
                      </p>
                    </div>
                    <Btn
                      href="/account/bookings"
                      variant="secondary"
                      size="sm"
                      iconRight={<ChevronRight className="size-3.5" />}
                    >
                      {a.prescriptions.viewBooking}
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
              <ShoppingBag className="size-4" aria-hidden /> {a.prescriptions.onlineOrders}
            </span>
          }
          description={a.prescriptions.onlineOrdersHint}
          right={
            <Btn href="/" variant="primary" size="sm">
              {a.prescriptions.orderNew}
            </Btn>
          }
        />
        <div className="p-5">
          {orders.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              {a.prescriptions.noOnlineOrders}{" "}
              <Link
                href="/"
                className="font-semibold text-[var(--color-brand-primary)] hover:underline"
              >
                {a.prescriptions.browseProducts}
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
                      <span>{a.prescriptions.ordered.replace("{date}", formatAppDate(o.createdAt))}</span>
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
                    {a.prescriptions.open}
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
