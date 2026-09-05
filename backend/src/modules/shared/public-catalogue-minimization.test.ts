import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { listCountries, listAdminCountries } from "../countries/countries.service.js";
import {
  getPublicHealthTestBySlug,
  listAdminHealthTests,
  listHealthTests,
  listHealthTestsByCountry,
} from "../health-tests/health-tests.service.js";

/**
 * PR-1 batch 5b — the remaining public catalogue readers (`/api/countries`
 * and the three public health-test readers) return explicit allow-lists.
 *
 * `listCountries` used to `include:` the Country model root plus the whole
 * `Currency` relation, so `/api/countries` published the FK `currencyId`,
 * the billing-model flag `commissionReceiptEnabled`, the medical-access
 * `accessModel`, both row timestamps and a constant `isActive: true`.
 * `listHealthTests` did the same on HealthTest AND nested `country: true`,
 * publishing the legacy migration path and a complete Country row inside
 * every catalogue item.
 *
 * The routing paths are the opposite case and stay: `legacyHomePath`,
 * `teamPath`, `generalConsultationPath`, `specialistConsultationPath`,
 * `enabledFeatures` and the `bookingSetting` intake flags are all read by
 * `frontend/lib/content/get-public-countries.ts`, the single consumer of
 * this endpoint. Narrowing them would break country routing, the legacy
 * redirects, the nav/footer feature gates and the booking form's required
 * fields.
 *
 * As in batch 5 the assertions pin the CONTRACT as an exact key set, so a
 * column added to Country or HealthTest later fails here until it is added
 * to the allow-list on purpose.
 */

/* ------------------------------------------------------------------ *
 * Contracts
 * ------------------------------------------------------------------ */

/** Root `/api/countries` — the public country contract, wider than the
 *  nested country projection because the frontend builds its routing table
 *  from it. */
const PUBLIC_COUNTRY_ROOT_KEYS = [
  "id",
  "code",
  "name",
  "slug",
  "defaultLocale",
  // Routing + legacy redirects (mergeCountryConfigWithBackend).
  "legacyHomePath",
  "teamPath",
  "generalConsultationPath",
  "specialistConsultationPath",
  // Nav / footer / sitemap feature gates.
  "enabledFeatures",
  // Supported locales (only `locale` is read) + booking intake rules.
  "countryLocales",
  "bookingSetting",
];

/** Columns `/api/countries` must NOT publish. */
const PRIVATE_COUNTRY_ROOT_FIELDS = [
  "currencyId", // FK to an internal table
  "currency", // the whole Currency row — no public consumer
  "accessModel", // medical-access RBAC model
  "commissionReceiptEnabled", // internal billing model
  "isActive", // constant true under the reader's own where-filter
  "createdAt",
  "updatedAt",
] as const;

const PUBLIC_COUNTRY_LOCALE_KEYS = ["locale"];

const PUBLIC_BOOKING_SETTING_KEYS = [
  "timezone",
  "requirePhone",
  "requireDateOfBirth",
  "requireNationalId",
  "requireAddress",
  "collectUtenteNumber",
];

/** The narrow country shape nested inside a health-test payload. */
const PUBLIC_NESTED_COUNTRY_KEYS = ["id", "code", "slug", "name", "defaultLocale"];

const PUBLIC_HEALTH_TEST_KEYS = [
  "id",
  "slug",
  "title",
  "shortDescription",
  "priceCents",
  "shippingCents",
  "currencyCode",
  "productImagePath",
  "galleryImagePaths",
  "sampleType",
  "resultsTimeline",
  "heroButtonLabel",
  "detailIntro",
  "whatThisTestCovers",
  "whyGetTested",
  "extraSections",
  "sortOrder",
  "isActive",
  "stock",
  "seoTitle",
  "seoDescription",
  "updatedAt",
  // Added by the locale merge.
  "resolvedLocale",
];

