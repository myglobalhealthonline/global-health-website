"use client";

import Link from "next/link";
import { Video } from "lucide-react";
import { formatAppDateTime, formatAppTime } from "@/lib/format-datetime";
import type { CalendarItem } from "./calendar-types";
import {
  RecordDetailsDrawer,
  RecordDetailsSection,
  RecordDetailsField,
} from "@/components/RecordDetailsDrawer";
import { getJoinState } from "@/lib/join-state";

/** Copy overrides for patient/doctor portals (i18n). Admin omits this and
 *  gets the English defaults — admin is English-by-design. */
type EventDetailLabels = {
  consultation?: string;
  close?: string;
  appointment?: string;
  type?: string;
  doctor?: string;
  patient?: string;
  country?: string;
  order?: string;
  timing?: string;
  start?: string;
  end?: string;
  timezone?: string;
  links?: string;
  joinVideoCall?: string;
  unconfirmed?: string;
  cancelled?: string;
  ended?: string;
  /** `{time}` template for the too-early state. */
  opensAt?: string;
  joinPending?: string;
};

type Props = {
  item: CalendarItem | null;
  /** Timezone the times are rendered in (viewer's zone). */
  tz: string;
  onClose: () => void;
  /** Optional URL binding — pass e.g. "event" to sync `?event=<id>` (admin calendar only). */
  paramKey?: string;
  /** Viewer context. "patient" avoids repeating the doctor's name in the
   *  title/subtitle (it already appears once in the Doctor row) and hides
   *  the self-referential Patient row. Omit for doctor/admin — unchanged
   *  default behavior. */
  viewerRole?: "patient" | "doctor" | "admin";
  labels?: EventDetailLabels;
};

function statusBadgeClass(status: string): string {
  if (status === "COMPLETED" || status === "PAID") return "gh-badge-success";
  if (status === "CANCELLED" || status === "FAILED") return "gh-badge-error";
  if (status === "CONTACTED" || status === "BOOKED") return "gh-badge-info";
  if (status === "UNDER_REVIEW") return "gh-badge-warning";
  return "gh-badge-neutral";
}

