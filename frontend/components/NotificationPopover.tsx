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
        className="relative inline-flex size-9 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-background-page)] text-[var(--color-text-muted)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
      >
        <Bell className="size-4" aria-hidden />
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="absolute right-[6px] top-[6px] size-[6px] rounded-full ring-2 ring-[var(--color-background-page)]"
            style={{ background: "var(--color-brand-accent)" }}
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
            className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(360px,calc(100vw-32px))] rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-page)] p-2"
            style={{ boxShadow: "var(--shadow-elevated)" }}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-2 pb-2">
              <span className="text-sm font-bold text-[var(--color-text-primary)]">
                Notifications
              </span>
              {unreadCount > 0 ? (
                <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                  {unreadCount} unread
                </span>
              ) : null}
            </div>

            {recent.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--color-text-muted)]">
                {emptyMessage}
              </p>
            ) : (
              <ul className="max-h-[360px] overflow-y-auto py-1">
                {recent.map((n) => {
                  const unread = n.readAt === null;
                  const inner = (
                    <span className="flex flex-col gap-0.5">
                      <span
                        className={`text-sm ${
                          unread
                            ? "font-bold text-[var(--color-text-primary)]"
                            : "font-semibold text-[var(--color-text-muted)]"
                        }`}
                      >
                        {n.title}
                      </span>
                      {n.body ? (
                        <span className="line-clamp-2 text-[12.5px] text-[var(--color-text-muted)]">
                          {n.body}
                        </span>
                      ) : null}
                      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  );
                  return (
                    <li key={n.id}>
                      {n.href ? (
                        <Link
                          href={n.href}
                          onClick={() => setOpen(false)}
                          className="block rounded-md px-3 py-2 hover:bg-[var(--color-background-soft)]"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div className="px-3 py-2">{inner}</div>
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
                className="mt-1 block border-t border-[var(--color-border)] py-2 text-center text-[12px] font-bold text-[var(--color-brand-primary)] hover:underline"
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
