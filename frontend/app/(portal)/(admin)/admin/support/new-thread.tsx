"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { Btn, Pill } from "@/components/portal-atoms";
import { PortalDialog } from "@/components/PortalDialog";
import { startAdminSupportThread } from "@/lib/api/support-chat-api";
import type { AdminSupportDoctorOption } from "@/lib/admin/admin-api/support";

/**
 * Admin side of "two-way" support: start a conversation with a doctor who has
 * never written in.
 *
 * The opening message is part of the same submit rather than a separate step —
 * the backend creates the thread and the first message in one call, because an
 * empty thread is invisible in the inbox (ordered on `lastMessageAt`) and
 * would notify the doctor about nothing.
 *
 * A doctor who already has a thread is not hidden from the picker: writing to
 * them simply appends to that thread, which is what an admin expects when they
 * pick a name.
 */
export function NewSupportThreadButton({
  doctors,
}: {
  doctors: AdminSupportDoctorOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        (d.countryCode ?? "").toLowerCase().includes(q),
    );
  }, [doctors, search]);

  function reset() {
    setSearch("");
    setDoctorId(null);
    setBody("");
    setError(null);
  }

  function close() {
    if (sending) return;
    setOpen(false);
    reset();
  }

  async function submit() {
    if (!doctorId || !body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await startAdminSupportThread(doctorId, body.trim());
      setOpen(false);
      reset();
      // Refresh first so the new thread is in the server-rendered list before
      // `?open=` tries to select it.
      router.refresh();
      router.push(`/admin/support?open=${encodeURIComponent(result.threadId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the conversation");
    } finally {
      setSending(false);
    }
  }

  const canSend = Boolean(doctorId) && body.trim().length > 0 && !sending;

  return (
    <>
      <Btn
        variant="primary"
        size="sm"
        iconLeft={<MessageSquarePlus className="size-4" aria-hidden />}
        onClick={() => setOpen(true)}
      >
        New conversation
      </Btn>

      <PortalDialog
        open={open}
        onClose={close}
        title="Message a doctor"
        width="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Btn variant="ghost" size="sm" onClick={close}>
              Cancel
            </Btn>
            <Btn variant="primary" size="sm" loading={sending} onClick={submit} disabled={!canSend}>
              Send message
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label
              className="mb-1 block text-xs font-bold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted, #6b7280)" }}
              htmlFor="support-doctor-search"
            >
              Doctor
            </label>
            <input
              id="support-doctor-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or country…"
              className="w-full rounded-[10px] border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-border, #e5e7eb)" }}
            />
            <div
              className="mt-2 max-h-56 overflow-y-auto rounded-[10px] border"
              style={{ borderColor: "var(--color-border, #e5e7eb)" }}
            >
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-sm" style={{ color: "var(--color-text-muted, #6b7280)" }}>
                  No doctors match that search.
                </p>
              ) : (
                <ul>
                  {filtered.map((d) => {
                    const selected = d.doctorId === doctorId;
                    return (
                      <li key={d.doctorId}>
                        <button
                          type="button"
                          onClick={() => setDoctorId(d.doctorId)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
                          style={{
                            background: selected
                              ? "var(--color-background-soft, #f5f6f5)"
                              : "transparent",
                            fontWeight: selected ? 700 : 500,
                          }}
                          aria-pressed={selected}
                        >
                          <span>{d.fullName}</span>
                          <span className="flex items-center gap-2">
                            {d.threadId ? <Pill tone="neutral">Existing thread</Pill> : null}
                            {d.countryCode ? (
                              <span
                                className="text-xs uppercase"
                                style={{ color: "var(--color-text-muted, #6b7280)" }}
                              >
                                {d.countryCode}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div>
            <label
              className="mb-1 block text-xs font-bold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted, #6b7280)" }}
              htmlFor="support-first-message"
            >
              Message
            </label>
            <textarea
              id="support-first-message"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="Write to the doctor — they are notified by email and WhatsApp."
              className="w-full rounded-[10px] border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-border, #e5e7eb)" }}
            />
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted, #6b7280)" }}>
              Your first name is shown to the doctor so they know who wrote.
            </p>
          </div>

          {error ? (
            <p className="gh-status-warning rounded-[10px] border px-3 py-2 text-sm">{error}</p>
          ) : null}
        </div>
      </PortalDialog>
    </>
  );
}
