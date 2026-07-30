import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Perf-oriented rule from eslint-plugin-react-hooks v6. The flagged
      // effects (HeroReveal, last-country, brazil-consent, …) are
      // pre-existing and behavior-correct; keep as a warning so it does not
      // block `next build`. Proper effect refactors are tracked in
      // docs/design/public-website/phase-2-redundancy-imagery-plan.md.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright specs use the @playwright/test runner — not the
    // app's tsconfig — so ESLint doesn't need to see them.
    "tests/e2e/**",
  ]),
]);

export default eslintConfig;