const PRIVATE_HEALTH_TEST_FIELDS = [
  "legacyPath", // legacy migration path
  "countryId", // internal FK
  "createdAt",
] as const;

const PUBLIC_HEALTH_TEST_FAQ_KEYS = ["id", "question", "answer", "sortOrder"];

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function extraKeys(payload: object, allowed: readonly string[]): string[] {
  return Object.keys(payload).filter((key) => !allowed.includes(key));
}

function assertNoPrivateKeys(payload: object, forbidden: readonly string[], label: string) {
  const leaked = Object.keys(payload).filter((key) => forbidden.includes(key));
  assert.deepEqual(leaked, [], `${label} must not expose ${leaked.join(", ")}`);
}

/** Scalar/enum column names Prisma knows about for a model. */
function modelScalars(model: "Country" | "HealthTest"): string[] {
  const dm = Prisma.dmmf.datamodel.models.find((m) => m.name === model);
  assert.ok(dm, `${model} missing from the Prisma DMMF`);
  return dm.fields.filter((f) => f.kind === "scalar" || f.kind === "enum").map((f) => f.name);
}

/** The six supported markets. Synthetic rows, one per market locale, so the
 *  serialization invariant is proven across all of them rather than on the
 *  single row a one-country fixture would give. */
const MARKETS = [
  { tag: "ie", locale: "EN" as const },
  { tag: "cz", locale: "CS" as const },
  { tag: "pt", locale: "PT" as const },
  { tag: "es", locale: "ES" as const },
  { tag: "ro", locale: "RO" as const },
  { tag: "br", locale: "PT" as const },
];

