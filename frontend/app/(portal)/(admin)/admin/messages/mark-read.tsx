"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Fire-and-forget: clears the admin's unread notifications for one
 * appointment when its thread is opened in the inbox. Nothing else marks
 * admin notification rows read, so without this the bell count only grows.
 *
 * Renders nothing; mounted alongside whichever chat the inbox is showing.
 */
export function MarkAppointmentNotificationsRead({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/notifications/appointment/${appointmentId}/read`, {
      method: "POST",
    })
      .then((res) => res.json())
      .then((json: { ok?: boolean; data?: { updated?: number } }) => {
        // Only refresh when something actually changed — the layout's bell
        // fetch is not free, and reopening a read thread is the common case.
        if (!cancelled && json.ok && (json.data?.updated ?? 0) > 0) {
          router.refresh();
        }
      })
      .catch(() => {
        // Best-effort — a failed mark-read must not break the thread view.
      });
    return () => {
      cancelled = true;
    };
  }, [appointmentId, router]);

  return null;
}
