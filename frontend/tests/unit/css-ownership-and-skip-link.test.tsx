import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Batch 13 — CSS ownership and foundational accessibility.
 *
 * Three invariants, asserted structurally rather than by snapshotting CSS:
 *
 *  1. CSS-1: `.gh-chat-note` / `.gh-chat-alert` live in exactly ONE of the two
 *     stylesheets. CLAUDE.md and AGENTS.md both state the rule — `globals.css`
 *     is tokens/resets/public, `portal.css` is authenticated-portal-only, and a
 *     selector belongs to exactly one of them, never both.
 *  2. CSS-2: every blur/backdrop surface named here carries the repo's
 *     established feature-detection fallback, so a browser without
 *     `backdrop-filter` still gets an opaque, readable surface.
 *  3. A11Y: every rendered shell offers a keyboard skip link to one
 *     `<main id="main-content">`.
 *
 * The CSS assertions read the stylesheets as text. That is deliberate: these
 * are ownership and presence invariants, not appearance, so they must not
 * break when a colour is retuned.
 */

const FRONTEND = path.resolve(__dirname, "..", "..");

/** Read normalized to LF. `.gitattributes` leaves these files to git's own
 *  autocrlf, so a Windows checkout hands back CRLF and any assertion written
 *  against a literal `\n` would pass or fail by platform. */
const readCss = (...segments: string[]) =>
  readFileSync(path.join(FRONTEND, ...segments), "utf8").replace(/\r\n/g, "\n");

const GLOBALS = readCss("app", "globals.css");
const PORTAL = readCss("app", "portal.css");

const SHEETS = { "globals.css": GLOBALS, "portal.css": PORTAL } as const;
type SheetName = keyof typeof SHEETS;

/**
 * Every rule whose selector list mentions `selector` as a whole class — i.e.
 * the places that sheet actually defines it.
 *
 * Matches the selector followed by a comma, `{`, or whitespace, so
 * `.gh-chat-note` does not also count `.gh-chat-note__body` (a different
 * class) while `.gh-chat-note,` and `.gh-chat-note:hover` do count. Blocks are
 * flat here — none of these selectors is declared inside a nested rule.
 */
function rulesDefining(css: string, selector: string): string[] {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // A rule head runs from the previous `}`/start to the `{` that opens it.
  const pattern = new RegExp(
    `(?:^|[}{;])\\s*([^{}@;]*${escaped}(?![\\w-])[^{}@;]*)\\{([^{}]*)\\}`,
    "g",
  );
  return [...css.matchAll(pattern)].map((m) => `${m[1].trim()}{${m[2]}}`);
}

function sheetsDefining(selector: string): SheetName[] {
  return (Object.keys(SHEETS) as SheetName[]).filter(
    (name) => rulesDefining(SHEETS[name], selector).length > 0,
  );
}

/** The `{ … }` body of the at-rule whose opening brace is at `open`. */
function blockAt(css: string, open: number): string {
  let depth = 0;
  let i = open;
  do {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") depth -= 1;
    i += 1;
  } while (depth > 0 && i < css.length);
  return css.slice(open, i);
}

/**
 * The bodies of every `@supports not (backdrop-filter: …)` block in a sheet.
 *
 * `[^{]*\)` and not `[^)]*\)`: every one of these blocks is written
 * `blur(1px)`, so stopping at the first `)` lands inside the `blur()` call and
 * the pattern matches nothing at all — which is how an earlier draft of this
 * helper reported a missing fallback for rules that already had one.
 */
