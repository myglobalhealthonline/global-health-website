import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard against mangled separators in metadata template literals.
 *
 * `feat(seo): server-render the real <html lang> via multi-root layouts`
 * shipped `${title} ? ${config.name}` in three route files — an em dash that
 * lost its encoding somewhere between editor and commit. It survived review
 * and a full crawl because a literal "?" is valid syntax and valid HTML; only
 * reading the served <title> exposed it ("Book your consultation ? Ireland").
 *
 * Every `[country]/[lang]` route joins a title to the country name with " — ",
 * so a bare " ? " between two interpolations is always the corrupted form.
 */
const SRC_ROOTS = ["app", "components", "lib"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const SKIP_DIRECTORIES = new Set(["node_modules", ".next", "dist"]);

// A " ? " sitting between a closing `}` and an opening `${` inside a template
// literal. A real ternary needs an operand before the "?", never `} ? ${`.
const MANGLED_SEPARATOR = /\}\s\?\s\$\{/u;

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry)) found.push(...sourceFiles(full));
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry))) {
      found.push(full);
    }
  }
  return found;
}

describe("metadata separators", () => {
  it("uses an em dash, not a mangled '?', between interpolations", () => {
    const repoRoot = path.resolve(__dirname, "../..");
    const offenders: string[] = [];

    for (const root of SRC_ROOTS) {
      for (const file of sourceFiles(path.join(repoRoot, root))) {
        const source = readFileSync(file, "utf8");
        source.split("\n").forEach((line, index) => {
          if (MANGLED_SEPARATOR.test(line)) {
            offenders.push(`${path.relative(repoRoot, file)}:${index + 1}`);
          }
        });
      }
    }

    expect(offenders).toEqual([]);
  });
});