function humanize(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/** IANA id → readable label, e.g. "Asia/Karachi" → "Karachi (GMT+05:00)". */
function humanTimezone(tz: string): string {
  try {
    const offset = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      timeZoneName: "longOffset",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    const city = tz.includes("/") ? tz.slice(tz.lastIndexOf("/") + 1).replace(/_/g, " ") : tz;
    return offset ? `${city} (${offset})` : city;
  } catch {
    return tz;
  }
}

export function EventDetailDialog({ item, tz, onClose, paramKey, viewerRole, labels }: Props) {
  const isPatientView = viewerRole === "patient";
  const isDoctorView = viewerRole === "doctor";
  const t: Required<EventDetailLabels> = {
    consultation: labels?.consultation ?? "Consultation",
    close: labels?.close ?? "Close",
    appointment: labels?.appointment ?? "Appointment",
    type: labels?.type ?? "Type",
    doctor: labels?.doctor ?? "Doctor",
    patient: labels?.patient ?? "Patient",
    country: labels?.country ?? "Country",
    order: labels?.order ?? "Order",
    timing: labels?.timing ?? "Timing",
    start: labels?.start ?? "Start",
    end: labels?.end ?? "End",
    timezone: labels?.timezone ?? "Timezone",
    links: labels?.links ?? "Links",
    joinVideoCall: labels?.joinVideoCall ?? "Join video call",
    unconfirmed: labels?.unconfirmed ?? "This request hasn't been confirmed yet.",
    cancelled: labels?.cancelled ?? "This consultation was cancelled.",
    ended: labels?.ended ?? "This consultation has ended.",
    opensAt: labels?.opensAt ?? "The join link opens at {time}.",
    joinPending: labels?.joinPending ?? "Join link will appear here once the call is scheduled.",
  };
  const meetingUrl = item?.meta?.meetingUrl ?? null;
  const joinState = item
    ? getJoinState(
        { status: item.status, meetingUrl, startAt: item.startAt, endAt: item.endAt },
        new Date(),
      )
    : null;
  const dialogTitle = item
    ? isPatientView
      ? `${item.meta?.consultationType ?? t.consultation} · ${formatAppTime(item.startAt, tz)}`
      : item.title
    : "";

  return (
    <RecordDetailsDrawer
      open={item !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      paramKey={paramKey}
      paramValue={item?.id}
      size="sm"
      title={dialogTitle}
      eyebrow={item?.meta?.consultationType ?? t.consultation}
      summary={
        item ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`gh-badge ${statusBadgeClass(item.status)}`}>
              {humanize(item.status)}
            </span>
            <span style={{ color: "var(--portal-muted)" }}>
              {formatAppDateTime(item.startAt, tz)}
              {item.endAt ? ` – ${formatAppDateTime(item.endAt, tz)}` : ""}
            </span>
            {!isPatientView && item.meta?.doctorName ? (
              <span style={{ color: "var(--portal-muted)" }}>· {item.meta.doctorName}</span>
            ) : null}
          </div>
        ) : null
      }
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button type="button" className="gh-btn gh-btn-ghost" onClick={onClose}>
            {t.close}
          </button>
        </div>
      }
    >
      {item ? (
        <>
          <RecordDetailsSection title={t.appointment}>
            <RecordDetailsField
              label={t.type}
              value={item.meta?.consultationType ?? undefined}
            />
            {isDoctorView ? null : (
              <RecordDetailsField label={t.doctor} value={item.meta?.doctorName ?? undefined} />
            )}
            {isPatientView && !item.meta?.patientName ? null : (
              <RecordDetailsField label={t.patient} value={item.meta?.patientName ?? undefined} />
            )}
            <RecordDetailsField
              label={t.country}
              value={item.meta?.countryCode?.toUpperCase()}
            />
            {item.meta?.orderId ? (
              <RecordDetailsField
                label={t.order}
                value={
                  <Link
                    href={`/admin/orders/${item.meta.orderId}`}
                    className="font-semibold underline decoration-dotted underline-offset-2"
                    style={{ color: "var(--portal-accent, #1B4D3E)" }}
                  >
                    {item.meta.orderNumber
                      ? `#${item.meta.orderNumber}`
                      : `#${item.meta.orderId.slice(-8).toUpperCase()}`}
                  </Link>
                }
              />
            ) : null}
          </RecordDetailsSection>

          <RecordDetailsSection title={t.timing}>
            <RecordDetailsField label={t.start} value={formatAppDateTime(item.startAt, tz)} />
            {item.endAt ? (
              <RecordDetailsField label={t.end} value={formatAppDateTime(item.endAt, tz)} />
            ) : null}
            <RecordDetailsField label={t.timezone} value={humanTimezone(tz)} />
          </RecordDetailsSection>

          <RecordDetailsSection title={t.links}>
            {joinState?.kind === "ready" && meetingUrl ? (
              <a
                href={meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="gh-btn gh-btn-primary flex w-full items-center justify-center gap-2"
                style={{ minHeight: 44 }}
              >
                <Video className="size-4" aria-hidden />
                {t.joinVideoCall}
              </a>
            ) : (
              <p className="text-xs" style={{ color: "var(--portal-muted)" }}>
                {joinState?.kind === "unconfirmed"
                  ? t.unconfirmed
                  : joinState?.kind === "cancelled"
                    ? t.cancelled
                    : joinState?.kind === "ended"
                      ? t.ended
                      : joinState?.kind === "too-early"
                        ? t.opensAt.replace(
                            "{time}",
                            formatAppDateTime(joinState.opensAt.toISOString(), tz),
                          )
                        : t.joinPending}
              </p>
            )}
          </RecordDetailsSection>
        </>
      ) : null}
    </RecordDetailsDrawer>
  );
}
