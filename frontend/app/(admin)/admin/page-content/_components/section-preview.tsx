/** Preview thumbnails so the admin can see, at a glance, which public
 * section a FormSection card edits. Hero/intro/who-for/why-choose/FAQ/
 * disclaimer render REAL screenshots of the live IE GP hub
 * (/ie/en/gp-appointment), captured once via Playwright into
 * frontend/public/admin/section-previews/{kind}.png — see git history for
 * the (deleted) capture script. Body has no live section (content cleared)
 * and SEO has no visual section, so those two keep a decorative schematic
 * mirroring the real public component's theme (see RichBodySection.tsx) —
 * not approximated colors, the actual design-token literal values pulled
 * from globals.css. Inline styles only — no new selectors added to
 * globals.css/portal.css (repo rule: a selector lives in exactly one of
 * those files; inline styles sidestep that). */
import type { CSSProperties, JSX } from "react";

// Literal values copied from frontend/app/globals.css — keep in sync if the
// token values there change.
const IVORY_GRADIENT = "linear-gradient(180deg, #fffdf1 0%, #f6f8f1 52%, #edf2e2 100%)"; // .gh2-section-ivory
const BRAND_PRIMARY = "#1D4B36"; // --color-brand-primary / --color-text-primary
const TEXT_BODY = "#2D3B36"; // --color-text-body
const BORDER = "#E4E7DD"; // --color-border

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

// Kinds with a real captured screenshot in public/admin/section-previews/.
const IMAGE_KINDS = new Set<PreviewKind>([
  "hero",
  "intro",
  "whoFor",
  "whyChoose",
  "faq",
  "disclaimer",
]);

function ImagePreview({ kind }: { kind: PreviewKind }) {
  return (
    <div style={FRAME_STYLE}>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static local
          crop in an admin-only aside; next/image's optimizer is unneeded overhead here. */}
      <img
        src={`/admin/section-previews/${kind}.png`}
        alt=""
        aria-hidden="true"
        width={180}
        height={96}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
      />
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

const SCHEMATIC_PREVIEWS: Partial<Record<PreviewKind, () => JSX.Element>> = {
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

/** Preview of the matching public section, so the admin can see at a
 * glance which part of the page a card edits. Rendered in the FormSection
 * header's `right` slot — snug at the card's top-right, tiny caption
 * underneath. Thumbnail is aria-hidden (purely visual). */
export function SectionPreview({ kind }: { kind: PreviewKind }) {
  const dark = DARK_KINDS.has(kind);
  const Schematic = SCHEMATIC_PREVIEWS[kind];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
      <div aria-hidden="true" style={{ position: "relative", maxWidth: "100%" }}>
        {IMAGE_KINDS.has(kind) ? <ImagePreview kind={kind} /> : Schematic ? <Schematic /> : null}
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
