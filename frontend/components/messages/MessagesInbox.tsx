"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Search } from "lucide-react";
import { formatAppDateTime } from "@/lib/format-datetime";

/**
 * Shared two-pane message inbox used by the admin, doctor, and patient
 * portals. The left column lists threads; selecting one opens the
 * conversation IN PLACE (right column) instead of navigating away to the
 * appointment page. Each conversation header shows a clickable order number
 * that deep-links to the appointment for anyone who needs the full record.
 *
 * The chat body itself is portal-specific (admin ChatThread, doctor/patient
 * ConsultationChat, etc.), so callers pass a `renderChat` callback that
 * returns the right embedded chat component for a selected thread.
 *
 * Themed with `--portal-*` variables (doctor/patient) falling back to admin
 * `--color-*` tokens then a neutral default, so one component reads correctly
 * in every portal.
 */
export type InboxThread = {
  /** Selection key — the appointment id. */
  id: string;
  orderNumber: string | null;
  /** Where the clickable order number navigates (appointment record). */
  orderHref: string;
  /** Primary line — patient name (staff) or consultation label (patient). */
  name: string;
  /** Secondary line — consultation type · country · email. */
  subtitle?: string | null;
  /** Last message preview. */
  preview?: string | null;
  /** ISO timestamp of the last message. */
  timestamp?: string | null;
  unreadCount?: number;
  /** Optional trailing tag next to the name (e.g. country code). */
  tag?: ReactNode;
};

const line = "var(--portal-line, var(--color-border, #e5e7eb))";
const surface = "var(--portal-surface, var(--color-background-page, #ffffff))";
const surfaceSoft =
  "var(--portal-well, var(--color-background-soft, #f5f6f5))";
const text = "var(--portal-text, var(--color-text-primary, #111827))";
const muted = "var(--portal-muted, var(--color-text-muted, #6b7280))";
const signal = "var(--portal-signal, var(--color-brand-primary, #16a34a))";

export function MessagesInbox({
  threads,
  renderChat,
  initialSelectedId,
  emptyTitle = "No conversations",
  emptyDescription = "Messages will appear here.",
}: {
  threads: InboxThread[];
  renderChat: (thread: InboxThread) => ReactNode;
  initialSelectedId?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialSelectedId comes from the URL/prop, only known post-mount
    if (initialSelectedId) setSelectedId(initialSelectedId);
  }, [initialSelectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.orderNumber ?? "").toLowerCase().includes(q) ||
        (t.subtitle ?? "").toLowerCase().includes(q) ||
        (t.preview ?? "").toLowerCase().includes(q),
    );
  }, [threads, search]);

  const selected = threads.find((t) => t.id === selectedId) ?? null;

  if (threads.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-[16px] border px-6 py-16 text-center"
        style={{ borderColor: line, background: surfaceSoft }}
      >
        <div>
          <MessageSquare
            className="mx-auto size-7"
            style={{ color: muted }}
            aria-hidden
          />
          <p className="mt-3 text-base font-bold" style={{ color: text }}>
            {emptyTitle}
          </p>
          <p className="mt-1 text-sm" style={{ color: muted }}>
            {emptyDescription}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(260px,340px)_1fr]">
      {/* Thread list */}
      <div className={selected ? "hidden md:block" : "block"}>
        <label className="relative mb-3 block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            style={{ color: muted }}
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full rounded-full border py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-focus)]"
            style={{ borderColor: line, background: surface, color: text }}
          />
        </label>

        <ul
          className="overflow-hidden rounded-[14px] border"
          style={{ borderColor: line, background: surface }}
        >
          {filtered.map((t) => {
            const isSel = t.id === selectedId;
            const unread = t.unreadCount ?? 0;
            return (
              <li key={t.id} style={{ borderTop: `1px solid ${line}` }}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className="flex w-full flex-col gap-1 px-3.5 py-3 text-left transition"
                  style={{
                    background: isSel ? surfaceSoft : "transparent",
                  }}
                >
                  <span className="flex items-center gap-2">
                    {t.orderNumber ? (
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-portal-thead font-semibold"
                        style={{ background: surfaceSoft, color: muted }}
                      >
                        {t.orderNumber}
                      </span>
                    ) : null}
                    <span
                      className="min-w-0 flex-1 truncate text-portal-body font-bold"
                      style={{ color: text }}
                    >
                      {t.name}
                    </span>
                    {t.tag}
                    {unread > 0 ? (
                      <span
                        className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-portal-thead font-bold text-white"
                        style={{ background: signal }}
                      >
                        {unread}
                      </span>
                    ) : null}
                  </span>
                  {t.subtitle ? (
                    <span
                      className="truncate text-portal-thead"
                      style={{ color: muted }}
                    >
                      {t.subtitle}
                    </span>
                  ) : null}
                  {t.preview ? (
                    <span
                      className="truncate text-portal-label"
                      style={{
                        color: muted,
                        fontWeight: unread > 0 ? 600 : 400,
                      }}
                    >
                      {t.preview}
                    </span>
                  ) : null}
                  {t.timestamp ? (
                    <span className="text-[10.5px] uppercase tracking-wide" style={{ color: muted }}>
                      {formatAppDateTime(t.timestamp)}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="px-3.5 py-6 text-center text-sm" style={{ color: muted }}>
              No matches.
            </li>
          ) : null}
        </ul>
      </div>

      {/* Conversation pane */}
      <div className={selected ? "block" : "hidden md:block"}>
        {selected ? (
          <div
            className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-[14px] border"
            style={{ borderColor: line, background: surface }}
          >
            <div
              className="flex flex-wrap items-center gap-2 px-4 py-3"
              style={{ borderBottom: `1px solid ${line}` }}
            >
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="inline-flex size-8 items-center justify-center rounded-full md:hidden"
                style={{ color: muted }}
                aria-label="Back to conversations"
              >
                <ArrowLeft className="size-4" aria-hidden />
              </button>
              {selected.orderNumber ? (
                <Link
                  href={selected.orderHref}
                  className="rounded px-1.5 py-0.5 font-mono text-portal-meta font-bold underline-offset-2 hover:underline"
                  style={{ background: surfaceSoft, color: signal }}
                  title="Open the appointment"
                >
                  {selected.orderNumber}
                </Link>
              ) : null}
              <span className="text-[15px] font-bold" style={{ color: text }}>
                {selected.name}
              </span>
              {selected.subtitle ? (
                <span className="text-portal-meta" style={{ color: muted }}>
                  {selected.subtitle}
                </span>
              ) : null}
            </div>
            <div className="flex-1 overflow-hidden p-3">{renderChat(selected)}</div>
          </div>
        ) : (
          <div
            className="hidden h-full min-h-[420px] place-items-center rounded-[14px] border md:grid"
            style={{ borderColor: line, background: surfaceSoft }}
          >
            <p className="text-sm" style={{ color: muted }}>
              Select a conversation to read and reply.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
