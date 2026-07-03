"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck } from "lucide-react";
import { formatAppDateTime } from "@/lib/format-datetime";
import { AdminEmptyState } from "@/components/portal-atoms";

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

export function NotificationListClient({
  initial,
}: {
  initial: NotificationItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>(initial);
  const [pending, startTransition] = useTransition();

  function markOne(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    startTransition(async () => {
      await fetch(`/api/doctor/notifications/${id}/read`, { method: "PATCH" });
      router.refresh();
    });
  }

  function markAll() {
    setItems((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
    startTransition(async () => {
      await fetch("/api/doctor/notifications/read-all", { method: "POST" });
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <AdminEmptyState
        className="gh-doctor-empty-state"
        icon={<Bell className="size-5" aria-hidden />}
        title="No notifications yet"
        description="Appointment assignments, messages, signed consults, form submissions, and exam results will appear here."
      />
    );
  }

  return (
    <div className="gh-card gh-doctor-notification-list overflow-hidden p-0">
      <div className="gh-doctor-list-toolbar flex items-center justify-between border-b border-[var(--portal-line)] px-4 py-3">
        <p className="text-[12px] text-[var(--portal-muted)]">
          Newest first
        </p>
        <button
          type="button"
          onClick={markAll}
          disabled={pending}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
        >
          <CheckCheck className="size-3.5" /> Mark all read
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
                  <p className="text-[13px] font-semibold text-[var(--portal-text)]">
                    {n.label}
                    {n.byUserName ? (
                      <span className="font-normal text-[var(--portal-muted)]">
                        {" "}
                        · {n.byUserName}
                      </span>
                    ) : null}
                  </p>
                  <time className="text-[11px] text-[var(--portal-muted)]">
                    {formatAppDateTime(n.createdAt)}
                  </time>
                </div>
                {n.snippet ? (
                  <p className="mt-1 line-clamp-2 text-[13px] text-[var(--portal-muted)]">
                    {n.snippet}
                  </p>
                ) : null}
                {n.appointmentId ? (
                  <Link
                    href={`/doctor/appointments/${n.appointmentId}`}
                    className="mt-1 inline-block text-[12px] font-semibold text-[var(--portal-primary)] hover:underline"
                  >
                    Open appointment →
                  </Link>
                ) : null}
              </div>
              {unread ? (
                <button
                  type="button"
                  onClick={() => markOne(n.id)}
                  disabled={pending}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
                  aria-label="Mark as read"
                >
                  <Check className="size-3.5" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
