"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  Eye,
  Loader2,
  X,
  Copy,
  Receipt,
  RotateCcw,
  Star,
} from "lucide-react";
import { BookingSourceIcon } from "@/components/BookingSourceIcon";
import {
  AdminEmptyState,
  AdminTable,
  Btn,
  IconBtn,
  Pill,
  Td,
  Th,
  Thead,
  Tr,
  type PillTone,
} from "@/components/portal-atoms";
import { formatAppDate, formatAppDateTime } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";
import { formatOrderDisplayId } from "@/lib/format-order-display";
import { OrderMeetLinkDisplay } from "./order-meet-link-display";
import { PortalMobileCard, type PortalMobileCardTone } from "@/components/PortalMobileCard";
import { PortalDialog } from "@/components/PortalDialog";
import {
  RecordDetailsDrawer,
  RecordDetailsSection,
  RecordDetailsField,
} from "@/components/RecordDetailsDrawer";

export type OrderConsultation = {
  appointmentId: string;
  doctorName: string | null;
  scheduledAt: string | null;
  consultationType: string;
};

export type AdminOrderRow = {
  id: string;
  orderNumber?: string | null;
  status: string;
  paymentStatus: string;
  email: string;
  fullName: string;
  countryCode: string;
  currencyCode: string;
  bookingSource: string;
  /** True when this is the customer's earliest order by email — drives the
   *  new-customer star badge next to their name. */
  isFirstOrder: boolean;
  totalCents: number;
  itemCount: number;
  meetingUrl: string | null;
  hasConsultation: boolean;
  invoiceId: string | null;
  stripeCheckoutUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  /** Consultation appointment(s) on this order — doctor + scheduled time.
   *  Empty for pure commerce orders (health tests / prescriptions). */
  consultations?: OrderConsultation[];
};

/** The order's primary (earliest) consultation, or null for commerce orders. */
function primaryConsultation(o: AdminOrderRow): OrderConsultation | null {
  return o.consultations?.[0] ?? null;
}

/** "Dr Jane Doe" / "Unassigned" / "—" (no consultation). Appends "+N" when an
 *  order bundles more than one consultation. */
function doctorLabel(o: AdminOrderRow): string {
  const c = primaryConsultation(o);
  if (!c) return "—";
  const base = c.doctorName ?? "Unassigned";
  const extra = (o.consultations?.length ?? 0) - 1;
  return extra > 0 ? `${base} +${extra}` : base;
}

