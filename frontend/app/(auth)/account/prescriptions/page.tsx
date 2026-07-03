import { FileText, Pill, ShoppingBag, ChevronRight } from "lucide-react";
import { fetchPatientPrescriptions } from "@/lib/api/prescriptions-api";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, Btn, PageHeader, Pill as PillBadge, SectionHeader } from "@/components/portal-atoms";
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
    <div className="gh-patient-page gh-patient-prescriptions-page">
      <PageHeader
        eyebrow={a.prescriptions.breadcrumb}
        title={a.prescriptions.title}
        description={a.prescriptions.subtitle}
      />

      <AdminSummaryStrip
        className="mb-5"
        items={[
          { label: "Doctor issued", value: String(issued.length), hint: "Clinical prescriptions from consultations" },
          { label: "Online orders", value: String(orders.length), hint: "Prescription checkout requests" },
          {
            label: "Paid orders",
            value: String(orders.filter((order) => order.paymentStatus === "PAID").length),
            hint: "Ready or already processed",
          },
          {
            label: "Needs action",
            value: String(orders.filter((order) => order.paymentStatus !== "PAID").length),
            hint: "Payment or review pending",
          },
        ]}
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
            <AdminEmptyState
              icon={<Pill className="size-6" aria-hidden />}
              assetSrc="/images/portal/obsidian/empty-records.svg"
              title={a.prescriptions.noPrescriptions}
              description="Doctor-issued medications and follow-up instructions will appear here after a signed consultation."
              action={
                <Btn href="/account/bookings" variant="secondary" size="sm">
                  {a.prescriptions.viewBooking}
                </Btn>
              }
            />
          ) : (
            <ul className="grid gap-3">
              {issued.map((p) => (
                <li
                  key={p.id}
                  className="gh-patient-prescription-card rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold text-[var(--portal-text)]">
                        {p.drugName}
                        {p.dose ? (
                          <span className="ml-2 font-normal text-[var(--portal-muted)]">
                            · {p.dose}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-[var(--portal-muted)]">
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
                        <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--portal-text-2)]">
                          {p.instructions}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[11px] text-[var(--portal-muted)]">
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
            <AdminEmptyState
              icon={<FileText className="size-6" aria-hidden />}
              assetSrc="/images/portal/obsidian/empty-payments.svg"
              title={a.prescriptions.noOnlineOrders}
              description="Online prescription requests and payment status will be listed here."
              action={
                <Btn href="/" variant="primary" size="sm">
                  {a.prescriptions.browseProducts}
                </Btn>
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--portal-line)]">
              {orders.map((o) => (
                <li
                  key={o.appointmentId}
                  className="gh-patient-list-row flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--portal-text)]">
                      {o.serviceName || o.consultationType}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--portal-muted)]">
                      <span>{a.prescriptions.ordered.replace("{date}", formatAppDate(o.createdAt))}</span>
                      <span>· {o.countryCode.toUpperCase()}</span>
                      <PillBadge tone={paymentTone(o.paymentStatus)}>
                        {o.paymentStatus.toLowerCase()}
                      </PillBadge>
                      {o.amountCents != null ? (
                        <span className="font-semibold text-[var(--portal-text)]">
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
    </div>
  );
}
