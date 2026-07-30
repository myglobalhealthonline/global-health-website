import Image from "next/image";

export interface MembershipCardProps {
  planName: string;
  cardholderName: string;
  memberId: string;
  /** Renewal / expiry label, already localized ("08 / 2026", "Not scheduled"). */
  validThrough: string;
  /** Country display name, or null when the sub has no country. */
  countryName: string | null;
  /** Raw subscription status (ACTIVE, PAST_DUE…) — shown lowercased, CSS uppercases. */
  status: string;
  /** True when the membership is cancelling at period end. */
  cancelAtPeriodEnd?: boolean;
  /** Copy for the cancellation pill; falls back to the status when absent. */
  cancelLabel?: string;
  /** Tier position (1-based) inside the country's plan ladder, 0 when unknown. */
  tier?: number;
  labels: { cardholder: string; memberId: string; validThrough: string; motto: string };
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
  cancelAtPeriodEnd = false,
  cancelLabel,
  tier = 0,
  labels,
}: MembershipCardProps) {
  const live = LIVE.has(status.toUpperCase());
  const pillTone = cancelAtPeriodEnd ? "warn" : live ? "live" : "muted";
  const pillText = cancelAtPeriodEnd && cancelLabel ? cancelLabel : status.toLowerCase();

  return (
    <article
      className={`gh-member-card${live && !cancelAtPeriodEnd ? "" : " gh-member-card--dim"}`}
      aria-label={`${planName} — ${labels.memberId} ${memberId}`}
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
            {pillText}
          </span>
        </header>

        <h2 className="gh-member-card__plan">{planName}</h2>

        <div aria-hidden className="gh-member-card__pulse">
          <svg viewBox="0 0 420 80" fill="none" preserveAspectRatio="none">
            <path
              d="M0 42H82L98 42L108 29L117 54L129 38H214L224 42L235 29L245 55L258 40H334L348 42L362 7L376 72L390 42H420"
              stroke="rgba(168,255,24,.48)"
              strokeWidth="3"
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
