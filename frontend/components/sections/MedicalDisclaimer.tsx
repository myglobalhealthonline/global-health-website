/**
 * Medical disclaimer box — clearly visible, sits below the main page
 * content and above the footer. Two variants:
 *   - "full"  → a bordered card section with every disclaimer paragraph.
 *   - "short" → a compact inline notice for tight spaces (e.g. beside a
 *     booking form / confirmation step).
 *
 * Light-theme by default to read as a serious legal notice rather than a
 * marketing band. Content is passed in (see ireland-service-content.ts).
 */

import { ShieldAlert } from "lucide-react";

type FullProps = {
  variant?: "full";
  /** One string per paragraph. */
  paragraphs: string[];
  title?: string;
};

type ShortProps = {
  variant: "short";
  /** A single compact notice line. */
  text: string;
  title?: string;
};

export type MedicalDisclaimerProps = FullProps | ShortProps;

export function MedicalDisclaimer(props: MedicalDisclaimerProps) {
  if (props.variant === "short") {
    return (
      <div
        role="note"
        className="flex gap-3 rounded-[var(--radius-card)] p-4"
        style={{
          background: "rgba(29,75,54,0.05)",
          border: "1px solid rgba(29,75,54,0.16)",
        }}
      >
        <ShieldAlert
          className="mt-0.5 size-4 shrink-0"
          style={{ color: "var(--color-brand-primary)" }}
          aria-hidden
        />
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          <span className="font-semibold text-[var(--color-text-body)]">
            {props.title ?? "Medical disclaimer."}{" "}
          </span>
          {props.text}
        </p>
      </div>
    );
  }

  const { paragraphs, title = "Medical disclaimer" } = props;

  return (
    <section
      aria-label="Medical disclaimer"
      style={{
        background: "var(--color-background-soft)",
        padding: "clamp(40px,5vw,72px) 0",
        borderTop: "1px solid rgba(29,75,54,0.10)",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div
          className="rounded-[var(--radius-card)] p-6 sm:p-8 lg:p-10"
          style={{
            background: "var(--color-background-page)",
            border: "1px solid rgba(29,75,54,0.18)",
            boxShadow: "0 2px 16px rgba(29,75,54,0.06)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert
              className="size-5"
              style={{ color: "var(--color-brand-primary)" }}
              aria-hidden
            />
            <h2
              className="text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ color: "var(--color-brand-primary)" }}
            >
              {title}
            </h2>
          </div>

          <div className="mt-5 space-y-4">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-text-muted)", maxWidth: "78ch" }}
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
