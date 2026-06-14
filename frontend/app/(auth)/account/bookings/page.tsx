import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { BookingsShell } from "./ui";
import { SyncOrderPaymentOnReturn } from "@/components/payments/SyncOrderPaymentOnReturn";
import { fetchAccountAppointments } from "@/lib/api/account-appointments-api";
import { syncOrderPaymentServer } from "@/lib/api/cart-server";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ orderId?: string; session_id?: string; payment?: string }>;
};

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

  return (
    <>
      <Suspense fallback={null}>
        <SyncOrderPaymentOnReturn skipIfSynced={paymentSynced} />
      </Suspense>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {a.bookings.breadcrumb}
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
            <CalendarDays className="size-6 text-[var(--color-brand-primary)]" aria-hidden />
            {a.bookings.title}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {a.bookings.subtitle}
          </p>
        </div>
        <Link href="/" className="gh-btn gh-btn-primary text-sm">
          {a.bookings.bookCta}
        </Link>
      </header>

      <BookingsShell
        items={history.ok ? history.data.items : []}
        unavailableMessage={
          history.ok
            ? null
            : a.bookings.unavailable
        }
        i18n={{ bookings: a.bookings, payments: a.payments }}
      />
    </>
  );
}