describe("PR-1 batch 5b — public catalogue response minimization", () => {
  let bootError: unknown = null;
  let fixture: {
    countryCode: string;
    marketCodes: string[];
    inactiveCode: string;
    testSlug: string;
  } | null = null;

  const suffix = String(Date.now()).slice(-8);
  let createdCurrencyId: string | null = null;
  const createdCountryIds: string[] = [];

  before(async () => {
    try {
      await prisma.$queryRawUnsafe("SELECT 1");

      const currency = await prisma.currency.create({
        data: { code: `Z${suffix.slice(-7)}`, symbol: "$", decimals: 2 },
      });
      createdCurrencyId = currency.id;

      const marketCodes: string[] = [];
      for (const market of MARKETS) {
        const code = `Q${suffix.slice(-5)}${market.tag}`;
        const row = await prisma.country.create({
          data: {
            code,
            name: `PR1b ${market.tag} ${suffix}`,
            slug: `pr1b-${market.tag}-${suffix}`,
            legacyHomePath: `/pr1b-${market.tag}-${suffix}`,
            teamPath: `/pr1b-${market.tag}-${suffix}/team`,
            generalConsultationPath: `/pr1b-${market.tag}-${suffix}/general`,
            specialistConsultationPath: `/pr1b-${market.tag}-${suffix}/specialist`,
            currencyId: currency.id,
            defaultLocale: market.locale,
            isActive: true,
            enabledFeatures: ["country-home", "health-tests"],
            // Internal columns set to recognisable non-default values, so a
            // leak cannot pass by matching the schema default.
            accessModel: "CLINIC",
            commissionReceiptEnabled: true,
            countryLocales: { create: [{ locale: market.locale, isDefault: true }] },
            bookingSetting: {
              create: {
                timezone: "Europe/Dublin",
                requirePhone: true,
                requireDateOfBirth: true,
                requireNationalId: true,
                requireAddress: true,
                collectUtenteNumber: true,
                // Internal operational flags — must not reach the public payload.
                bookingEnabled: false,
                doctorServiceSelfSelectApproval: false,
              },
            },
          },
        });
        createdCountryIds.push(row.id);
        marketCodes.push(code);
      }

      // An inactive market: country availability is signalled by ABSENCE from
      // the list, which is why the constant `isActive` column need not ship.
      const inactiveCode = `Q${suffix.slice(-5)}xx`;
      const inactive = await prisma.country.create({
        data: {
          code: inactiveCode,
          name: `PR1b inactive ${suffix}`,
          slug: `pr1b-inactive-${suffix}`,
          legacyHomePath: `/pr1b-inactive-${suffix}`,
          teamPath: `/pr1b-inactive-${suffix}/team`,
          generalConsultationPath: `/pr1b-inactive-${suffix}/general`,
          specialistConsultationPath: `/pr1b-inactive-${suffix}/specialist`,
          currencyId: currency.id,
          defaultLocale: "EN",
          isActive: false,
        },
      });
      createdCountryIds.push(inactive.id);

      // Health tests hang off the first market.
      const countryId = createdCountryIds[0];
      const firstMarketCode = marketCodes[0];
      assert.ok(countryId && firstMarketCode, "the market loop must have created a country");
      const testSlug = `pr1b-test-${suffix}`;
      const healthTest = await prisma.healthTest.create({
        data: {
          countryId,
          slug: testSlug,
          title: "PR1b Full Blood Count",
          shortDescription: "At-home blood panel",
          priceCents: 8900,
          shippingCents: 500,
          currencyCode: "EUR",
          productImagePath: "/api/media/pr1b-test.png",
          galleryImagePaths: ["/api/media/pr1b-test-2.png"],
          sampleType: "Blood",
          resultsTimeline: "3 working days",
          heroButtonLabel: "Order this test",
          detailIntro: "A broad screen of your blood chemistry.",
          whatThisTestCovers: ["Haemoglobin", "White cell count"],
          whyGetTested: ["Fatigue"],
          extraSections: [{ title: "How it works", body: "Post the kit back." }],
          sortOrder: 1,
          isActive: true,
          stock: 7,
          seoTitle: "Full Blood Count",
          seoDescription: "Order a full blood count online.",
          // Legacy migration path — must never reach a public payload.
          legacyPath: `/pr1b-legacy-${suffix}/full-blood-count`,
          faqs: {
            create: [
              {
                question: "How long do results take?",
                answer: "Three working days from receipt.",
                sortOrder: 0,
                isVisible: true,
              },
            ],
          },
        },
      });
      assert.ok(healthTest.id);

      fixture = {
        countryCode: firstMarketCode,
        marketCodes,
        inactiveCode,
        testSlug,
      };
    } catch (err) {
      bootError = err;
    }
  });

  after(async () => {
    if (createdCountryIds.length > 0) {
      await prisma.country.deleteMany({ where: { id: { in: createdCountryIds } } });
    }
    if (createdCurrencyId) {
      await prisma.currency.deleteMany({ where: { id: createdCurrencyId } });
    }
    await prisma.$disconnect();
  });

  function ready(t: { skip: (reason?: string) => void }) {
    if (!fixture) {
      t.skip(`database unavailable: ${String(bootError)}`);
      return null;
    }
    return fixture;
  }

  function mine<T extends { code: string }>(rows: readonly T[], code: string): T {
    const row = rows.find((r) => r.code === code);
    assert.ok(row, `fixture country ${code} missing from /api/countries`);
    return row;
  }

  /* ---------------------------------------------------------------- *
   * 1-3. GET /api/countries
   * ---------------------------------------------------------------- */

  it("GET /api/countries — exact public key set, no internal or legacy columns", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listCountries(), f.countryCode);
    assertNoPrivateKeys(row, PRIVATE_COUNTRY_ROOT_FIELDS, "/api/countries");
    assert.deepEqual(extraKeys(row, PUBLIC_COUNTRY_ROOT_KEYS), []);
  });

  it("GET /api/countries — keeps every field the public consumer reads", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listCountries(), f.countryCode);
    // Identity + market selection.
    assert.ok(row.id);
    assert.equal(row.code, f.countryCode);
    assert.equal(row.name, `PR1b ie ${suffix}`);
    assert.equal(row.slug, `pr1b-ie-${suffix}`);
    // Routing + legacy redirects.
    assert.equal(row.legacyHomePath, `/pr1b-ie-${suffix}`);
    assert.equal(row.teamPath, `/pr1b-ie-${suffix}/team`);
    assert.equal(row.generalConsultationPath, `/pr1b-ie-${suffix}/general`);
    assert.equal(row.specialistConsultationPath, `/pr1b-ie-${suffix}/specialist`);
    // Localization.
    assert.equal(row.defaultLocale, "EN");
    assert.deepEqual(
      row.countryLocales.map((l) => l.locale),
      ["EN"],
    );
    // Feature availability.
    assert.deepEqual(row.enabledFeatures, ["country-home", "health-tests"]);
    // Booking intake rules.
    assert.ok(row.bookingSetting);
    assert.equal(row.bookingSetting.timezone, "Europe/Dublin");
    assert.equal(row.bookingSetting.requirePhone, true);
    assert.equal(row.bookingSetting.requireDateOfBirth, true);
    assert.equal(row.bookingSetting.requireNationalId, true);
    assert.equal(row.bookingSetting.requireAddress, true);
    assert.equal(row.bookingSetting.collectUtenteNumber, true);
  });

  it("GET /api/countries — nested locales and booking settings are explicitly shaped", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listCountries(), f.countryCode);
    const locale = row.countryLocales[0];
    assert.ok(locale);
    assert.deepEqual(extraKeys(locale, PUBLIC_COUNTRY_LOCALE_KEYS), []);
    assert.ok(row.bookingSetting);
    assert.deepEqual(extraKeys(row.bookingSetting, PUBLIC_BOOKING_SETTING_KEYS), []);
  });

  it("GET /api/countries — all six supported markets serialize identically", async (t) => {
    const f = ready(t);
    if (!f) return;
    const rows = await listCountries();
    assert.equal(f.marketCodes.length, 6);
    for (const code of f.marketCodes) {
      const row = mine(rows, code);
      assertNoPrivateKeys(row, PRIVATE_COUNTRY_ROOT_FIELDS, `/api/countries (${code})`);
      assert.deepEqual(
        Object.keys(row).sort(),
        [...PUBLIC_COUNTRY_ROOT_KEYS].sort(),
        `${code} must serialize with the same public key set as every other market`,
      );
    }
    // Every OTHER row the endpoint returns obeys the same contract, so a
    // seeded or pre-existing market cannot leak either.
    for (const row of rows) {
      assertNoPrivateKeys(row, PRIVATE_COUNTRY_ROOT_FIELDS, `/api/countries (${row.code})`);
    }
  });

  it("GET /api/countries — availability is signalled by absence, not an isActive flag", async (t) => {
    const f = ready(t);
    if (!f) return;
    const rows = await listCountries();
    assert.equal(
      rows.some((r) => r.code === f.inactiveCode),
      false,
      "an inactive market must not appear in the public country list",
    );
  });

  /* ---------------------------------------------------------------- *
   * 4-8. Public health tests
   * ---------------------------------------------------------------- */

  it("GET /api/health-tests — exact public key set, no legacyPath", async (t) => {
    const f = ready(t);
    if (!f) return;
    const rows = await listHealthTests();
    const row = rows.find((r) => r.slug === f.testSlug);
    assert.ok(row, "fixture health test missing from the global list");
    assertNoPrivateKeys(row, PRIVATE_HEALTH_TEST_FIELDS, "/api/health-tests");
    assert.deepEqual(extraKeys(row, [...PUBLIC_HEALTH_TEST_KEYS, "country"]), []);
  });

  it("GET /api/countries/:code/health-tests — exact public key set, no legacyPath", async (t) => {
    const f = ready(t);
    if (!f) return;
    const rows = await listHealthTestsByCountry(f.countryCode);
    const row = rows.find((r) => r.slug === f.testSlug);
    assert.ok(row, "fixture health test missing from the country list");
    assertNoPrivateKeys(row, PRIVATE_HEALTH_TEST_FIELDS, "country health tests");
    assert.deepEqual(extraKeys(row, [...PUBLIC_HEALTH_TEST_KEYS, "country"]), []);
  });

  it("GET /api/health-tests/:slug — exact public key set, no legacyPath", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = await getPublicHealthTestBySlug(f.testSlug, f.countryCode);
    assert.ok(row);
    assertNoPrivateKeys(row, PRIVATE_HEALTH_TEST_FIELDS, "health test detail");
    assert.deepEqual(extraKeys(row, [...PUBLIC_HEALTH_TEST_KEYS, "country", "faqs"]), []);
  });

  it("nested country on every public health-test reader uses the explicit public shape", async (t) => {
    const f = ready(t);
    if (!f) return;
    const global = (await listHealthTests()).find((r) => r.slug === f.testSlug);
    const byCountry = (await listHealthTestsByCountry(f.countryCode)).find(
      (r) => r.slug === f.testSlug,
    );
    const detail = await getPublicHealthTestBySlug(f.testSlug, f.countryCode);
    assert.ok(global && byCountry && detail);

    for (const [label, payload] of [
      ["/api/health-tests", global],
      ["country health tests", byCountry],
      ["health test detail", detail],
    ] as const) {
      assert.deepEqual(
        extraKeys(payload.country, PUBLIC_NESTED_COUNTRY_KEYS),
        [],
        `${label}: nested country must not widen to the full Country row`,
      );
      assertNoPrivateKeys(
        payload.country,
        PRIVATE_COUNTRY_ROOT_FIELDS,
        `${label}: nested country`,
      );
    }
  });

  it("nested health-test FAQs are explicitly mapped", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = await getPublicHealthTestBySlug(f.testSlug, f.countryCode);
    assert.ok(row);
    const faq = row.faqs[0];
    assert.ok(faq, "fixture health test must have an FAQ");
    assert.deepEqual(extraKeys(faq, PUBLIC_HEALTH_TEST_FAQ_KEYS), []);
  });

  it("keeps the catalogue, pricing, availability and booking data the public site needs", async (t) => {
    const f = ready(t);
    if (!f) return;
    const detail = await getPublicHealthTestBySlug(f.testSlug, f.countryCode);
    assert.ok(detail);
    // Booking identifier — AddToCartButton posts `healthTestId`.
    assert.ok(detail.id);
    assert.equal(detail.slug, f.testSlug);
    // Pricing + currency formatting inputs.
    assert.equal(detail.priceCents, 8900);
    assert.equal(detail.shippingCents, 500);
    assert.equal(detail.currencyCode, "EUR");
    // Stock badge / sold-out gate.
    assert.equal(detail.stock, 7);
    // Card + detail rendering.
    assert.equal(detail.title, "PR1b Full Blood Count");
    assert.equal(detail.shortDescription, "At-home blood panel");
    assert.equal(detail.detailIntro, "A broad screen of your blood chemistry.");
    assert.equal(detail.heroButtonLabel, "Order this test");
    assert.equal(detail.sampleType, "Blood");
    assert.equal(detail.resultsTimeline, "3 working days");
    assert.equal(detail.productImagePath, "/api/media/pr1b-test.png");
    assert.deepEqual(detail.galleryImagePaths, ["/api/media/pr1b-test-2.png"]);
    assert.deepEqual(detail.whatThisTestCovers, ["Haemoglobin", "White cell count"]);
    assert.deepEqual(detail.whyGetTested, ["Fatigue"]);
    assert.ok(Array.isArray(detail.extraSections));
    // SEO.
    assert.equal(detail.seoTitle, "Full Blood Count");
    assert.equal(detail.seoDescription, "Order a full blood count online.");
    // Locale merge output.
    assert.equal(detail.resolvedLocale, "EN");
    // Country routing context.
    assert.equal(detail.country.code, f.countryCode);

    // The list readers keep the card fields and the sitemap's lastmod.
    const card = (await listHealthTestsByCountry(f.countryCode)).find(
      (r) => r.slug === f.testSlug,
    );
    assert.ok(card);
    assert.equal(card.isActive, true);
    assert.equal(card.priceCents, 8900);
    assert.equal(card.currencyCode, "EUR");
    assert.equal(card.stock, 7);
    assert.ok(card.updatedAt instanceof Date);
  });

  /* ---------------------------------------------------------------- *
   * 9. Admin responses unchanged
   * ---------------------------------------------------------------- */

  it("admin country responses still carry the internal columns", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = (await listAdminCountries()).find((r) => r.code === f.countryCode);
    assert.ok(row, "fixture country missing from the admin list");
    assert.equal(row.isActive, true);
    assert.equal(row.accessModel, "CLINIC");
    assert.equal(row.commissionReceiptEnabled, true);
    assert.ok(row.currencyId);
    assert.ok(row.currency, "admin country must still include the Currency relation");
    assert.equal(row.currency.decimals, 2);
    assert.ok(row.createdAt instanceof Date);
    assert.ok(Array.isArray(row.domains));
    assert.ok(row.bookingSetting);
    // Operational flags the public payload never sees.
    assert.equal(row.bookingSetting.bookingEnabled, false);
    assert.equal(row.bookingSetting.doctorServiceSelfSelectApproval, false);
  });

  it("admin health-test responses still carry the internal columns", async (t) => {
    const f = ready(t);
    if (!f) return;
    // No `as Parameters<...>` cast: a cast is only comparability-checked, so
    // a field later made required on AdminHealthTestsQuery would go unnoticed
    // here. A plain literal keeps that a compile error.
    const res = await listAdminHealthTests({
      page: 1,
      pageSize: 100,
      countryCode: f.countryCode,
    });
    const row = res.items.find((r) => r.slug === f.testSlug);
    assert.ok(row, "fixture health test missing from the admin list");
    assert.equal(row.legacyPath, `/pr1b-legacy-${suffix}/full-blood-count`);
    assert.ok(row.countryId);
    assert.ok(row.createdAt instanceof Date);
  });

  /* ---------------------------------------------------------------- *
   * 10. A new Prisma column cannot serialize itself into public JSON
   * ---------------------------------------------------------------- */

  it("a column added to Country or HealthTest does not reach public JSON automatically", async (t) => {
    const f = ready(t);
    if (!f) return;

    const countryRow = mine(await listCountries(), f.countryCode);
    const countryScalars = modelScalars("Country");
    const countryUnpublished = countryScalars.filter(
      (name) => !Object.keys(countryRow).includes(name),
    );
    assert.ok(
      countryUnpublished.length > 0,
      "Country must have scalar columns the public reader deliberately withholds",
    );
    // Anything the reader does publish is named by the allow-list above —
    // which is the property that makes a future column invisible by default.
    assert.deepEqual(extraKeys(countryRow, PUBLIC_COUNTRY_ROOT_KEYS), []);

    const testRow = await getPublicHealthTestBySlug(f.testSlug, f.countryCode);
    assert.ok(testRow);
    const testScalars = modelScalars("HealthTest");
    const testUnpublished = testScalars.filter((name) => !Object.keys(testRow).includes(name));
    assert.ok(
      testUnpublished.length > 0,
      "HealthTest must have scalar columns the public reader deliberately withholds",
    );
    assert.deepEqual(
      extraKeys(testRow, [...PUBLIC_HEALTH_TEST_KEYS, "country", "faqs"]),
      [],
    );
  });
});
