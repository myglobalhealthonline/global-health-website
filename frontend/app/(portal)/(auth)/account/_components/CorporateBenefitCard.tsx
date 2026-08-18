export interface CorporateBenefitCardProps {
  /** Plan name as stored ("Corporate Complete"); last word renders in lime. */
  planName: string;
  /** Word appended in lime when the plan name is a single word ("Plan"). */
  planSuffix: string;
  /** Person the card belongs to — employee or beneficiary. */
  cardholderName: string;
  /** Localized "Employee member" / "Beneficiary member" — printed on the face
   *  so a clinic can tell who is the plan holder and who is covered by them. */
  memberTypeLabel: string;
  cardNumber: string;
  /** Expiry, already localized ("30/06/2027"). */
  validThrough: string;
  /** Raw card status — anything but ACTIVE desaturates the face. */
  status: string;
  labels: { subtitle: string; cardholder: string; memberId: string; validThrough: string };
}

/**
 * Physical-card render of the corporate benefit card (/account/corporate).
 * Presentational and server-rendered — every value arrives formatted. Chrome
 * (hex mesh, plus mark, wave footer) is inline SVG so it scales with the card;
 * sizes live in `portal.css` under `.gh-benefitcard*` and are container-query
 * units, so the face is identical in a half column, full width, or on mobile.
 */
