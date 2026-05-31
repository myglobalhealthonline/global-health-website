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
          <div role="tablist" className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ gap: 0 }}>
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

      {/* Panel */}
      <div
        role="tabpanel"
        className="mx-auto max-w-[var(--container-width)] px-5 md:px-10"
        style={{ padding: "clamp(40px,5vw,72px) var(--container-padding, 2.5rem)" }}
      >
        <div className="mx-auto max-w-3xl">
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

          <div
            className="mt-8"
            style={{ borderTop: "1px solid rgba(29,75,54,0.10)" }}
          >
            {active.items.map((item) => (
              <details
                key={item.question}
                className="group"
                style={{ borderBottom: "1px solid rgba(29,75,54,0.10)" }}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5">
                  <span
                    className="text-base font-semibold transition-colors group-hover:text-[var(--color-brand-primary)]"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {item.question}
                  </span>
                  <span
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    style={{
                      border: "1px solid rgba(29,75,54,0.20)",
                      color: "var(--color-brand-primary)",
                      background: "rgba(29,75,54,0.06)",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M7 1V13M1 7H13"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </summary>
                <p
                  className="pb-5 max-w-[62ch] text-sm leading-relaxed"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
