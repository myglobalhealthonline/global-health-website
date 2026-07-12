"use client";

import Link from "next/link";
import { Video } from "lucide-react";
import { formatAppDateTime } from "@/lib/format-datetime";
import type { CalendarItem } from "./calendar-types";
import {
  RecordDetailsDrawer,
  RecordDetailsSection,
  RecordDetailsField,
} from "@/components/RecordDetailsDrawer";

type Props = {
  item: CalendarItem | null;
  /** Timezone the times are rendered in (viewer's zone). */
  tz: string;
  onClose: () => void;
  /** Optional URL binding — pass e.g. "event" to sync `?event=<id>` (admin calendar only). */
  paramKey?: string;
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

// ponytail: role-agnostic join gating — same statuses cover patient
// consultations (REQUEST_RECEIVED/UNDER_REVIEW/CONTACTED/COMPLETED/CANCELLED)
// and admin/doctor slot items (OPEN/HELD/BOOKED/BLOCKED); both mean
// "confirmed" / "cancelled-or-unavailable" in their own vocabulary.
const CONFIRMED_STATUSES = new Set(["CONTACTED", "BOOKED"]);
const ENDED_STATUSES = new Set(["COMPLETED"]);
const CANCELLED_STATUSES = new Set(["CANCELLED", "BLOCKED"]);
const JOIN_WINDOW_BEFORE_MS = 15 * 60 * 1000;
/** Fallback call length when the item carries no `endAt` (consultations don't). */
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

type JoinState =
  | { kind: "ready" }
  | { kind: "no-link" }
  | { kind: "unconfirmed" }
  | { kind: "cancelled" }
  | { kind: "ended" }
  | { kind: "too-early"; opensAt: Date };

function getJoinState(item: CalendarItem, now: Date): JoinState {
  if (!item.meta?.meetingUrl) return { kind: "no-link" };
  if (CANCELLED_STATUSES.has(item.status)) return { kind: "cancelled" };
  if (ENDED_STATUSES.has(item.status)) return { kind: "ended" };
  if (!CONFIRMED_STATUSES.has(item.status)) return { kind: "unconfirmed" };

  const start = new Date(item.startAt);
  const end = item.endAt ? new Date(item.endAt) : new Date(start.getTime() + DEFAULT_DURATION_MS);
  const opensAt = new Date(start.getTime() - JOIN_WINDOW_BEFORE_MS);
  if (now < opensAt) return { kind: "too-early", opensAt };
  if (now > end) return { kind: "ended" };
  return { kind: "ready" };
}

export function EventDetailDialog({ item, tz, onClose, paramKey }: Props) {
  const meetingUrl = item?.meta?.meetingUrl ?? null;
  const joinState = item ? getJoinState(item, new Date()) : null;

  return (
    <RecordDetailsDrawer
      open={item !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      paramKey={paramKey}
      paramValue={item?.id}
      size="sm"
      title={item?.title ?? ""}
      eyebrow={item?.meta?.consultationType ?? "Consultation"}
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
            {item.meta?.doctorName ? (
              <span style={{ color: "var(--portal-muted)" }}>· {item.meta.doctorName}</span>
            ) : null}
          </div>
        ) : null
      }
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button type="button" className="gh-btn gh-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      {item ? (
        <>
          <RecordDetailsSection title="Appointment">
            <RecordDetailsField
              label="Type"
              value={item.meta?.consultationType ?? undefined}
            />
            <RecordDetailsField label="Doctor" value={item.meta?.doctorName ?? undefined} />
            <RecordDetailsField label="Patient" value={item.meta?.patientName ?? undefined} />
            <RecordDetailsField
              label="Country"
              value={item.meta?.countryCode?.toUpperCase()}
            />
            {item.meta?.orderId ? (
              <RecordDetailsField
                label="Order"
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

          <RecordDetailsSection title="Timing">
            <RecordDetailsField label="Start" value={formatAppDateTime(item.startAt, tz)} />
            <RecordDetailsField
              label="End"
              value={item.endAt ? formatAppDateTime(item.endAt, tz) : undefined}
            />
            <RecordDetailsField label="Timezone" value={tz} />
          </RecordDetailsSection>

          <RecordDetailsSection title="Links">
            {joinState?.kind === "ready" && meetingUrl ? (
              <a
                href={meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="gh-btn gh-btn-primary flex w-full items-center justify-center gap-2"
                style={{ minHeight: 44 }}
              >
                <Video className="size-4" aria-hidden />
                Join video call
              </a>
            ) : (
              <p className="text-xs" style={{ color: "var(--portal-muted)" }}>
                {joinState?.kind === "unconfirmed"
                  ? "This request hasn't been confirmed yet."
                  : joinState?.kind === "cancelled"
                    ? "This consultation was cancelled."
                    : joinState?.kind === "ended"
                      ? "This consultation has ended."
                      : joinState?.kind === "too-early"
                        ? `The join link opens at ${formatAppDateTime(joinState.opensAt.toISOString(), tz)}.`
                        : "Join link will appear here once the call is scheduled."}
              </p>
            )}
          </RecordDetailsSection>
        </>
      ) : null}
    </RecordDetailsDrawer>
  );
}