export function CorporateBenefitCard({
  planName,
  planSuffix,
  cardholderName,
  memberTypeLabel,
  cardNumber,
  validThrough,
  status,
  labels,
}: CorporateBenefitCardProps) {
  const words = planName.trim().split(/\s+/).filter(Boolean);
  const accent = words.length > 1 ? words[words.length - 1] : planSuffix;
  const head = words.length > 1 ? words.slice(0, -1).join(" ") : (words[0] ?? planName);

  return (
    <article
      className="gh-benefitcard"
      data-status={status}
      aria-label={`${planName} — ${labels.memberId} ${cardNumber}`}
    >
      <svg className="gh-benefitcard__hex" viewBox="0 0 420 300" aria-hidden>
        <g fill="none" stroke="#8aa887" strokeWidth="1.25">
          <path d="M70 20l30 17v35L70 89 40 72V37z" />
          <path d="M137 56l35 20v40l-35 20-35-20V76z" />
          <path d="M223 16l30 17v35l-30 17-30-17V33z" />
          <path d="M299 62l36 21v42l-36 21-36-21V83z" />
          <path d="M372 14l27 16v31l-27 16-27-16V30z" />
          <path d="M67 135l26 15v30l-26 15-26-15v-30z" />
          <path d="M171 155l41 24v48l-41 24-41-24v-48z" />
          <path d="M288 172l29 17v34l-29 17-29-17v-34z" />
          <path d="M362 139l25 14v29l-25 14-25-14v-29z" />
          <path d="M100 72l37-16M172 76l51-43M253 68l46 15M335 83l37-22M93 150l44-34M212 179l76-7M317 189l45-36" />
        </g>
        <g fill="#8aa887">
          <circle cx="100" cy="72" r="3" />
          <circle cx="172" cy="76" r="3" />
          <circle cx="253" cy="68" r="3" />
          <circle cx="335" cy="83" r="3" />
          <circle cx="93" cy="150" r="3" />
          <circle cx="212" cy="179" r="3" />
          <circle cx="317" cy="189" r="3" />
        </g>
      </svg>

      <svg className="gh-benefitcard__plus" viewBox="0 0 100 100" aria-hidden>
        <path
          d="M40 7h20v30h30v26H60v30H40V63H10V37h30z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>

      <div className="gh-benefitcard__content">
        {/* eslint-disable-next-line @next/next/no-img-element -- the face scales
            with the container (43cqi); next/image would need a fixed intrinsic
            box and this asset is only 9.6 KB. */}
        <img
          className="gh-benefitcard__logo"
          src="/logos/global-health-dark.png"
          alt="Global Health"
          width={404}
          height={272}
        />

        <span className="gh-benefitcard__type">{memberTypeLabel}</span>

        <p className="gh-benefitcard__subtitle">{labels.subtitle}</p>

        <h3 className="gh-benefitcard__plan">
          {head} <em>{accent}</em>
        </h3>

        <div className="gh-benefitcard__rule" aria-hidden />

        <div className="gh-benefitcard__holder">
          <div className="gh-benefitcard__label">{labels.cardholder}</div>
          <div className="gh-benefitcard__name" title={cardholderName}>
            {cardholderName}
          </div>
        </div>

        <section className="gh-benefitcard__details">
          <div className="gh-benefitcard__detail">
            <svg className="gh-benefitcard__icon" viewBox="0 0 48 48" aria-hidden>
              <circle cx="24" cy="15" r="7" fill="none" stroke="currentColor" strokeWidth="2.6" />
              <path
                d="M10 39c0-7.5 5.4-12 14-12s14 4.5 14 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
            <div className="gh-benefitcard__label">{labels.memberId}</div>
            <div className="gh-benefitcard__value">{cardNumber}</div>
          </div>

          <span className="gh-benefitcard__sep" aria-hidden />

          <div className="gh-benefitcard__detail">
            <svg className="gh-benefitcard__icon" viewBox="0 0 48 48" aria-hidden>
              <rect
                x="7"
                y="10"
                width="34"
                height="31"
                rx="4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
              />
              <path
                d="M15 6v9M33 6v9M7 19h34"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M15 26h4M24 26h4M33 26h1M15 33h4M24 33h4M33 33h1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
            <div className="gh-benefitcard__label">{labels.validThrough}</div>
            <div className="gh-benefitcard__value">{validThrough}</div>
          </div>
        </section>
      </div>

      <svg
        className="gh-benefitcard__lines"
        viewBox="0 0 700 260"
        preserveAspectRatio="none"
        aria-hidden
      >
        <g fill="none" stroke="#7d9b6f" strokeWidth="1">
          <path d="M0 240C180 190 260 70 700 10" />
          <path d="M0 228C180 178 260 62 700 20" />
          <path d="M0 216C180 166 260 54 700 30" />
          <path d="M0 204C180 154 260 46 700 40" />
          <path d="M0 192C180 142 260 38 700 50" />
          <path d="M0 180C180 130 260 30 700 60" />
          <path d="M0 168C180 118 260 22 700 70" />
          <path d="M0 156C180 106 260 14 700 80" />
          <path d="M0 144C180 94 260 6 700 90" />
          <path d="M0 132C180 82 260 -2 700 100" />
        </g>
      </svg>

      <svg
        className="gh-benefitcard__waves"
        viewBox="0 0 1200 520"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="ghBenefitDeep" x1="0" x2="1">
            <stop offset="0" stopColor="#003c2a" />
            <stop offset=".62" stopColor="#00563d" />
            <stop offset="1" stopColor="#003f2d" />
          </linearGradient>
          <linearGradient id="ghBenefitLime" x1="0" x2="1">
            <stop offset="0" stopColor="#cfe99a" />
            <stop offset=".62" stopColor="#eff7da" />
            <stop offset=".82" stopColor="#a5dd21" />
            <stop offset="1" stopColor="#8fd000" />
          </linearGradient>
        </defs>
        <path
          d="M0 310C180 270 315 405 535 410C760 415 836 275 955 175C1065 82 1130 60 1200 30V520H0Z"
          fill="#edf3e5"
        />
        <path
          d="M0 345C170 305 315 430 525 435C750 440 845 320 980 210C1070 137 1145 110 1200 90V520H0Z"
          fill="url(#ghBenefitLime)"
        />
        <path
          d="M0 390C185 352 310 462 530 468C760 474 855 362 995 260C1095 188 1150 165 1200 150V520H0Z"
          fill="#ffffff"
        />
        <path
          d="M0 420C160 365 325 490 545 495C775 500 885 394 1025 304C1115 246 1165 230 1200 220V520H0Z"
          fill="url(#ghBenefitDeep)"
        />
        <g fill="none" stroke="#24855f" strokeWidth="1" opacity=".45">
          <path d="M1030 360l22-13 22 13v26l-22 13-22-13z" />
          <path d="M1082 392l22-13 22 13v26l-22 13-22-13z" />
          <path d="M1134 360l22-13 22 13v26l-22 13-22-13z" />
          <path d="M1082 328l22-13 22 13v26l-22 13-22-13z" />
          <path d="M1186 392l22-13 22 13v26l-22 13-22-13z" />
        </g>
      </svg>
    </article>
  );
}
