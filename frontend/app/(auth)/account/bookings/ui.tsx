"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  CreditCard,
  Video,
  Clock,
  MapPin,
  MessageCircle,
  Search,
  XCircle,
} from "lucide-react";
import type { AccountAppointment } from "@/lib/api/account-appointments-api";
import { PortalDialog } from "@/components/PortalDialog";
import { AdminEmptyState, Btn, Pill } from "@/components/portal-atoms";
import type { PillTone } from "@/components/portal-atoms";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { RecordDetailsDrawer } from "@/components/RecordDetailsDrawer";
import { ChatThread } from "@/components/chat/ChatThread";
import { fetchPatientMessages, postPatientMessage } from "@/lib/api/chat-api";
import { ConsultationChat } from "@/components/chat/ConsultationChat";
import {
  fetchPatientChat,
  postPatientMessage as postPatientChatMessage,
  uploadPatientChatFile,
} from "@/lib/api/consultation-chat-api";
import {
  cancelAccountAppointment,
  fetchAppointmentPaymentUrl,
} from "@/lib/api/account-appointment-actions";
import { formatAppDateTime } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";
import { getJoinState } from "@/lib/join-state";

// Mirrors backend appointment-status-transitions.ts allowedTransitions —
// only these statuses can still move to CANCELLED. Keep in sync.
const CANCELLABLE_STATUSES = new Set(["REQUEST_RECEIVED", "UNDER_REVIEW", "CONTACTED"]);

type BookingsI18n = {
  bookings: {
    noBookings: string;
    noBookingsBody: string;
    bookOnline: string;
    searchLabel: string;
    searchPlaceholder: string;
    statusLabel: string;
    filterAll: string;
    filterCreated: string;
    filterSent: string;
    filterContacted: string;
    filterConcluded: string;
    filterCancelled: string;
    clearFilters: string;
    actionRequiredOne: string;
    actionRequiredMany: string;
    completePayment: string;
    noMatch: string;
    noMatchBody: string;
    paymentStartError: string;
    unavailableTitle: string;
    messageClinic: string;
    doctorChatLocked: string;
    chatWithDoctor: string;
    rescheduleAction: string;
    cancelBooking: string;
    keepBooking: string;
    cancelling: string;
    cancelConfirm: string;
    scheduledLabel: string;
    timeTbc: string;
    notesLabel: string;
    whereLabel: string;
    directionsLabel: string;
    metaOrder: string;
    metaCountry: string;
    metaDoctor: string;
    metaScheduled: string;
    metaPayment: string;
  };
  payments: {
    statusPaid: string;
    statusProcessing: string;
    statusActionRequired: string;
    statusFailed: string;
    statusRefunded: string;
    statusCanceled: string;
    statusUnpaid: string;
  };
  dashboard: {
    joinCall: string;
  };
  messages: {
    typeGeneral: string;
    typeSpecialist: string;
    typePrescription: string;
    typeHealthTest: string;
    typeHomeDelivery: string;
  };
};