function noBackdropSupportBlocks(css: string): string {
  return [...css.matchAll(/@supports not \(backdrop-filter:[^{]*\)\s*\{/g)]
    .map((m) => blockAt(css, m.index! + m[0].length - 1))
    .join("\n");
}

/** The `@media (pointer: coarse)` block that solidifies portal chrome. */
function coarsePointerChromeBlock(css: string): string {
  const at = css.indexOf("@media (pointer: coarse)  {\n.gh-portal-sidebar");
  expect(at, "portal chrome coarse-pointer block").toBeGreaterThan(-1);
  return blockAt(css, css.indexOf("{", at));
}

describe("CSS-1 — chat note/alert belong to exactly one stylesheet", () => {
  // The three components that use these classes — ChatThread,
  // ConsultationChat, InternalMessagesThread — are reachable only from
  // `app/(portal)/**` (admin, account, doctor). They are portal-only, so
  // portal.css owns them, which is also where their siblings already live
  // (`.gh-chat-note__meta`, `.gh-chat-note__body`, `.gh-chat-empty`).
  it.each([".gh-chat-note", ".gh-chat-alert"])(
    "%s is defined in portal.css and nowhere else",
    (selector) => {
      expect(sheetsDefining(selector)).toEqual(["portal.css"]);
    },
  );

  it.each([".gh-chat-note", ".gh-chat-alert"])(
    "%s is declared once in its owning sheet, not split across rules",
    (selector) => {
      expect(rulesDefining(PORTAL, selector)).toHaveLength(1);
    },
  );

  it("keeps the containment the globals.css rule used to provide", () => {
    // The deleted globals.css rule carried `position: relative; overflow:
    // hidden` for both classes. Deleting it must not change the computed
    // style, so portal.css's own rules have to carry them now.
    for (const selector of [".gh-chat-note", ".gh-chat-alert"]) {
      const [rule] = rulesDefining(PORTAL, selector);
      expect(rule, selector).toMatch(/position:\s*relative/);
      expect(rule, selector).toMatch(/overflow:\s*hidden/);
    }
  });

  it("does not move the class into a third stylesheet", () => {
    // The repo has exactly two hand-authored sheets; anything else would be a
    // new convention rather than an ownership correction.
    expect(sheetsDefining(".gh-chat-note__body")).toEqual(["portal.css"]);
    expect(sheetsDefining(".gh-chat-empty")).toEqual(["portal.css"]);
  });
});

describe("CSS-2 — blur surfaces carry the established fallback", () => {
  it(".gh-stat-card blurs where supported", () => {
    const [rule] = rulesDefining(GLOBALS, ".gh-stat-card").filter((r) =>
      /backdrop-filter/.test(r),
    );
    expect(rule).toBeDefined();
    expect(rule).toMatch(/-webkit-backdrop-filter:\s*blur\(/);
    expect(rule).toMatch(/backdrop-filter:\s*blur\(var\(--lux-blur-card\)\)/);
  });

  it(".gh-stat-card falls back to an opaque surface without backdrop-filter", () => {
    // Reuses `.gh-admin-card`'s fallback verbatim (portal.css): the two rules
    // carry byte-identical `--lux-card-fill` + blur declarations, and #f2f4ef
    // is the documented solid equivalent of that gradient.
    const fallback = noBackdropSupportBlocks(GLOBALS);
    const [rule] = rulesDefining(fallback, ".gh-stat-card");
    expect(rule, "no @supports-not rule for .gh-stat-card").toBeDefined();
    expect(rule).toMatch(/background-color:\s*#f2f4ef/);
  });

  it(".gh-portal-dialog-overlay blurs where supported", () => {
    const [rule] = rulesDefining(PORTAL, ".gh-portal-dialog-overlay").filter((r) =>
      /backdrop-filter/.test(r),
    );
    expect(rule).toBeDefined();
    expect(rule).toMatch(/backdrop-filter:\s*blur\(var\(--lux-blur-overlay\)\)/);
    // Stacking and pointer behaviour are part of the contract this batch must
    // not disturb: the scrim stays fixed, full-bleed, and on the modal layer.
    expect(rule).toMatch(/position:\s*fixed/);
    expect(rule).toMatch(/z-index:\s*var\(--z-modal-overlay\)/);
  });

  it(".gh-portal-dialog-overlay falls back to an opaque scrim without backdrop-filter", () => {
    // `--lux-overlay-fill` is rgba(7, 18, 12, 0.60) — with no blur behind it,
    // page content stays legible through the scrim and the modal loses its
    // separation. `.gh-doctor-doc-modal` already solves this and its comment
    // names `.gh-portal-dialog-overlay` as the same single-layer pattern.
    const fallback = noBackdropSupportBlocks(PORTAL);
    const [rule] = rulesDefining(fallback, ".gh-portal-dialog-overlay");
    expect(rule, "no @supports-not rule for .gh-portal-dialog-overlay").toBeDefined();
    expect(rule).toMatch(/background:\s*rgba\(9,\s*15,\s*12,\s*0\.72\)/);
  });

  it(".gh-portal-dialog-overlay drops the blur on coarse pointers", () => {
    // CLAUDE.md: a new glass class joins BOTH mobile fallback blocks in its
    // own sheet. `.gh-app-sheet-overlay--portal` is the sibling already in
    // this block — stacked overlay blur is the exact GPU-tile pattern that
    // corrupts on Android.
    const block = coarsePointerChromeBlock(PORTAL);
    expect(block).toContain(".gh-portal-dialog-overlay");
    const [rule] = rulesDefining(block, ".gh-portal-dialog-overlay");
    expect(rule).toMatch(/backdrop-filter:\s*none\s*!important/);
    expect(rule).toMatch(/background:\s*rgba\(9,\s*15,\s*12,\s*0\.72\)/);
  });
});

describe("the skip link's own styling", () => {
  it("is off-screen at rest and pinned into view on focus", () => {
    const [rest] = rulesDefining(GLOBALS, ".gh-skip-link");
    expect(rest).toMatch(/position:\s*absolute/);
    // Absolutely positioned and parked above the viewport: no layout shift
    // while hidden, and nothing reserves space for it.
    expect(rest).toMatch(/top:\s*-\d+px/);

    const focus = rulesDefining(GLOBALS, ".gh-skip-link:focus");
    expect(focus).toHaveLength(1);
    expect(focus[0]).toMatch(/top:\s*8px/);
  });

  it("sits above every other layer in the z scale", () => {
    // `--z-skip-link: 700` is the top of the documented scale (toast is 600),
    // so the link outranks sticky headers, drawers, dialogs and toasts.
    const [rest] = rulesDefining(GLOBALS, ".gh-skip-link");
    const z = Number(/z-index:\s*(\d+)/.exec(rest)?.[1]);
    const scaleTop = Number(/--z-skip-link:\s*(\d+)/.exec(GLOBALS)?.[1]);
    expect(scaleTop).toBe(700);
    expect(z).toBeGreaterThanOrEqual(scaleTop);
  });

  it("uses design tokens for its surface, not a hardcoded colour", () => {
    const [rest] = rulesDefining(GLOBALS, ".gh-skip-link");
    expect(rest).toMatch(/background:\s*var\(--color-brand-primary\)/);
  });
});

/* ── Rendered surfaces ──────────────────────────────────────────────────── */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {}, refresh: () => {} }),
  usePathname: () => "/admin/doctors",
  useSearchParams: () => new URLSearchParams(),
}));

