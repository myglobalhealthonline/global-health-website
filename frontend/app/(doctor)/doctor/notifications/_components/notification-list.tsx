"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck } from "lucide-react";
import { formatAppDateTime } from "@/lib/format-datetime";

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
      <div className="gh-card p-10 text-center text-sm text-[var(--color-text-muted)]">
        Nothing here yet.
      </div>
    );
  }

  return (
    <div className="gh-card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <p className="text-[12px] text-[var(--color-text-muted)]">
          Newest first
        </p>
        <button
          type="button"
          onClick={markAll}
          disabled={pending}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <CheckCheck className="size-3.5" /> Mark all read
        </button>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {items.map((n) => {
          const unread = !n.readAt;
          return (
            <li
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 ${unread ? "bg-[var(--color-brand-primary)]/5" : ""}`}
            >
              <span
                className="mt-1 inline-block size-2 shrink-0 rounded-full"
                style={{
                  background: unread
                    ? "var(--color-brand-primary)"
                    : "transparent",
                }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {n.label}
                    {n.byUserName ? (
                      <span className="font-normal text-[var(--color-text-muted)]">
                        {" "}
                        · {n.byUserName}
                      </span>
                    ) : null}
                  </p>
                  <time className="text-[11px] text-[var(--color-text-muted)]">
                    {formatAppDateTime(n.createdAt)}
                  </time>
                </div>
                {n.snippet ? (
                  <p className="mt-1 line-clamp-2 text-[13px] text-[var(--color-text-muted)]">
                    {n.snippet}
                  </p>
                ) : null}
                {n.appointmentId ? (
                  <Link
                    href={`/doctor/appointments/${n.appointmentId}`}
                    className="mt-1 inline-block text-[12px] font-semibold text-[var(--color-brand-primary)] hover:underline"
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
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
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
