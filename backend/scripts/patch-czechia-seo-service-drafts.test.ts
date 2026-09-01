import assert from "node:assert/strict";
import test from "node:test";

import {
  CZECHIA_SEO_SERVICE_DRAFTS,
  czechiaSeoApprovalSha256,
  czechiaSeoConfirmationToken,
  parseCzechiaSeoReviewDate,
  validateCzechiaSeoServiceDraft,
  type CzechiaSeoServiceDraft,
} from "../src/content/czechia-seo-service-drafts.js";
import {
  clinicalReviewAsset,
  clinicalReviewStatusFromRegister,
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
    translations: ["CS", "EN", "PT", "ES", "RO", "DE"].map((locale) =>
      ({
        id: locale === "CS" ? `translation-${draft.serviceId}` : `translation-${locale.toLowerCase()}`,
        locale,
        name: old("translated name"),
        summary: old("translated summary"),
        seoTitle: old("translated title"),
        seoDescription: old("translated description"),
        heroTitle: old("translated hero title"),
        heroDescription: old("translated hero description"),
        detailBody: "<p>old translated body</p>",
        ctaLabel: old("translated cta") as string | null,
        updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      }),
    ),
    faqs: draft.expectedFaqIds.map((id, index) => ({
      id,
      question: old(`question ${index}`),
      answer: old(`answer ${index}`),
      sortOrder: index,
      isVisible: true,
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      translations: ["CS", "EN", "PT", "ES", "RO", "DE"].map((locale) =>
        ({
          id: locale === "CS" ? `translation-${id}` : `translation-${locale.toLowerCase()}-${id}`,
          locale,
          question: old(`translated question ${index}`),
          answer: old(`translated answer ${index}`),
          updatedAt: new Date("2026-08-01T00:00:00.000Z"),
        }),
      ),
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
  const draft = CZECHIA_SEO_SERVICE_DRAFTS.find(({ slug }) => slug === "neschopenka-online")!;
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
    locale: draft.locale,
    apply,
    approvedHash: apply ? czechiaSeoApprovalSha256(draft) : null,
    reviewedAt: apply ? parseCzechiaSeoReviewDate("2026-08-31") : null,
    reviewerDoctorId: apply ? "reviewer-doctor" : null,
    confirmation: apply ? czechiaSeoConfirmationToken(draft) : null,
    clinicalReviewStatus: apply ? "approved" : "pending",
    nativeReviewerId: apply && draft.locale === "EN" ? "native-editor-id" : null,
    nativeReviewedAt:
      apply && draft.locale === "EN" ? parseCzechiaSeoReviewDate("2026-08-31") : null,
  };
}

function fakeDatabase(seed: FakeService, failFaqTranslation = false) {
  let state = structuredClone(seed);
  let transactionCount = 0;
  let isolationLevel: string | undefined;
  let transactionTimeout: number | undefined;
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
        updateMany: async ({ where, data }: { where: { id: string; updatedAt: Date }; data: object }) => {
          const row = target.translations.find(({ id }) => id === where.id);
          if (!row || row.updatedAt.getTime() !== where.updatedAt.getTime()) return { count: 0 };
          Object.assign(row, data, { updatedAt: new Date(row.updatedAt.getTime() + 1) });
          writes.push(`translation:${where.id}`);
          return { count: 1 };
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
      config: { isolationLevel: string; timeout?: number },
    ) => {
      transactionCount += 1;
      isolationLevel = config.isolationLevel;
      transactionTimeout = config.timeout;
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
    transactionTimeout: () => transactionTimeout,
    writes,
  };
}

const silentLogger = { log() {} };
const fullDraft = CZECHIA_SEO_SERVICE_DRAFTS.find(({ slug }) => slug === "neschopenka-online")!;

test("supported FAQ rewrites keep their records and use natural topic anchors", () => {
  const expectedQuestions = new Map([
    [
      "cmr85xsa7000l70ju0rerevdi",
      "Jak rychle se eNeschopenka objeví v systému ČSSZ, pokud ji lékař vystaví?",
    ],
    ["cmr85xu55000w70ju09qbtii5", "Co když se můj stav před obnovením receptu změnil?"],
    [
      "cmr85xu55000x70jus9xjlihu",
      "Mohu si objednat obnovení léčby bez registrovaného praktického lékaře?",
    ],
  ]);

  const faqDrafts = CZECHIA_SEO_SERVICE_DRAFTS.filter(({ faqs }) => faqs.length > 0);
  for (const draft of faqDrafts) {
    assert.deepEqual(
      draft.faqs.map(({ id }) => id),
      draft.expectedFaqIds,
    );
    assert.deepEqual(validateCzechiaSeoServiceDraft(draft), []);
  }

  const questionsById = new Map(faqDrafts.flatMap(({ faqs }) => faqs.map(({ id, question }) => [id, question])));
  for (const [id, expectedQuestion] of expectedQuestions) {
    assert.equal(questionsById.get(id), expectedQuestion);
  }
});

test("reads approval only from the exact locale-specific clinical register row", () => {
  const czech = CZECHIA_SEO_SERVICE_DRAFTS.find(
    ({ slug, locale }) => slug === "lekar-online-praha" && locale === "CS",
  )!;
  const english = CZECHIA_SEO_SERVICE_DRAFTS.find(
    ({ slug, locale }) => slug === "lekar-online-praha" && locale === "EN",
  )!;
  const csv = [
    "asset,asset_type,review_domain,reason,claim_guardrail,official_source,priority,reviewer_requirement,status,reviewer_name,reviewer_doctor_id,reviewed_at,approved_sha256,native_reviewer_name,native_reviewer_id,native_reviewed_at",
    `${clinicalReviewAsset(czech)},service page,domain,reason,guardrail,source,P0,physician,pending,,,,,,,`,
    `${clinicalReviewAsset(english)},service page,domain,reason,guardrail,source,P0,physician,approved,Reviewer,doctor-id,2026-08-31T12:00:00Z,${"a".repeat(64)},Editor,editor-id,2026-08-31T13:00:00Z`,
  ].join("\n");

  assert.equal(clinicalReviewStatusFromRegister(csv, clinicalReviewAsset(czech)), "pending");
  assert.equal(clinicalReviewStatusFromRegister(csv, clinicalReviewAsset(english)), "approved");
});

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

test("apply aborts before the transaction when the EN preservation row is absent", async () => {
  const { draft: sourceDraft, service } = testDraft();
  service.translations.splice(service.translations.findIndex(({ locale }) => locale === "EN"), 1);
  const draft = draftFor(service, sourceDraft);
  const database = fakeDatabase(service);

  await assert.rejects(
    runCzechiaSeoServicePatch(database.client, options(draft, true), silentLogger, [draft]),
    /missing non-CS service translation.*EN/i,
  );
  assert.equal(database.transactionCount(), 0);
  assert.deepEqual(database.writes, []);
});

test("apply aborts before the transaction when another supported locale row is absent", async () => {
  const { draft: sourceDraft, service } = testDraft();
  service.translations.splice(service.translations.findIndex(({ locale }) => locale === "PT"), 1);
  const draft = draftFor(service, sourceDraft);
  const database = fakeDatabase(service);

  await assert.rejects(
    runCzechiaSeoServicePatch(database.client, options(draft, true), silentLogger, [draft]),
    /missing non-CS service translation.*PT/i,
  );
  assert.equal(database.transactionCount(), 0);
  assert.deepEqual(database.writes, []);
});

test("pending clinical register status aborts even with exact CLI approval values", async () => {
  const { draft, service } = testDraft();
  const database = fakeDatabase(service);
  const pending = { ...options(draft, true), clinicalReviewStatus: "pending" };

  await assert.rejects(
    runCzechiaSeoServicePatch(database.client, pending, silentLogger, [draft]),
    /clinical review register/i,
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
  assert.equal(database.transactionTimeout(), 30_000);
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
  const sourceDraft = fullDraft;
  const service = seedService(sourceDraft);
  const english = service.translations.find(({ locale }) => locale === "EN")!;
  english.ctaLabel = null;
  const draft = draftFor(service, sourceDraft);
  const database = fakeDatabase(service);

  await runCzechiaSeoServicePatch(database.client, options(draft, true), silentLogger, [draft]);

  const savedEnglish = database.state().translations.find(({ locale }) => locale === "EN");
  assert.equal(savedEnglish?.ctaLabel, service.ctaLabel);
  assert.notEqual(savedEnglish?.ctaLabel, draft.ctaLabel);
  assert.ok(database.writes.includes("translation:translation-en"));
});

test("apply keeps an empty base CTA locale-local instead of leaking Czech copy", async () => {
  const sourceDraft = fullDraft;
  const service = seedService(sourceDraft);
  service.ctaLabel = null;
  service.translations.find(({ locale }) => locale === "EN")!.ctaLabel = null;
  const draft = draftFor(service, sourceDraft);
  const database = fakeDatabase(service);

  await runCzechiaSeoServicePatch(database.client, options(draft, true), silentLogger, [draft]);

  const saved = database.state();
  assert.equal(saved.ctaLabel, null);
  assert.equal(saved.translations.find(({ locale }) => locale === "CS")?.ctaLabel, draft.ctaLabel);
  assert.equal(saved.translations.find(({ locale }) => locale === "EN")?.ctaLabel, null);
});

test("apply aborts when a non-CS locale would fall back to rewritten Czech FAQs", async () => {
  const sourceDraft = fullDraft;
  const service = seedService(sourceDraft);
  for (const faq of service.faqs) {
    faq.translations.splice(faq.translations.findIndex(({ locale }) => locale === "EN"), 1);
  }
  const draft = draftFor(service, sourceDraft);
  const database = fakeDatabase(service);

  await assert.rejects(
    runCzechiaSeoServicePatch(database.client, options(draft, true), silentLogger, [draft]),
    /unsafe non-CS base-copy fallbacks/i,
  );
  assert.equal(database.transactionCount(), 0);
  assert.deepEqual(database.writes, []);
});

test("an English variant updates only its translation and preserves the Czech base", async () => {
  const english = CZECHIA_SEO_SERVICE_DRAFTS.find(
    ({ slug, locale }) => slug === "lekar-online-praha" && locale === "EN",
  )!;
  const service = seedService(english);
  const draft = draftFor(service, english);
  const database = fakeDatabase(service);

  await runCzechiaSeoServicePatch(database.client, options(draft, true), silentLogger, [draft]);

  const saved = database.state();
  assert.equal(saved.seoTitle, service.seoTitle);
  assert.equal(saved.translations.find(({ locale }) => locale === "CS")?.seoTitle, service.translations[0]?.seoTitle);
  assert.equal(saved.translations.find(({ locale }) => locale === "EN")?.seoTitle, draft.seoTitle);
});
