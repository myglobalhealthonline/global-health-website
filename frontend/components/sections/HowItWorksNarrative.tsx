/**
 * "How it works" — dark luxury version.
 * Forest-night canvas, lime step numbers, 3-card horizontal layout
 * with connector line on desktop. White titles, white/60 descriptions.
 */

import { ArrowRight } from "lucide-react";

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
        background: "var(--color-background-dark)",
        padding: "clamp(64px,8vw,120px) 0",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="mx-auto px-5 md:px-10"
        style={{ maxWidth: "var(--container-width)" }}
      >
        {/* Header */}
        <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p
              className="text-[11px] font-bold tracking-[0.22em] uppercase"
              style={{ color: "var(--color-brand-accent)" }}
            >
              How it works
            </p>
            <h2
              className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
              style={{
                fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)",
                color: "rgba(255,255,255,0.95)",
                maxWidth: "22ch",
              }}
            >
              Three steps.{" "}
              <span style={{ color: "var(--color-brand-accent)" }}>
                Roughly two minutes.
              </span>
            </h2>
          </div>
          <p
            className="leading-relaxed"
            style={{
              fontSize: "var(--text-body-lg)",
              color: "rgba(255,255,255,0.45)",
              maxWidth: "38ch",
            }}
          >
            From landing on the page to a confirmed appointment — the
            shortest path. No accounts, no questionnaires, no upsells.
          </p>
        </div>

        {/* Steps — 3 cards with connector */}
        <div className="gh-hiw-grid">
          {STEPS.map((s, i) => (
            <div key={s.n} className="gh-hiw-item">
              {/* Card */}
              <div
                className="gh-hiw-card flex flex-col h-full"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "var(--radius-card)",
                  padding: "clamp(28px,3vw,40px)",
                  transition: "border-color 0.2s, background 0.2s",
                }}
              >
                {/* Step number */}
                <span
                  className="font-extrabold leading-none tracking-[-0.04em] [font-variant-numeric:tabular-nums] select-none"
                  style={{
                    fontSize: "clamp(3rem,6vw,5rem)",
                    color: "var(--color-brand-accent)",
                    opacity: 0.9,
                  }}
                  aria-hidden
                >
                  {s.n}
                </span>

                {/* Text */}
                <div className="mt-6 flex-1">
                  <h3
                    className="font-extrabold tracking-[-0.02em] leading-tight"
                    style={{
                      fontSize: "clamp(1.2rem,2vw,1.5rem)",
                      color: "rgba(255,255,255,0.92)",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="mt-3 leading-relaxed"
                    style={{
                      fontSize: "var(--text-body)",
                      color: "rgba(255,255,255,0.55)",
                      maxWidth: "34ch",
                    }}
                  >
                    {s.lede}
                  </p>
                </div>
              </div>

              {/* Connector arrow — hidden after last item */}
              {i < STEPS.length - 1 ? (
                <div
                  className="gh-hiw-connector"
                  aria-hidden
                >
                  <ArrowRight
                    style={{ color: "rgba(176,241,34,0.35)" }}
                    strokeWidth={1.5}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .gh-hiw-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        .gh-hiw-item {
          display: contents;
        }
        .gh-hiw-connector {
          display: none;
        }
        @media (min-width: 900px) {
          .gh-hiw-grid {
            grid-template-columns: 1fr auto 1fr auto 1fr;
            align-items: stretch;
            gap: 0;
          }
          .gh-hiw-item {
            display: contents;
          }
          .gh-hiw-connector {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 8px;
          }
          .gh-hiw-card:hover {
            background: rgba(176,241,34,0.05) !important;
            border-color: rgba(176,241,34,0.18) !important;
          }
        }
      `}</style>
    </section>
  );
}
