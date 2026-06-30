"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Video, X } from "lucide-react";
import { formatAppDateTime } from "@/lib/format-datetime";
import type { CalendarItem } from "./calendar-types";

type Props = {
  item: CalendarItem | null;
  /** Timezone the times are rendered in (viewer's zone). */
  tz: string;
  onClose: () => void;
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

export function EventDetailDialog({ item, tz, onClose }: Props) {
  useEffect(() => {
    if (!item) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  if (!item || typeof document === "undefined") return null;

  const meetingUrl = item.meta?.meetingUrl ?? null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="gh-calendar-dialog w-full max-w-md rounded-t-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-background-page)] p-5 shadow-[var(--shadow-elevated)] sm:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
              {item.meta?.consultationType ?? "Consultation"}
            </p>
            <h2 className="mt-0.5 truncate text-lg font-bold text-[var(--color-text-primary)]">
              {item.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-background-soft)]"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <dl className="mt-4 grid gap-3 text-sm">
          <Row label="When">
            {formatAppDateTime(item.startAt, tz)}
          </Row>
          {item.meta?.doctorName ? (
            <Row label="Doctor">{item.meta.doctorName}</Row>
          ) : null}
          {item.meta?.patientName ? (
            <Row label="Patient">{item.meta.patientName}</Row>
          ) : null}
          {item.meta?.countryCode ? (
            <Row label="Country">{item.meta.countryCode.toUpperCase()}</Row>
          ) : null}
          <Row label="Status">
            <span className={`gh-badge ${statusBadgeClass(item.status)}`}>
              {humanize(item.status)}
            </span>
          </Row>
        </dl>

        {meetingUrl ? (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[999px] bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            <Video className="size-4" aria-hidden />
            Join video call
          </a>
        ) : (
          <p className="mt-5 rounded-[var(--radius-card-sm)] bg-[var(--color-background-soft)] px-3 py-2.5 text-center text-xs text-[var(--color-text-muted)]">
            Join link will appear here once the call is scheduled.
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="text-right font-medium text-[var(--color-text-primary)]">
        {children}
      </dd>
    </div>
  );
}
