/**
 * Health-test kit page sections.
 *
 * The kit pages carry four content blocks that the generic service sections
 * rendered too flatly: a biomarker manifest, the reasons to test, the
 * collection steps, and the prep notes. Each one below is shaped to its
 * content — a numbered rail for a sequence, an indexed manifest for a list of
 * measured markers — rather than reusing one card grid four times.
 *
 * Content-driven: props in, no data fetching. Forest/lime/ivory tokens only.
 */

import type { ReactNode } from "react";
import {
  Ban,
  ChevronDown,
  Clock,
  Droplet,
  FlaskConical,
  Hand,
  Info,
  Moon,
  Pill,
  Scissors,
  Utensils,
} from "lucide-react";
import { SectionSeam } from "@/components/ui/SectionSeam";

/** "Heading\nBody" blocks, separated by blank lines — the shape the kit
 *  seeder writes into `extraSections`. Falls back to a bodyless entry so a
 *  hand-authored section without headings still renders. */
export function parseTitledNotes(body: string): Array<{ heading: string; body: string }> {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [first, ...rest] = block.split("\n");
      return { heading: first.trim(), body: rest.join(" ").trim() };
    });
}

const SECTION_PAD = { padding: "clamp(56px,7vw,104px) 0" } as const;

function Eyebrow({ dark, children }: { dark?: boolean; children: ReactNode }) {
  return (
    <p
      className="text-[11px] font-bold uppercase tracking-[0.2em]"
      style={{ color: dark ? "var(--color-brand-accent)" : "var(--color-brand-primary)" }}
    >
      {children}
    </p>
  );
}

function Heading({ dark, children }: { dark?: boolean; children: ReactNode }) {
  return (
    <h2
      className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.04]"
      style={{
        fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.75rem)",
        color: dark ? "rgba(255,255,255,0.95)" : "var(--color-text-primary)",
        maxWidth: "20ch",
      }}
    >
      {children}
    </h2>
  );
}

// ── What's included — indexed biomarker manifest ─────────────────────

/**
 * A measured-marker list reads as a specification, not a list of benefits, so
 * it gets hairline rows and a monospace index instead of ticks in cards.
 */
/** "Panel: marker, marker" splits into an expandable row; anything without a
 *  colon is a single line. Only a colon followed by a space counts, so a
 *  marker written as "Ratio: total:HDL" is not mistaken for a panel. */
function parsePanel(entry: string): { name: string; markers: string[] } {
  const at = entry.indexOf(": ");
  if (at < 0) return { name: entry, markers: [] };
  const markers = entry
    .slice(at + 2)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return markers.length > 0 ? { name: entry.slice(0, at), markers } : { name: entry, markers: [] };
}

