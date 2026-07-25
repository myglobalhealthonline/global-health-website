import { Globe2 } from "lucide-react";
import { fetchCrossBorderRxInbox } from "@/lib/api/doctor-api";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { CrossBorderRxDecisionPanel } from "./_components/cross-border-rx-decision-panel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Doctor · Cross-border requests" };

/**
 * Doctor B inbox: cross-jurisdiction prescription requests routed to this
 * doctor. Each card shows the requesting doctor + patient + clinical summary,
 * a link into the async consultation workspace (to write the note / issue the
 * prescription), and the accept / request-info / refuse controls.
 */
export default async function CrossBorderRxInboxPage() {
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const copy = d.crossBorderRxInbox;
  const res = await fetchCrossBorderRxInbox();
  const items = res.ok ? res.data.items : [];

  return (
    <div>
      <header className="mb-6">
        <p className="text-portal-thead font-bold uppercase tracking-[0.18em] text-[var(--portal-muted)]">
          {copy.eyebrow}
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--portal-text)]">
          <Globe2 className="size-6" aria-hidden /> {copy.title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--portal-muted)]">{copy.description}</p>
      </header>

      {!res.ok ? (
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{res.message}</p>
      ) : items.length === 0 ? (
        <div className="gh-card p-6 text-sm text-[var(--portal-muted)]">{copy.empty}</div>
      ) : (
        <ul className="grid gap-4">
          {items.map((item) => (
            <li key={item.id} className="gh-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-portal-compact font-semibold text-[var(--portal-text)]">
                    {item.patientFullName}
                  </p>
                  {item.sourceDoctorName ? (
                    <p className="text-portal-label text-[var(--portal-muted)]">
                      {copy.fromLabel}: {item.sourceDoctorName}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-portal-thead font-bold uppercase tracking-[0.08em] ${
                    item.status === "MORE_INFO"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-[var(--portal-primary)]/10 text-[var(--portal-primary)]"
                  }`}
                >
                  {item.status === "MORE_INFO" ? copy.statusMoreInfo : copy.statusAwaiting}
                </span>
              </div>

              <p className="mt-2 whitespace-pre-wrap rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3 text-portal-compact text-[var(--portal-text)]">
                {item.clinicalSummary}
              </p>

              <CrossBorderRxDecisionPanel
                requestId={item.id}
                asyncAppointmentId={item.asyncAppointmentId}
                copy={copy}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
