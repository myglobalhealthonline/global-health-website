import Link from "next/link";
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
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "CANCELLED") return "bg-rose-50 text-rose-700 border-rose-200";
  if (status === "CONTACTED") return "bg-sky-50 text-sky-700 border-sky-200";
  if (status === "UNDER_REVIEW") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-[var(--color-background-soft)] text-[var(--color-text-primary)] border-[var(--color-border)]";
}

export function BookingsShell({ items, unavailableMessage }: BookingsShellProps) {
  if (unavailableMessage) {
    return (
      <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {unavailableMessage}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <p className="text-sm text-[var(--color-text-muted)]">
          You do not have any account-linked booking requests yet.
        </p>
        <Link href="/book-online" className="gh-btn gh-btn-primary mt-4 inline-flex">
          Book online
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                item.status,
              )}`}
            >
              {formatStatus(item.status)}
            </span>
            <p className="text-xs text-[var(--color-text-muted)]">Created: {formatDate(item.createdAt)}</p>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-[var(--color-text-muted)] sm:grid-cols-2">
            <p>
              <span className="font-semibold text-[var(--color-text-primary)]">Country:</span> {item.countryCode}
            </p>
            <p>
              <span className="font-semibold text-[var(--color-text-primary)]">Consultation:</span> {item.consultationType}
            </p>
          </div>
          {item.notesPreview ? (
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">Notes: {item.notesPreview}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
