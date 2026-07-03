"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ClipboardList, CreditCard, Video, Clock, MapPin, MessageCircle, Search } from "lucide-react";
import type { AccountAppointment } from "@/lib/api/account-appointments-api";
import { PortalDialog } from "@/components/PortalDialog";
import { PortalMobileCard } from "@/components/PortalMobileCard";
import { AdminEmptyState, Btn, Pill } from "@/components/portal-atoms";
import type { PillTone } from "@/components/portal-atoms";
import { ChatThread } from "@/components/chat/ChatThread";
import { fetchPatientMessages, postPatientMessage } from "@/lib/api/chat-api";
import { ConsultationChat } from "@/components/chat/ConsultationChat";
import {
  fetchPatientChat,
  postPatientMessage as postPatientChatMessage,
  uploadPatientChatFile,
} from "@/lib/api/consultation-chat-api";
import { formatAppDateTime } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";

type BookingsI18n = {
  bookings: {
    noBookings: string;
    noBookingsBody: string;
    bookOnline: string;
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
};

type BookingsShellProps = {
  items: AccountAppointment[];
  unavailableMessage?: string | null;
  i18n?: BookingsI18n;
};

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "REQUEST_RECEIVED", label: "Created" },
  { value: "UNDER_REVIEW", label: "Sent" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "COMPLETED", label: "Concluded" },
  { value: "CANCELLED", label: "Cancelled" },
];

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

function requiresPayment(item: AccountAppointment): boolean {
  if (!item.amountCents || item.amountCents <= 0) return false;
  return item.paymentStatus !== "PAID";
}

function formatPaymentLabel(
  status: string,
  amountCents: number | null,
  currency: string | null,
  i18n?: BookingsI18n,
) {
  if (!amountCents) return null;
  const price = formatPrice(amountCents, currency);
  const p = i18n?.payments;
  if (status === "PAID") return `${p?.statusPaid ?? "Paid"} · ${price}`;
  if (status === "PROCESSING") return `${p?.statusProcessing ?? "Processing"} · ${price}`;
  if (status === "REQUIRES_ACTION") return `${p?.statusActionRequired ?? "Awaiting payment"} · ${price}`;
  if (status === "FAILED") return `${p?.statusFailed ?? "Payment failed"} · ${price}`;
  if (status === "REFUNDED") return `${p?.statusRefunded ?? "Refunded"} · ${price}`;
  if (status === "CANCELED") return `${p?.statusCanceled ?? "Cancelled"} · ${price}`;
  return `${price} ${p?.statusUnpaid ?? "unpaid"}`;
}

