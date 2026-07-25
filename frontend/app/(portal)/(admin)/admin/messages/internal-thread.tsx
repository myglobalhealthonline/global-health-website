"use client";

import { useEffect, useState } from "react";
import { InternalMessagesThread } from "@/components/chat/InternalMessagesThread";
import type { AdminInternalMessage } from "@/lib/admin/admin-api";

/**
 * Client-side loader around `InternalMessagesThread` for the Messages
 * inbox. The appointment page can server-render the thread because it
 * knows its one appointment id up front; the inbox only learns which
 * thread to show when the admin clicks a row, so it fetches on select
 * through the same-origin proxy.
 *
 * Callers MUST key this on `appointmentId` — switching threads resets the
 * loaded/optimistic state by remount, not by clearing it in the effect.
 */
export function AdminInternalThread({ appointmentId }: { appointmentId: string }) {
  const [items, setItems] = useState<AdminInternalMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/appointments/${appointmentId}/internal-messages`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((json: { ok?: boolean; message?: string; data?: { items?: AdminInternalMessage[] } }) => {
        if (cancelled) return;
        if (!json.ok) {
          setError(json.message ?? "Could not load internal notes.");
          return;
        }
        setItems(json.data?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load internal notes.");
      });
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  if (error) {
    return (
      <p className="gh-status-warning m-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
        {error}
      </p>
    );
  }

  if (items === null) {
    return (
      <p className="p-4 text-portal-compact text-[var(--color-text-muted)]">
        Loading internal notes…
      </p>
    );
  }

  return (
    <div className="p-4">
      <InternalMessagesThread
        appointmentId={appointmentId}
        initialItems={items}
        postEndpoint={`/api/admin/appointments/${appointmentId}/internal-messages`}
        currentRole="ADMIN"
      />
    </div>
  );
}
