import assert from "node:assert/strict";
import test from "node:test";

import {
  CZECHIA_PAGE_CONTENT_SEO_DRAFTS,
  czechiaPageContentApprovalSha256,
  czechiaPageContentConfirmationToken,
  type CzechiaPageContentSeoDraft,
} from "../src/content/czechia-page-content-seo-drafts.js";
import {
  pageContentSourceSha256,
  parseCzechiaPageContentReviewDate,
  readClinicalRegisterStatus,
  runCzechiaPageContentSeoPatch,
  type CzechiaPageContentPatchOptions,
} from "./patch-czechia-page-content-seo-drafts.js";

type FakePage = ReturnType<typeof seedPage>;
type FakeClient = Parameters<typeof runCzechiaPageContentSeoPatch>[0];

function seedPage(draft: CzechiaPageContentSeoDraft) {
  return {
    id: draft.pageContentId,
    country: { code: "cz" },
    pageKey: draft.pageKey,
    status: "PUBLISHED",
    isActive: true,
    updatedAt: new Date(draft.expectedPageUpdatedAt),
    heroImagePath: "/preserved.webp",
    ogImagePath: null,
    ctaHref: "/preserved",
    showIntro: true,
    showWhoFor: true,
    showWhyChoose: true,
    showFaq: true,
    showDisclaimer: true,
    showBody: false,
    introTheme: null,
    whoForTheme: null,
    whyChooseTheme: null,
    faqTheme: null,
    disclaimerTheme: null,
    createdAt: new Date("2026-07-13T00:00:00.000Z"),
    translations: [
      {
        id: draft.translationId,
        pageContentId: draft.pageContentId,
        locale: draft.locale,
        heroTitle: null,
        heroSubtitle: null,
        heroTitleLead: null,
        heroTitleAccent: null,
        ctaLabel: null,
        intro: "preserved intro",
        whoForTitle: "preserved who for",
        whoForIntro: null,
        whoForItems: ["preserved"],
        whyChooseTitle: "preserved why choose",
        whyChooseItems: ["preserved"],
        faq: [{ question: "preserved", answer: "preserved" }],
        disclaimerParagraphs: ["preserved"],
        disclaimerShort: "preserved",
        body: "<p>preserved</p>",
        seoTitle: null,
        seoDescription: "old description",
        createdAt: new Date("2026-07-13T00:00:00.000Z"),
        updatedAt: new Date(draft.expectedTranslationUpdatedAt),
      },
    ],
  };
}

function draftFor(page: FakePage, draft: CzechiaPageContentSeoDraft) {
  return { ...draft, expectedSourceSha256: pageContentSourceSha256(page as never) };
}

function options(draft: CzechiaPageContentSeoDraft, apply: boolean): CzechiaPageContentPatchOptions {
  return {
    only: draft.key,
    apply,
    approvedHash: apply ? czechiaPageContentApprovalSha256(draft) : null,
    reviewedAt: apply ? new Date("2026-09-01T12:00:00.000Z") : null,
    reviewerId: apply ? "reviewer-1" : null,
    nativeReviewerId: draft.locale === "EN" && apply ? "native-editor" : null,
    nativeReviewedAt:
      draft.locale === "EN" && apply ? new Date("2026-09-01T12:00:00.000Z") : null,
    confirmation: apply ? czechiaPageContentConfirmationToken(draft) : null,
  };
}