const anchors = (html: string) =>
  [...html.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);

const skipLinks = (html: string) =>
  anchors(html).filter((a) => a.includes('class="gh-skip-link"'));

const mainContentTargets = (html: string) =>
  [...html.matchAll(/<main\b[^>]*\bid="main-content"[^>]*>/g)].map((m) => m[0]);

/** Index of the first element a keyboard user can reach. */
function firstFocusableIndex(html: string): number {
  const match = /<(?:a\b[^>]*\bhref=|button\b|input\b|select\b|textarea\b)/.exec(html);
  return match ? match.index : -1;
}

function assertSkipLinkContract(html: string, surface: string) {
  const links = skipLinks(html);
  expect(links, `${surface}: no skip link`).toHaveLength(1);

  // A native anchor to the landmark — no click handler, no router push. The
  // whole point is that it works with JavaScript disabled.
  expect(links[0]).toContain('href="#main-content"');
  expect(links[0]).not.toMatch(/onclick|data-router|role="button"/i);

  // Exactly one target, so the fragment is unambiguous and no duplicate id
  // exists on the surface.
  expect(mainContentTargets(html), `${surface}: main#main-content`).toHaveLength(1);
  expect(html.match(/id="main-content"/g), `${surface}: id uses`).toHaveLength(1);

  // First practical keyboard control: nothing focusable precedes it.
  expect(html.indexOf(links[0]), `${surface}: not first focusable`).toBe(
    firstFocusableIndex(html),
  );

  // A visible label, not an empty or icon-only link.
  const label = new RegExp(
    `${links[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^<]+)</a>`,
  ).exec(html)?.[1];
  expect(label?.trim(), `${surface}: label`).toBeTruthy();
}

describe("A11Y — skip link on the authenticated portal", () => {
  it("the admin shell offers one, ahead of its ~15-item sidebar", async () => {
    const { AdminShell } = await import(
      "@/app/(portal)/(admin)/admin/_components/admin-shell"
    );
    const html = renderToStaticMarkup(
      <AdminShell
        user={{ fullName: "Ada Lovelace", email: "ada@example.com", role: "SUPER_ADMIN" }}
        countries={[]}
        activeCountry={null}
        sections={[{ href: "/admin/doctors", label: "Doctors" }]}
        signOutAction={async () => {}}
        setCountryPreferenceAction={async () => {}}
      >
        <p>page</p>
      </AdminShell>,
    );

    assertSkipLinkContract(html, "AdminShell");
  });

  it("the shared portal shell (account / doctor / corporate) offers one", async () => {
    const { PortalShell } = await import("@/components/portal-shell");
    const html = renderToStaticMarkup(
      <PortalShell
        portalKey="patient"
        user={{ fullName: "Ada Lovelace", email: "ada@example.com", role: "PATIENT" }}
        groups={[
          { label: "Care", items: [{ href: "/account", label: "Overview", icon: null }] },
        ]}
        portalLabel="Patient portal"
        rootHref="/account"
        rootBreadcrumb="Account"
        signOutAction={async () => {}}
      >
        <p>page</p>
      </PortalShell>,
    );

    assertSkipLinkContract(html, "PortalShell");
  });
});

