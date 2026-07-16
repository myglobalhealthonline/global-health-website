"use client";

import { useState, useTransition } from "react";
import { formatAppDateTime } from "@/lib/format-datetime";
import { Btn } from "@/components/portal-atoms";

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
type InternalMessagesLabels = {
  emptyState?: string;
  authorDoctor?: string;
  authorAdmin?: string;
  placeholderFromDoctor?: string;
  placeholderFromAdmin?: string;
  postNote?: string;
  postFailed?: string;
};

export function InternalMessagesThread({
  initialItems,
  postEndpoint,
  currentRole,
  labels,
}: {
  appointmentId: string;
  initialItems: InternalMessage[];
  postEndpoint: string;
  currentRole: "DOCTOR" | "ADMIN";
  /** Copy overrides for the doctor portal (i18n). Admin omits this and
   *  gets the English defaults — admin is English-by-design. */
  labels?: InternalMessagesLabels;
}) {
  const t = {
    emptyState: labels?.emptyState ?? "No internal notes yet.",
    authorDoctor: labels?.authorDoctor ?? "Doctor",
    authorAdmin: labels?.authorAdmin ?? "Admin",
    placeholderFromDoctor: labels?.placeholderFromDoctor ?? "Note for admin (e.g. needs payment confirmation)…",
    placeholderFromAdmin: labels?.placeholderFromAdmin ?? "Note for doctor (e.g. patient called about follow-up)…",
    postNote: labels?.postNote ?? "Post note",
    postFailed: labels?.postFailed ?? "Could not post.",
  };
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
        setError(json.message ?? t.postFailed);
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
          <li className="text-portal-compact" style={{ color: "var(--portal-muted)" }}>
            {t.emptyState}
          </li>
        ) : (
          items.map((m) => (
            <li key={m.id} className="gh-chat-note">
              <div className="gh-chat-note__meta flex items-baseline justify-between gap-2">
                <span>
                  {m.authorRole === "DOCTOR" ? t.authorDoctor : t.authorAdmin} · {m.authorName}
                </span>
                <time>{formatAppDateTime(m.createdAt)}</time>
              </div>
              <p className="gh-chat-note__body">{m.body}</p>
            </li>
          ))
        )}
      </ul>

      <form onSubmit={submit} className="gh-chat-compose grid gap-2 p-3">
        <textarea
          className="gh-input min-h-[4rem] resize-y"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            currentRole === "DOCTOR" ? t.placeholderFromDoctor : t.placeholderFromAdmin
          }
          maxLength={8000}
        />
        {error ? (
          <p className="gh-status-warning rounded-md border px-3 py-2 text-portal-label">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Btn type="submit" variant="primary" size="sm" disabled={pending || body.trim() === ""} loading={pending}>
            {t.postNote}
          </Btn>
        </div>
      </form>
    </div>
  );
}
