/**
 * FAQ accordion — dark luxury version.
 * Forest-night canvas, border-top dividers, lime expand icon.
 */

type FAQItem = { question: string; answer: string };

type FAQSectionProps = {
  title?: string;
  items: FAQItem[];
};

export function FAQSection({ title = "FAQs", items }: FAQSectionProps) {
  return (
    <section
      className="relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest"
      style={{
        padding: "clamp(64px,8vw,120px) 0",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        {/* Header */}
        <div className="mb-12 lg:mb-16">
          <p
            className="text-[11px] font-bold tracking-[0.22em] uppercase"
            style={{ color: "var(--color-brand-accent)" }}
          >
            Questions
          </p>
          <h2
            className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
            style={{
              fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)",
              color: "rgba(255,255,255,0.95)",
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
                className="group gh2-glass-forest gh2-glass-hover rounded-[14px] px-5 motion-reduce:transition-none md:px-6"
              >
                <summary
                  id={summaryId}
                  aria-controls={answerId}
                  className="gh-focus-on-dark flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 rounded-md py-5 md:py-6"
                >
                  <span
                    className="text-base font-semibold leading-snug transition-colors duration-200 group-hover:text-[var(--color-brand-accent)] motion-reduce:transition-none"
                    style={{ color: "rgba(255,255,255,0.88)" }}
                  >
                    {item.question}
                  </span>
                  <span
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "var(--color-brand-accent)",
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
                  style={{ color: "rgba(255,255,255,0.78)", maxWidth: "62ch" }}
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
