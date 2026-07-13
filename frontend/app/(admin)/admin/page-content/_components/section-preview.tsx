/** Tiny decorative schematic thumbnails so the admin can see, at a glance,
 * which public section a FormSection card edits. Each miniature mirrors the
 * real public component's theme + layout (see ServiceContentSections.tsx,
 * FAQSection.tsx, MedicalDisclaimer.tsx, RichBodySection.tsx, ServiceHero.tsx)
 * using the actual design-token literal values pulled from globals.css —
 * not approximated colors. Inline styles only — no new selectors added to
 * globals.css/portal.css (repo rule: a selector lives in exactly one of
 * those files; inline styles sidestep that). */
import type { CSSProperties, JSX } from "react";

// Literal values copied from frontend/app/globals.css — keep in sync if the
// token values there change.
const HERO_BG = "#031F18"; // ServiceHero canvas (not the lighter gh2-section-forest)
const FOREST_GRADIENT = "linear-gradient(178deg, #12342A 0%, #0F2E25 100%)"; // .gh2-section-forest
const IVORY_GRADIENT = "linear-gradient(180deg, #fffdf1 0%, #f6f8f1 52%, #edf2e2 100%)"; // .gh2-section-ivory
const LIME = "#B0F122"; // --color-brand-accent
const BRAND_PRIMARY = "#1D4B36"; // --color-brand-primary / --color-text-primary
const TEXT_BODY = "#2D3B36"; // --color-text-body
const BORDER = "#E4E7DD"; // --color-border
const GLASS_FOREST_BG = "rgba(4,32,24,0.92)"; // .gh2-glass-forest fill
const GLASS_BORDER = "rgba(255,255,255,0.12)"; // .gh2-glass-forest border (approx)

type PreviewKind =
  | "hero"
  | "intro"
  | "whoFor"
  | "whyChoose"
  | "faq"
  | "disclaimer"
  | "body"
  | "seo";

const FRAME_STYLE: CSSProperties = {
  width: 180,
  height: 96,
  maxWidth: "100%",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  overflow: "hidden",
  flexShrink: 0,
  position: "relative",
};

function Line({
  width,
  height = 4,
  color,
  top,
  left = 10,
  radius = 2,
}: {
  width: number;
  height?: number;
  color: string;
  top: number;
  left?: number;
  radius?: number;
}): JSX.Element {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width,
        height,
        background: color,
        borderRadius: radius,
      }}
    />
  );
}

/** Small filled circle used as a stand-in for a check/tick icon. */
function CheckDot({ top, left, size = 12 }: { top: number; left: number; size?: number }) {
  return (
    <span
      style={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(29,75,54,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ width: size * 0.4, height: size * 0.4, borderRadius: "50%", background: BRAND_PRIMARY }} />
    </span>
  );
}

/** Lime circular "+" — the FAQ accordion's expand affordance. */
function PlusIcon({ top, left }: { top: number; left: number }) {
  return (
    <span
      style={{
        position: "absolute",
        top,
        left,
        width: 10,
        height: 10,
        borderRadius: "50%",
        border: `1px solid rgba(176,241,34,0.6)`,
      }}
    >
      <span style={{ position: "absolute", top: 4.5, left: 2, width: 6, height: 1, background: LIME }} />
      <span style={{ position: "absolute", top: 2, left: 4.5, width: 1, height: 6, background: LIME }} />
    </span>
  );
}

function HeroPreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: HERO_BG }}>
      {/* two-tone headline: ivory lead + lime accent word */}
      <Line width={100} height={8} color="#F5FFF8" top={8} radius={3} />
      <Line width={56} height={7} color={LIME} top={19} radius={3} />
      <Line width={90} height={3.5} color="rgba(255,255,255,0.45)" top={31} />
      {/* dual CTA pills */}
      <div style={{ position: "absolute", top: 41, left: 10, width: 48, height: 13, borderRadius: 999, background: LIME }} />
      <div
        style={{
          position: "absolute",
          top: 41,
          left: 62,
          width: 40,
          height: 13,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.55)",
        }}
      />
      {/* three-up feature-card row */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 59,
            left: 10 + i * 44,
            width: 38,
            height: 20,
            borderRadius: 6,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <span style={{ position: "absolute", top: 3, left: 4, width: 6, height: 6, borderRadius: "50%", background: "rgba(176,241,34,0.2)" }} />
          <span style={{ position: "absolute", top: 12, left: 4, width: 28, height: 3, borderRadius: 1.5, background: "rgba(255,255,255,0.55)" }} />
        </div>
      ))}
    </div>
  );
}

function IntroPreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: IVORY_GRADIENT }}>
      <Line width={54} height={5} color={BRAND_PRIMARY} top={14} radius={2} />
      {/* large lede paragraph — bigger line-height than plain body copy */}
      <Line width={155} height={7} color={TEXT_BODY} top={26} />
      <Line width={135} height={7} color={TEXT_BODY} top={37} />
      <Line width={95} height={7} color={TEXT_BODY} top={48} />
    </div>
  );
}

function WhoForPreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: IVORY_GRADIENT }}>
      <Line width={64} height={5} color={BRAND_PRIMARY} top={10} radius={2} />
      {/* sm:grid-cols-2 checklist rows — no card boxes, just icon + line */}
      {Array.from({ length: 6 }, (_, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const left = 10 + col * 85;
        const top = 23 + row * 15;
        return (
          <div key={i}>
            <CheckDot top={top} left={left} />
            <Line width={58} height={3.5} color="#9aa08c" top={top + 4} left={left + 16} />
          </div>
        );
      })}
    </div>
  );
}

function WhyChoosePreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: IVORY_GRADIENT }}>
      <Line width={54} height={5} color={BRAND_PRIMARY} top={9} radius={2} />
      <Line width={90} height={6} color="var(--color-text-primary)" top={18} radius={2} />
      {/* the cards themselves are always dark forest-glass, even on the ivory section */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 30,
            left: 10 + i * 55,
            width: 50,
            height: 52,
            borderRadius: 6,
            background: GLASS_FOREST_BG,
            border: `1px solid ${GLASS_BORDER}`,
          }}
        >
          <span style={{ position: "absolute", top: 6, left: 6, width: 11, height: 11, borderRadius: "50%", background: LIME }} />
          <span style={{ position: "absolute", top: 22, left: 6, width: 38, height: 3, borderRadius: 1.5, background: "rgba(255,255,255,0.85)" }} />
          <span style={{ position: "absolute", top: 29, left: 6, width: 30, height: 3, borderRadius: 1.5, background: "rgba(255,255,255,0.55)" }} />
        </div>
      ))}
    </div>
  );
}

function FaqPreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: FOREST_GRADIENT }}>
      <Line width={44} height={4.5} color={LIME} top={9} radius={2} />
      <Line width={58} height={7} color="rgba(255,255,255,0.95)" top={17} radius={2} />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 31 + i * 18,
            left: 10,
            width: 160,
            height: 14,
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Line width={108} height={3.5} color="rgba(255,255,255,0.80)" top={5} left={8} />
          <PlusIcon top={2} left={140} />
        </div>
      ))}
    </div>
  );
}

function DisclaimerPreview() {
  // MedicalDisclaimer's "full" variant renders on the dark gh2-section-forest
  // canvas with a bordered gh2-glass-forest card, not a pale legal-notice band.
  return (
    <div style={{ ...FRAME_STYLE, background: FOREST_GRADIENT }}>
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          right: 8,
          bottom: 8,
          borderRadius: 8,
          background: GLASS_FOREST_BG,
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      >
        <Line width={64} height={4} color={LIME} top={10} left={10} radius={2} />
        {Array.from({ length: 4 }, (_, i) => (
          <Line
            key={i}
            width={148 - (i % 2) * 22}
            height={3}
            color="rgba(255,255,255,0.72)"
            top={22 + i * 10}
            left={10}
          />
        ))}
      </div>
    </div>
  );
}

function BodyPreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: IVORY_GRADIENT }}>
      <Line width={92} height={7} color="var(--color-text-primary)" top={10} radius={2} />
      {Array.from({ length: 4 }, (_, i) => (
        <Line key={i} width={155 - (i % 3) * 18} height={3.5} color={TEXT_BODY} top={26 + i * 11} />
      ))}
      {/* hint of a bulleted list */}
      <Line width={4} height={4} color={BRAND_PRIMARY} top={71} left={10} radius={2} />
      <Line width={90} height={3.5} color={TEXT_BODY} top={71} left={20} />
    </div>
  );
}

function SeoPreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: "#ffffff", border: `1px solid ${BORDER}` }}>
      <Line width={140} height={6} color="#1a0dab" top={13} radius={2} />
      <Line width={90} height={4} color="#006621" top={26} radius={2} />
      <Line width={158} height={3.5} color="#545454" top={38} />
      <Line width={130} height={3.5} color="#545454" top={47} />
    </div>
  );
}

const PREVIEWS: Record<PreviewKind, () => JSX.Element> = {
  hero: HeroPreview,
  intro: IntroPreview,
  whoFor: WhoForPreview,
  whyChoose: WhyChoosePreview,
  faq: FaqPreview,
  disclaimer: DisclaimerPreview,
  body: BodyPreview,
  seo: SeoPreview,
};

// Public-facing label per kind — matches the FormSection titles in
// page-content-editor.tsx so the tag is unambiguous even out of context.
const LABELS: Record<PreviewKind, string> = {
  hero: "Hero",
  intro: "Intro",
  whoFor: "Who it's for",
  whyChoose: "Why choose",
  faq: "FAQ",
  disclaimer: "Disclaimer",
  body: "Body",
  seo: "SEO snippet",
};

// Kinds whose frame renders on a dark canvas — the overlay label needs a
// light tint there instead of the default forest tint.
const DARK_KINDS = new Set<PreviewKind>(["hero", "faq", "disclaimer"]);

/** Decorative mini schematic of the matching public section, so the admin
 * can see at a glance which part of the page a card edits. Rendered in the
 * FormSection header's `right` slot — snug at the card's top-right, tiny
 * caption underneath. Thumbnail is aria-hidden (purely visual). */
export function SectionPreview({ kind }: { kind: PreviewKind }) {
  const Preview = PREVIEWS[kind];
  const dark = DARK_KINDS.has(kind);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
      <div aria-hidden="true" style={{ position: "relative", maxWidth: "100%" }}>
        <Preview />
        <span
          style={{
            position: "absolute",
            bottom: 4,
            left: 8,
            fontSize: 7,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: dark ? "rgba(255,255,255,0.55)" : "rgba(29,75,54,0.55)",
            pointerEvents: "none",
          }}
        >
          {LABELS[kind]}
        </span>
      </div>
      <span
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
        }}
      >
        Live section preview
      </span>
    </div>
  );
}
