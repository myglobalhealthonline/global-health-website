"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Video } from "lucide-react";
import { formatAppDateTime } from "@/lib/format-datetime";
import type { CalendarItem } from "./calendar-types";
import { PortalDialog } from "@/components/PortalDialog";

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
  const meetingUrl = item?.meta?.meetingUrl ?? null;

  return (
    <PortalDialog open={item !== null} onClose={onClose} title={item?.title ?? ""} width="sm">
      {item ? (
        <>
          <p className="gh-eyebrow mb-3">{item.meta?.consultationType ?? "Consultation"}</p>

          <dl
            className="grid gap-3 rounded-[var(--portal-radius)] p-3 text-sm"
            style={{ border: "1px solid var(--portal-line)", background: "var(--portal-well)" }}
          >
            <Row label="When">{formatAppDateTime(item.startAt, tz)}</Row>
            {item.meta?.doctorName ? <Row label="Doctor">{item.meta.doctorName}</Row> : null}
            {item.meta?.patientName ? <Row label="Patient">{item.meta.patientName}</Row> : null}
            {item.meta?.countryCode ? (
              <Row label="Country">{item.meta.countryCode.toUpperCase()}</Row>
            ) : null}
            {item.meta?.orderId ? (
              <Row label="Order">
                <Link
                  href={`/admin/orders/${item.meta.orderId}`}
                  className="font-semibold underline decoration-dotted underline-offset-2"
                  style={{ color: "var(--portal-accent, #1B4D3E)" }}
                >
                  {item.meta.orderNumber
                    ? `#${item.meta.orderNumber}`
                    : `#${item.meta.orderId.slice(-8).toUpperCase()}`}
                </Link>
              </Row>
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
              className="gh-btn gh-btn-primary mt-5 flex w-full items-center justify-center gap-2"
              style={{ minHeight: 44 }}
            >
              <Video className="size-4" aria-hidden />
              Join video call
            </a>
          ) : (
            <p
              className="mt-5 rounded-[var(--portal-radius-sm)] px-3 py-2.5 text-center text-xs"
              style={{ background: "var(--portal-well)", color: "var(--portal-muted)" }}
            >
              Join link will appear here once the call is scheduled.
            </p>
          )}
        </>
      ) : null}
    </PortalDialog>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[110px_1fr] sm:items-center">
      <dt className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--portal-muted)" }}>
        {label}
      </dt>
      <dd className="font-medium sm:text-right" style={{ color: "var(--portal-text)" }}>
        {children}
      </dd>
    </div>
  );
}
