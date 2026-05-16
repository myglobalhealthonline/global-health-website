import Link from "next/link";
import { CalendarDays, ArrowRight, ClipboardList, Video, Clock } from "lucide-react";
import type { AccountAppointment } from "@/lib/api/account-appointments-api";

type BookingsShellProps = {
  items: AccountAppointment[];
  unavailableMessage?: string | null;
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(dateLike: string) {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) return dateLike;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function statusBadgeClass(status: string) {
  if (status === "COMPLETED") return "gh-badge-success";
  if (status === "CANCELLED") return "gh-badge-error";
  if (status === "CONTACTED") return "gh-badge-info";
  if (status === "UNDER_REVIEW") return "gh-badge-warning";
  return "gh-badge-neutral";
}

export function BookingsShell({ items, unavailableMessage }: BookingsShellProps) {
  if (unavailableMessage) {
    return (
      <div className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-panel)] px-5 py-4">
        <p className="text-sm text-[var(--color-text-muted)]">{unavailableMessage}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center rounded-[var(--radius-card-sm)] border border-dashed border-[var(--color-border)] bg-[var(--color-background-panel)] px-6 py-12 text-center">
        <ClipboardList className="size-10 text-[var(--color-border-strong)]" aria-hidden />
        <p className="mt-4 text-base font-semibold text-[var(--color-text-primary)]">No bookings yet</p>
        <p className="mt-1 max-w-xs text-sm text-[var(--color-text-muted)]">
          You have not made any booking requests. Start by booking your first consultation.
        </p>
        <Link href="/book-online" className="gh-btn gh-btn-primary mt-5 text-sm">
          Book online
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {items.map((item) => (
        <article
          key={item.id}
          className="gh-card p-5 transition hover:shadow-[var(--shadow-card-hover)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-[var(--color-text-muted)]" aria-hidden />
              <span className="text-sm text-[var(--color-text-muted)]">{formatDate(item.createdAt)}</span>
            </div>
            <span className={`gh-badge ${statusBadgeClass(item.status)}`}>
              {formatStatus(item.status)}
            </span>
          </div>

          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Country</p>
              <p className="mt-0.5 font-medium text-[var(--color-text-primary)]">{item.countryCode.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Consultation</p>
              <p className="mt-0.5 font-medium text-[var(--color-text-primary)]">{item.consultationType}</p>
            </div>
          </div>

          {/* Scheduled-call band — appears only once admin sets the slot.
              The whole row links to the Meet link if present so patients
              can join with one click. */}
          {item.scheduledAt || item.meetingUrl ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-emerald-700" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Scheduled
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-emerald-900">
                    {item.scheduledAt ? formatDate(item.scheduledAt) : "Time to be confirmed"}
                  </p>
                </div>
              </div>
              {item.meetingUrl ? (
                <a
                  href={item.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
                >
                  <Video className="size-4" aria-hidden />
                  Join call
                </a>
              ) : null}
            </div>
          ) : null}

          {item.notesPreview ? (
            <div className="mt-3 rounded-[var(--radius-card-sm)] bg-[var(--color-background-soft)] px-3 py-2">
              <p className="text-xs font-semibold text-[var(--color-text-muted)]">Notes</p>
              <p className="mt-0.5 text-sm text-[var(--color-text-body)]">{item.notesPreview}</p>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
