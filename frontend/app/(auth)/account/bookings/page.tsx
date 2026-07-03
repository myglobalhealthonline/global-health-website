import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { BookingsShell } from "./ui";
import { SyncOrderPaymentOnReturn } from "@/components/payments/SyncOrderPaymentOnReturn";
import { fetchAccountAppointments } from "@/lib/api/account-appointments-api";
import { syncOrderPaymentServer } from "@/lib/api/cart-server";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { AdminSummaryStrip } from "@/components/portal-atoms";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ orderId?: string; session_id?: string; payment?: string }>;
};

function getRequestNowMs() {
  return Date.now();
}

export default async function AccountBookingsPage({ searchParams }: Props) {
  const { orderId, session_id: stripeSessionId, payment } = await searchParams;
  const trimmedOrderId = orderId?.trim();
  let paymentSynced = false;

  if (payment !== "cancelled" && (trimmedOrderId || stripeSessionId?.trim())) {
    const sync = await syncOrderPaymentServer({
      orderId: trimmedOrderId,
      stripeSessionId: stripeSessionId?.trim(),
      source: "account-bookings",
    });
    paymentSynced = sync.ok;
  }

  const [history, locale] = await Promise.all([
    fetchAccountAppointments(),
    getPageLocale(),
  ]);
  const { account: a } = loadLocaleBundle(locale);
  const items = history.ok ? history.data.items : [];
  const now = getRequestNowMs();
  const upcoming = items.filter((item) => item.scheduledAt && new Date(item.scheduledAt).getTime() >= now).length;
  const needsPayment = items.filter((item) => item.amountCents && item.amountCents > 0 && item.paymentStatus !== "PAID").length;
  const meetReady = items.filter((item) => item.meetingUrl).length;

  return (
    <div className="gh-patient-page gh-patient-bookings-page">
      <Suspense fallback={null}>
        <SyncOrderPaymentOnReturn skipIfSynced={paymentSynced} />
      </Suspense>
      <header className="gh-patient-page-header mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--portal-muted)]">
            {a.bookings.breadcrumb}
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--portal-text)]">
            <CalendarDays className="size-6 text-[var(--portal-primary)]" aria-hidden />
            {a.bookings.title}
          </h2>
          <p className="text-sm text-[var(--portal-muted)]">
            {a.bookings.subtitle}
          </p>
        </div>
        <Link href="/" className="gh-btn gh-btn-primary text-sm">
          {a.bookings.bookCta}
        </Link>
      </header>

      <AdminSummaryStrip
        className="mb-5"
        items={[
          { label: "Upcoming", value: String(upcoming), hint: "Scheduled consultations" },
          { label: "Payment", value: needsPayment ? `${needsPayment} action` : "Clear", hint: "Required before doctor chat" },
          { label: "Meet links", value: String(meetReady), hint: "Ready video calls" },
          { label: "History", value: String(items.length), hint: "All appointment requests" },
        ]}
      />

      <BookingsShell
        items={items}
        unavailableMessage={
          history.ok
            ? null
            : a.bookings.unavailable
        }
        i18n={{ bookings: a.bookings, payments: a.payments }}
      />
    </div>
  );
}
