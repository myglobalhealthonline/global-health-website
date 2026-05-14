/**
 * Vertical narrative "How it works" with big serif numbers.
 * Matches `ui_kits/website/Sections.jsx HowItWorks`.
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
      "Browse 30+ services across general, specialist, prescriptions, and home tests. Filter by language, urgency, or price.",
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
    <section style={{ padding: "120px 0" }}>
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
              letterSpacing: "0.18em",
              color: "var(--color-brand-primary)",
            }}
          >
            How it works
          </span>
          <h2
            className="text-[var(--color-text-primary)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(40px, 5vw, 64px)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.0,
              margin: "16px 0 24px",
            }}
          >
            Three steps.
            <br />
            Roughly two&nbsp;minutes.
          </h2>
          <p
            className="m-0 text-[var(--color-text-muted)]"
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              maxWidth: "32ch",
            }}
          >
            From landing on the page to a confirmed appointment, we built the
            shortest path. No accounts, no questionnaires, no upsells.
          </p>
        </div>

        {/* Steps RIGHT */}
        <ol
          className="m-0 flex list-none flex-col gap-12 p-0"
        >
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              className="grid items-start gap-7"
              style={{
                gridTemplateColumns: "auto 1fr",
                borderTop: i === 0 ? "none" : "1px solid var(--color-border)",
                paddingTop: i === 0 ? 0 : 48,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 64,
                  fontWeight: 800,
                  color: "var(--color-brand-primary)",
                  letterSpacing: "-0.03em",
                  lineHeight: 0.9,
                  opacity: 0.85,
                }}
              >
                {s.n}
              </span>
              <div>
                <h3
                  className="text-[var(--color-text-primary)]"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 800,
                    letterSpacing: "-0.015em",
                    lineHeight: 1.15,
                    margin: "0 0 10px",
                  }}
                >
                  {s.title}
                </h3>
                <p
                  className="m-0 text-[var(--color-text-muted)]"
                  style={{
                    fontSize: 17,
                    lineHeight: 1.6,
                    maxWidth: "44ch",
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
