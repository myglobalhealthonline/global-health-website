import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { fetchAdminMessageThreads } from "@/lib/admin/admin-api";
import { formatAppDateTime } from "@/lib/format-datetime";
import { FlagBadge } from "../_components/flag-badge";
import {
  AdminCard,
  AdminEmptyState,
  PageHeader,
  Pill,
} from "../_components/atoms";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const result = await fetchAdminMessageThreads();

  if (!result.ok) {
    return (
      <>
        <PageHeader eyebrow="Messages" title="Patient messages" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load message threads: {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const threads = result.data.items;
  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  return (
    <>
      <PageHeader
        eyebrow="Messages"
        title="Patient messages"
        description="Every patient ↔ clinic conversation, newest first. Open a thread to read and reply."
        actions={
          totalUnread > 0 ? (
            <Pill tone="brand">{totalUnread} unread</Pill>
          ) : null
        }
      />

      {threads.length === 0 ? (
        <AdminEmptyState
          icon={<MessagesSquare className="size-6" aria-hidden />}
          title="No patient messages yet"
          description="When a patient messages the clinic from their booking, the conversation shows up here."
        />
      ) : (
        <div className="grid gap-3">
          {threads.map((t) => {
            const last = t.lastMessage;
            const lastFromPatient = last?.authorRole === "PATIENT";
            return (
              <Link
                key={t.appointmentId}
                href={`/admin/appointments/${t.appointmentId}#patient-chat`}
                className="block"
              >
                <AdminCard className="transition hover:border-[var(--color-brand-primary)]/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {t.orderNumber ? (
                          <span className="rounded bg-[var(--color-background-soft)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--color-text-muted)]">
                            {t.orderNumber}
                          </span>
                        ) : null}
                        <span className="text-[15px] font-bold text-[var(--color-text-primary)]">
                          {t.patientName}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <FlagBadge code={t.countryCode} size={13} />
                          <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                            {t.countryCode}
                          </span>
                        </span>
                        {t.unreadCount > 0 ? (
                          <Pill tone="brand">{t.unreadCount} new</Pill>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                        {t.consultationType}
                        {t.patientEmail ? ` · ${t.patientEmail}` : ""}
                      </p>
                      {last ? (
                        <p className="mt-2 line-clamp-1 text-sm text-[var(--color-text-body)]">
                          <span className="font-semibold text-[var(--color-text-muted)]">
                            {lastFromPatient ? "Patient: " : "You: "}
                          </span>
                          {last.body}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm italic text-[var(--color-text-muted)]">
                          No messages yet
                        </p>
                      )}
                    </div>
                    {last ? (
                      <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
                        {formatAppDateTime(last.createdAt)}
                      </span>
                    ) : null}
                  </div>
                </AdminCard>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
