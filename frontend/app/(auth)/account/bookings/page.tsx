import { Suspense } from "react";
import { BookingsShell } from "./ui";
import { BookingsTabsClient } from "./_components/BookingsTabsClient";
import { PatientCalendarUI } from "../calendar/ui";
import { SyncOrderPaymentOnReturn } from "@/components/payments/SyncOrderPaymentOnReturn";
import { fetchAccountAppointments } from "@/lib/api/account-appointments-api";
import { syncOrderPaymentServer } from "@/lib/api/cart-server";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { AdminSummaryStrip, Btn, PageHeader } from "@/components/portal-atoms";
import { CalendarClock, CalendarRange, Clock, CreditCard, Globe, History, Video } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ orderId?: string; session_id?: string; payment?: string; tab?: string; booking?: string }>;
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

  // Calendar was merged into this page as a tab (IA-2) — one fetch feeds
  // both the list view and the calendar's CalendarItem mapping.
  const [history, locale] = await Promise.all([
    fetchAccountAppointments(),
    getPageLocale(),
  ]);
  const { account: a } = loadLocaleBundle(locale);
  const items = history.ok ? history.data.items : [];
  const now = getRequestNowMs();
  const upcoming = items.filter((item) => item.scheduledAt && new Date(item.scheduledAt).getTime() >= now).length;
  // Mirror requiresPayment() in ui.tsx — a cancelled booking's order is
  // cancelled too, so it never needs payment (its payment link can't resolve).
  const needsPayment = items.filter(
    (item) =>
      item.amountCents &&
      item.amountCents > 0 &&
      item.paymentStatus !== "PAID" &&
      item.status !== "CANCELLED",
  ).length;
  const meetReady = items.filter((item) => item.meetingUrl).length;

  const calendarItems: CalendarItem[] = items
    .filter((item) => item.scheduledAt)
    .map((item) => ({
      id: item.id,
      kind: "consultation" as const,
      startAt: item.scheduledAt as string,
      endAt: null,
      status: item.status,
      title: item.doctorName ? item.doctorName : item.consultationType,
      meta: {
        doctorName: item.doctorName ?? null,
        consultationType: item.consultationType,
        meetingUrl: item.meetingUrl,
        countryCode: item.countryCode,
        patientTimezone: item.patientTimezone ?? null,
      },
    }));
  const defaultTz = items.find((item) => item.patientTimezone)?.patientTimezone ?? null;
  const calendarUpcoming = calendarItems.filter((item) => new Date(item.startAt).getTime() >= now).length;
  const calendarMeetReady = calendarItems.filter((item) => item.meta?.meetingUrl).length;
  const calendarCountries = new Set(calendarItems.map((item) => item.meta?.countryCode).filter(Boolean)).size;

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

      <BookingsTabsClient
        tabList={a.nav.myBookings}
        tabCalendar={a.nav.calendar}
        tabsAria={a.bookings.tabsAria}
        listPanel={
          <>
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
          </>
        }
        calendarPanel={
          <>
            <AdminSummaryStrip
              className="mb-5"
              items={[
                { label: a.calendar.sumScheduled, value: String(calendarItems.length), hint: a.calendar.sumScheduledHint, icon: <CalendarRange aria-hidden /> },
                { label: a.calendar.sumUpcoming, value: String(calendarUpcoming), hint: a.calendar.sumUpcomingHint, icon: <Clock aria-hidden /> },
                { label: a.calendar.sumMeetLinks, value: String(calendarMeetReady), hint: a.calendar.sumMeetLinksHint, icon: <Video aria-hidden /> },
                { label: a.calendar.sumMarkets, value: String(calendarCountries), hint: a.calendar.sumMarketsHint, icon: <Globe aria-hidden /> },
              ]}
            />
            {history.ok ? (
              <PatientCalendarUI
                items={calendarItems}
                defaultTz={defaultTz}
                emptyLabel={a.calendar.emptyDay}
                emptyHint={a.calendar.emptyDayHint}
              />
            ) : (
              <div className="gh-patient-empty-state rounded-[var(--radius-card-sm)] border border-[var(--portal-line)] bg-[var(--portal-surface-elevated)] px-5 py-4">
                <p className="text-sm text-[var(--portal-muted)]">{history.message}</p>
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