/** Scheduled consultation time, "Time TBC" when unscheduled, "—" otherwise. */
function consultationTimeLabel(o: AdminOrderRow): string {
  const c = primaryConsultation(o);
  if (!c) return "—";
  return c.scheduledAt ? formatAppDateTime(c.scheduledAt) : "Time TBC";
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy payment link"
      className="gh-admin-order-copy-link inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-white px-2 py-1 text-portal-thead font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
    >
      {copied ? (
        <Check className="size-3 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="size-3" aria-hidden />
      )}
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

function statusTone(status: string): PillTone {
  if (status === "PAID") return "published";
  if (status === "FULFILLED") return "active";
  if (status === "CANCELLED" || status === "REFUNDED") return "inactive";
  if (status === "PENDING") return "pending";
  return "neutral";
}

function statusCardTone(status: string): PortalMobileCardTone {
  if (status === "PAID" || status === "FULFILLED") return "success";
  if (status === "CANCELLED" || status === "REFUNDED") return "danger";
  if (status === "PENDING") return "warning";
  return "neutral";
}

export function AdminOrdersTable({ items }: { items: AdminOrderRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = useState<string | null>(
    () => searchParams.get("order"),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingBulkStatus, setPendingBulkStatus] = useState<"FULFILLED" | "CANCELLED" | null>(
    null,
  );
  const [pendingRefundId, setPendingRefundId] = useState<string | null>(null);

  const canRefund = (o: AdminOrderRow) =>
    o.paymentStatus === "PAID" && o.status !== "REFUNDED";

  function confirmRefund() {
    const id = pendingRefundId;
    setPendingRefundId(null);
    if (!id) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${id}/refund`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.message ?? "Refund failed");
        return;
      }
      router.refresh();
    });
  }

  const refundOrder = pendingRefundId
    ? items.find((o) => o.id === pendingRefundId) ?? null
    : null;

  const quickViewOrder = quickViewId
    ? items.find((o) => o.id === quickViewId) ?? null
    : null;

  function openQuickView(id: string) {
    setQuickViewId(id);
    const next = new URLSearchParams(searchParams.toString());
    next.set("order", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((o) => o.id)));
  }

  function bulkAction(status: "FULFILLED" | "CANCELLED") {
    if (selected.size === 0) return;
    setPendingBulkStatus(status);
  }

  function confirmBulkAction() {
    const status = pendingBulkStatus;
    if (!status) return;
    const ids = [...selected];
    setPendingBulkStatus(null);
    if (ids.length === 0) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/bulk`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.message ?? "Bulk action failed");
        return;
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  const bulkCount = selected.size;
  const bulkVerb = pendingBulkStatus === "FULFILLED" ? "Mark fulfilled" : "Cancel";
  const bulkBody = `${bulkVerb} ${bulkCount} order${bulkCount === 1 ? "" : "s"}? ${
    pendingBulkStatus === "CANCELLED"
      ? "HELD consultation slots will be released. Issue Stripe refunds separately."
      : ""
  }`;

  const allChecked = items.length > 0 && selected.size === items.length;
  const someChecked = selected.size > 0;

  return (
    <>
      {/* Bulk action bar */}
      {someChecked ? (
        <div className="gh-admin-order-bulkbar mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">
          <span className="font-semibold text-emerald-900">
            {selected.size} selected
          </span>
          <div className="gh-admin-order-bulkbar-actions flex items-center gap-2">
            <button
              type="button"
              onClick={() => bulkAction("FULFILLED")}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
              Mark fulfilled
            </button>
            <button
              type="button"
              onClick={() => bulkAction("CANCELLED")}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              <X className="size-3" />
              Cancel orders
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-semibold text-emerald-800 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {items.length === 0 ? (
        <AdminEmptyState
          icon={<Receipt className="size-8" aria-hidden />}
          title="No orders yet"
          description="Orders will appear here after checkout starts. Use this table to reconcile payments, invoices, consultation slots, and fulfillment status."
        />
      ) : (
        <>
      <div className="gh-admin-order-table-wrap overflow-x-auto">
        <AdminTable>
          <Thead>
            <Th style={{ width: 36 }}>
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                aria-label="Select all"
              />
            </Th>
            <Th>Order</Th>
            <Th>Customer</Th>
            <Th>Source</Th>
            <Th>Doctor</Th>
            <Th>Consultation</Th>
            <Th align="right">Total</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th align="right" style={{ width: 190 }}>
              {" "}
            </Th>
          </Thead>
          <tbody>
            {items.map((o) => (
                <Tr
                  key={o.id}
                  onClick={() => openQuickView(o.id)}
                  className="gh-admin-order-row cursor-pointer"
                >
                  <Td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggle(o.id)}
                      aria-label={`Select order ${o.id}`}
                    />
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-xs text-[var(--color-brand-primary)] hover:underline"
                    >
                      #{formatOrderDisplayId(o)}
                    </Link>
                  </Td>
                  <Td>
                    <span className="gh-admin-order-name inline-flex items-center gap-1.5 font-semibold text-[var(--color-text-primary)]">
                      {o.fullName}
                      {o.isFirstOrder ? (
                        <Star
                          className="gh-admin-order-firstorder-star size-3 shrink-0 fill-current"
                          aria-label="New customer — first order"
                        />
                      ) : null}
                    </span>
                    <span className="block text-xs text-[var(--color-text-muted)]">
                      {o.email}
                    </span>
                  </Td>
                  <Td>
                    <BookingSourceIcon source={o.bookingSource} />
                  </Td>
                  <Td>
                    <span className="text-sm text-[var(--color-text-primary)]">
                      {doctorLabel(o)}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {consultationTimeLabel(o)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {formatPrice(o.totalCents, o.currencyCode)}
                    </span>
                  </Td>
                  <Td>
                    <Pill tone={statusTone(o.status)}>{o.status.toLowerCase()}</Pill>
                  </Td>
                  <Td>{formatAppDate(o.createdAt)}</Td>
                  <Td align="right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center justify-end gap-2">
                      {canRefund(o) ? (
                        <button
                          type="button"
                          onClick={() => setPendingRefundId(o.id)}
                          disabled={pending}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-300 px-2 py-1 text-portal-thead font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                        >
                          {pending ? (
                            <Loader2 className="size-3 animate-spin" aria-hidden />
                          ) : (
                            <RotateCcw className="size-3" aria-hidden />
                          )}
                          Refund
                        </button>
                      ) : null}
                      <IconBtn ariaLabel={`Quick view order ${o.id}`} onClick={() => openQuickView(o.id)}>
                        <Eye className="size-3.5" aria-hidden />
                      </IconBtn>
                      <IconBtn ariaLabel={`Open order ${o.id}`} href={`/admin/orders/${o.id}`}>
                        <ExternalLink className="size-3.5" aria-hidden />
                      </IconBtn>
                    </div>
                  </Td>
                </Tr>
              ))}
          </tbody>
        </AdminTable>
      </div>

      <div className="gh-admin-mobile-list gh-admin-order-mobile-list">
        {items.map((o) => (
          <PortalMobileCard
            key={o.id}
            tone={statusCardTone(o.status)}
            title={
              <Link href={`/admin/orders/${o.id}`} className="no-underline">
                #{formatOrderDisplayId(o)}
              </Link>
            }
            subtitle={
              <span className="inline-flex items-center gap-1.5">
                {o.fullName} · {o.email}
                {o.isFirstOrder ? (
                  <Star
                    className="gh-admin-order-firstorder-star size-3 shrink-0 fill-current"
                    aria-label="New customer — first order"
                  />
                ) : null}
              </span>
            }
            statusPill={<Pill tone={statusTone(o.status)}>{o.status.toLowerCase()}</Pill>}
            meta={[
              { label: "Source", value: <BookingSourceIcon source={o.bookingSource} /> },
              { label: "Total", value: formatPrice(o.totalCents, o.currencyCode) },
              { label: "Country", value: o.countryCode.toUpperCase() },
              { label: "Items", value: o.itemCount },
              { label: "Created", value: formatAppDate(o.createdAt) },
              ...(primaryConsultation(o)
                ? [
                    { label: "Doctor", value: doctorLabel(o) },
                    { label: "Consultation", value: consultationTimeLabel(o) },
                  ]
                : []),
            ]}
            actions={
              <>
                {o.stripeCheckoutUrl ? <CopyLinkButton url={o.stripeCheckoutUrl} /> : null}
                {canRefund(o) ? (
                  <button
                    type="button"
                    onClick={() => setPendingRefundId(o.id)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded border border-amber-300 bg-white px-2 py-1 text-portal-thead font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                  >
                    {pending ? (
                      <Loader2 className="size-3 animate-spin" aria-hidden />
                    ) : (
                      <RotateCcw className="size-3" aria-hidden />
                    )}
                    Refund
                  </button>
                ) : null}
                <IconBtn ariaLabel={`Open order ${o.id}`} href={`/admin/orders/${o.id}`}>
                  <ExternalLink className="size-3.5" aria-hidden />
                </IconBtn>
              </>
            }
          />
        ))}
      </div>
      </>
      )}

      <PortalDialog
        open={pendingBulkStatus !== null}
        onClose={() => setPendingBulkStatus(null)}
        title={bulkVerb}
        danger
        footer={
          <>
            <Btn variant="ghost" onClick={() => setPendingBulkStatus(null)}>
              Cancel
            </Btn>
            <Btn variant="danger" onClick={confirmBulkAction}>
              {bulkVerb}
            </Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
          {bulkBody}
        </p>
      </PortalDialog>

      <PortalDialog
        open={pendingRefundId !== null}
        onClose={() => setPendingRefundId(null)}
        title="Refund order"
        danger
        footer={
          <>
            <Btn variant="ghost" onClick={() => setPendingRefundId(null)}>
              Keep payment
            </Btn>
            <Btn variant="danger" onClick={confirmRefund}>
              Refund now
            </Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
          Refund{" "}
          {refundOrder
            ? `${formatPrice(refundOrder.totalCents, refundOrder.currencyCode)} `
            : "the full amount "}
          to the customer via Stripe? The order is marked REFUNDED, and any HELD slots and reserved subscription credits are released. This cannot be undone.
        </p>
      </PortalDialog>

      <RecordDetailsDrawer
        open={quickViewOrder !== null}
        onOpenChange={(next) => {
          if (!next) setQuickViewId(null);
        }}
        paramKey="order"
        paramValue={quickViewOrder?.id}
        title={quickViewOrder ? `Order #${formatOrderDisplayId(quickViewOrder)}` : ""}
        summary={
          quickViewOrder ? (
            <div className="gh-order-drawer-summary flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="font-semibold text-[var(--portal-text)]">
                {quickViewOrder.fullName}
              </span>
              <span>{formatPrice(quickViewOrder.totalCents, quickViewOrder.currencyCode)}</span>
              <Pill tone={statusTone(quickViewOrder.status)}>
                {quickViewOrder.status.toLowerCase()}
              </Pill>
              <span>{formatAppDate(quickViewOrder.createdAt)}</span>
            </div>
          ) : null
        }
        footer={
          quickViewOrder ? (
            <>
              <Btn variant="ghost" onClick={() => setQuickViewId(null)}>
                Close
              </Btn>
              <Link href={`/admin/orders/${quickViewOrder.id}`}>
                <Btn variant="primary">Open full order</Btn>
              </Link>
            </>
          ) : null
        }
      >
        {quickViewOrder ? (
          <>
            {quickViewOrder.consultations && quickViewOrder.consultations.length > 0 ? (
              <RecordDetailsSection title="Consultation">
                {quickViewOrder.consultations.map((c) => (
                  <div key={c.appointmentId} className="grid gap-1">
                    <RecordDetailsField
                      label="Doctor"
                      value={c.doctorName ?? "Unassigned"}
                    />
                    <RecordDetailsField
                      label="Time"
                      value={c.scheduledAt ? formatAppDateTime(c.scheduledAt) : "Time TBC"}
                    />
                  </div>
                ))}
              </RecordDetailsSection>
            ) : null}

            <RecordDetailsSection title="Items">
              <RecordDetailsField
                label="Country"
                value={quickViewOrder.countryCode.toUpperCase()}
              />
              <RecordDetailsField label="Item count" value={quickViewOrder.itemCount} />
            </RecordDetailsSection>

            <RecordDetailsSection title="Payment">
              <RecordDetailsField
                label="Payment status"
                value={quickViewOrder.paymentStatus.toLowerCase()}
              />
              <RecordDetailsField
                label="Paid at"
                value={quickViewOrder.paidAt ? formatAppDate(quickViewOrder.paidAt) : null}
              />
              {quickViewOrder.stripeCheckoutUrl ? (
                <CopyLinkButton url={quickViewOrder.stripeCheckoutUrl} />
              ) : null}
            </RecordDetailsSection>

            <RecordDetailsSection title="Meeting">
              <OrderMeetLinkDisplay
                meetingUrl={quickViewOrder.meetingUrl ?? null}
                hasConsultation={quickViewOrder.hasConsultation ?? false}
                variant="panel"
              />
            </RecordDetailsSection>

            <RecordDetailsSection title="Invoice">
              {quickViewOrder.invoiceId ? (
                <Link
                  href={`/print/order-invoices/${quickViewOrder.invoiceId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
                >
                  <Receipt className="size-3.5" aria-hidden />
                  Download invoice
                </Link>
              ) : (
                <RecordDetailsField label="Invoice" value={null} />
              )}
            </RecordDetailsSection>

            <RecordDetailsSection title="Timestamps">
              <RecordDetailsField label="Created" value={formatAppDate(quickViewOrder.createdAt)} />
              <RecordDetailsField
                label="Paid"
                value={quickViewOrder.paidAt ? formatAppDate(quickViewOrder.paidAt) : null}
              />
            </RecordDetailsSection>
          </>
        ) : null}
      </RecordDetailsDrawer>
    </>
  );
}
