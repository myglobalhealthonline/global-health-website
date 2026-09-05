import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../db/prisma.js";
import {
  createAdminService,
  createAdminSpecialty,
  updateAdminService,
  updateAdminSpecialty,
} from "../services/services.service.js";
import {
  createAdminHealthTest,
  updateAdminHealthTest,
} from "../health-tests/health-tests.service.js";
import { upsertCountryLegalProfile } from "../countries/countries.service.js";

/**
 * CA-4 — content writes and their translation rows must commit together.
 *
 * Each admin content write below persists a base row (Service, Specialty,
 * HealthTest, CountryLegalProfile) plus zero or more per-locale translation
 * rows. Before CA-4 those were two separate transactions, so a translation
 * failure left the base row committed — a half-applied CMS edit that the
 * admin UI reports as failed.
 *
 * Failure injection uses a CHECK constraint added to the translation table
 * for the duration of this suite: any translation whose text equals
 * FAIL_MARKER is rejected by Postgres. That is a real database error raised
 * inside the real write path — no production code is stubbed or altered —
 * so a passing assertion here is genuine proof of Prisma transaction
 * rollback rather than a mock's promise to roll back.
 *
 * Ordering matters: the marker always sits on the SECOND translation entry
 * so the first locale is already written when the failure lands. That is
 * exactly the partial-commit window CA-4 closes.
 */

const FAIL_MARKER = "__CA4_FAIL__";

/** translation table -> the column that carries the poison marker. */
const PROBES: ReadonlyArray<readonly [table: string, column: string]> = [
  ["ServiceTranslation", "name"],
  ["SpecialtyTranslation", "name"],
  ["HealthTestTranslation", "title"],
  ["CountryDisclaimerTranslation", "shortDisclaimer"],
];

function probeName(table: string): string {
  return `ca4_probe_${table.toLowerCase()}`;
}

async function dropProbe(table: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${probeName(table)}"`,
  );
}

type ServiceCreateArgs = Parameters<typeof createAdminService>[0];
type ServiceUpdateArgs = Parameters<typeof updateAdminService>[1];
type SpecialtyCreateArgs = Parameters<typeof createAdminSpecialty>[0];
type SpecialtyUpdateArgs = Parameters<typeof updateAdminSpecialty>[1];
type HealthTestCreateArgs = Parameters<typeof createAdminHealthTest>[0];
type HealthTestUpdateArgs = Parameters<typeof updateAdminHealthTest>[1];
type LegalProfileArgs = Parameters<typeof upsertCountryLegalProfile>[1];

/** Full ServiceTranslation entry — every optional field spelled out. */
function svcTr(locale: "PT" | "ES" | "EN", name: string) {
  return {
    locale,
    name,
    summary: null,
    seoTitle: null,
    seoDescription: null,
    heroTitle: null,
    heroDescription: null,
    detailBody: null,
    ctaLabel: null,
  };
}

