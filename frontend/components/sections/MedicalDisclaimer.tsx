/**
 * Medical disclaimer box — clearly visible, sits below the main page
 * content and above the footer. Two variants:
 *   - "full"  → a bordered card section with every disclaimer paragraph.
 *   - "short" → a compact inline notice for tight spaces (e.g. beside a
 *     booking form / confirmation step).
 *
 * The notice card itself is always forest glass; `theme` only chooses the
 * band it sits on. Content is passed in (per-country PageContent CMS).
 */

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SectionSeam } from "@/components/ui/SectionSeam";

type FullProps = {
  variant?: "full";
  /** One string per paragraph. */
  paragraphs: string[];
  title?: string;
  /** Band behind the card: "dark" (default) = forest section, "light" =
   *  ivory section for pages that opt into the CMS green/ivory picker.
   *  The card stays forest glass either way. */
  theme?: "dark" | "light";
};

type ShortProps = {
  variant: "short";
  /** Compact notice. Paragraphs may be separated by blank lines. */
  text: string;
  title?: string;
  /** Optional trailing link to the full disclaimer (e.g. doctor profiles). */
  link?: { href: string; label: string };
};

export type MedicalDisclaimerProps = FullProps | ShortProps;

export function MedicalDisclaimer(props: MedicalDisclaimerProps) {
  if (props.variant === "short") {
    const paragraphs = props.text
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
      .filter(Boolean);
    return (
      <div
        role="note"
        className="flex gap-3 rounded-[var(--radius-card)] p-4 gh2-glass-forest"
        style={{
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      >
        <ShieldAlert
          className="mt-0.5 size-4 shrink-0"
          style={{ color: "var(--color-brand-accent)" }}
          aria-hidden
        />
        <div
          className="space-y-2 text-xs leading-relaxed"
          style={{ color: "rgba(255,255,255,0.72)" }}
        >
          {paragraphs.map((para, i) => (
            <p key={i}>
              {i === 0 ? (
                <span className="font-semibold" style={{ color: "var(--color-brand-accent)" }}>
                  {props.title ?? "Medical disclaimer."}{" "}
                </span>
              ) : null}
              {para}
            </p>
          ))}
          {props.link ? (
            <p>
              <Link
                href={props.link.href}
                className="font-semibold underline underline-offset-2"
                style={{ color: "var(--color-brand-accent)" }}
              >
                {props.link.label}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const { paragraphs, title = "Medical disclaimer", theme = "dark" } = props;
  const light = theme === "light";

  return (
    <section
      aria-label={title}
      className={
        light
          ? "relative gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
          : "relative gh2-section-forest gh-medical-pattern gh-medical-pattern-dark"
      }
      style={{
        padding: "clamp(40px,5vw,72px) 0",
      }}
    >
      <SectionSeam theme={light ? "light" : "dark"} />
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        {/* The card is forest glass on BOTH themes — `theme` only picks the
            band behind it. A white card here read as a flat notice box and
            was the one place on the site where this component looked
            different from every other page. */}
        <div
          className="gh2-glass-forest gh2-dark-content rounded-[var(--radius-card)] p-6 sm:p-8 lg:p-10"
          style={{ border: "1px solid rgba(255,255,255,0.14)" }}
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert
              className="size-5"
              style={{ color: "var(--color-brand-accent)" }}
              aria-hidden
            />
            <h2
              className="text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ color: "var(--color-brand-accent)" }}
            >
              {title}
            </h2>
          </div>

          <div className="mt-5 space-y-4">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.72)" }}
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