const DEFAULT_BOOKINGS_I18N: BookingsI18n = {
  bookings: {
    noBookings: "No bookings yet",
    noBookingsBody: "You have not made any booking requests. Start by booking your first consultation.",
    bookOnline: "Book online",
    searchLabel: "Search",
    searchPlaceholder: "Type, doctor, order #, country, status…",
    statusLabel: "Status",
    filterAll: "All statuses",
    filterCreated: "Created",
    filterSent: "Sent",
    filterContacted: "Contacted",
    filterConcluded: "Concluded",
    filterCancelled: "Cancelled",
    clearFilters: "Clear filters",
    actionRequiredOne: "Action required — 1 booking needs payment",
    actionRequiredMany: "Action required — {count} bookings need payment",
    completePayment: "Complete payment",
    noMatch: "No bookings match",
    noMatchBody: "Try a different search term or clear the status filter.",
    paymentStartError: "Could not start payment.",
    unavailableTitle: "Bookings unavailable",
    messageClinic: "Message the clinic",
    doctorChatLocked: "Doctor chat — complete payment to unlock",
    chatWithDoctor: "Chat with your doctor",
    rescheduleAction: "Reschedule",
    cancelBooking: "Cancel booking",
    keepBooking: "Keep booking",
    cancelling: "Cancelling…",
    cancelConfirm: "Cancel your {type} booking? This can't be undone.",
    scheduledLabel: "Scheduled",
    timeTbc: "Time to be confirmed",
    notesLabel: "Notes",
    whereLabel: "Where",
    directionsLabel: "Directions",
    metaOrder: "Order",
    metaCountry: "Country",
    metaDoctor: "Doctor",
    metaScheduled: "Scheduled",
    metaPayment: "Payment",
  },
  payments: {
    statusPaid: "Paid",
    statusProcessing: "Processing",
    statusActionRequired: "Action required",
    statusFailed: "Payment failed",
    statusRefunded: "Refunded",
    statusCanceled: "Cancelled",
    statusUnpaid: "unpaid",
  },
  dashboard: { joinCall: "Join call" },
  messages: {
    typeGeneral: "GP consultation",
    typeSpecialist: "Specialist consultation",
    typePrescription: "Online prescription",
    typeHealthTest: "Health test",
    typeHomeDelivery: "Home delivery",
  },
};

type BookingsShellProps = {
  items: AccountAppointment[];
  unavailableMessage?: string | null;
  i18n?: BookingsI18n;
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: string): PillTone {
  if (status === "COMPLETED") return "active";
  if (status === "CANCELLED") return "inactive";
  if (status === "CONTACTED") return "brand";
  if (status === "UNDER_REVIEW") return "pending";
  return "neutral";
}

function paymentTone(status: string): PillTone {
  if (status === "PAID") return "active";
  if (status === "FAILED") return "inactive";
  if (status === "PROCESSING" || status === "REQUIRES_ACTION") return "pending";
  return "neutral";
}

// Map the raw consultationType ("general", "specialist", …) to a readable
// label so cards don't just say "general".
const CONSULT_LABEL_KEYS: Record<string, keyof BookingsI18n["messages"]> = {
  general: "typeGeneral",
  specialist: "typeSpecialist",
  prescription: "typePrescription",
  health_test: "typeHealthTest",
  home_delivery: "typeHomeDelivery",
};

function consultLabel(type: string, i18n: BookingsI18n): string {
  const key = CONSULT_LABEL_KEYS[type.toLowerCase().replace(/[\s-]+/g, "_")];
  return key ? i18n.messages[key] : formatStatus(type);
}

function requiresPayment(item: AccountAppointment): boolean {
  if (!item.amountCents || item.amountCents <= 0) return false;
  return item.paymentStatus !== "PAID";
}

function formatPaymentLabel(
  status: string,
  amountCents: number | null,
  currency: string | null,
  i18n: BookingsI18n,
) {
  if (!amountCents) return null;
  const price = formatPrice(amountCents, currency);
  const p = i18n.payments;
  if (status === "PAID") return `${p.statusPaid} · ${price}`;
  if (status === "PROCESSING") return `${p.statusProcessing} · ${price}`;
  if (status === "REQUIRES_ACTION") return `${p.statusActionRequired} · ${price}`;
  if (status === "FAILED") return `${p.statusFailed} · ${price}`;
  if (status === "REFUNDED") return `${p.statusRefunded} · ${price}`;
  if (status === "CANCELED") return `${p.statusCanceled} · ${price}`;
  return `${price} ${p.statusUnpaid}`;
}