describe("A11Y — skip link on the public localized site", () => {
  it("the auth shell used by the localized login/register pages offers one", async () => {
    const { GH2AuthShell } = await import("@/components/sections/GH2PagePrimitives");
    const html = renderToStaticMarkup(
      <GH2AuthShell
        eyebrow="Global Health"
        title="Sign in"
        accent="#B0F122"
        shell={{
          skipToMainContent: "Skip to main content",
          privacyProtected: "Privacy protected",
          encryptedSessions: "Encrypted sessions",
          responseSupport: "Response support",
          networkLabel: "Network",
          secureAccess: "Secure access",
          backToHome: "Back to home",
          tabSignIn: "Sign in",
          tabCreateAccount: "Create account",
        }}
      >
        <p>form</p>
      </GH2AuthShell>,
    );

    assertSkipLinkContract(html, "GH2AuthShell");
  });

  it("SiteChrome puts one ahead of the header on every country/locale page", () => {
    // SiteChrome pulls in the whole public header/footer tree, so this asserts
    // the contract on its source instead of rendering it: the link is the
    // first child of the returned fragment, before <SiteHeader>, and the only
    // `id="main-content"` is on its <main>.
    const src = readCss("components", "layout", "SiteChrome.tsx");
    const body = src.slice(src.indexOf("return ("));

    expect(body).toMatch(/<a href="#main-content" className="gh-skip-link">/);
    expect(body).toMatch(/<main id="main-content"/);
    expect(body.match(/id="main-content"/g)).toHaveLength(1);
    // Ahead of the header, so it is reachable on the first Tab.
    expect(body.indexOf('href="#main-content"')).toBeLessThan(body.indexOf("<SiteHeader"));
    // Localized, not a hardcoded English string.
    expect(body).toContain("{a11y.skipToContent}");
  });
});

describe("A11Y — skip-link label localization", () => {
  const LOCALES = ["en", "cs", "de", "es", "pt", "ro"] as const;

  it.each(LOCALES)("%s carries both skip-to-content labels", (locale) => {
    const common = JSON.parse(
      readFileSync(path.join(FRONTEND, "locales", locale, "common.json"), "utf8"),
    ) as { a11y?: Record<string, string>; portalChrome?: Record<string, string> };

    // `a11y.skipToContent` is what SiteChrome renders on the public localized
    // pages; `portalChrome.skipToContent` is the portal shells' label.
    expect(common.a11y?.skipToContent?.trim(), `${locale} a11y`).toBeTruthy();
    expect(
      common.portalChrome?.skipToContent?.trim(),
      `${locale} portalChrome`,
    ).toBeTruthy();
  });

  it("translates the label rather than shipping English everywhere", () => {
    const label = (locale: string) =>
      (
        JSON.parse(
          readFileSync(path.join(FRONTEND, "locales", locale, "common.json"), "utf8"),
        ) as { a11y: { skipToContent: string } }
      ).a11y.skipToContent;

    for (const locale of ["cs", "de", "es", "pt", "ro"]) {
      expect(label(locale), locale).not.toBe(label("en"));
    }
  });
});

describe("existing landmarks stay valid", () => {
  it("each shell renders exactly one <main>", async () => {
    const { AdminShell } = await import(
      "@/app/(portal)/(admin)/admin/_components/admin-shell"
    );
    const html = renderToStaticMarkup(
      <AdminShell
        user={{ fullName: "Ada Lovelace", email: "ada@example.com", role: "SUPER_ADMIN" }}
        countries={[]}
        activeCountry={null}
        sections={[{ href: "/admin/doctors", label: "Doctors" }]}
        signOutAction={async () => {}}
        setCountryPreferenceAction={async () => {}}
      >
        <p>page</p>
      </AdminShell>,
    );

    expect(html.match(/<main\b/g)).toHaveLength(1);
    // The admin main keeps its layout classes — adding the id must not
    // disturb the shell's grid/flex sizing.
    expect(html).toMatch(/<main[^>]*class="gh-admin-main gh-portal-main min-w-0 flex-1"/);
  });
});
