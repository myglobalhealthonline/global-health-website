import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { fetchDoctorMessageThreads } from "@/lib/api/doctor-api";
import { formatAppDateTime } from "@/lib/format-datetime";
import {
  AdminCard,
  AdminEmptyState,
  PageHeader,
  Pill,
} from "@/components/portal-atoms";

export const dynamic = "force-dynamic";

export default async function DoctorMessagesPage() {
  const result = await fetchDoctorMessageThreads();

  if (!result.ok) {
    return (
      <>
        <PageHeader eyebrow="Messages" title="Patient messages" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load conversations: {result.message}
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
        description="Your consultation chats with patients, newest first. Open one to read and reply."
        actions={totalUnread > 0 ? <Pill tone="brand">{totalUnread} unread</Pill> : null}
      />

      {threads.length === 0 ? (
        <AdminEmptyState
          icon={<MessagesSquare className="size-6" aria-hidden />}
          title="No patient messages yet"
          description="When a patient messages you from a paid booking, the conversation appears here."
        />
      ) : (
        <div className="grid gap-3">
          {threads.map((t) => {
            const last = t.lastMessage;
            const lastFromPatient = last?.authorRole === "PATIENT";
            return (
              <Link
                key={t.appointmentId}
                href={`/doctor/appointments/${t.appointmentId}`}
                className="block"
              >
                <AdminCard className="transition hover:border-[var(--color-brand-primary)]/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-bold text-[var(--color-text-primary)]">
                          {t.patientName}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                          {t.countryCode} · {t.consultationType}
                        </span>
                        {t.unreadCount > 0 ? (
                          <Pill tone="brand">{t.unreadCount} new</Pill>
                        ) : null}
                      </div>
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
