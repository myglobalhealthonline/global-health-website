"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatAppDate } from "@/lib/format-datetime";

/**
 * Notification dropdown for the admin/doctor/patient topbar.
 *
 * Renders the bell button + a popover with the 5 most recent items.
 * When `items` is empty, surfaces a friendly `emptyMessage` instead of
 * collapsing — so admins/patients still get feedback that the bell is
 * a real control even before their notification feed ships.
 *
 * State is local — opening the popover never re-fetches, the caller is
 * responsible for passing fresh items from the server layout.
 */

export type NotificationPopoverItem = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  /** ISO timestamp. */
  createdAt: string;
  /** Null = unread. ISO timestamp once dismissed. */
  readAt: string | null;
};

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

export function NotificationPopover({
  items,
  unreadCount,
  viewAllHref,
  emptyMessage = "You're all caught up.",
}: {
  items: NotificationPopoverItem[];
  unreadCount: number;
  viewAllHref: string | null;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);

  // Close on Escape — keeps keyboard parity with the user menu next to it.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const recent = items.slice(0, 5);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="menu"
        className="gh-notification-button relative inline-flex size-9 items-center justify-center rounded-full transition hover:bg-white/5"
        style={{ color: "var(--portal-chrome-text)" }}
      >
        <Bell className="size-4" aria-hidden />
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="absolute right-[6px] top-[6px] size-[6px] rounded-full"
            style={{
              background: "var(--portal-signal)",
              boxShadow: "0 0 0 2px var(--portal-signal-glow)",
            }}
          />
        ) : null}
        {unreadCount > 0 ? (
          <span className="sr-only">{unreadCount} unread notifications</span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30"
          />
          <div
            role="menu"
            className="gh-notification-popover absolute right-0 top-[calc(100%+8px)] z-40 w-[min(360px,calc(100vw-32px))] p-2"
            style={{
              borderRadius: "var(--portal-radius-xl)",
              border: "1px solid var(--portal-line)",
              background: "var(--portal-surface-elevated)",
              boxShadow: "var(--portal-shadow-modal)",
            }}
          >
            <div
              className="gh-notification-popover__header flex items-center justify-between px-2 pb-2"
              style={{ borderBottom: "1px solid var(--portal-line)" }}
            >
              <span className="text-sm font-bold" style={{ color: "var(--portal-text)" }}>
                Notifications
              </span>
              {unreadCount > 0 ? (
                <span className="text-[11px] font-semibold" style={{ color: "var(--portal-muted)" }}>
                  {unreadCount} unread
                </span>
              ) : null}
            </div>

            {recent.length === 0 ? (
              <p
                className="gh-notification-popover__empty px-3 py-6 text-center text-sm"
                style={{ color: "var(--portal-muted)" }}
              >
                {emptyMessage}
              </p>
            ) : (
              <ul className="max-h-[360px] overflow-y-auto py-1">
                {recent.map((n) => {
                  const unread = n.readAt === null;
                  const inner = (
                    <span className="flex items-start gap-2">
                      {unread ? (
                        <span
                          aria-hidden
                          className="mt-[6px] size-[5px] shrink-0 rounded-full"
                          style={{ background: "var(--portal-signal)" }}
                        />
                      ) : (
                        <span aria-hidden className="mt-[6px] size-[5px] shrink-0" />
                      )}
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span
                          className="text-sm"
                          style={{
                            fontWeight: unread ? 700 : 600,
                            color: unread ? "var(--portal-text)" : "var(--portal-muted)",
                          }}
                        >
                          {n.title}
                        </span>
                        {n.body ? (
                          <span className="line-clamp-2 text-[12.5px]" style={{ color: "var(--portal-muted)" }}>
                            {n.body}
                          </span>
                        ) : null}
                        <span
                          className="text-[10px] uppercase tracking-wider"
                          style={{ color: "var(--portal-muted)" }}
                        >
                          {timeAgo(n.createdAt)}
                        </span>
                      </span>
                    </span>
                  );
                  return (
                    <li key={n.id}>
                      {n.href ? (
                        <Link
                          href={n.href}
                          onClick={() => setOpen(false)}
                          className="gh-notification-popover__item block rounded-[var(--portal-radius-sm)] px-3 py-2 hover:bg-[var(--portal-well)]"
                          style={{
                            background: unread
                              ? "color-mix(in srgb, var(--portal-signal-soft) 50%, transparent)"
                              : "transparent",
                          }}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div
                          className="gh-notification-popover__item rounded-[var(--portal-radius-sm)] px-3 py-2"
                          style={{
                            background: unread
                              ? "color-mix(in srgb, var(--portal-signal-soft) 50%, transparent)"
                              : "transparent",
                          }}
                        >
                          {inner}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {viewAllHref ? (
              <Link
                href={viewAllHref}
                onClick={() => setOpen(false)}
                className="mt-2 block rounded-[var(--portal-radius)] py-2 text-center text-[12px] font-bold"
                style={{ background: "var(--portal-mint-soft)", color: "var(--portal-mint-text)" }}
              >
                View all
              </Link>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