export function BookingsShell({ items, unavailableMessage, i18n = DEFAULT_BOOKINGS_I18N }: BookingsShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Only one chat thread is open at a time. Keeps polling load to one
  // background fetch every 10s regardless of how many bookings the
  // patient has in their history.
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [openConsultChatId, setOpenConsultChatId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [cancelTarget, setCancelTarget] = useState<AccountAppointment | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paymentRedirectUrl, setPaymentRedirectUrl] = useState<string | null>(null);
  // ColumnPriorityTable row -> details drawer (fix 02-003). Only one booking's
  // full detail (scheduled band, where, notes, chat/reschedule/cancel) is
  // mounted at a time, same as the old per-card dialogs. Deep-linkable via
  // ?booking=<id> — initialized from the URL so a fresh load with the param
  // opens the drawer immediately.
  const [detailsId, setDetailsId] = useState<string | null>(() => searchParams.get("booking"));

  // Keep ?booking=<id> in sync with detailsId on every open/close path
  // (row click, Details button, footer Close, Escape/overlay dismiss) —
  // router.replace, no scroll, no history entry per navigation.
  function syncDetailsParam(id: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (id) next.set("booking", id);
    else next.delete("booking");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function openDetails(id: string) {
    setDetailsId(id);
    syncDetailsParam(id);
  }

  function closeDetails() {
    setDetailsId(null);
    syncDetailsParam(null);
  }

  // Navigation is a side effect, not a render/handler-body concern — run it
  // here so it fires exactly once per URL rather than inline during the
  // click handler.
  useEffect(() => {
    if (paymentRedirectUrl) {
      window.location.href = paymentRedirectUrl;
    }
  }, [paymentRedirectUrl]);

  async function onConfirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    const res = await cancelAccountAppointment(cancelTarget.id);
    setCancelling(false);
    if (res.ok) {
      setCancelTarget(null);
      router.refresh();
    } else {
      setCancelError(res.message);
    }
  }

  async function onCompletePayment(appointmentId: string) {
    setPayingId(appointmentId);
    setPayError(null);
    const res = await fetchAppointmentPaymentUrl(appointmentId);
    if (res.ok && res.data.url) {
      // payingId stays set (spinner keeps showing) through the redirect —
      // the effect above performs the actual navigation.
      setPaymentRedirectUrl(res.data.url);
    } else {
      setPayingId(null);
      setPayError(!res.ok ? res.message : i18n.bookings.paymentStartError);
    }
  }

  // Client-side filter — the account appointments fetcher has no query
  // params today, so this filters the already-fetched history in the
  // browser rather than adding a new server round-trip.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (status && item.status !== status) return false;
      if (!term) return true;
      return (
        consultLabel(item.consultationType, i18n).toLowerCase().includes(term) ||
        item.consultationType.toLowerCase().includes(term) ||
        item.countryCode.toLowerCase().includes(term) ||
        formatStatus(item.status).toLowerCase().includes(term) ||
        (item.doctorName ?? "").toLowerCase().includes(term) ||
        (item.orderNumber ?? "").toLowerCase().includes(term)
      );
    });
  }, [items, search, status]);

  const unpaidItems = useMemo(() => items.filter(requiresPayment), [items]);

  const b = i18n.bookings;
  const STATUS_FILTERS = [
    { value: "", label: b.filterAll },
    { value: "REQUEST_RECEIVED", label: b.filterCreated },
    { value: "UNDER_REVIEW", label: b.filterSent },
    { value: "CONTACTED", label: b.filterContacted },
    { value: "COMPLETED", label: b.filterConcluded },
    { value: "CANCELLED", label: b.filterCancelled },
  ];

  const detailsItem = items.find((item) => item.id === detailsId) ?? null;
  const consultChatItem = items.find((item) => item.id === openConsultChatId) ?? null;

  // Shared actions cell — rendered as the desktop table's trailing column AND
  // as the mobile PortalMobileCard's action row (ColumnPriorityTable's
  // `cardActions`), so both surfaces stay in sync from one place.
  // stopPropagation keeps these from also firing the row's onRowClick.
  function bookingActionsCell(item: AccountAppointment) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openDetails(item.id);
          }}
          className="gh-btn gh-btn-soft text-sm"
        >
          Details
        </button>
        {requiresPayment(item) ? (
          <Btn
            variant="primary"
            size="sm"
            disabled={payingId === item.id}
            loading={payingId === item.id}
            iconLeft={<CreditCard className="size-3.5" aria-hidden />}
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              void onCompletePayment(item.id);
            }}
          >
            {b.completePayment}
          </Btn>
        ) : null}
        {getJoinState(
          { status: item.status, meetingUrl: item.meetingUrl, startAt: item.scheduledAt },
          new Date(),
        ).kind === "ready" ? (
          <a
            href={item.meetingUrl!}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="gh-btn gh-btn-primary text-sm"
          >
            <Video className="size-3.5" aria-hidden />
            {i18n.dashboard.joinCall}
          </a>
        ) : null}
      </div>
    );
  }

  const bookingFields: ColumnPriorityField<AccountAppointment>[] = [
    {
      key: "type",
      label: "Type",
      priority: 1,
      cardPrimary: true,
      render: (item) => (
        <>
          <span className="block font-semibold text-[var(--portal-text)]">
            {item.orderNumber
              ? `${item.orderNumber} · ${consultLabel(item.consultationType, i18n)}`
              : consultLabel(item.consultationType, i18n)}
          </span>
          {item.doctorName ? (
            <span className="block text-xs text-[var(--portal-muted)]">{item.doctorName}</span>
          ) : null}
        </>
      ),
    },
    {
      key: "booked",
      label: "Booked",
      priority: 2,
      render: (item) => (
        <span className="text-[var(--portal-muted)]">{formatAppDateTime(item.createdAt)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      priority: 1,
      render: (item) => <Pill tone={statusTone(item.status)}>{formatStatus(item.status)}</Pill>,
    },
    {
      key: "actions",
      label: "",
      priority: 1,
      align: "right",
      desktopOnly: true,
      render: bookingActionsCell,
    },
  ];

  if (unavailableMessage) {
    return (
      <AdminEmptyState
        className="mt-6"
        tone="danger"
        icon={<ClipboardList className="size-6" aria-hidden />}
        title={b.unavailableTitle}
        description={unavailableMessage}
      />
    );
  }

  if (items.length === 0) {
    return (
      <AdminEmptyState
        className="mt-6"
        icon={<ClipboardList className="size-6" aria-hidden />}
        assetSrc="/images/portal/obsidian/empty-calendar.svg"
        title={b.noBookings}
        description={b.noBookingsBody}
        action={
          // No country/lang context in /account — go through the gate.
          <Btn href="/" variant="primary" size="sm" iconLeft={<ArrowRight className="size-3.5" aria-hidden />}>
            {b.bookOnline}
          </Btn>
        }
      />
    );
  }

  return (
    <div className="mt-6">
      <div className="gh-patient-bookings-filters mb-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[280px]">
          <span className="gh-field-label">{b.searchLabel}</span>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
              style={{ color: "var(--portal-muted)" }}
              aria-hidden
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={b.searchPlaceholder}
              className="gh-input min-w-0 pl-9"
            />
          </div>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="gh-field-label">{b.statusLabel}</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="gh-select min-w-0"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>
        {search || status ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("");
            }}
            className="text-portal-compact font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
          >
            {b.clearFilters}
          </button>
        ) : null}
      </div>

      {payError ? (
        <div
          className="mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm"
          style={{ borderColor: "var(--portal-danger)", background: "var(--portal-danger-soft)", color: "var(--portal-danger-text)" }}
          role="alert"
        >
          {payError}
        </div>
      ) : null}

      {unpaidItems.length > 0 ? (
        <div
          className="gh-patient-action-required mb-5 rounded-[var(--radius-card)] border-2 px-4 py-4"
          style={{ borderColor: "var(--portal-warning)", background: "var(--portal-warning-soft)" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="size-5 shrink-0" style={{ color: "var(--portal-warning-text)" }} aria-hidden />
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--portal-warning-text)" }}>
              {unpaidItems.length === 1 ? b.actionRequiredOne : b.actionRequiredMany.replace("{count}", String(unpaidItems.length))}
            </h2>
          </div>
          <div className="grid gap-2">
            {unpaidItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] bg-[var(--portal-surface-elevated)] px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--portal-text)" }}>
                    {consultLabel(item.consultationType, i18n)}
                  </p>
                  <p className="text-xs" style={{ color: "var(--portal-muted)" }}>
                    {formatPaymentLabel(item.paymentStatus, item.amountCents, item.currencyCode, i18n)}
                  </p>
                </div>
                <Btn
                  variant="primary"
                  size="sm"
                  disabled={payingId === item.id}
                  loading={payingId === item.id}
                  iconLeft={<CreditCard className="size-3.5" aria-hidden />}
                  onClick={() => void onCompletePayment(item.id)}
                >
                  {b.completePayment}
                </Btn>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <AdminEmptyState
          icon={<Search className="size-6" aria-hidden />}
          title={b.noMatch}
          description={b.noMatchBody}
        />
      ) : (
        <div className="gh-patient-bookings-list gh-card overflow-hidden p-0">
          <ColumnPriorityTable
            fields={bookingFields}
            rows={filtered}
            getRowKey={(item) => item.id}
            cardTone={(item) =>
              item.status === "COMPLETED" ? "success" : item.status === "CANCELLED" ? "danger" : "neutral"
            }
            onRowClick={(item) => openDetails(item.id)}
            cardActions={bookingActionsCell}
          />
        </div>
      )}

      {/* Details drawer — everything that used to render unconditionally
          inside every PortalMobileCard (scheduled band, where, notes, chat/
          reschedule/cancel actions) now mounts once for whichever booking
          was opened. Content/formatters are unchanged from the old card. */}
      <RecordDetailsDrawer
        open={detailsItem !== null}
        onOpenChange={(next) => {
          if (!next) closeDetails();
        }}
        title={
          detailsItem
            ? detailsItem.orderNumber
              ? `${detailsItem.orderNumber} · ${consultLabel(detailsItem.consultationType, i18n)}`
              : consultLabel(detailsItem.consultationType, i18n)
            : ""
        }
        summary={
          detailsItem ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <Pill tone={statusTone(detailsItem.status)}>{formatStatus(detailsItem.status)}</Pill>
              <span>Booked {formatAppDateTime(detailsItem.createdAt)}</span>
              {detailsItem.doctorName ? <span>{detailsItem.doctorName}</span> : null}
            </div>
          ) : null
        }
        footer={
          <Btn variant="ghost" onClick={() => closeDetails()}>
            Close
          </Btn>
        }
      >
        {detailsItem ? (
          <>
            {(() => {
              const item = detailsItem;
              const paymentLabel = formatPaymentLabel(item.paymentStatus, item.amountCents, item.currencyCode, i18n);
              const joinState = getJoinState(
                { status: item.status, meetingUrl: item.meetingUrl, startAt: item.scheduledAt },
                new Date(),
              );
              return (
                <>
                  <div className="gh-portal-mobile-card__meta">
                    <span className="gh-portal-mobile-card__meta-item">
                      <em>{b.metaCountry}</em>
                      <strong>{item.countryCode.toUpperCase()}</strong>
                    </span>
                    {paymentLabel ? (
                      <span className="gh-portal-mobile-card__meta-item">
                        <em>{b.metaPayment}</em>
                        <strong>
                          <Pill tone={paymentTone(item.paymentStatus)}>{paymentLabel}</Pill>
                        </strong>
                      </span>
                    ) : null}
                  </div>

                  {/* Scheduled-call band — appears only once admin sets the slot.
                      The whole row links to the Meet link if present so patients
                      can join with one click. */}
                  {item.scheduledAt || item.meetingUrl ? (
                    <div
                      className="gh-patient-booking-band mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border px-4 py-3"
                      style={{ borderColor: "var(--portal-success)", background: "var(--portal-success-soft)" }}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="size-4" style={{ color: "var(--portal-success-text)" }} aria-hidden />
                        <div>
                          <p
                            className="text-xs font-semibold uppercase tracking-wider"
                            style={{ color: "var(--portal-success-text)" }}
                          >
                            {b.scheduledLabel}
                          </p>
                          <p className="mt-0.5 text-sm font-medium" style={{ color: "var(--portal-text)" }}>
                            {item.scheduledAt
                              ? formatAppDateTime(item.scheduledAt, item.patientTimezone)
                              : b.timeTbc}
                          </p>
                        </div>
                      </div>
                      {joinState.kind === "ready" ? (
                        <a
                          href={item.meetingUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gh-btn gh-btn-primary text-sm"
                        >
                          <Video className="size-4" aria-hidden />
                          {i18n.dashboard.joinCall}
                        </a>
                      ) : item.meetingUrl ? (
                        // Mirrors EventDetailDialog's join-gating copy — link
                        // exists but isn't joinable yet (unconfirmed/too
                        // early/ended/cancelled).
                        <p className="text-xs" style={{ color: "var(--portal-muted)" }}>
                          {joinState.kind === "unconfirmed"
                            ? "This request hasn't been confirmed yet."
                            : joinState.kind === "cancelled"
                              ? "This consultation was cancelled."
                              : joinState.kind === "ended"
                                ? "This consultation has ended."
                                : joinState.kind === "too-early"
                                  ? `The join link opens at ${formatAppDateTime(joinState.opensAt.toISOString(), item.patientTimezone)}.`
                                  : null}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {/* In-person "Where" block — appears when consultationMode is
                      IN_PERSON and admin has set a Clinic or a free-text address. */}
                  {item.consultationMode === "IN_PERSON" &&
                  (item.clinicName || item.locationAddress) ? (
                    <WhereBlock
                      clinicName={item.clinicName ?? null}
                      clinicCity={item.clinicCity ?? null}
                      locationAddress={item.locationAddress ?? null}
                      i18n={b}
                    />
                  ) : null}

                  {item.notesPreview ? (
                    <div className="mt-3 rounded-[var(--radius-card-sm)] bg-[var(--portal-well)] px-3 py-2">
                      <p className="text-xs font-semibold text-[var(--portal-muted)]">{b.notesLabel}</p>
                      <p className="mt-0.5 text-sm text-[var(--portal-text-2)]">{item.notesPreview}</p>
                    </div>
                  ) : null}

                  {/* Admin chat + doctor chat — each opens in its own drawer dialog
                      rather than expanding inline. */}
                  <div className="gh-patient-booking-actions mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        // Close the details drawer first — Radix's modal focus
                        // trap on the still-open AppSheet blocks pointer events
                        // reaching a second body-level PortalDialog otherwise.
                        closeDetails();
                        setOpenConsultChatId(null);
                        setOpenChatId(item.id);
                      }}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--portal-line)] px-3 py-2 text-sm font-semibold text-[var(--portal-primary)] hover:bg-[var(--portal-well)] sm:w-auto"
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      {b.messageClinic}
                    </button>

                    {requiresPayment(item) ? (
                      <span
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium sm:w-auto"
                        style={{
                          borderColor: "var(--portal-warning)",
                          background: "var(--portal-warning-soft)",
                          color: "var(--portal-warning-text)",
                        }}
                        title={b.doctorChatLocked}
                      >
                        <MessageCircle className="size-4" aria-hidden />
                        {b.doctorChatLocked}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          closeDetails();
                          setOpenChatId(null);
                          setOpenConsultChatId(item.id);
                        }}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--portal-line)] px-3 py-2 text-sm font-semibold text-[var(--portal-primary)] hover:bg-[var(--portal-well)] sm:w-auto"
                      >
                        <MessageCircle className="size-4" aria-hidden />
                        {b.chatWithDoctor}
                      </button>
                    )}

                    {CANCELLABLE_STATUSES.has(item.status) ? (
                      <>
                        <a
                          href={`/account/bookings/${item.id}/reschedule`}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--portal-line)] px-3 py-2 text-sm font-semibold text-[var(--portal-text)] hover:bg-[var(--portal-well)] sm:w-auto"
                        >
                          <Clock className="size-4" aria-hidden />
                          {b.rescheduleAction}
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            closeDetails();
                            setCancelError(null);
                            setCancelTarget(item);
                          }}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold sm:w-auto"
                          style={{ borderColor: "var(--portal-danger)", color: "var(--portal-danger-text)" }}
                        >
                          <XCircle className="size-4" aria-hidden />
                          {b.cancelBooking}
                        </button>
                      </>
                    ) : null}
                  </div>
                </>
              );
            })()}
          </>
        ) : null}
      </RecordDetailsDrawer>

      {/* Chat dialogs live outside the details drawer (not nested inside its
          conditional content) — the "Message clinic"/"Chat with doctor"
          buttons above close the drawer before opening these, and a still-
          mounted AppSheet's Radix focus trap blocks pointer events reaching
          a second body-level PortalDialog, so the drawer must actually be
          gone from the DOM by the time these open. Keyed off item id, same
          as before the ColumnPriorityTable migration. */}
      {openChatId ? (
        <PortalDialog
          open={openChatId !== null}
          onClose={() => setOpenChatId(null)}
          title={b.messageClinic}
          width="sm"
          noBodyPadding
        >
          <ChatThread
            appointmentId={openChatId}
            viewerRole="PATIENT"
            fetcher={fetchPatientMessages}
            poster={postPatientMessage}
            variant="embedded"
          />
        </PortalDialog>
      ) : null}

      {openConsultChatId && consultChatItem && !requiresPayment(consultChatItem) ? (
        <PortalDialog
          open={openConsultChatId !== null}
          onClose={() => setOpenConsultChatId(null)}
          title={b.chatWithDoctor}
          width="sm"
          noBodyPadding
        >
          <ConsultationChat
            appointmentId={openConsultChatId}
            viewerRole="PATIENT"
            fetcher={fetchPatientChat}
            poster={postPatientChatMessage}
            fileUploader={uploadPatientChatFile}
            variant="embedded"
          />
        </PortalDialog>
      ) : null}

      <PortalDialog
        open={cancelTarget !== null}
        onClose={() => (cancelling ? null : setCancelTarget(null))}
        title={b.cancelBooking}
        danger
        footer={
          <>
            <Btn variant="ghost" onClick={() => setCancelTarget(null)} disabled={cancelling}>
              {b.keepBooking}
            </Btn>
            <Btn variant="danger" onClick={() => void onConfirmCancel()} disabled={cancelling} loading={cancelling}>
              {cancelling ? b.cancelling : b.cancelBooking}
            </Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
          {cancelTarget ? b.cancelConfirm.replace("{type}", consultLabel(cancelTarget.consultationType, i18n)) : ""}
        </p>
        {cancelError ? (
          <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800" role="alert">
            {cancelError}
          </p>
        ) : null}
      </PortalDialog>
    </div>
  );
}