function fakeDatabase(seed: FakePage, reviewerEligible = true) {
  let state = structuredClone(seed);
  let transactionCount = 0;
  const writes: object[] = [];
  const updateWheres: object[] = [];

  const transactionClient = (target: FakePage) => ({
    pageContent: {
      findUnique: async () => structuredClone(target),
    },
    pageContentTranslation: {
      updateMany: async ({ where, data }: { where: { id: string; updatedAt: Date }; data: object }) => {
        updateWheres.push(structuredClone(where));
        const row = target.translations.find(({ id }) => id === where.id);
        if (!row || row.updatedAt.getTime() !== where.updatedAt.getTime()) return { count: 0 };
        Object.assign(row, data, { updatedAt: new Date(row.updatedAt.getTime() + 1) });
        writes.push(structuredClone(data));
        return { count: 1 };
      },
    },
    doctor: {
      findUnique: async () =>
        reviewerEligible
          ? {
              active: true,
              additionalCountries: [
                {
                  active: true,
                  chamberEntity: "ČLK",
                  registrationNumber: "12345",
                  isVerified: true,
                },
              ],
            }
          : {
              active: true,
              additionalCountries: [
                {
                  active: true,
                  chamberEntity: "ČLK",
                  registrationNumber: null,
                  isVerified: false,
                },
              ],
            },
    },
  });

  const client = {
    pageContent: { findUnique: async () => structuredClone(state) },
    doctor: transactionClient(state).doctor,
    $transaction: async (
      operation: (tx: ReturnType<typeof transactionClient>) => Promise<unknown>,
      config: { isolationLevel: string },
    ) => {
      assert.equal(config.isolationLevel, "Serializable");
      transactionCount += 1;
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
    writes,
    updateWheres,
  };
}

const approvedRegister = (asset: string) => `asset,status\n${asset},approved\n`;
const silentLogger = { log() {} };

test("reads the exact asset status from the clinical register", () => {
  const csv = 'asset,reason,status\n/czechia/cs,"scope, claims",pending\n/czechia/en,native,approved\n';
  assert.equal(readClinicalRegisterStatus(csv, "/czechia/cs"), "pending");
  assert.equal(readClinicalRegisterStatus(csv, "/czechia/en"), "approved");
  assert.throws(() => readClinicalRegisterStatus(csv, "/missing"), /missing/i);
});

test("rejects invalid or future native-review dates", () => {
  assert.throws(() => parseCzechiaPageContentReviewDate("2026-02-31"), /valid calendar date/i);
  assert.throws(() => parseCzechiaPageContentReviewDate("2099-01-01"), /future/i);
  assert.equal(
    parseCzechiaPageContentReviewDate("2026-09-01")?.toISOString(),
    "2026-09-01T12:00:00.000Z",
  );
});

test("pending clinical status keeps apply impossible and performs no write", async () => {
  const source = CZECHIA_PAGE_CONTENT_SEO_DRAFTS[0];
  const page = seedPage(source);
  const draft = draftFor(page, source);
  const database = fakeDatabase(page);

  await assert.rejects(
    runCzechiaPageContentSeoPatch(
      database.client,
      options(draft, true),
      "asset,status\n/czechia/cs,pending\n",
      silentLogger,
      [draft],
    ),
    /clinical register status=approved/i,
  );
  assert.equal(database.transactionCount(), 0);
  assert.deepEqual(database.writes, []);
});

test("apply requires one exact allowlisted target", async () => {
  const source = CZECHIA_PAGE_CONTENT_SEO_DRAFTS[0];
  const database = fakeDatabase(seedPage(source));

  await assert.rejects(
    runCzechiaPageContentSeoPatch(
      database.client,
      { ...options(source, true), only: null },
      "asset,status\n/czechia/cs,approved\n",
      silentLogger,
      [source, CZECHIA_PAGE_CONTENT_SEO_DRAFTS[1]],
    ),
    /one exact --only target/i,
  );
  assert.equal(database.transactionCount(), 0);
});

test("apply rejects an unverified reviewer before any copy write", async () => {
  const source = CZECHIA_PAGE_CONTENT_SEO_DRAFTS[0];
  const page = seedPage(source);
  const draft = draftFor(page, source);
  const database = fakeDatabase(page, false);

  await assert.rejects(
    runCzechiaPageContentSeoPatch(
      database.client,
      options(draft, true),
      approvedRegister(draft.canonicalPath),
      silentLogger,
      [draft],
    ),
    /verified active Czech ČLK registration/i,
  );
  assert.deepEqual(database.writes, []);
});

test("dry-run verifies the source hash without starting a transaction", async () => {
  const source = CZECHIA_PAGE_CONTENT_SEO_DRAFTS[0];
  const page = seedPage(source);
  const draft = draftFor(page, source);
  const database = fakeDatabase(page);

  await runCzechiaPageContentSeoPatch(
    database.client,
    options(draft, false),
    approvedRegister(draft.canonicalPath),
    silentLogger,
    [draft],
  );
  assert.equal(database.transactionCount(), 0);
  assert.deepEqual(database.writes, []);
});

test("stale source content aborts before a transaction", async () => {
  const source = CZECHIA_PAGE_CONTENT_SEO_DRAFTS[0];
  const page = seedPage(source);
  const draft = { ...draftFor(page, source), expectedSourceSha256: "0".repeat(64) };
  const database = fakeDatabase(page);

  await assert.rejects(
    runCzechiaPageContentSeoPatch(
      database.client,
      options(draft, false),
      approvedRegister(draft.canonicalPath),
      silentLogger,
      [draft],
    ),
    /source fingerprint changed/i,
  );
  assert.equal(database.transactionCount(), 0);
});

test("a matching ID from another country aborts before any write", async () => {
  const source = CZECHIA_PAGE_CONTENT_SEO_DRAFTS[0];
  const page = seedPage(source);
  page.country.code = "ro";
  const draft = draftFor(page, source);
  const database = fakeDatabase(page);

  await assert.rejects(
    runCzechiaPageContentSeoPatch(
      database.client,
      options(draft, false),
      approvedRegister(draft.canonicalPath),
      silentLogger,
      [draft],
    ),
    /country changed/i,
  );
  assert.equal(database.transactionCount(), 0);
  assert.deepEqual(database.writes, []);
});

test("apply changes only the allowlisted target translation fields", async () => {
  const source = CZECHIA_PAGE_CONTENT_SEO_DRAFTS[2];
  const page = seedPage(source);
  const draft = draftFor(page, source);
  const before = structuredClone(page);
  const database = fakeDatabase(page);

  await runCzechiaPageContentSeoPatch(
    database.client,
    options(draft, true),
    approvedRegister(draft.canonicalPath),
    silentLogger,
    [draft],
  );

  const after = database.state();
  assert.equal(database.transactionCount(), 1);
  assert.deepEqual(database.writes, [draft.copy]);
  assert.deepEqual(
    (database.updateWheres[0] as { pageContent: unknown }).pageContent,
    { country: { code: "cz" } },
  );
  assert.equal(after.heroImagePath, before.heroImagePath);
  assert.equal(after.ctaHref, before.ctaHref);
  assert.deepEqual(after.translations[0]?.faq, before.translations[0]?.faq);
  assert.equal(after.translations[0]?.seoTitle, draft.copy.seoTitle);
  assert.equal(after.translations[0]?.intro, draft.copy.intro);
});
