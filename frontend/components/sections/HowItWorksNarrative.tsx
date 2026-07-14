/**
 * How it works — clinical editorial version.
 * Full-width step rows divided by hairlines: ghost numeral | title +
 * body | arrow affordance. Hover tints the row and fills the arrow.
 */

import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { SectionSeam } from "@/components/ui/SectionSeam";

export type HowItWorksI18n = {
  eyebrow: string;
  headlineMain: string;
  headlineAccent: string;
  subtitle: string;
  step1Title: string;
  step1Body: string;
  step2Title: string;
  step2Body: string;
  step3Title: string;
  step3Body: string;
};

export function HowItWorksNarrative({
  theme = "dark",
  i18n,
}: {
  theme?: "dark" | "light";
  i18n?: HowItWorksI18n;
}) {
  const isLight = theme === "light";
  const hairline = isLight ? "rgba(29,75,54,0.14)" : "rgba(255,255,255,0.10)";

  const steps = [
    {
      n: "01",
      title: i18n?.step1Title ?? "Pick your country",
      lede:
        i18n?.step1Body ??
        "We connect you with doctors registered in your country — so referrals, certificates, and follow-ups all work locally.",
    },
    {
      n: "02",
      title: i18n?.step2Title ?? "Choose what you need",
      lede:
        i18n?.step2Body ??
        "Browse general, specialist, and home-test services. Filter by language, urgency, or price.",
    },
    {
      n: "03",
      title: i18n?.step3Title ?? "Talk to a doctor",
      lede:
        i18n?.step3Body ??
        "Join the consultation from any device. Receive notes or next steps when clinically appropriate after the appointment.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className={
        isLight
          ? "relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
          : "relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest"
      }
      style={{
        padding: "clamp(64px,8vw,120px) 0",
      }}
    >
      <SectionSeam theme={isLight ? "light" : "dark"} />
      <div
        className="mx-auto px-5 md:px-10"
        style={{ maxWidth: "var(--container-width)" }}
      >
        {/* Header */}
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6 md:mb-16">
          <div>
            <p className="flex items-center gap-3">
              <span
                className="text-[11px] font-bold tracking-[0.22em] uppercase"
                style={{ color: isLight ? "var(--color-brand-primary)" : "var(--color-brand-accent)" }}
              >
                {i18n?.eyebrow ?? "How it works"}
              </span>
            </p>
            <h2
              className="mt-5 font-extrabold tracking-[-0.035em] leading-[1.0]"
              style={{
                fontSize: "clamp(2.1rem, 4vw + 0.5rem, 3.6rem)",
                color: isLight ? "var(--color-text-primary)" : "rgba(255,255,255,0.95)",
                maxWidth: "22ch",
              }}
            >
              {i18n?.headlineMain ?? "Three steps."}{" "}
              <span style={{ color: isLight ? "#8FB021" : "var(--color-brand-accent)" }}>
                {i18n?.headlineAccent ?? "A clearer path."}
              </span>
            </h2>
          </div>
          <p
            className="leading-relaxed"
            style={{
              fontSize: "var(--text-body-lg)",
              color: isLight ? "var(--color-text-muted)" : "rgba(255,255,255,0.45)",
              maxWidth: "38ch",
            }}
          >
            {i18n?.subtitle ??
              "From landing on the page to a confirmed appointment — the path through service, clinician, time, and patient details."}
          </p>
        </div>

        {/* Step rows */}
        <RevealOnScroll stagger style={{ borderBottom: `1px solid ${hairline}` }}>
          {steps.map((s) => (
            <div
              key={s.n}
              className="gh2-step grid items-center gap-x-8 gap-y-4 rounded-xl px-2 py-9 md:grid-cols-[minmax(96px,140px)_1fr] md:px-6 md:py-12"
              style={{ borderTop: `1px solid ${hairline}` }}
            >
              {/* Ghost numeral — gradient ink so it reads designed, not faded */}
              <span
                aria-hidden
                className="select-none bg-clip-text font-extrabold leading-none tracking-[-0.05em] text-transparent [font-variant-numeric:tabular-nums]"
                style={{
                  fontSize: "clamp(3.25rem,7vw,5.5rem)",
                  backgroundImage: isLight
                    ? "linear-gradient(160deg, rgba(29,75,54,0.32), rgba(143,176,33,0.30))"
                    : "linear-gradient(160deg, rgba(176,241,34,0.38), rgba(176,241,34,0.14))",
                }}
              >
                {s.n}
              </span>

              {/* Copy */}
              <div>
                <h3
                  className="font-extrabold tracking-[-0.02em] leading-tight"
                  style={{
                    fontSize: "clamp(1.3rem,2.2vw,1.75rem)",
                    color: isLight ? "var(--color-text-primary)" : "rgba(255,255,255,0.92)",
                  }}
                >
                  {s.title}
                </h3>
                <p
                  className="mt-2.5 leading-relaxed"
                  style={{
                    fontSize: "var(--text-body)",
                    color: isLight ? "var(--color-text-muted)" : "rgba(255,255,255,0.55)",
                    maxWidth: "58ch",
                  }}
                >
                  {s.lede}
                </p>
              </div>
            </div>
          ))}
        </RevealOnScroll>
      </div>
    </section>
  );
}
