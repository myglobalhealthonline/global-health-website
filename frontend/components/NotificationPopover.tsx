"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { formatAppDate } from "@/lib/format-datetime";
import { AppMenu, AppMenuItem } from "@/components/AppMenu";
import { Btn } from "@/components/portal-atoms";

export type NotificationPopoverItem = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  createdAt: string;
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

/** Portalled notification menu with Radix dismissal, collision and focus handling. */
export function NotificationPopover({
  items,
  unreadCount,
  viewAllHref,
  emptyMessage = "You're all caught up.",
  ariaLabel = "Notifications",
  heading = "Notifications",
  unreadSuffix = "unread",
  unreadNotificationsSr = "{count} unread notifications",
  viewAllLabel = "View all",
}: {
  items: NotificationPopoverItem[];
  unreadCount: number;
  viewAllHref: string | null;
  emptyMessage?: string;
  ariaLabel?: string;
  heading?: string;
  /** e.g. "unread" — appended after the count as "{unreadCount} {unreadSuffix}". */
  unreadSuffix?: string;
  /** sr-only text; "{count}" is replaced with unreadCount. */
  unreadNotificationsSr?: string;
  viewAllLabel?: string;
}) {
  const recent = items.slice(0, 5);

  return (
    <AppMenu
      contentClassName="gh-portal-menu-content gh-notification-popover w-[min(360px,calc(100vw-32px))] p-2"
      trigger={
        <button
          type="button"
          aria-label={ariaLabel}
          // The dot alone doesn't say how many or what — hovering the bell
          // should answer that without opening the menu.
          title={
            unreadCount > 0
              ? unreadNotificationsSr.replace("{count}", String(unreadCount))
              : ariaLabel
          }
          data-tour="topbar-notifications"
          className="gh-notification-button relative inline-flex size-9 items-center justify-center rounded-full transition hover:bg-white/5"
          style={{ color: "var(--portal-chrome-text)" }}
        >
          <Bell className="size-4" aria-hidden />
          {unreadCount > 0 ? <span aria-hidden className="absolute right-[6px] top-[6px] size-[6px] rounded-full bg-[var(--portal-signal)] shadow-[0_0_0_2px_var(--portal-signal-glow)]" /> : null}
          {unreadCount > 0 ? <span className="sr-only">{unreadNotificationsSr.replace("{count}", String(unreadCount))}</span> : null}
        </button>
      }
    >
      <div className="flex items-center justify-between px-2 pb-2" style={{ borderBottom: "1px solid var(--portal-line)" }}>
        <span className="text-sm font-bold text-[var(--portal-text)]">{heading}</span>
        {unreadCount > 0 ? <span className="text-[11px] font-semibold text-[var(--portal-muted)]">{unreadCount} {unreadSuffix}</span> : null}
      </div>
      {recent.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-[var(--portal-muted)]">{emptyMessage}</p>
      ) : (
        <div className="py-1">
          {recent.map((notification) => {
            const unread = notification.readAt === null;
            const content = (
              <span className="flex items-start gap-2">
                <span aria-hidden className={`mt-[6px] size-[5px] shrink-0 rounded-full ${unread ? "bg-[var(--portal-signal)] shadow-[0_0_0_2px_var(--portal-signal-glow)]" : ""}`} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={`text-sm ${unread ? "font-bold text-[var(--portal-text)]" : "font-semibold text-[var(--portal-muted)]"}`}>{notification.title}</span>
                  {notification.body ? <span className="line-clamp-2 text-[12.5px] text-[var(--portal-muted)]">{notification.body}</span> : null}
                  <span className="text-[10px] uppercase tracking-wider text-[var(--portal-muted)]">{timeAgo(notification.createdAt)}</span>
                </span>
              </span>
            );
            return notification.href ? (
              <AppMenuItem key={notification.id} asChild>
                <Link href={notification.href} className={`gh-notification-popover__item block rounded-[var(--portal-radius-sm)] px-3 py-2 outline-none data-[highlighted]:bg-[var(--portal-well)] ${unread ? "bg-[color-mix(in_srgb,var(--portal-signal-soft)_50%,transparent)]" : ""}`}>{content}</Link>
              </AppMenuItem>
            ) : (
              <div key={notification.id} className={`rounded-[var(--portal-radius-sm)] px-3 py-2 ${unread ? "bg-[color-mix(in_srgb,var(--portal-signal-soft)_50%,transparent)]" : ""}`}>{content}</div>
            );
          })}
        </div>
      )}
      {viewAllHref ? <Btn href={viewAllHref} variant="soft" size="sm" className="mt-2 w-full justify-center">{viewAllLabel}</Btn> : null}
    </AppMenu>
  );
}
