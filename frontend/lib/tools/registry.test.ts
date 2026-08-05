import { describe, expect, it } from "vitest";
import { TOOLS, TOOL_SLUGS, getToolsCopy } from "./registry";
import type { LocaleCode } from "@/lib/i18n/types";

/**
 * The parity `registry.ts`'s header promises: its `sections` array is
 * POSITIONAL against each tool's `sections` in `tools.json`, and `rowTones` is
 * one tone per table row. A copy edit that drops a row, or a translator who
 * merges two, would otherwise silently mis-colour the chart in that locale
 * only — nothing else in the build would notice.
 */

const LOCALES: LocaleCode[] = ["en", "cs", "de", "es", "pt", "ro"];

describe("tool registry ↔ tools.json parity", () => {
  it("has copy for every registered tool in every locale", () => {
    for (const locale of LOCALES) {
      const copy = getToolsCopy(locale).tools;
      expect(Object.keys(copy).sort()).toEqual([...TOOL_SLUGS].sort());
    }
  });

  it("keeps sections positional against the JSON in every locale", () => {
    for (const locale of LOCALES) {
      const bundle = getToolsCopy(locale);
      for (const tool of TOOLS) {
        expect(bundle.tools[tool.slug].sections, `${locale}/${tool.slug}`).toHaveLength(
          tool.sections.length,
        );
      }
    }
  });

  it("gives one tone per table row, and none where there is no table", () => {
    for (const locale of LOCALES) {
      const bundle = getToolsCopy(locale);
      for (const tool of TOOLS) {
        tool.sections.forEach((meta, index) => {
          const table = bundle.tools[tool.slug].sections[index]?.table;
          const where = `${locale}/${tool.slug}#${meta.id}`;
          if (meta.rowTones) {
            expect(table, `${where}: rowTones with no table`).toBeDefined();
            expect(meta.rowTones, where).toHaveLength(table!.rows.length);
          } else {
            expect(table, `${where}: table with no rowTones`).toBeUndefined();
          }
        });
      }
    }
  });

  it("keeps every table row the width of its own column header", () => {
    for (const locale of LOCALES) {
      const bundle = getToolsCopy(locale);
      for (const slug of TOOL_SLUGS) {
        for (const section of bundle.tools[slug].sections) {
          if (!section.table) continue;
          for (const row of section.table.rows) {
            expect(row, `${locale}/${slug}`).toHaveLength(section.table.columns.length);
          }
        }
      }
    }
  });

  it("leaves no placeholder unfilled outside the two the renderer fills", () => {
    // `{country}` (H1 trail, meta title) and the widget's `{kg}`/`{count}`/
    // `{total}` are interpolated at render. Anything else is a typo that would
    // ship a literal brace to a searcher.
    const ALLOWED = /^\{(country|kg|lb|count|total|weeks|days|date)\}$/;
    for (const locale of LOCALES) {
      const bundle = getToolsCopy(locale);
      for (const slug of TOOL_SLUGS) {
        const copy = bundle.tools[slug];
        const { widget, metaTitle, h1Trail, ...rest } = copy;
        void widget;
        void metaTitle;
        void h1Trail;
        const found = JSON.stringify(rest).match(/\{[a-zA-Z]+\}/g) ?? [];
        expect(found.filter((token) => !ALLOWED.test(token)), `${locale}/${slug}`).toEqual([]);
      }
    }
  });
});
