"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import {
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/lib/api/me-subscription";
import { formatAppDate } from "@/lib/format-datetime";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatAppDate(iso);
}

/**
 * Patient notification centre list (§30). Marks an item read on click/open and
 * supports "mark all read". Optimistic — the row dims immediately, then the API
 * call + router.refresh reconcile the server state (and the bell count).
 */
export function PatientNotificationList({ initial }: { initial: NotificationItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>(initial);
  const [busy, setBusy] = useState(false);
  const unread = items.filter((i) => !i.readAt).length;
  const nowIso = () => new Date().toISOString();

  async function markOne(id: string) {
    const target = items.find((i) => i.id === id);
    if (!target || target.readAt) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, readAt: nowIso() } : i)));
    await markNotificationRead(id);
    router.refresh();
  }

  async function markAll() {
    if (unread === 0 || busy) return;
    setBusy(true);
    setItems((prev) => prev.map((i) => ({ ...i, readAt: i.readAt ?? nowIso() })));
    await markAllNotificationsRead();
    setBusy(false);
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="gh-patient-empty-state gh-card flex flex-col items-center gap-2 p-10 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-[var(--color-background-soft)]">
          <Bell className="size-6" style={{ color: "var(--color-text-muted)" }} aria-hidden />
        </span>
        <p className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
          No notifications yet
        </p>
        <p className="max-w-sm text-sm" style={{ color: "var(--color-text-muted)" }}>
          Appointment updates, payment receipts, document alerts, and profile reminders will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {unread > 0 ? (
      <div className="gh-patient-notification-toolbar mb-4 flex justify-end">
          <button
            type="button"
            onClick={markAll}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold transition hover:border-[var(--color-border-strong)] disabled:opacity-60"
            style={{ color: "var(--color-text-primary)" }}
          >
            <Check className="size-4" aria-hidden />
            Mark all read
          </button>
        </div>
      ) : null}

      <ul className="gh-patient-notification-list gh-card divide-y overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
        {items.map((n) => {
          const isUnread = !n.readAt;
          const href = n.payload?.href ?? null;
          const inner = (
            <span className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-1.5 size-2 shrink-0 rounded-full"
                style={{ background: isUnread ? "var(--color-brand-accent)" : "transparent" }}
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span
                  className={`text-sm ${isUnread ? "font-bold" : "font-semibold"}`}
                  style={{ color: isUnread ? "var(--color-text-primary)" : "var(--color-text-muted)" }}
                >
                  {n.payload?.title ?? "Notification"}
                </span>
                {n.payload?.body ? (
                  <span className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
                    {n.payload.body}
                  </span>
                ) : null}
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                  {timeAgo(n.createdAt)}
                </span>
              </span>
            </span>
          );
          return (
            <li key={n.id} style={{ borderColor: "var(--color-border)" }}>
              {href ? (
                <Link
                  href={href}
                  onClick={() => void markOne(n.id)}
              className="gh-patient-notification-row block px-4 py-3.5 transition hover:bg-[var(--color-background-soft)]"
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => void markOne(n.id)}
                className="gh-patient-notification-row block w-full px-4 py-3.5 text-left transition hover:bg-[var(--color-background-soft)]"
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