describe("CA-4 content + translation atomicity", () => {
  let bootError: unknown = null;
  let fixture: {
    countryId: string;
    otherCountryId: string;
    currencyId: string;
    currencyCode: string;
  } | null = null;

  const suffix = String(Date.now()).slice(-8);
  // Tracked separately from `fixture` so a `before` that throws part-way
  // through still cleans up whatever it already created.
  let createdCurrencyId: string | null = null;
  const createdCountryIds: string[] = [];

  before(async () => {
    try {
      await prisma.$queryRawUnsafe("SELECT 1");

      const currency = await prisma.currency.create({
        data: { code: `X${suffix.slice(-7)}`, symbol: "$", decimals: 2 },
      });
      createdCurrencyId = currency.id;
      const country = await prisma.country.create({
        data: {
          code: `C${suffix.slice(-5)}`,
          name: `CA4 ${suffix}`,
          slug: `ca4-${suffix}`,
          legacyHomePath: `/ca4-${suffix}`,
          teamPath: `/ca4-${suffix}/team`,
          generalConsultationPath: `/ca4-${suffix}/general`,
          specialistConsultationPath: `/ca4-${suffix}/specialist`,
          currencyId: currency.id,
          defaultLocale: "EN",
          countryLocales: {
            create: [{ locale: "EN", isDefault: true }, { locale: "PT" }, { locale: "ES" }],
          },
        },
      });
      createdCountryIds.push(country.id);
      // A second country whose content must stay untouched by any rollback.
      const otherCountry = await prisma.country.create({
        data: {
          code: `D${suffix.slice(-5)}`,
          name: `CA4 other ${suffix}`,
          slug: `ca4-other-${suffix}`,
          legacyHomePath: `/ca4-other-${suffix}`,
          teamPath: `/ca4-other-${suffix}/team`,
          generalConsultationPath: `/ca4-other-${suffix}/general`,
          specialistConsultationPath: `/ca4-other-${suffix}/specialist`,
          currencyId: currency.id,
          defaultLocale: "EN",
          countryLocales: { create: [{ locale: "EN", isDefault: true }, { locale: "PT" }] },
        },
      });

      createdCountryIds.push(otherCountry.id);

      for (const [table, column] of PROBES) {
        // Drop first: probe names are fixed, so an earlier aborted run could
        // otherwise leave one behind and make ADD CONSTRAINT fail forever.
        await dropProbe(table);
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${table}" ADD CONSTRAINT "${probeName(table)}" ` +
            `CHECK ("${column}" IS DISTINCT FROM '${FAIL_MARKER}')`,
        );
      }

      fixture = {
        countryId: country.id,
        otherCountryId: otherCountry.id,
        currencyId: currency.id,
        currencyCode: currency.code,
      };
    } catch (err) {
      bootError = err;
    }
  });

  after(async () => {
    // Unconditional: a `before` that threw part-way through still added some
    // of the probes, and a leaked one would poison every later run.
    for (const [table] of PROBES) {
      await dropProbe(table).catch(() => {});
    }
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

  // -- Service ---------------------------------------------------------------

  it("createAdminService: a failing translation rolls the service back", async (t) => {
    const f = ready(t);
    if (!f) return;

    const slug = `svc-create-fail-${suffix}`;
    await assert.rejects(
      createAdminService({
        countryId: f.countryId,
        kind: "GENERAL",
        slug,
        name: "Base name",
        translations: [svcTr("PT", "Nome PT"), svcTr("ES", FAIL_MARKER)],
      } as ServiceCreateArgs),
    );

    assert.equal(
      await prisma.service.count({ where: { countryId: f.countryId, slug } }),
      0,
      "base Service row must not survive a failed translation write",
    );
    assert.equal(
      await prisma.serviceTranslation.count({ where: { service: { slug } } }),
      0,
      "no partial ServiceTranslation row may survive",
    );
  });

  it("updateAdminService: a failing translation leaves base row and existing translations untouched", async (t) => {
    const f = ready(t);
    if (!f) return;

    const created = await createAdminService({
      countryId: f.countryId,
      kind: "GENERAL",
      slug: `svc-update-${suffix}`,
      name: "Original name",
      summary: "Original summary",
      translations: [svcTr("PT", "PT original")],
    } as ServiceCreateArgs);

    const baseBefore = await prisma.service.findUniqueOrThrow({ where: { id: created.id } });
    const translationsBefore = await prisma.serviceTranslation.findMany({
      where: { serviceId: created.id },
      orderBy: { locale: "asc" },
    });
    const otherCountryServices = await prisma.service.count({
      where: { countryId: f.otherCountryId },
    });

    await assert.rejects(
      updateAdminService(created.id, {
        name: "Changed name",
        summary: "Changed summary",
        translations: [svcTr("PT", "PT changed"), svcTr("ES", FAIL_MARKER)],
      } as ServiceUpdateArgs),
    );

    assert.deepEqual(
      await prisma.service.findUniqueOrThrow({ where: { id: created.id } }),
      baseBefore,
      "base Service row must be byte-for-byte unchanged",
    );
    assert.deepEqual(
      await prisma.serviceTranslation.findMany({
        where: { serviceId: created.id },
        orderBy: { locale: "asc" },
      }),
      translationsBefore,
      "existing translations must be unchanged and no new locale may appear",
    );
    assert.equal(
      await prisma.service.count({ where: { countryId: f.otherCountryId } }),
      otherCountryServices,
      "unrelated country content must be untouched",
    );
  });

  it("createAdminService + updateAdminService still commit base and translations on success", async (t) => {
    const f = ready(t);
    if (!f) return;

    const slug = `svc-ok-${suffix}`;
    const created = await createAdminService({
      countryId: f.countryId,
      kind: "GENERAL",
      slug,
      name: "Green name",
      translations: [svcTr("PT", "PT green"), svcTr("ES", "ES green")],
    } as ServiceCreateArgs);

    // Response shape: base columns plus the adminServiceInclude relations.
    assert.equal(created.name, "Green name");
    assert.equal(created.slug, slug);
    assert.equal(created.country.id, f.countryId);
    assert.ok(Array.isArray(created.assets));
    assert.ok(Array.isArray(created.assignedDoctors));
    assert.ok(Array.isArray(created.insuranceCoverages));
    assert.deepEqual(
      created.translations.map((row) => `${row.locale}:${row.name}`).sort(),
      ["ES:ES green", "PT:PT green"],
    );

    const updated = await updateAdminService(created.id, {
      name: "Green name v2",
      translations: [svcTr("PT", "PT green v2")],
    } as ServiceUpdateArgs);
    assert.ok(updated);
    assert.equal(updated.name, "Green name v2");
    assert.equal(updated.translations.find((row) => row.locale === "PT")?.name, "PT green v2");
    // Additive: ES survives an update that only submits PT.
    assert.equal(updated.translations.length, 2);
  });

  // -- Specialty -------------------------------------------------------------

  it("createAdminSpecialty: a failing translation rolls the specialty back", async (t) => {
    const f = ready(t);
    if (!f) return;

    const slug = `spec-create-fail-${suffix}`;
    await assert.rejects(
      createAdminSpecialty({
        countryId: f.countryId,
        slug,
        name: "Base specialty",
        translations: [
          { locale: "PT", name: "PT esp", cardSummary: null },
          { locale: "ES", name: FAIL_MARKER, cardSummary: null },
        ],
      } as SpecialtyCreateArgs),
    );

    assert.equal(
      await prisma.specialty.count({ where: { countryId: f.countryId, slug } }),
      0,
      "base Specialty row must not survive a failed translation write",
    );
    assert.equal(
      await prisma.specialtyTranslation.count({ where: { specialty: { slug } } }),
      0,
      "no partial SpecialtyTranslation row may survive",
    );
  });

  it("updateAdminSpecialty: a failing translation leaves base row and existing translations untouched", async (t) => {
    const f = ready(t);
    if (!f) return;

    const created = await createAdminSpecialty({
      countryId: f.countryId,
      slug: `spec-update-${suffix}`,
      name: "Specialty original",
      translations: [{ locale: "PT", name: "PT original", cardSummary: "PT card" }],
    } as SpecialtyCreateArgs);

    const baseBefore = await prisma.specialty.findUniqueOrThrow({ where: { id: created.id } });
    const translationsBefore = await prisma.specialtyTranslation.findMany({
      where: { specialtyId: created.id },
      orderBy: { locale: "asc" },
    });

    await assert.rejects(
      updateAdminSpecialty(created.id, {
        name: "Specialty changed",
        translations: [
          { locale: "PT", name: "PT changed", cardSummary: "PT changed card" },
          { locale: "ES", name: FAIL_MARKER, cardSummary: null },
        ],
      } as SpecialtyUpdateArgs),
    );

    assert.deepEqual(
      await prisma.specialty.findUniqueOrThrow({ where: { id: created.id } }),
      baseBefore,
      "base Specialty row must be byte-for-byte unchanged",
    );
    assert.deepEqual(
      await prisma.specialtyTranslation.findMany({
        where: { specialtyId: created.id },
        orderBy: { locale: "asc" },
      }),
      translationsBefore,
      "existing translations must be unchanged and no new locale may appear",
    );
  });

  it("createAdminSpecialty + updateAdminSpecialty still commit base and translations on success", async (t) => {
    const f = ready(t);
    if (!f) return;

    const created = await createAdminSpecialty({
      countryId: f.countryId,
      slug: `spec-ok-${suffix}`,
      name: "Specialty green",
      translations: [{ locale: "PT", name: "PT green", cardSummary: null }],
    } as SpecialtyCreateArgs);

    assert.equal(created.name, "Specialty green");
    assert.ok(Array.isArray(created.assets));
    assert.deepEqual(
      created.translations.map((row) => row.locale),
      ["PT"],
    );

    const updated = await updateAdminSpecialty(created.id, {
      name: "Specialty green v2",
      translations: [{ locale: "ES", name: "ES green", cardSummary: null }],
    } as SpecialtyUpdateArgs);
    assert.ok(updated);
    assert.equal(updated.name, "Specialty green v2");
    assert.deepEqual(updated.translations.map((row) => row.locale).sort(), ["ES", "PT"]);
  });

  // -- Health test -----------------------------------------------------------

  it("createAdminHealthTest: a failing translation rolls the health test back", async (t) => {
    const f = ready(t);
    if (!f) return;

    const slug = `ht-create-fail-${suffix}`;
    await assert.rejects(
      createAdminHealthTest({
        countryId: f.countryId,
        slug,
        title: "Base test",
        priceCents: 1000,
        currencyCode: f.currencyCode,
        productImagePath: "/api/media/ca4-test.png",
        sortOrder: 0,
        translations: [
          { locale: "PT", title: "PT teste" },
          { locale: "ES", title: FAIL_MARKER },
        ],
      } as HealthTestCreateArgs),
    );

    assert.equal(
      await prisma.healthTest.count({ where: { countryId: f.countryId, slug } }),
      0,
      "base HealthTest row must not survive a failed translation write",
    );
    assert.equal(
      await prisma.healthTestTranslation.count({ where: { healthTest: { slug } } }),
      0,
      "no partial HealthTestTranslation row may survive",
    );
  });

  it("updateAdminHealthTest: a failing translation leaves base row and existing translations untouched", async (t) => {
    const f = ready(t);
    if (!f) return;

    const created = await createAdminHealthTest({
      countryId: f.countryId,
      slug: `ht-update-${suffix}`,
      title: "Test original",
      priceCents: 1000,
      currencyCode: f.currencyCode,
      productImagePath: "/api/media/ca4-test.png",
      sortOrder: 0,
      translations: [{ locale: "PT", title: "PT original" }],
    } as HealthTestCreateArgs);

    const baseBefore = await prisma.healthTest.findUniqueOrThrow({ where: { id: created.id } });
    const translationsBefore = await prisma.healthTestTranslation.findMany({
      where: { healthTestId: created.id },
      orderBy: { locale: "asc" },
    });

    await assert.rejects(
      updateAdminHealthTest(created.id, {
        title: "Test changed",
        priceCents: 9999,
        translations: [
          { locale: "PT", title: "PT changed" },
          { locale: "ES", title: FAIL_MARKER },
        ],
      } as HealthTestUpdateArgs),
    );

    assert.deepEqual(
      await prisma.healthTest.findUniqueOrThrow({ where: { id: created.id } }),
      baseBefore,
      "base HealthTest row must be byte-for-byte unchanged",
    );
    assert.deepEqual(
      await prisma.healthTestTranslation.findMany({
        where: { healthTestId: created.id },
        orderBy: { locale: "asc" },
      }),
      translationsBefore,
      "existing translations must be unchanged and no new locale may appear",
    );
  });

  it("createAdminHealthTest + updateAdminHealthTest still commit base and translations on success", async (t) => {
    const f = ready(t);
    if (!f) return;

    const created = await createAdminHealthTest({
      countryId: f.countryId,
      slug: `ht-ok-${suffix}`,
      title: "Test green",
      priceCents: 1000,
      currencyCode: f.currencyCode,
      productImagePath: "/api/media/ca4-test.png",
      sortOrder: 0,
      translations: [{ locale: "PT", title: "PT green" }],
    } as HealthTestCreateArgs);

    assert.equal(created.title, "Test green");
    assert.equal(created.country.id, f.countryId);
    assert.deepEqual(
      created.translations.map((row) => row.locale),
      ["PT"],
    );

    const updated = await updateAdminHealthTest(created.id, {
      title: "Test green v2",
      translations: [{ locale: "ES", title: "ES green" }],
    } as HealthTestUpdateArgs);
    assert.ok(updated);
    assert.equal(updated.title, "Test green v2");
    assert.deepEqual(updated.translations.map((row) => row.locale).sort(), ["ES", "PT"]);
  });

  // -- Country legal profile -------------------------------------------------

  it("upsertCountryLegalProfile: a failing disclaimer translation leaves the profile untouched", async (t) => {
    const f = ready(t);
    if (!f) return;

    // Seed the base profile plus one committed PT override.
    await upsertCountryLegalProfile(f.countryId, {
      legalCompanyName: "CA4 Ltd",
      shortDisclaimer: "Base short",
      fullDisclaimer: "Base full",
      disclaimerTranslations: [
        { locale: "PT", shortDisclaimer: "PT short", fullDisclaimer: "PT full" },
      ],
    } as LegalProfileArgs);

    const baseBefore = await prisma.countryLegalProfile.findUniqueOrThrow({
      where: { countryId: f.countryId },
    });
    const translationsBefore = await prisma.countryDisclaimerTranslation.findMany({
      where: { legalProfileId: baseBefore.id },
      orderBy: { locale: "asc" },
    });

    await assert.rejects(
      upsertCountryLegalProfile(f.countryId, {
        legalCompanyName: "CA4 Ltd CHANGED",
        shortDisclaimer: "Changed short",
        fullDisclaimer: "Changed full",
        disclaimerTranslations: [
          { locale: "PT", shortDisclaimer: "PT changed", fullDisclaimer: "PT changed full" },
          { locale: "ES", shortDisclaimer: FAIL_MARKER, fullDisclaimer: "ES full" },
        ],
      } as LegalProfileArgs),
    );

    assert.deepEqual(
      await prisma.countryLegalProfile.findUniqueOrThrow({ where: { countryId: f.countryId } }),
      baseBefore,
      "base CountryLegalProfile row must be byte-for-byte unchanged",
    );
    assert.deepEqual(
      await prisma.countryDisclaimerTranslation.findMany({
        where: { legalProfileId: baseBefore.id },
        orderBy: { locale: "asc" },
      }),
      translationsBefore,
      "existing disclaimer translations must be unchanged and no new locale may appear",
    );
  });

  it("upsertCountryLegalProfile: a failing disclaimer translation rolls back a first-time profile create", async (t) => {
    const f = ready(t);
    if (!f) return;

    await assert.rejects(
      upsertCountryLegalProfile(f.otherCountryId, {
        legalCompanyName: "Other Ltd",
        shortDisclaimer: "Other short",
        disclaimerTranslations: [
          { locale: "PT", shortDisclaimer: "PT other", fullDisclaimer: null },
          { locale: "EN", shortDisclaimer: FAIL_MARKER, fullDisclaimer: null },
        ],
      } as LegalProfileArgs),
    );

    assert.equal(
      await prisma.countryLegalProfile.count({ where: { countryId: f.otherCountryId } }),
      0,
      "a first-time legal profile must not survive a failed disclaimer translation",
    );
  });

  it("upsertCountryLegalProfile still commits profile and disclaimer translations on success", async (t) => {
    const f = ready(t);
    if (!f) return;

    const saved = await upsertCountryLegalProfile(f.countryId, {
      legalCompanyName: "CA4 Ltd v2",
      shortDisclaimer: "Base short v2",
      fullDisclaimer: "Base full v2",
      disclaimerTranslations: [
        { locale: "ES", shortDisclaimer: "ES short", fullDisclaimer: "ES full" },
      ],
    } as LegalProfileArgs);

    assert.equal(saved.legalCompanyName, "CA4 Ltd v2");
    assert.ok(Array.isArray(saved.disclaimerTranslations));
    assert.ok(Array.isArray(saved.trustTranslations));
    assert.deepEqual(
      saved.disclaimerTranslations.map((row) => row.locale).sort(),
      ["ES", "PT"],
      "additive per submitted locale — PT from the earlier save survives",
    );
  });
});
