import assert from "node:assert/strict";
import test from "node:test";
import { LocaleCode } from "@prisma/client";
import { landingAvailableLocales, landingServiceSlugs } from "./seo-landing.service.js";

/**
 * International-locale batch (2026-08-09). `landingAvailableLocales` feeds
 * the `availableLocales` field `app/sitemap.ts` and `/health/[slug]/page.tsx`
 * both use as their single source of truth for which locale variants of a
 * landing page are genuinely translated (as opposed to `resolveTranslation`'s
 * exact-locale -> country-default fallback, which previously let every
 * supported locale 200 off of one real row).
 */
test("landingAvailableLocales: exact translation set for a fully-translated page", () => {
  const locales = landingAvailableLocales([
    { locale: LocaleCode.EN },
    { locale: LocaleCode.PT },
    { locale: LocaleCode.ES },
    { locale: LocaleCode.CS },
    { locale: LocaleCode.RO },
    { locale: LocaleCode.DE },
  ]);
  assert.deepEqual(
    new Set(locales),
    new Set([LocaleCode.EN, LocaleCode.PT, LocaleCode.ES, LocaleCode.CS, LocaleCode.RO, LocaleCode.DE]),
  );
});

test("landingAvailableLocales: partial cluster returns exactly en/pt/es, never cs/ro/de", () => {
  const locales = landingAvailableLocales([
    { locale: LocaleCode.EN },
    { locale: LocaleCode.PT },
    { locale: LocaleCode.ES },
  ]);
  assert.deepEqual(new Set(locales), new Set([LocaleCode.EN, LocaleCode.PT, LocaleCode.ES]));
  assert.ok(!locales.includes(LocaleCode.CS));
  assert.ok(!locales.includes(LocaleCode.RO));
  assert.ok(!locales.includes(LocaleCode.DE));
});

test("landingAvailableLocales: a page with no translation rows resolves to an empty set", () => {
  assert.deepEqual(landingAvailableLocales([]), []);
});

test("landingAvailableLocales: never fabricates a locale beyond its real rows", () => {
  const locales = landingAvailableLocales([{ locale: LocaleCode.EN }]);
  assert.deepEqual(locales, [LocaleCode.EN]);
});

test("landingServiceSlugs: still resolves slugs from ctaService, related, and body links unaffected by the locale change", () => {
  const slugs = landingServiceSlugs(
    { ctaService: "gp-consultation", related: [{ label: "x", href: "/services/dermatology" }] },
    '<a href="/services/sick-certificate">apply</a>',
  );
  assert.deepEqual(
    new Set(slugs),
    new Set(["gp-consultation", "dermatology", "sick-certificate"]),
  );
});
