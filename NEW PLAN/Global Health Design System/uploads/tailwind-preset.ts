// =====================================================================
// Global Health — Tailwind preset
// File: packages/design-tokens/tailwind-preset.ts
// Usage in each app:
//   import preset from "@global-health/design-tokens/tailwind-preset";
//   export default { presets: [preset], content: [...] }
// =====================================================================

import type { Config } from "tailwindcss";

// Helper: HSL CSS variable consumption with opacity support
const hsl = (variable: string) => `hsl(var(--${variable}) / <alpha-value>)`;

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        // GH Forest — primary brand scale
        "gh-forest": {
          50:  hsl("gh-forest-50"),
          100: hsl("gh-forest-100"),
          200: hsl("gh-forest-200"),
          300: hsl("gh-forest-300"),
          400: hsl("gh-forest-400"),
          500: hsl("gh-forest-500"),
          DEFAULT: hsl("gh-forest-500"),
          600: hsl("gh-forest-600"),
          700: hsl("gh-forest-700"),
          800: hsl("gh-forest-800"),
          900: hsl("gh-forest-900"),
        },

        // GH Olive — secondary brand
        "gh-olive": {
          100: hsl("gh-olive-100"),
          300: hsl("gh-olive-300"),
          500: hsl("gh-olive-500"),
          DEFAULT: hsl("gh-olive-500"),
          700: hsl("gh-olive-700"),
        },

        // GH Lime — high-energy accent
        "gh-lime": {
          100: hsl("gh-lime-100"),
          300: hsl("gh-lime-300"),
          500: hsl("gh-lime-500"),
          DEFAULT: hsl("gh-lime-500"),
          700: hsl("gh-lime-700"),
        },

        // Neutrals — body text, surfaces, borders
        neutral: {
          0:   hsl("neutral-0"),
          50:  hsl("neutral-50"),
          100: hsl("neutral-100"),
          200: hsl("neutral-200"),
          300: hsl("neutral-300"),
          400: hsl("neutral-400"),
          500: hsl("neutral-500"),
          600: hsl("neutral-600"),
          700: hsl("neutral-700"),
          800: hsl("neutral-800"),
          900: hsl("neutral-900"),
        },

        // Semantic tokens — components consume these directly
        background: hsl("background"),
        "background-elevated": hsl("background-elevated"),
        "background-sunken": hsl("background-sunken"),
        foreground: hsl("foreground"),
        "foreground-muted": hsl("foreground-muted"),
        "foreground-subtle": hsl("foreground-subtle"),
        border: hsl("border"),
        "border-strong": hsl("border-strong"),
        ring: hsl("ring"),
        primary: {
          DEFAULT: hsl("primary"),
          hover: hsl("primary-hover"),
          foreground: hsl("primary-foreground"),
        },
        accent: {
          DEFAULT: hsl("accent"),
          hover: hsl("accent-hover"),
          foreground: hsl("accent-foreground"),
        },

        // System status colors
        success: {
          DEFAULT: hsl("success"),
          bg: hsl("success-bg"),
        },
        warning: {
          DEFAULT: hsl("warning"),
          bg: hsl("warning-bg"),
        },
        danger: {
          DEFAULT: hsl("danger"),
          bg: hsl("danger-bg"),
        },
        info: {
          DEFAULT: hsl("info"),
          bg: hsl("info-bg"),
        },
      },

      fontFamily: {
        sans: ['"Gilroy"', '"Avenir Next"', '"Avenir"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        display: ['"Gilroy"', '"Avenir Next"', "sans-serif"], // bold/black weights
      },

      fontSize: {
        xs:   ["12px", { lineHeight: "16px" }],
        sm:   ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg:   ["18px", { lineHeight: "28px" }],
        xl:   ["20px", { lineHeight: "28px" }],
        "2xl": ["24px", { lineHeight: "32px" }],
        "3xl": ["30px", { lineHeight: "36px" }],
        "4xl": ["36px", { lineHeight: "40px" }],
        "5xl": ["48px", { lineHeight: "1.1" }],
        "6xl": ["64px", { lineHeight: "1.0" }],
      },

      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },

      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },

      // Tighter letter-spacing on Gilroy display weights
      letterSpacing: {
        tighter: "-0.04em",
        tight: "-0.02em",
        normal: "0",
        wide: "0.025em",
        wider: "0.05em",
        widest: "0.08em",
      },
    },
  },
};

export default preset;
