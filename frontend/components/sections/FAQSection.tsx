/**
 * FAQ accordion — dark luxury version by default.
 * Forest-night canvas, border-top dividers, lime expand icon.
 *
 * `theme="light"` renders the ivory variant (same structure/padding,
 * dark-on-ivory colors, gh2-card-ivory accordion cards) for pages that
 * opt into the CMS green/ivory section picker.
 */

type FAQItem = { question: string; answer: string };

type FAQSectionProps = {
  title?: string;
  items: FAQItem[];
  theme?: "dark" | "light";
};

export function FAQSection({ title = "FAQs", items, theme = "dark" }: FAQSectionProps) {
  const light = theme === "light";
  return (
    <section
      className={
        light
          ? "relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
          : "relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest"
      }
      style={{
        padding: "clamp(64px,8vw,120px) 0",
        borderTop: light ? "1px solid rgba(29,75,54,0.10)" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        {/* Header */}
        <div className="mb-12 lg:mb-16">
          <p
            className="text-[11px] font-bold tracking-[0.22em] uppercase"
            style={{ color: light ? "var(--color-brand-primary)" : "var(--color-brand-accent)" }}
          >
            Questions
          </p>
          <h2
            className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
            style={{
              fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)",
              color: light ? "var(--color-text-primary)" : "rgba(255,255,255,0.95)",
              maxWidth: "22ch",
            }}
          >
            {title}
          </h2>
        </div>

        {/* Accordion */}
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {items.map((item, i) => {
            const summaryId = `faq-summary-${i}`;
            const answerId = `faq-answer-${i}`;
            return (
              <details
                key={item.question}
                className={
                  light
                    ? "group gh2-card-ivory rounded-[14px] px-5 motion-reduce:transition-none md:px-6"
                    : "group gh2-glass-forest gh2-glass-hover rounded-[14px] px-5 motion-reduce:transition-none md:px-6"
                }
              >
                <summary
                  id={summaryId}
                  aria-controls={answerId}
                  className={
                    light
                      ? "flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 rounded-md py-5 md:py-6"
                      : "gh-focus-on-dark flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 rounded-md py-5 md:py-6"
                  }
                >
                  <span
                    className={
                      light
                        ? "text-base font-semibold leading-snug transition-colors duration-200 group-hover:text-[var(--color-brand-primary)] motion-reduce:transition-none"
                        : "text-base font-semibold leading-snug transition-colors duration-200 group-hover:text-[var(--color-brand-accent)] motion-reduce:transition-none"
                    }
                    style={{
                      color: light ? "var(--color-text-primary)" : "rgba(255,255,255,0.88)",
                    }}
                  >
                    {item.question}
                  </span>
                  <span
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    style={{
                      background: light ? "rgba(29,75,54,0.08)" : "rgba(255,255,255,0.05)",
                      border: light ? "1px solid rgba(29,75,54,0.14)" : "1px solid rgba(255,255,255,0.10)",
                      color: light ? "var(--color-brand-primary)" : "var(--color-brand-accent)",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p
                  id={answerId}
                  role="region"
                  aria-labelledby={summaryId}
                  className="pb-6 text-sm leading-relaxed"
                  style={{
                    color: light ? "var(--color-text-body)" : "rgba(255,255,255,0.78)",
                    maxWidth: "62ch",
                  }}
                >
                  {item.answer}
                </p>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}
