import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest config for the frontend unit-test surface.
 *
 * Scope:
 *   - `tests/unit/**` and any `*.test.ts(x)` inside `lib/` or
 *     `components/`. Excludes `tests/e2e` (Playwright) and `app/`
 *     (Next.js owns its compilation pipeline; testing RSCs requires
 *     extra plumbing, defer until needed).
 *
 * Run with `pnpm --filter frontend test`.
 */
export default defineConfig({
  test: {
    include: [
      "tests/unit/**/*.{test,spec}.{ts,tsx}",
      "lib/**/*.{test,spec}.{ts,tsx}",
      "components/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    environment: "node",
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
