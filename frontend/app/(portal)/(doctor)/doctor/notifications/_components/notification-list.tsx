"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck } from "lucide-react";
import { formatAppDateTime } from "@/lib/format-datetime";
import { AdminEmptyState, AdminSummaryStrip } from "@/components/portal-atoms";
import { useNotificationCenter } from "@/components/portal-shell";

type NotificationItem = {
  id: string;
  type: string;
  label: string;
  appointmentId?: string;
  snippet?: string;
  byUserName?: string;
  byRole?: "DOCTOR" | "ADMIN";
  readAt: string | null;
  createdAt: string;
};

// Type-only import (erased at build time) — no runtime locale-loading code
// ships to the client bundle; the component only receives plain strings via props.
// ponytail: cs/de/ro doctor.json are partial locale stubs (missing many keys), so the
// exact per-locale union type doesn't structurally match; loosen to Record<string, string>.
type NotificationsPageStrings = { [key: string]: string };

export function NotificationListClient({
  initial,
  strings,
}: {
  initial: NotificationItem[];
  strings: NotificationsPageStrings;
}) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>(initial);
  const [pending, startTransition] = useTransition();
  const { setUnreadCount } = useNotificationCenter();

  function markOne(id: string) {
    const wasUnread = items.some((n) => n.id === id && !n.readAt);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    // Optimistic — updates the bell/sidebar badge in the same tick instead
    // of waiting on router.refresh() to re-run the shell layout's own fetch.
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    startTransition(async () => {
      await fetch(`/api/doctor/notifications/${id}/read`, { method: "PATCH" });
      router.refresh();
    });
  }

  function markAll() {
    setItems((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
    setUnreadCount(0);
    startTransition(async () => {
      await fetch("/api/doctor/notifications/read-all", { method: "POST" });
      router.refresh();
    });
  }

  // Derived from `items` (not a server-computed prop) so it stays correct
  // through optimistic mark-read/mark-all clicks without depending on
  // router.refresh() re-running the page's own data fetch (11-001).
  const unreadCount = items.filter((n) => !n.readAt).length;
  const summaryStrip = (
    <AdminSummaryStrip
      className="mb-4"
      items={[
        {
          label: strings.unread,
          value: unreadCount,
          hint: strings.needsReview,
          tone: unreadCount > 0 ? "warning" : "neutral",
        },
        {
          label: strings.total,
          value: items.length,
          hint: strings.recentHint,
          tone: "brand",
        },
      ]}
    />
  );

  if (items.length === 0) {
    return (
      <>
        {summaryStrip}
        <AdminEmptyState
          className="gh-doctor-empty-state"
          icon={<Bell className="size-5" aria-hidden />}
          assetSrc="/images/portal/obsidian/empty-notifications.svg"
          title={strings.emptyTitle}
          description={strings.emptyDesc}
        />
      </>
    );
  }

  return (
    <>
    {summaryStrip}
    <div className="gh-card gh-doctor-notification-list overflow-hidden p-0">
      <div className="gh-doctor-list-toolbar flex items-center justify-between border-b border-[var(--portal-line)] px-4 py-3">
        <p className="text-portal-meta text-[var(--portal-muted)]">
          {strings.newestFirst}
        </p>
        <button
          type="button"
          onClick={markAll}
          disabled={pending}
          className="inline-flex items-center gap-1 text-portal-meta font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
        >
          <CheckCheck className="size-3.5" /> {strings.markAllRead}
        </button>
      </div>
      <ul className="divide-y divide-[var(--portal-line)]">
        {items.map((n) => {
          const unread = !n.readAt;
          return (
            <li
              key={n.id}
              className={`gh-doctor-notification-row flex items-start gap-3 px-4 py-3 ${unread ? "bg-[var(--portal-primary)]/5" : ""}`}
            >
              <span
                className="mt-1 inline-block size-2 shrink-0 rounded-full"
                style={{
                  background: unread
                    ? "var(--portal-primary)"
                    : "transparent",
                }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="gh-doctor-notification-title flex items-baseline justify-between gap-2">
                  <p className="text-portal-compact font-semibold text-[var(--portal-text)]">
                    {n.label}
                    {n.byUserName ? (
                      <span className="font-normal text-[var(--portal-muted)]">
                        {" "}
                        · {n.byUserName}
                      </span>
                    ) : null}
                  </p>
                  <time className="text-portal-thead text-[var(--portal-muted)]">
                    {formatAppDateTime(n.createdAt)}
                  </time>
                </div>
                {n.snippet ? (
                  <p className="mt-1 line-clamp-2 text-portal-compact text-[var(--portal-muted)]">
                    {n.snippet}
                  </p>
                ) : null}
                {n.appointmentId ? (
                  <Link
                    href={`/doctor/appointments/${n.appointmentId}`}
                    className="mt-1 inline-block text-portal-meta font-semibold text-[var(--portal-primary)] hover:underline"
                  >
                    {strings.openAppointment}
                  </Link>
                ) : null}
              </div>
              {unread ? (
                <button
                  type="button"
                  onClick={() => markOne(n.id)}
                  disabled={pending}
                  className="inline-flex items-center gap-1 text-portal-meta font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
                  aria-label={strings.markAsRead}
                >
                  <Check className="size-3.5" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
    </>
  );
}
