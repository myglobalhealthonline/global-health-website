/** Tiny decorative schematic thumbnails so the admin can see, at a glance,
 * which public section a FormSection card edits. Inline styles only — no
 * new selectors added to globals.css/portal.css (repo rule: a selector
 * lives in exactly one of those files; inline styles sidestep that). */
import type { CSSProperties, JSX } from "react";

const FOREST = "#0f2e24";
const IVORY = "#f7f6ee";
const LIME = "#c8e05a";
const SOFT = "#eef0e4";

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
  height: 90,
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  overflow: "hidden",
  flexShrink: 0,
  position: "relative",
};

function Line({
  width,
  height = 5,
  color,
  top,
  left = 10,
  radius = 2,
  italic = false,
}: {
  width: number;
  height?: number;
  color: string;
  top: number;
  left?: number;
  radius?: number;
  italic?: boolean;
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
        transform: italic ? "skewX(-8deg)" : undefined,
      }}
    />
  );
}

function Dot({ top, left, color }: { top: number; left: number; color: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: color,
      }}
    />
  );
}

function HeroPreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: FOREST }}>
      <Line width={110} height={9} color={IVORY} top={18} radius={3} />
      <Line width={60} height={7} color={LIME} top={31} radius={3} italic />
      <Line width={90} height={4} color="rgba(247,246,238,0.45)" top={46} />
      <div
        style={{
          position: "absolute",
          top: 62,
          left: 10,
          width: 54,
          height: 16,
          borderRadius: 999,
          background: LIME,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 62,
          left: 70,
          width: 44,
          height: 16,
          borderRadius: 999,
          border: "1px solid rgba(247,246,238,0.6)",
        }}
      />
    </div>
  );
}

function IntroPreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: IVORY }}>
      <Line width={80} height={4} color="#9aa08c" top={38} left={50} />
      <Line width={100} height={4} color="#9aa08c" top={48} left={40} />
    </div>
  );
}

function WhoForPreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: IVORY }}>
      <Line width={70} height={6} color={FOREST} top={10} radius={2} />
      {Array.from({ length: 6 }, (_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 26 + row * 26,
              left: 10 + col * 55,
              width: 48,
              height: 20,
              borderRadius: 4,
              background: SOFT,
              border: "1px solid var(--color-border)",
            }}
          >
            <Dot top={7} left={5} color={LIME} />
          </div>
        );
      })}
    </div>
  );
}

function WhyChoosePreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: SOFT }}>
      <Line width={70} height={6} color={FOREST} top={10} radius={2} />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 26 + i * 20,
            left: 10,
            width: 160,
            height: 15,
            borderRadius: 4,
            background: IVORY,
            border: "1px solid var(--color-border)",
          }}
        />
      ))}
    </div>
  );
}

function FaqPreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: FOREST }}>
      <Line width={50} height={6} color={IVORY} top={10} radius={2} />
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <Line width={130} height={4} color="rgba(247,246,238,0.55)" top={28 + i * 18} />
          <Dot top={26 + i * 18} left={150} color={LIME} />
        </div>
      ))}
    </div>
  );
}

function DisclaimerPreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: "#efece0", border: "1px solid #d8d4c2" }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Line key={i} width={160 - (i % 2) * 20} height={3} color="#8b8672" top={12 + i * 13} />
      ))}
    </div>
  );
}

function BodyPreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: IVORY }}>
      <Line width={70} height={6} color={FOREST} top={10} radius={2} />
      {Array.from({ length: 4 }, (_, i) => (
        <Line key={i} width={155 - (i % 3) * 15} height={4} color="#9aa08c" top={26 + i * 12} />
      ))}
    </div>
  );
}

function SeoPreview() {
  return (
    <div style={{ ...FRAME_STYLE, background: "#ffffff" }}>
      <Line width={130} height={6} color="#1a0dab" top={14} radius={2} />
      <Line width={90} height={4} color="#006621" top={28} radius={2} />
      <Line width={155} height={3.5} color="#545454" top={40} />
      <Line width={140} height={3.5} color="#545454" top={49} />
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

/** Decorative mini schematic of the matching public section, so the admin
 * can see at a glance which part of the page a card edits. Rendered in the
 * FormSection header's `right` slot — snug at the card's top-right, tiny
 * caption underneath. Thumbnail is aria-hidden (purely visual). */
export function SectionPreview({ kind }: { kind: PreviewKind }) {
  const Preview = PREVIEWS[kind];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
      <div aria-hidden="true" style={{ maxWidth: "100%" }}>
        <Preview />
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
