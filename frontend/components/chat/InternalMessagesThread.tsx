"use client";

import { useState, useTransition } from "react";
import { formatAppDateTime } from "@/lib/format-datetime";

type InternalMessage = {
  id: string;
  authorRole: "DOCTOR" | "ADMIN";
  authorName: string;
  body: string;
  createdAt: string;
};

/**
 * Doctor ↔ admin per-appointment thread.
 *
 * Polling-based: the parent server component re-fetches on each
 * `router.refresh()` triggered by a successful POST. No WebSockets in
 * the MVP — volume doesn't justify it yet, and the polling model means
 * the same component renders on both the doctor and admin sides simply
 * by swapping `postEndpoint` + `currentRole`.
 */
export function InternalMessagesThread({
  initialItems,
  postEndpoint,
  currentRole,
}: {
  appointmentId: string;
  initialItems: InternalMessage[];
  postEndpoint: string;
  currentRole: "DOCTOR" | "ADMIN";
}) {
  const [items, setItems] = useState<InternalMessage[]>(initialItems);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await fetch(postEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { message?: InternalMessage };
      };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Could not post.");
        return;
      }
      if (json.data?.message) {
        setItems((prev) => [...prev, json.data!.message!]);
      }
      setBody("");
    });
  }

  return (
    <div className="mt-3 grid gap-3">
      <ul className="grid gap-2">
        {items.length === 0 ? (
          <li className="text-[13px] text-[var(--color-text-muted)]">
            No internal notes yet.
          </li>
        ) : (
          items.map((m) => {
            const mine = m.authorRole === currentRole;
            return (
              <li
                key={m.id}
                className={`rounded-md border px-3 py-2 text-[13px] ${
                  mine
                    ? "border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/5"
                    : "border-[var(--color-border)] bg-white"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    {m.authorRole === "DOCTOR" ? "Doctor" : "Admin"} ·{" "}
                    {m.authorName}
                  </span>
                  <time className="text-[11px] text-[var(--color-text-muted)]">
                    {formatAppDateTime(m.createdAt)}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[var(--color-text-primary)]">
                  {m.body}
                </p>
              </li>
            );
          })
        )}
      </ul>

      <form onSubmit={submit} className="grid gap-2">
        <textarea
          className="gh-input min-h-[4rem] resize-y"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            currentRole === "DOCTOR"
              ? "Note for admin (e.g. needs payment confirmation)…"
              : "Note for doctor (e.g. patient called about follow-up)…"
          }
          maxLength={8000}
        />
        {error ? (
          <p className="gh-status-warning rounded-md border px-3 py-2 text-[12.5px]">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || body.trim() === ""}
            className="gh-btn gh-btn-primary"
          >
            {pending ? "Posting…" : "Post note"}
          </button>
        </div>
      </form>
    </div>
  );
}