function WhereBlock({
  clinicName,
  clinicCity,
  locationAddress,
  i18n,
}: {
  clinicName: string | null;
  clinicCity: string | null;
  locationAddress: string | null;
  i18n: BookingsI18n["bookings"];
}) {
  const primary = clinicName ?? locationAddress ?? "";
  const secondary = clinicName && clinicCity ? clinicCity : null;
  // Build a Maps link from whichever address parts we have. Patient
  // gets a one-tap directions launcher.
  const query = clinicName
    ? [clinicName, clinicCity].filter(Boolean).join(", ")
    : (locationAddress ?? "");
  const mapsHref = query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
  return (
    <div
      className="gh-patient-booking-band mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border px-4 py-3"
      style={{ borderColor: "var(--portal-info)", background: "var(--portal-info-soft)" }}
    >
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 size-4" style={{ color: "var(--portal-info-text)" }} aria-hidden />
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--portal-info-text)" }}
          >
            {i18n.whereLabel}
          </p>
          <p className="mt-0.5 text-sm font-medium" style={{ color: "var(--portal-text)" }}>{primary}</p>
          {secondary ? (
            <p className="text-xs" style={{ color: "var(--portal-text-2)" }}>{secondary}</p>
          ) : null}
        </div>
      </div>
      {mapsHref ? (
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
          style={{ color: "var(--portal-info-text)" }}
        >
          {i18n.directionsLabel} <ArrowRight className="size-3.5" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}
