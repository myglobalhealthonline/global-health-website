/**
 * Trust signals — dark luxury version.
 * Forest-night canvas, glass feature cards with lime icon circles,
 * adaptive grid based on item count.
 */

import { ShieldCheck, Star, Timer, Users } from "lucide-react";
import { Container } from "@/components/layout/Container";

type TrustSignal =
  | string
  | {
      title: string;
      description?: string;
      image?: { src: string; alt: string };
    };

type TrustSignalsProps = {
  title?: string;
  subtitle?: string;
  items: TrustSignal[];
};

const icons = [Star, ShieldCheck, Timer, Users];

export function TrustSignals({ title = "Why patients choose us", subtitle, items }: TrustSignalsProps) {
  const colClass =
    items.length >= 5
      ? "lg:grid-cols-3"
      : items.length === 4
        ? "lg:grid-cols-4"
        : items.length === 3
          ? "lg:grid-cols-3"
          : "lg:grid-cols-2";

  return (
    <section
      style={{
        background: "var(--color-background-dark)",
        padding: "clamp(64px,8vw,120px) 0",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Container>
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center mb-14">
          <p
            className="text-[11px] font-bold tracking-[0.22em] uppercase"
            style={{ color: "var(--color-brand-accent)" }}
          >
            Why Us
          </p>
          <h2
            className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
            style={{
              fontSize: "clamp(2rem,4vw+0.5rem,3.5rem)",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              className="mt-4 mx-auto leading-relaxed"
              style={{
                fontSize: "var(--text-body-lg)",
                color: "rgba(255,255,255,0.52)",
                maxWidth: "48ch",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {/* Cards */}
        <ul
          className={`mx-auto max-w-6xl grid grid-cols-1 gap-5 sm:grid-cols-2 ${colClass}`}
        >
          {items.map((item, index) => {
            const normalized = typeof item === "string" ? { title: item } : item;
            const Icon = icons[index % icons.length];

            return (
              <li
                key={`${normalized.title}-${index}`}
                className="flex flex-col gap-5"
                style={{
                  borderRadius: "var(--radius-card)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: "clamp(24px,3vw,36px)",
                }}
              >
                <span
                  className="inline-flex size-11 items-center justify-center rounded-2xl"
                  style={{
                    background: "rgba(176,241,34,0.10)",
                    border: "1px solid rgba(176,241,34,0.18)",
                    color: "var(--color-brand-accent)",
                  }}
                >
                  <Icon className="size-5" strokeWidth={1.5} aria-hidden />
                </span>

                <div>
                  <p
                    className="font-extrabold tracking-[-0.02em] leading-snug"
                    style={{
                      fontSize: "clamp(1.05rem,1.5vw,1.2rem)",
                      color: "rgba(255,255,255,0.92)",
                    }}
                  >
                    {normalized.title}
                  </p>
                  {normalized.description ? (
                    <p
                      className="mt-2 text-sm leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.52)" }}
                    >
                      {normalized.description}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