export function BiomarkerManifestSection({
  eyebrow,
  title,
  items,
  countTemplate,
}: {
  eyebrow: string;
  title: string;
  items: string[];
  /** Chip template beside the heading, e.g. "{count} markers". Counts the
   *  markers inside panels, not the number of rows. */
  countTemplate?: string;
}) {
  const rows = items.map(parsePanel);
  const total = rows.reduce((n, r) => n + Math.max(1, r.markers.length), 0);
  const countLabel = countTemplate && total > 1 ? countTemplate.replace("{count}", String(total)) : undefined;
  return (
    <section
      className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel relative overflow-hidden"
      style={SECTION_PAD}
    >
      <SectionSeam theme="light" />
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <Heading>{title}</Heading>
          </div>
          {countLabel ? (
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-bold uppercase tracking-[0.12em]"
              style={{
                background: "rgba(29,75,54,0.07)",
                border: "1px solid rgba(29,75,54,0.16)",
                color: "var(--color-brand-primary)",
              }}
            >
              <FlaskConical className="size-3.5" strokeWidth={2} aria-hidden />
              {countLabel}
            </span>
          ) : null}
        </div>

        <ul className="mt-10 grid gap-x-12 sm:grid-cols-2">
          {rows.map((row, i) => (
            <li
              key={row.name}
              className="border-t"
              style={{ borderColor: "rgba(29,75,54,0.14)" }}
            >
              {row.markers.length > 0 ? (
                /* Native <details> — a disclosure needs no JavaScript, stays
                   keyboard-operable, and is findable by in-page search when
                   closed in browsers that support hidden-content matching. */
                <details>
                  <summary className="flex cursor-pointer list-none items-baseline gap-4 py-4 [&::-webkit-details-marker]:hidden">
                    <span
                      className="shrink-0 text-[12px] font-bold [font-variant-numeric:tabular-nums]"
                      style={{ color: "rgba(29,75,54,0.42)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="flex-1 text-[15.5px] leading-relaxed"
                      style={{ color: "var(--color-text-body)" }}
                    >
                      {row.name}
                      <span className="ml-2 text-[13px]" style={{ color: "rgba(29,75,54,0.50)" }}>
                        ({row.markers.length})
                      </span>
                    </span>
                    <ChevronDown
                      /* Rotation lives in globals.css — Tailwind's group-open
                         variant emits no rotation in this setup. */
                      className="gh-manifest-chevron mt-1 size-4 shrink-0"
                      style={{ color: "var(--color-brand-primary)" }}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </summary>
                  <ul className="flex flex-wrap gap-2 pb-5 pl-9">
                    {row.markers.map((m) => (
                      <li
                        key={m}
                        className="rounded-full px-3 py-1.5 text-[13px]"
                        style={{
                          background: "rgba(29,75,54,0.06)",
                          border: "1px solid rgba(29,75,54,0.14)",
                          color: "var(--color-text-body)",
                        }}
                      >
                        {m}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <div className="flex items-baseline gap-4 py-4">
                  <span
                    className="shrink-0 text-[12px] font-bold [font-variant-numeric:tabular-nums]"
                    style={{ color: "rgba(29,75,54,0.42)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="text-[15.5px] leading-relaxed"
                    style={{ color: "var(--color-text-body)" }}
                  >
                    {row.name}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Why should you test — editorial reason list ──────────────────────

/**
 * These entries are symptoms and situations, not selling points, so they get
 * a quiet numbered rail rather than green ticks — a tick beside "Persistent
 * fatigue or low mood" reads as endorsement.
 */
export function ReasonsToTestSection({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: string[];
}) {
  return (
    <section
      className="gh-medical-pattern gh-medical-pattern-dark gh2-section-forest relative overflow-hidden"
      style={SECTION_PAD}
    >
      <SectionSeam theme="dark" />
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <Eyebrow dark>{eyebrow}</Eyebrow>
            <Heading dark>{title}</Heading>
          </div>

          <ul className="lg:pt-3">
            {items.map((item, i) => (
              <li
                key={item}
                className="flex items-baseline gap-5 border-b py-5 first:border-t"
                style={{ borderColor: "rgba(255,255,255,0.10)" }}
              >
                <span
                  className="shrink-0 text-[12px] font-bold [font-variant-numeric:tabular-nums]"
                  style={{ color: "var(--color-brand-accent)", opacity: 0.75 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="leading-relaxed"
                  style={{
                    fontSize: "clamp(0.98rem, 0.5vw + 0.85rem, 1.12rem)",
                    color: "rgba(255,255,255,0.84)",
                  }}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── How it works — numbered collection rail ──────────────────────────

/**
 * Four steps in a fixed order. Desktop lays them along a horizontal rule with
 * the numerals sitting on it; mobile drops to a vertical timeline so the
 * sequence still reads top-to-bottom.
 */
export function KitStepsSection({
  eyebrow,
  title,
  steps,
}: {
  eyebrow: string;
  title: string;
  steps: Array<{ heading: string; body: string }>;
}) {
  return (
    <section
      className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel relative overflow-hidden"
      style={SECTION_PAD}
    >
      <SectionSeam theme="light" />
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading>{title}</Heading>

        <ol
          className="mt-12 grid gap-x-8 gap-y-10"
          style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 220px), 1fr))` }}
        >
          {steps.map((step, i) => (
            <li key={step.heading} className="relative">
              {/* Rail — runs behind the numeral, stopping at the last step. */}
              {i < steps.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute left-0 top-[21px] hidden h-px w-full sm:block"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(29,75,54,0.28) 0%, rgba(29,75,54,0.10) 100%)",
                  }}
                />
              ) : null}

              <span
                className="relative inline-flex size-[42px] items-center justify-center rounded-full text-[14px] font-extrabold [font-variant-numeric:tabular-nums]"
                style={{
                  background: "var(--color-brand-accent)",
                  color: "#0a1f14",
                  boxShadow: "0 0 0 6px var(--color-background-page)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <h3
                className="mt-5 font-extrabold tracking-[-0.02em] leading-tight"
                style={{ fontSize: "clamp(1.05rem,1.4vw,1.22rem)", color: "var(--color-text-primary)" }}
              >
                {step.heading}
              </h3>
              {step.body ? (
                <p
                  className="mt-2.5 text-[14.5px] leading-relaxed"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {step.body}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── What to know before testing — prep notes ─────────────────────────

/** Pick an icon from the note's heading. Falls back to a neutral info mark,
 *  so a new note never renders iconless. */
function prepIcon(heading: string) {
  const h = heading.toLowerCase();
  if (/fast|eat normally|by mouth|gluten/.test(h)) return Utensils;
  if (/water|hydrat/.test(h)) return Droplet;
  if (/biotin|supplement/.test(h)) return Pill;
  if (/10am|morning|cycle|same day|days|wait|antibiotic/.test(h)) return Clock;
  if (/gel|cream|spray|hrt/.test(h)) return Hand;
  if (/polish|nail|clip/.test(h)) return Scissors;
  if (/rest|avoid|no need|nothing to/.test(h)) return Ban;
  if (/contracept|pill/.test(h)) return Moon;
  return Info;
}

/**
 * Prep instructions decide whether a result is usable, so they sit in a
 * tinted advisory panel above the FAQs rather than reading as more marketing
 * copy. Each note keeps its own heading and icon.
 */
export function KitPrepSection({
  eyebrow,
  title,
  notes,
}: {
  eyebrow: string;
  title: string;
  notes: Array<{ heading: string; body: string }>;
}) {
  return (
    <section
      className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel relative overflow-hidden"
      style={SECTION_PAD}
    >
      <SectionSeam theme="light" />
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div
          className="rounded-[var(--radius-card)] p-6 sm:p-8 lg:p-10"
          style={{
            background: "rgba(176,241,34,0.07)",
            border: "1px solid rgba(29,75,54,0.18)",
          }}
        >
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2
            className="mt-3 font-extrabold tracking-[-0.02em] leading-tight"
            style={{
              fontSize: "clamp(1.4rem, 2vw + 0.5rem, 2rem)",
              color: "var(--color-text-primary)",
              maxWidth: "26ch",
            }}
          >
            {title}
          </h2>

          <ul className="mt-8 grid gap-x-10 gap-y-1 lg:grid-cols-2">
            {notes.map((note) => {
              const Icon = prepIcon(note.heading);
              return (
                <li
                  key={note.heading}
                  className="flex gap-4 border-t py-5"
                  style={{ borderColor: "rgba(29,75,54,0.14)" }}
                >
                  <span
                    className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                    style={{
                      background: "rgba(29,75,54,0.09)",
                      border: "1px solid rgba(29,75,54,0.14)",
                      color: "var(--color-brand-primary)",
                    }}
                  >
                    <Icon className="size-4" strokeWidth={1.9} aria-hidden />
                  </span>
                  <div>
                    <h3
                      className="font-bold leading-snug"
                      style={{ fontSize: "15.5px", color: "var(--color-text-primary)" }}
                    >
                      {note.heading}
                    </h3>
                    {note.body ? (
                      <p
                        className="mt-1.5 text-[14.5px] leading-relaxed"
                        style={{ color: "var(--color-text-body)" }}
                      >
                        {note.body}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
