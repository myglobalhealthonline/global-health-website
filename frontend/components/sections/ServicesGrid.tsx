import { ServiceCard } from "@/components/cards/ServiceCard";
import { Container } from "@/components/layout/Container";

type Item = {
  title: string;
  description: string;
  href: string;
  serviceType?: "general" | "specialist";
  audience?: string;
  duration?: string;
  startingPrice?: string;
  imageSrc?: string | null;
};

type ServicesGridProps = {
  title?: string;
  intro?: string;
  eyebrow?: string;
  items: Item[];
  featureFirst?: boolean;
  /** "dark" renders forest-night glass cards; "light" (default) renders white cards. */
  variant?: "light" | "dark";
};

export function ServicesGrid({
  title,
  intro,
  eyebrow,
  items,
  featureFirst = true,
  variant = "light",
}: ServicesGridProps) {
  const useFeatured = featureFirst && items.length >= 4;
  const isDark = variant === "dark";

  return (
    <section
      style={
        isDark
          ? {
              background: "var(--color-background-dark)",
              padding: "clamp(64px,8vw,120px) 0",
              borderTop: "1px solid rgba(255,255,255,0.07)",
            }
          : { background: "var(--color-background-page)", padding: "clamp(48px,6vw,96px) 0" }
      }
    >
      <Container>
        {/* Header */}
        <div className="mb-12 lg:mb-14">
          {eyebrow && (
            <span
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: isDark ? "var(--color-brand-accent)" : "var(--color-brand-primary)" }}
            >
              {eyebrow}
            </span>
          )}
          {title && (
            <h2
              className="mt-3 font-extrabold tracking-[-0.03em] leading-[1.02]"
              style={{
                fontSize: "clamp(2rem,4vw+0.5rem,3.5rem)",
                color: isDark ? "rgba(255,255,255,0.92)" : "var(--color-text-primary)",
              }}
            >
              {title}
            </h2>
          )}
          {intro && (
            <p
              className="mt-3 max-w-2xl text-[length:var(--text-body-lg)] leading-relaxed"
              style={{ color: isDark ? "rgba(255,255,255,0.70)" : "var(--color-text-muted)" }}
            >
              {intro}
            </p>
          )}
        </div>

        <div className={useFeatured ? "gh-card-grid gh-card-grid--featured" : "gh-card-grid"}>
          {items.map((item) => (
            <ServiceCard key={item.href} {...item} dark={isDark} />
          ))}
        </div>
      </Container>
    </section>
  );
}
