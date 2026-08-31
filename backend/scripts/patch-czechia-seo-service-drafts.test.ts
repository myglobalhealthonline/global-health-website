import assert from "node:assert/strict";
import test from "node:test";

import {
  CZECHIA_SEO_SERVICE_DRAFTS,
  czechiaSeoApprovalSha256,
  czechiaSeoConfirmationToken,
  parseCzechiaSeoReviewDate,
  type CzechiaSeoServiceDraft,
} from "../src/content/czechia-seo-service-drafts.js";
import {
  runCzechiaSeoServicePatch,
  sourceSha256,
  type CzechiaSeoPatchOptions,
} from "./patch-czechia-seo-service-drafts.js";

type FakeService = ReturnType<typeof seedService>;
type FakeClient = Parameters<typeof runCzechiaSeoServicePatch>[0];

function seedService(draft: CzechiaSeoServiceDraft) {
  const old = (field: string) => `old ${field}`;
  return {
    id: draft.serviceId,
    countryId: "country-cz",
    kind: "GENERAL",
    slug: draft.slug,
    visibility: "PUBLIC",
    isActive: true,
    updatedAt: new Date(draft.expectedServiceUpdatedAt),
    name: old("name"),
    summary: old("summary"),
    seoTitle: old("title"),
    seoDescription: old("description"),
    seoKeywords: ["preserved"],
    heroTitle: old("hero title"),
    heroDescription: old("hero description"),
    detailBody: "<p>old body</p>",
    ctaLabel: old("cta") as string | null,
    sortOrder: 7,
    durationMinutes: 15,
    basePriceCents: 85000,
    currencyCode: "CZK",
    shippingCents: 0,
    bookingPausedFrom: null,
    bookingPausedUntil: null,
    bookingPauseReason: null,
    consultationSetting: "VIDEO",
    bookingSetting: "BOOKABLE",
    lastReviewedAt: null,
    authorDisplayName: null,
    reviewerDisplayName: null,
    authorDoctorId: null,
    reviewerDoctorId: null,
    country: { code: "cz", defaultLocale: "CS" },
    translations: [
      {
        id: `translation-${draft.serviceId}`,
        locale: "CS",
        name: old("translated name"),
        summary: old("translated summary"),
        seoTitle: old("translated title"),
        seoDescription: old("translated description"),
        heroTitle: old("translated hero title"),
        heroDescription: old("translated hero description"),
        detailBody: "<p>old translated body</p>",
        ctaLabel: old("translated cta") as string | null,
        updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    ],
    faqs: draft.faqs.map(({ id }, index) => ({
      id,
      question: old(`question ${index}`),
      answer: old(`answer ${index}`),
      sortOrder: index,
      isVisible: true,
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      translations: [
        {
          id: `translation-${id}`,
          locale: "CS",
          question: old(`translated question ${index}`),
          answer: old(`translated answer ${index}`),
          updatedAt: new Date("2026-08-01T00:00:00.000Z"),
        },
      ],
    })),
    assignedDoctors: [
      {
        doctorId: "assigned-doctor",
        isActive: true,
        status: "active",
        sortOrder: 0,
        doctorAmountCents: 30000,
      },
    ],
  };
}

function testDraft() {
  const draft = CZECHIA_SEO_SERVICE_DRAFTS[0];
  const service = seedService(draft);
  return { draft: draftFor(service, draft), service };
}

function draftFor(service: FakeService, draft: CzechiaSeoServiceDraft) {
  return {
    ...draft,
    expectedSourceSha256: sourceSha256(service as never),
  } satisfies CzechiaSeoServiceDraft;
}

function options(draft: CzechiaSeoServiceDraft, apply: boolean): CzechiaSeoPatchOptions {
  return {
    only: draft.slug,
    apply,
    approvedHash: apply ? czechiaSeoApprovalSha256(draft) : null,
    reviewedAt: apply ? parseCzechiaSeoReviewDate("2026-08-31") : null,
    reviewerDoctorId: apply ? "reviewer-doctor" : null,
    confirmation: apply ? czechiaSeoConfirmationToken(draft) : null,
  };
}

function fakeDatabase(seed: FakeService, failFaqTranslation = false) {
  let state = structuredClone(seed);
  let transactionCount = 0;
  let isolationLevel: string | undefined;
  const writes: string[] = [];

  function transactionClient(target: FakeService) {
    return {
      service: {
        findUnique: async () => structuredClone(target),
        updateMany: async ({ where, data }: { where: { id: string; updatedAt: Date }; data: object }) => {
          if (where.id !== target.id || where.updatedAt.getTime() !== target.updatedAt.getTime()) {
            return { count: 0 };
          }
          Object.assign(target, data, { updatedAt: new Date(target.updatedAt.getTime() + 1) });
          writes.push(`service:${where.id}`);
          return { count: 1 };
        },
      },
      doctor: {
        findUnique: async () => ({
          active: true,
          additionalCountries: [
            { chamberEntity: "ČLK", registrationNumber: "12345", isVerified: true },
          ],
        }),
      },
      serviceTranslation: {
        update: async ({ where, data }: { where: { id: string }; data: object }) => {
          const row = target.translations.find(({ id }) => id === where.id);
          if (!row) throw new Error("unexpected translation id");
          Object.assign(row, data);
          writes.push(`translation:${where.id}`);
        },
      },
      serviceFaq: {
        update: async ({ where, data }: { where: { id: string }; data: object }) => {
          const row = target.faqs.find(({ id }) => id === where.id);
          if (!row) throw new Error("unexpected FAQ id");
          Object.assign(row, data);
          writes.push(`faq:${where.id}`);
        },
      },
      serviceFaqTranslation: {
        update: async ({ where, data }: { where: { id: string }; data: object }) => {
          if (failFaqTranslation) throw new Error("injected FAQ translation failure");
          const row = target.faqs.flatMap(({ translations }) => translations).find(({ id }) => id === where.id);
          if (!row) throw new Error("unexpected FAQ translation id");
          Object.assign(row, data);
          writes.push(`faq-translation:${where.id}`);
        },
      },
    };
  }

  const client = {
    service: { findUnique: async () => structuredClone(state) },
    $transaction: async (
      operation: (tx: ReturnType<typeof transactionClient>) => Promise<unknown>,
      config: { isolationLevel: string },
    ) => {
      transactionCount += 1;
      isolationLevel = config.isolationLevel;
      const working = structuredClone(state);
      const result = await operation(transactionClient(working));
      state = working;
      return result;
    },
  } as unknown as FakeClient;

  return {
    client,
    state: () => structuredClone(state),
    transactionCount: () => transactionCount,
    isolationLevel: () => isolationLevel,
    writes,
  };
}

const silentLogger = { log() {} };

test("dry-run reads the exact source and performs no transaction or write", async () => {
  const { draft, service } = testDraft();
  const database = fakeDatabase(service);

  await runCzechiaSeoServicePatch(database.client, options(draft, false), silentLogger, [draft]);

  assert.equal(database.transactionCount(), 0);
  assert.deepEqual(database.writes, []);
  assert.deepEqual(database.state(), service);
});

test("a stale source fingerprint aborts before the transaction", async () => {
  const { draft, service } = testDraft();
  const database = fakeDatabase(service);
  const staleDraft = { ...draft, expectedSourceSha256: "0".repeat(64) };

  await assert.rejects(
    runCzechiaSeoServicePatch(database.client, options(staleDraft, false), silentLogger, [staleDraft]),
    /source fingerprint changed/i,
  );
  assert.equal(database.transactionCount(), 0);
  assert.deepEqual(database.writes, []);
});

test("apply updates only the exact base, CS translation and existing FAQ ids", async () => {
  const { draft, service } = testDraft();
  const database = fakeDatabase(service);

  await runCzechiaSeoServicePatch(database.client, options(draft, true), silentLogger, [draft]);

  const saved = database.state();
  assert.equal(database.transactionCount(), 1);
  assert.equal(database.isolationLevel(), "Serializable");
  assert.equal(saved.name, draft.name);
  assert.equal(saved.translations[0]?.name, draft.name);
  assert.equal(saved.basePriceCents, service.basePriceCents);
  assert.deepEqual(saved.assignedDoctors, service.assignedDoctors);
  assert.equal(saved.lastReviewedAt, null, "global review metadata must not leak across locales");
  assert.deepEqual(
    database.writes.sort(),
    [
      `service:${draft.serviceId}`,
      `translation:translation-${draft.serviceId}`,
      ...draft.faqs.flatMap(({ id }) => [`faq:${id}`, `faq-translation:translation-${id}`]),
    ].sort(),
  );
});

test("transaction failure rolls every attempted copy change back", async () => {
  const { draft, service } = testDraft();
  const database = fakeDatabase(service, true);

  await assert.rejects(
    runCzechiaSeoServicePatch(database.client, options(draft, true), silentLogger, [draft]),
    /injected FAQ translation failure/i,
  );
  assert.equal(database.transactionCount(), 1);
  assert.deepEqual(database.state(), service);
});

test("apply materializes existing non-CS fallback text before changing the Czech base", async () => {
  const sourceDraft = CZECHIA_SEO_SERVICE_DRAFTS[0];
  const service = seedService(sourceDraft);
  const english = { ...structuredClone(service.translations[0]!), id: "translation-en", locale: "EN", ctaLabel: null };
  service.translations.push(english);
  for (const faq of service.faqs) {
    faq.translations.push({
      ...structuredClone(faq.translations[0]!),
      id: `translation-en-${faq.id}`,
      locale: "EN",
    });
  }
  const draft = draftFor(service, sourceDraft);
  const database = fakeDatabase(service);

  await runCzechiaSeoServicePatch(database.client, options(draft, true), silentLogger, [draft]);

  const savedEnglish = database.state().translations.find(({ locale }) => locale === "EN");
  assert.equal(savedEnglish?.ctaLabel, service.ctaLabel);
  assert.notEqual(savedEnglish?.ctaLabel, draft.ctaLabel);
  assert.ok(database.writes.includes("translation:translation-en"));
});

test("apply aborts when an existing non-CS fallback cannot be materialized", async () => {
  const sourceDraft = CZECHIA_SEO_SERVICE_DRAFTS[0];
  const service = seedService(sourceDraft);
  service.ctaLabel = null;
  service.translations.push({
    ...structuredClone(service.translations[0]!),
    id: "translation-en",
    locale: "EN",
    ctaLabel: null,
  });
  const draft = draftFor(service, sourceDraft);
  const database = fakeDatabase(service);

  await assert.rejects(
    runCzechiaSeoServicePatch(database.client, options(draft, true), silentLogger, [draft]),
    /unsafe non-CS base-copy fallbacks/i,
  );
  assert.equal(database.transactionCount(), 0);
  assert.deepEqual(database.writes, []);
});

test("apply aborts when a non-CS locale would fall back to rewritten Czech FAQs", async () => {
  const sourceDraft = CZECHIA_SEO_SERVICE_DRAFTS[0];
  const service = seedService(sourceDraft);
  service.translations.push({
    ...structuredClone(service.translations[0]!),
    id: "translation-en",
    locale: "EN",
  });
  const draft = draftFor(service, sourceDraft);
  const database = fakeDatabase(service);

  await assert.rejects(
    runCzechiaSeoServicePatch(database.client, options(draft, true), silentLogger, [draft]),
    /unsafe non-CS base-copy fallbacks/i,
  );
  assert.equal(database.transactionCount(), 0);
  assert.deepEqual(database.writes, []);
});
