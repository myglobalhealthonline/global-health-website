import { Container } from "@/components/layout/Container";

type FAQItem = { question: string; answer: string };

type FAQSectionProps = {
  title?: string;
  items: FAQItem[];
};

export function FAQSection({ title = "FAQs", items }: FAQSectionProps) {
  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24">
      <Container>
        <div className="mx-auto max-w-3xl">
          <h2 className="gh-h2 text-[var(--color-text-primary)]">{title}</h2>
        </div>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-[var(--color-border)]">
          {items.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-primary)] transition-colors">
                  {item.question}
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-background-soft)] text-[var(--color-brand-primary)] transition-transform duration-200 group-open:rotate-45">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform">
                    <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
