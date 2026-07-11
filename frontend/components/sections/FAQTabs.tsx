"use client";

import { useState } from "react";

type FAQItem = { question: string; answer: string };
type FAQGroup = { eyebrow: string; title: string; items: FAQItem[] };

export function FAQTabs({ groups }: { groups: FAQGroup[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = groups[activeIdx];

  return (
    <div style={{ background: "var(--color-background-soft)" }}>
      {/* Tab bar */}
      <div style={{ borderBottom: "1px solid rgba(29,75,54,0.12)" }}>
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div
            role="tablist"
            className="gh-faq-tabs flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ gap: 0 }}
          >
            {groups.map((group, i) => {
              const isActive = i === activeIdx;
              return (
                <button
                  key={group.eyebrow}
                  type="button"
                  role="tab"
                  aria-selected={isActive ? "true" : "false"}
                  onClick={() => setActiveIdx(i)}
                  className="whitespace-nowrap px-6 py-4 text-sm transition-colors duration-150"
                  style={{
                    fontWeight: isActive ? 600 : 500,
                    color: isActive
                      ? "var(--color-brand-primary)"
                      : "var(--color-text-muted)",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    borderBottom: isActive
                      ? "2px solid var(--color-brand-primary)"
                      : "2px solid transparent",
                    marginBottom: -1,
                    background: "none",
                    cursor: "pointer",
                  }}
                >
                  {group.eyebrow}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Panel — same container + horizontal padding as the tab bar so
          the content's left edge lines up with the tabs. Only the
          vertical padding is set inline (the earlier `padding` shorthand
          overrode the Tailwind px-* and pushed the content out of
          alignment with the tabs). */}
      <div
        role="tabpanel"
        className="mx-auto max-w-[var(--container-width)] px-5 md:px-10"
        style={{ paddingBlock: "clamp(40px,5vw,72px)" }}
      >
        {/* Left-aligned (no mx-auto) so it shares the tab bar's left
            edge; capped to a readable width. */}
        <div className="max-w-3xl">
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              color: "var(--color-brand-primary)",
            }}
          >
            {active.eyebrow}
          </p>
          <h2
            className="mt-3 font-extrabold tracking-[-0.025em] leading-[1.05]"
            style={{
              fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.5rem)",
              color: "var(--color-text-primary)",
            }}
          >
            {active.title}
          </h2>

          <div className="mt-8" style={{ borderTop: "1px solid rgba(29,75,54,0.12)" }}>
            {active.items.map((item, index) => (
              <article
                key={item.question}
                className="grid gap-5 py-7 sm:grid-cols-[90px_1fr]"
                style={{ borderBottom: "1px solid rgba(29,75,54,0.12)" }}
              >
                <span
                  aria-hidden
                  className="select-none font-extrabold leading-none tracking-[-0.05em]"
                  style={{ fontSize: "clamp(3rem,7vw,5rem)", color: "rgba(29,75,54,0.10)" }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-extrabold tracking-[-0.02em] text-[var(--color-text-primary)]">
                    {item.question}
                  </h3>
                  <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-[var(--color-text-muted)]">
                    {item.answer}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
