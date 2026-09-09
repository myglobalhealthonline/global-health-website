import { FlaskConical, MapPin } from "lucide-react";
import type { AccountLabRequisition } from "@/lib/api/account-appointments-api";

/**
 * The patient's laboratory requisitions, on the bookings page beneath their
 * appointments.
 *
 * Rendered as its own block rather than mixed into the appointments list: a
 * requisition has no slot to cancel, no payment action of its own once it is
 * paid, and its own status vocabulary. Folding it into `AccountAppointment`
 * would have the list's status filters, "requires payment" logic and cancel
 * buttons all acting on a record that supports none of them.
 *
 * Read-only throughout — every transition here is driven by an admin or the
 * lab.
 */

type Labels = {
  heading: string;
  subtitle: string;
  collectionPointLabel: string;
  examsLabel: string;
  resultsReadyLabel: string;
  statusLabels: Partial<Record<string, string>>;
};

function formatDate(value: string | null, locale: string): string | null {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return null;
  }
}

export function LabRequisitionsList({
  items,
  labels,
  locale,
}: {
  items: AccountLabRequisition[];
  labels: Labels;
  locale: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-start gap-2">
        <FlaskConical
          className="mt-0.5 size-4 shrink-0"
          style={{ color: "var(--portal-info-text)" }}
          aria-hidden
        />
        <div>
          <h2 className="text-base font-semibold text-[var(--portal-text)]">{labels.heading}</h2>
          <p className="text-sm text-[var(--portal-muted)]">{labels.subtitle}</p>
        </div>
      </div>

      <ul className="grid gap-3">
        {items.map((item) => {
          const collectionDate = formatDate(item.collectionDate, locale);
          const statusLabel = labels.statusLabels[item.status] ?? item.status.replace(/_/g, " ").toLowerCase();
          return (
            <li
              key={item.id}
              className="rounded-[var(--radius-card-sm)] border px-4 py-3"
              style={{ borderColor: "var(--portal-border)", background: "var(--portal-surface)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--portal-muted)]">
                    {labels.examsLabel}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-[var(--portal-text)]">
                    {item.exams.length > 0 ? item.exams.join(", ") : "—"}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{
                    color: "var(--portal-info-text)",
                    background: "var(--portal-info-soft)",
                  }}
                >
                  {item.hasResults ? labels.resultsReadyLabel : statusLabel}
                </span>
              </div>

              {item.collectionPointName || item.collectionPointAddress ? (
                <div className="mt-3 flex items-start gap-2">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0"
                    style={{ color: "var(--portal-info-text)" }}
                    aria-hidden
                  />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--portal-muted)]">
                      {labels.collectionPointLabel}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-[var(--portal-text)]">
                      {item.collectionPointName ?? item.collectionPointAddress}
                    </p>
                    {item.collectionPointName && item.collectionPointAddress ? (
                      <p className="text-xs text-[var(--portal-text-2)]">
                        {item.collectionPointAddress}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {collectionDate ? (
                <p className="mt-2 text-sm text-[var(--portal-text-2)]">{collectionDate}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
