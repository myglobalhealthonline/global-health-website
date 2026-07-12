import { Suspense } from "react";
import { BookingsShell } from "./ui";
import { SyncOrderPaymentOnReturn } from "@/components/payments/SyncOrderPaymentOnReturn";
import { fetchAccountAppointments } from "@/lib/api/account-appointments-api";
import { syncOrderPaymentServer } from "@/lib/api/cart-server";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { AdminSummaryStrip, Btn, PageHeader } from "@/components/portal-atoms";
import { CalendarClock, CreditCard, History, Video } from "lucide-react";

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
      <PageHeader
        eyebrow={a.bookings.breadcrumb}
        title={a.bookings.title}
        description={a.bookings.subtitle}
        icon={<CalendarClock aria-hidden />}
        actions={
          <Btn href="/" variant="primary" size="sm">
            {a.bookings.bookCta}
          </Btn>
        }
      />

      <AdminSummaryStrip
        className="mb-5"
        items={[
          { label: "Upcoming", value: String(upcoming), hint: "Scheduled consultations", tone: "brand", icon: <CalendarClock aria-hidden /> },
          { label: "Payment", value: needsPayment ? `${needsPayment} action` : "Clear", hint: "Required before doctor chat", tone: needsPayment > 0 ? "warning" : "neutral", icon: <CreditCard aria-hidden /> },
          { label: "Meet links", value: String(meetReady), hint: "Ready video calls", tone: meetReady > 0 ? "success" : "neutral", icon: <Video aria-hidden /> },
          { label: "History", value: String(items.length), hint: "All appointment requests", icon: <History aria-hidden /> },
        ]}
      />

      <BookingsShell
        items={items}
        unavailableMessage={
          history.ok
            ? null
            : a.bookings.unavailable
        }
        i18n={{ bookings: a.bookings, payments: a.payments, dashboard: a.dashboard, messages: a.messages }}
      />
    </div>
  );
}
