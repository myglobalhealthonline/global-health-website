import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { cookies } from "next/headers";
import {
  AdminCard,
  PageHeader,
  Pill,
  SectionHeader,
  type PillTone,
} from "@/components/portal-atoms";
import { formatAppDateTime } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";
import { formatOrderDisplayId } from "@/lib/format-order-display";
import { AdminOrderActions } from "./_components/order-actions";
import { OrderMeetLinkDisplay } from "../_components/order-meet-link-display";
import { UpdateAppointmentPanel } from "./_components/update-appointment-panel";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
};

type AdminOrder = {
  id: string;
  orderNumber?: string | null;
  userId: string | null;
  email: string;
  fullName: string;
  phone: string | null;
  countryCode: string;
  currencyCode: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  status: string;
  paymentStatus: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  paidAt: string | null;
  shipName: string | null;
  shipLine1: string | null;
  shipLine2: string | null;
  shipCity: string | null;
  shipPostalCode: string | null;
  shipCountryCode: string | null;
  appointmentIds: string[];
  meetingUrl: string | null;
  items: {
    id: string;
    kind: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    appointmentId: string | null;
  }[];
  createdAt: string;
  updatedAt: string;
};

async function fetchAdminOrder(id: string): Promise<AdminOrder | null> {
  const backend = getBackendOrigin();
  if (!backend) return null;
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  try {
    const res = await fetch(`${backend}/api/admin/orders/${id}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; data?: AdminOrder };
    if (!json.ok || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

function statusTone(status: string): PillTone {
  if (status === "PAID") return "published";
  if (status === "FULFILLED") return "active";
  if (status === "CANCELLED" || status === "REFUNDED") return "inactive";
  if (status === "PENDING") return "pending";
  return "neutral";
}

export default async function AdminOrderDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const order = await fetchAdminOrder(id);
  if (!order) notFound();

  const isTerminal =
    order.status === "FULFILLED" ||
    order.status === "CANCELLED" ||
    order.status === "REFUNDED";

  const hasConsultation = order.items.some(
    (i) => i.kind === "GENERAL_CONSULTATION" || i.kind === "SPECIALIST_CONSULTATION",
  );
  const consultationAppointmentId =
    order.items.find(
      (i) =>
        (i.kind === "GENERAL_CONSULTATION" || i.kind === "SPECIALIST_CONSULTATION") &&
        i.appointmentId,
    )?.appointmentId ?? null;

  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to orders
      </Link>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <ShoppingBag className="size-3.5" aria-hidden /> Order #{formatOrderDisplayId(order)}
          </span>
        }
        title={formatPrice(order.totalCents, order.currencyCode)}
        description={`Placed ${formatAppDateTime(order.createdAt)} · ${order.countryCode.toUpperCase()}`}
        actions={
          <div className="flex items-center gap-2">
            <Pill tone={statusTone(order.status)}>{order.status.toLowerCase()}</Pill>
            {!isTerminal ? <AdminOrderActions orderId={order.id} status={order.status} /> : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4">
          <AdminCard padding={0}>
            <SectionHeader title="Items" />
            <div className="p-5">
              <ul className="divide-y divide-[var(--color-border)]">
                {order.items.map((i) => (
                  <li
                    key={i.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[var(--color-text-primary)]">
                        {i.name}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {i.kind === "HEALTH_TEST"
                          ? "Health test"
                          : i.kind === "PRESCRIPTION_SERVICE"
                            ? "Online prescription"
                            : "Consultation"}
                        {" · "}
                        {formatPrice(i.unitPriceCents, order.currencyCode)} × {i.quantity}
                      </p>
                      {i.appointmentId ? (
                        <Link
                          href={`/admin/appointments/${i.appointmentId}`}
                          className="mt-1 inline-block text-[11px] font-semibold text-[var(--color-brand-primary)] hover:underline"
                        >
                          → Open appointment
                        </Link>
                      ) : null}
                    </div>
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {formatPrice(i.lineTotalCents, order.currencyCode)}
                    </p>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
                <Row label="Subtotal" value={formatPrice(order.subtotalCents, order.currencyCode)} />
                <Row label="Shipping" value={formatPrice(order.shippingCents, order.currencyCode)} />
                <Row label="Total" value={formatPrice(order.totalCents, order.currencyCode)} bold />
              </dl>
            </div>
          </AdminCard>

          <AdminCard padding={0}>
            <SectionHeader title="Customer" />
            <div className="grid gap-1 p-5 text-sm">
              <p className="font-semibold">{order.fullName}</p>
              <p className="text-[var(--color-text-muted)]">{order.email}</p>
              {order.phone ? (
                <p className="text-[var(--color-text-muted)]">{order.phone}</p>
              ) : null}
              {order.userId ? (
                <Link
                  href={`/admin/users/${order.userId}`}
                  className="mt-2 inline-block text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
                >
                  → View account
                </Link>
              ) : (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Guest checkout
                </p>
              )}
            </div>
          </AdminCard>
        </div>

        <aside className="grid gap-4 self-start">
          {hasConsultation && consultationAppointmentId ? (
            <UpdateAppointmentPanel
              appointmentId={consultationAppointmentId}
              orderId={order.id}
              countryCode={order.countryCode}
              returnPath={`/admin/orders/${order.id}`}
              error={sp.error}
              success={sp.success}
            />
          ) : null}

          {hasConsultation ? (
            <AdminCard padding={0}>
              <SectionHeader title="Google Meet" />
              <OrderMeetLinkDisplay
                meetingUrl={order.meetingUrl}
                hasConsultation={hasConsultation}
                variant="panel"
              />
            </AdminCard>
          ) : null}

          <AdminCard padding={0}>
            <SectionHeader title="Shipping" />
            <div className="p-5 text-sm">
              {order.shipName ? (
                <>
                  <p className="font-semibold">{order.shipName}</p>
                  <p>{order.shipLine1}</p>
                  {order.shipLine2 ? <p>{order.shipLine2}</p> : null}
                  <p>
                    {order.shipCity} {order.shipPostalCode}
                  </p>
                  <p>{order.shipCountryCode}</p>
                </>
              ) : (
                <p className="text-[var(--color-text-muted)]">No shipping address.</p>
              )}
            </div>
          </AdminCard>

          <AdminCard padding={0}>
            <SectionHeader title="Payment" />
            <div className="grid gap-2 p-5 text-sm">
              <p>
                <span className="text-[var(--color-text-muted)]">Status:</span>{" "}
                <span className="font-semibold">{order.paymentStatus}</span>
              </p>
              {order.paidAt ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Paid {formatAppDateTime(order.paidAt)}
                </p>
              ) : null}
              {order.stripeSessionId ? (
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  <span className="font-mono">Session: {order.stripeSessionId.slice(-12)}</span>
                </p>
              ) : null}
              {order.stripePaymentIntentId ? (
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  <span className="font-mono">PI: {order.stripePaymentIntentId.slice(-12)}</span>
                </p>
              ) : null}
            </div>
          </AdminCard>

          <AdminCard padding={0}>
            <SectionHeader title="Timestamps" />
            <div className="grid gap-1 p-5 text-xs text-[var(--color-text-muted)]">
              <p>Created {formatAppDateTime(order.createdAt)}</p>
              <p>Updated {formatAppDateTime(order.updatedAt)}</p>
            </div>
          </AdminCard>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={bold ? "font-bold" : "text-[var(--color-text-muted)]"}>{label}</dt>
      <dd className={bold ? "font-bold" : "font-semibold text-[var(--color-text-primary)]"}>
        {value}
      </dd>
    </div>
  );
}
