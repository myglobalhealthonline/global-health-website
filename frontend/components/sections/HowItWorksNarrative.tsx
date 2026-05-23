/**
 * Vertical narrative "How it works" — dark luxury version.
 * Forest night bg, lime step numbers, white titles, muted lede.
 */

const STEPS = [
  {
    n: "01",
    title: "Pick your country",
    lede:
      "We connect you with doctors registered in your country — so referrals, prescriptions, and follow-ups all work locally.",
  },
  {
    n: "02",
    title: "Choose what you need",
    lede:
      "Browse general, specialist, prescription, and home-test services. Filter by language, urgency, or price.",
  },
  {
    n: "03",
    title: "Talk to a doctor",
    lede:
      "Join the consultation from any device. Receive prescriptions and referrals by email within the hour.",
  },
];

export function HowItWorksNarrative() {
  return (
    <section
      style={{
        padding: "120px 0",
        background: "var(--color-background-dark)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="gh-how-grid mx-auto grid gap-16"
        style={{
          maxWidth: 1320,
          padding: "0 clamp(20px, 4vw, 40px)",
        }}
      >
        {/* Sticky LEFT */}
        <div
          className="gh-how-sticky"
          style={{
            position: "sticky",
            top: 120,
            height: "fit-content",
          }}
        >
          <span
            className="uppercase"
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: "var(--color-brand-accent)",
            }}
          >
            How it works
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(40px, 5vw, 64px)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.0,
              margin: "16px 0 24px",
              color: "rgba(255,255,255,0.92)",
            }}
          >
            Three steps.
            <br />
            Roughly two&nbsp;minutes.
          </h2>
          <p
            className="m-0"
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              maxWidth: "32ch",
              color: "rgba(255,255,255,0.65)",
            }}
          >
            From landing on the page to a confirmed appointment, we built the
            shortest path. No accounts, no questionnaires, no upsells.
          </p>
        </div>

        {/* Steps RIGHT */}
        <ol className="m-0 flex list-none flex-col gap-12 p-0">
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              className="grid items-start gap-7"
              style={{
                gridTemplateColumns: "auto 1fr",
                borderTop:
                  i === 0 ? "none" : "1px solid rgba(255,255,255,0.07)",
                paddingTop: i === 0 ? 0 : 48,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 64,
                  fontWeight: 800,
                  color: "var(--color-brand-accent)",
                  letterSpacing: "-0.03em",
                  lineHeight: 0.9,
                  opacity: 0.75,
                }}
              >
                {s.n}
              </span>
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 800,
                    letterSpacing: "-0.015em",
                    lineHeight: 1.15,
                    margin: "0 0 10px",
                    color: "rgba(255,255,255,0.88)",
                  }}
                >
                  {s.title}
                </h3>
                <p
                  className="m-0"
                  style={{
                    fontSize: 17,
                    lineHeight: 1.6,
                    maxWidth: "44ch",
                    color: "rgba(255,255,255,0.65)",
                  }}
                >
                  {s.lede}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <style>{`
        .gh-how-grid { grid-template-columns: 1fr; }
        @media (min-width: 900px) {
          .gh-how-grid { grid-template-columns: 1fr 1.4fr; gap: 96px; }
        }
      `}</style>
    </section>
  );
}