export function BookingsShell({ items, unavailableMessage, i18n }: BookingsShellProps) {
  // Only one chat thread is open at a time. Keeps polling load to one
  // background fetch every 10s regardless of how many bookings the
  // patient has in their history.
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [openConsultChatId, setOpenConsultChatId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  // Client-side filter — the account appointments fetcher has no query
  // params today, so this filters the already-fetched history in the
  // browser rather than adding a new server round-trip.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (status && item.status !== status) return false;
      if (!term) return true;
      return (
        item.consultationType.toLowerCase().includes(term) ||
        item.countryCode.toLowerCase().includes(term) ||
        formatStatus(item.status).toLowerCase().includes(term)
      );
    });
  }, [items, search, status]);

  if (unavailableMessage) {
    return (
      <AdminEmptyState
        className="mt-6"
        tone="danger"
        icon={<ClipboardList className="size-6" aria-hidden />}
        title="Bookings unavailable"
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
        title={i18n?.bookings.noBookings ?? "No bookings yet"}
        description={
          i18n?.bookings.noBookingsBody ??
          "You have not made any booking requests. Start by booking your first consultation."
        }
        action={
          // No country/lang context in /account — go through the gate.
          <Btn href="/" variant="primary" size="sm" iconLeft={<ArrowRight className="size-3.5" aria-hidden />}>
            {i18n?.bookings.bookOnline ?? "Book online"}
          </Btn>
        }
      />
    );
  }

  return (
    <div className="mt-6">
      <div className="gh-patient-bookings-filters mb-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[280px]">
          <span className="gh-field-label">Search</span>
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
              placeholder="Consultation type, country, status…"
              className="gh-input min-w-0 pl-9"
            />
          </div>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="gh-field-label">Status</span>
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
            className="text-[13px] font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <AdminEmptyState
          icon={<Search className="size-6" aria-hidden />}
          title="No bookings match"
          description="Try a different search term or clear the status filter."
        />
      ) : (
        <div className="gh-patient-bookings-list grid gap-4">
          {filtered.map((item) => {
            const paymentLabel = formatPaymentLabel(item.paymentStatus, item.amountCents, item.currencyCode, i18n);
            return (
              <PortalMobileCard
                key={item.id}
                tone={item.status === "COMPLETED" ? "success" : item.status === "CANCELLED" ? "danger" : "neutral"}
                title={item.consultationType}
                subtitle={formatAppDateTime(item.createdAt)}
                statusPill={<Pill tone={statusTone(item.status)}>{formatStatus(item.status)}</Pill>}
                meta={[
                  { label: "Country", value: item.countryCode.toUpperCase() },
                  ...(paymentLabel
                    ? [{ label: "Payment", value: <Pill tone={paymentTone(item.paymentStatus)}>{paymentLabel}</Pill> }]
                    : []),
                ]}
              >
                {requiresPayment(item) ? (
                  <div
                    className="mt-3 flex items-start gap-2 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm"
                    style={{
                      borderColor: "var(--portal-warning)",
                      background: "var(--portal-warning-soft)",
                      color: "var(--portal-warning-text)",
                    }}
                  >
                    <CreditCard className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <div>
                      <p className="font-semibold">Payment needed</p>
                      <p className="text-xs">Complete payment to unlock doctor chat and keep the appointment moving.</p>
                    </div>
                  </div>
                ) : null}

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
                          Scheduled
                        </p>
                        <p className="mt-0.5 text-sm font-medium" style={{ color: "var(--portal-text)" }}>
                          {item.scheduledAt
                            ? formatAppDateTime(item.scheduledAt, item.patientTimezone)
                            : "Time to be confirmed"}
                        </p>
                      </div>
                    </div>
                    {item.meetingUrl ? (
                      <a
                        href={item.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gh-btn gh-btn-primary text-sm"
                      >
                        <Video className="size-4" aria-hidden />
                        Join call
                      </a>
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
                  />
                ) : null}

                {item.notesPreview ? (
                  <div className="mt-3 rounded-[var(--radius-card-sm)] bg-[var(--portal-well)] px-3 py-2">
                    <p className="text-xs font-semibold text-[var(--portal-muted)]">Notes</p>
                    <p className="mt-0.5 text-sm text-[var(--portal-text-2)]">{item.notesPreview}</p>
                  </div>
                ) : null}

                {/* Admin chat + doctor chat — each opens in its own drawer dialog
                    rather than expanding inline, so a long booking list doesn't
                    get pushed around by an open thread. */}
                <div className="gh-patient-booking-actions mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenConsultChatId(null);
                      setOpenChatId(item.id);
                    }}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--portal-line)] px-3 py-2 text-sm font-semibold text-[var(--portal-primary)] hover:bg-[var(--portal-well)] sm:w-auto"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    Message the clinic
                  </button>

                  {requiresPayment(item) ? (
                    <span
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium sm:w-auto"
                      style={{
                        borderColor: "var(--portal-warning)",
                        background: "var(--portal-warning-soft)",
                        color: "var(--portal-warning-text)",
                      }}
                      title="Complete payment to unlock chat with your doctor"
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      Doctor chat — complete payment to unlock
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenChatId(null);
                        setOpenConsultChatId(item.id);
                      }}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--portal-line)] px-3 py-2 text-sm font-semibold text-[var(--portal-primary)] hover:bg-[var(--portal-well)] sm:w-auto"
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      Chat with your doctor
                    </button>
                  )}
                </div>

                <PortalDialog
                  open={openChatId === item.id}
                  onClose={() => setOpenChatId(null)}
                  title="Message the clinic"
                  width="sm"
                  noBodyPadding
                >
                  <ChatThread
                    appointmentId={item.id}
                    viewerRole="PATIENT"
                    fetcher={fetchPatientMessages}
                    poster={postPatientMessage}
                    variant="embedded"
                  />
                </PortalDialog>

                <PortalDialog
                  open={openConsultChatId === item.id && !requiresPayment(item)}
                  onClose={() => setOpenConsultChatId(null)}
                  title="Chat with your doctor"
                  width="sm"
                  noBodyPadding
                >
                  <ConsultationChat
                    appointmentId={item.id}
                    viewerRole="PATIENT"
                    fetcher={fetchPatientChat}
                    poster={postPatientChatMessage}
                    fileUploader={uploadPatientChatFile}
                    variant="embedded"
                  />
                </PortalDialog>
              </PortalMobileCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WhereBlock({
  clinicName,
  clinicCity,
  locationAddress,
}: {
  clinicName: string | null;
  clinicCity: string | null;
  locationAddress: string | null;
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
            Where
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
          Directions <ArrowRight className="size-3.5" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}
