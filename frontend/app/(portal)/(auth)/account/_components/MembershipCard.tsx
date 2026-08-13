import Image from "next/image";

export interface MembershipCardProps {
  planName: string;
  cardholderName: string;
  memberId: string;
  /** Renewal / expiry label, already localized ("08 / 2026", "Not scheduled"). */
  validThrough: string;
  /** Country display name, or null when the sub has no country. */
  countryName: string | null;
  /** Raw subscription status (ACTIVE, PAST_DUE…) — drives the lit/dim face. */
  status: string;
  /** Localized status copy for the pill; falls back to the raw status. */
  statusLabel?: string;
  /** True when the membership is cancelling at period end. */
  cancelAtPeriodEnd?: boolean;
  /** Copy for the cancellation pill; falls back to the status when absent. */
  cancelLabel?: string;
  /** Tier position (1-based) inside the country's plan ladder, 0 when unknown. */
  tier?: number;
  labels: { cardholder: string; memberId: string; validThrough: string; motto: string };
  /**
   * Admin-chosen face for a private membership level (§24.2, decision 45).
   *
   * Absent — which is every public subscription card — keeps the default lime
   * face untouched. Present, the card switches to `data-tinted` and one scoped
   * block in `portal.css` repaints the chrome from these variables, because a
   * fixed lime border on a pale background is the failure mode that makes the
   * whole picker look broken.
   *
   * All four values are DERIVED server-side from one stored hex; only
   * `background` is ever persisted.
   */
  palette?: {
    background: string;
    foreground: string;
    muted: string;
    chrome: string;
  } | null;
  /** Extra line under the ID slots — the family link on a dependent's card. */
  footnote?: string | null;
}

/** Statuses that keep the card lit. Anything else desaturates the face. */
const LIVE = new Set(["ACTIVE", "TRIALING"]);

/**
 * Physical-card render of the member's subscription (Signal direction).
 * Presentational and server-rendered — every value arrives as a formatted
 * string. Chrome (guilloche, ring, ECG rule, care mark) is CSS in
 * `portal.css` under `.gh-member-card*`; only the globe mark is an asset.
 */
export function MembershipCard({
  planName,
  cardholderName,
  memberId,
  validThrough,
  countryName,
  status,
  statusLabel,
  cancelAtPeriodEnd = false,
  cancelLabel,
  tier = 0,
  labels,
  palette = null,
  footnote = null,
}: MembershipCardProps) {
  const live = LIVE.has(status.toUpperCase());
  const pillTone = cancelAtPeriodEnd ? "warn" : live ? "live" : "muted";
  const pillText =
    cancelAtPeriodEnd && cancelLabel ? cancelLabel : (statusLabel ?? status.toLowerCase());

  return (
    <article
      className={`gh-member-card${live && !cancelAtPeriodEnd ? "" : " gh-member-card--dim"}`}
      aria-label={`${planName} — ${labels.memberId} ${memberId}`}
      data-tinted={palette ? "" : undefined}
      style={
        palette
          ? ({
              "--gh-card-bg": palette.background,
              "--gh-card-fg": palette.foreground,
              "--gh-card-muted": palette.muted,
              "--gh-card-chrome": palette.chrome,
            } as React.CSSProperties)
          : undefined
      }
    >
      <span aria-hidden className="gh-member-card__ring" />
      <div className="gh-member-card__inner">
        <header className="gh-member-card__top">
          <div>
            <div className="gh-member-card__lock">
              <Image
                src="/logos/global-health-mark.png"
                alt=""
                aria-hidden
                width={180}
                height={182}
                className="gh-member-card__mark"
              />
              <p className="gh-member-card__brand">GLOBAL HEALTH</p>
            </div>
            <p className="gh-member-card__motto">{labels.motto}</p>
          </div>
          <span className={`gh-member-card__pill gh-member-card__pill--${pillTone}`}>
            <span aria-hidden className="gh-member-card__dot" />
            {/* Own element so long statuses ("Awaiting first payment") can
                ellipsis — a bare text node in a flex row cannot. */}
            <span className="gh-member-card__pill-text">{pillText}</span>
          </span>
        </header>

        <h2 className="gh-member-card__plan">{planName}</h2>

        {/* One PQRST beat on the baseline rule. Drawn to its own aspect ratio
            (no `preserveAspectRatio="none"`) — stretching a wide viewBox into
            this short row flattened the spikes into noise. */}
        <div aria-hidden className="gh-member-card__pulse">
          <svg viewBox="0 0 96 40" fill="none" preserveAspectRatio="xMaxYMid meet">
            <path
              d="M0 20H18q3-6 6 0h6l4 8 5-21 5 30 4-17h5q5-10 10 0h33"
              // `currentColor`, not a literal: the stroke is chrome, and chrome
              // has to follow the derived foreground on a tinted card (§24.2).
              // The default lime is set on the svg's `color` in portal.css.
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        <div className="gh-member-card__holder">
          <div className="gh-member-card__label">{labels.cardholder}</div>
          <strong className="gh-member-card__name" title={cardholderName}>
            {cardholderName}
          </strong>
        </div>

        <div className="gh-member-card__slots">
          <div>
            <div className="gh-member-card__label">{labels.memberId}</div>
            <strong className="gh-member-card__value">{memberId}</strong>
          </div>
          <span aria-hidden className="gh-member-card__sep" />
          <div>
            <div className="gh-member-card__label">{labels.validThrough}</div>
            <strong className="gh-member-card__value">{validThrough}</strong>
          </div>
        </div>

        {footnote ? <p className="gh-member-card__footnote">{footnote}</p> : null}

        <footer className="gh-member-card__foot">
          <span className="gh-member-card__country">{countryName}</span>
          <span className="gh-member-card__marks">
            {tier > 0 ? (
              <span aria-hidden className="gh-member-card__pips">
                {[1, 2, 3].map((i) => (
                  <i key={i} className={i <= tier ? "is-on" : undefined} />
                ))}
              </span>
            ) : null}
            <span aria-hidden className="gh-member-card__care" />
          </span>
        </footer>
      </div>
    </article>
  );
}
