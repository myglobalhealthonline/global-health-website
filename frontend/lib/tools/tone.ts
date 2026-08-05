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
export const TONE: Record<ToneKey, { dot: string; text: string; bg: string; border: string }> = {
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
