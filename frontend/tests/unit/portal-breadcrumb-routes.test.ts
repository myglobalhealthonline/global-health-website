import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The portal shells build breadcrumbs from the pathname, linking every path
 * prefix. A prefix with no page.tsx therefore renders a crumb that 404s —
 * that's how "/admin/plans/<id>" (only .../edit exists) became a dead link.
 *
 * The shells now render record-id segments as plain text, so a gap is only
 * harmless when the missing prefix ends in a dynamic segment. Any OTHER gap
 * is a real dead crumb.
 */
const PORTAL_ROOT = join(process.cwd(), "app", "(portal)");
const GROUP_RE = /^\(.*\)$/;
const DYNAMIC_RE = /^\[.*\]$/;
// Standalone routes that render no shell, so no breadcrumb trail at all.
const NO_SHELL = ["/print/", "/share/", "/corporate-invite/"];

function collectRoutes(dir: string, segments: string[], out: Set<string>) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "page.tsx") {
      out.add(`/${segments.join("/")}`);
      continue;
    }
    if (!statSync(full).isDirectory()) continue;
    if (entry.startsWith("_")) continue;
    // Route groups "(admin)" and parallel/intercepting routes contribute no URL segment.
    collectRoutes(full, GROUP_RE.test(entry) ? segments : [...segments, entry], out);
  }
}

describe("portal breadcrumb routes", () => {
  it("has no linkable path prefix without a page", () => {
    const routes = new Set<string>();
    collectRoutes(PORTAL_ROOT, [], routes);
    expect(routes.size).toBeGreaterThan(50);

    const dead: string[] = [];
    for (const route of routes) {
      if (NO_SHELL.some((p) => route.startsWith(p))) continue;
      const parts = route.slice(1).split("/");
      for (let i = 1; i < parts.length; i++) {
        const prefix = `/${parts.slice(0, i).join("/")}`;
        if (routes.has(prefix)) continue;
        if (DYNAMIC_RE.test(parts[i - 1])) continue; // rendered as plain text, not a link
        dead.push(`${prefix} (from ${route})`);
      }
    }
    expect(dead).toEqual([]);
  });
});
