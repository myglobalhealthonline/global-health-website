import type { ReactNode } from "react";

/**
 * The dark vitals-monitor status panel: clinical grid, ECG trace, a status
 * chip, headline and actions. Built for the 404 (`NotFound404`) and now
 * shared with the public error boundaries so "Page not found" and
 * "Something went wrong" are the same object with a different reading
 * instead of two unrelated pages.
 *
 * Purely presentational — no hooks, no server APIs — so it renders in a
 * server tree (`not-found.tsx`) and in a client tree (`error.tsx`, which
 * needs `onClick`) from one definition. That is also why the recovery links
 * and buttons arrive as `ReactNode`: the 404 uses `next/link`, while
 * `global-error` renders outside the router and must use plain `<a>`.
 *
 * The `gh2-404-*` class prefix is historical — this is the styling of the
 * panel, not of one status code. Rules live in `globals.css` (public), and
 * `body:has(.gh2-404)` there also suppresses the floating WhatsApp/convai
 * widgets, which is wanted on both readings.
 */
export function GH2StatusMonitor({
  eyebrow,
  monitorLabel,
  code,
  signalLabel,
  quickLinks,
  quickLinksLabel,
  title,
  body,
  reference,
  actions,
}: {
  eyebrow: string;
  monitorLabel: string;
  /** Shown in the monitor's top-right chip, e.g. "HTTP 404" / "HTTP 500". */
  code: string;
  signalLabel: string;
  /** Omitted on the error reading: its job is to retry, not to send the
   *  visitor elsewhere. The monitor simply ends after the trace. */
  quickLinks?: ReactNode;
  quickLinksLabel?: string;
  title: string;
  body: ReactNode;
  /** Support reference (the error digest). */
  reference?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <section className="gh2-404">
      <div className="gh2-404-inner">
        <span className="gh2-404-eyebrow">
          <span className="gh2-live-dot" aria-hidden />
          {eyebrow}
        </span>

        <div className="gh2-404-monitor">
          <div className="gh2-404-monitor-top">
            <span>{monitorLabel}</span>
            <span className="gh2-404-code">{code}</span>
          </div>
          {/* Decorative: the trace says nothing the headline below doesn't,
              so the whole thing (label included) is hidden from AT. */}
          <svg className="gh2-404-ecg" viewBox="0 0 620 150" preserveAspectRatio="none" aria-hidden>
            <path
              className="gh2-404-trace"
              d="M0,95 L70,95 L82,95 L92,72 L102,118 L112,60 L124,95 L150,95 L180,95 L215,95 L245,95 L400,95 L420,95 L432,95 L442,72 L452,118 L462,60 L474,95 L500,95 L620,95"
            />
            <text className="gh2-404-flatlabel" x="310" y="80" textAnchor="middle">
              {signalLabel}
            </text>
          </svg>
          {quickLinks ? (
            <nav className="gh2-404-monitor-bottom" aria-label={quickLinksLabel}>
              {quickLinks}
            </nav>
          ) : null}
        </div>

        <h1 className="gh2-404-title">{title}</h1>
        <p className="gh2-404-lede">{body}</p>
        {reference}

        <div className="gh2-404-actions">{actions}</div>
      </div>
    </section>
  );
}

/** Support reference line for the error reading. Muted against the panel's
 *  dark ground — the page's own `--color-text-muted` is tuned for light
 *  surfaces and all but disappears here. */
export function GH2StatusReference({ digest }: { digest: string }) {
  return (
    <p className="mt-3 text-[12px] tracking-[0.08em] text-[var(--gh2-on-dark-faint)]">
      Ref: <code>{digest}</code>
    </p>
  );
}
