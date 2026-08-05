import type { ToneKey } from "@/lib/tools/registry";

/**
 * Result/row tones for the health tools. Deliberately NOT the brand lime —
 * a clinical "your reading is raised" needs amber/red semantics that lime
 * cannot carry. Forest is reused for the healthy state so a good result still
 * reads as the brand.
 *
 * Plain data (no JSX) so both the server-rendered chart tables and the client
 * widgets can import it.
 */
export type TonePalette = { dot: string; text: string; bg: string; border: string };

/**
 * Same semantics on a dark surface. The instrument panel is `gh2-glass-forest`,
 * so the ivory palette below would put forest text on a forest fill — the
 * result number would vanish. Dots stay saturated (they read fine on dark),
 * text goes light, fills go translucent-white-plus-hue.
 */
export const TONE_DARK: Record<ToneKey, TonePalette> = {
  good: {
    dot: "#B0F122",
    text: "#D6F98A",
    bg: "rgba(176, 241, 34, 0.10)",
    border: "rgba(176, 241, 34, 0.28)",
  },
  warn: {
    dot: "#F2C14E",
    text: "#F5D48A",
    bg: "rgba(242, 193, 78, 0.12)",
    border: "rgba(242, 193, 78, 0.30)",
  },
  alert: {
    dot: "#F08A75",
    text: "#F6B3A3",
    bg: "rgba(240, 138, 117, 0.13)",
    border: "rgba(240, 138, 117, 0.32)",
  },
  muted: {
    dot: "rgba(255, 255, 255, 0.45)",
    text: "rgba(255, 255, 255, 0.72)",
    bg: "rgba(255, 255, 255, 0.06)",
    border: "rgba(255, 255, 255, 0.14)",
  },
};

export const TONE: Record<ToneKey, TonePalette> = {
  good: {
    dot: "#1D4B36",
    text: "#1D4B36",
    bg: "rgba(29, 75, 54, 0.07)",
    border: "rgba(29, 75, 54, 0.22)",
  },
  warn: {
    dot: "#B0761A",
    text: "#8A5B12",
    bg: "rgba(176, 118, 26, 0.09)",
    border: "rgba(176, 118, 26, 0.28)",
  },
  alert: {
    dot: "#A8321F",
    text: "#8E2A1A",
    bg: "rgba(168, 50, 31, 0.08)",
    border: "rgba(168, 50, 31, 0.26)",
  },
  muted: {
    dot: "#8A8F88",
    text: "#5A6159",
    bg: "rgba(45, 59, 54, 0.05)",
    border: "rgba(45, 59, 54, 0.14)",
  },
};
