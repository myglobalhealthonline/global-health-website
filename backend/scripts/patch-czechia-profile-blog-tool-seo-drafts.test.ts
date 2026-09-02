import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { before, beforeEach, mock, test } from "node:test";
import { Prisma } from "@prisma/client";

import * as draftModule from "../src/content/czechia-profile-blog-tool-seo-drafts.js";

const scriptSource = readFileSync(
  new URL("./patch-czechia-profile-blog-tool-seo-drafts.ts", import.meta.url),
  "utf8",
);

const baseDraft = draftModule.CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS[0]!;
const translationUpdatedAt = "2026-09-01T10:00:00.000Z";

function doctorSource(countryCode = "cz", locale = "CS", updatedAt = translationUpdatedAt) {
  return {
    id: baseDraft.doctorCountryId,
    doctorId: baseDraft.doctorId,
    countryId: "country-cz",
    country: { code: countryCode },
    active: true,
    doctor: {
      id: baseDraft.doctorId,
      slug: baseDraft.slug,
      active: true,
      qualifications: ["MD"],
      credentials: [],
      specialties: [],
      assignedServices: [],
      availabilities: [],
      faqs: [],
    },
    translations: [
      {
        id: baseDraft.translationId,
        locale,
        title: "Praktický lékař",
        bio: "Protected biography",
        seoTitle: "Old title",
        seoDescription: "Old description",
        seoKeywords: ["old"],
        updatedAt: new Date(updatedAt),
      },
    ],
  };
}

const initialSource = doctorSource();
const { country: _countryGuard, ...fingerprintSource } = initialSource;
const doctorDraft = {
  ...baseDraft,
  expectedTranslationUpdatedAt: translationUpdatedAt,
  expectedSourceSha256: createHash("sha256")
    .update(JSON.stringify(fingerprintSource))
    .digest("hex"),
};

function savedDoctorSource() {
  const source = doctorSource();
  return {
    ...source,
    translations: source.translations.map((translation) => ({
      ...translation,
      seoTitle: doctorDraft.desired.seoTitle,
      seoDescription: doctorDraft.desired.seoDescription,
      seoKeywords: [...doctorDraft.desired.seoKeywords],
      updatedAt: new Date("2026-09-02T10:00:00.000Z"),
    })),
  };
}

const state = {
  reviewer: { active: true } as { active: boolean } | null,
  source: initialSource,
  saved: savedDoctorSource(),
  updates: [] as unknown[],
  transactionOptions: null as unknown,
};

const transaction = {
  doctor: {
    findUnique: async () => state.reviewer,
  },
  doctorCountry: {
    findUnique: async () => state.source,
    findUniqueOrThrow: async () => state.saved,
  },
  doctorMarketTranslation: {
    updateMany: async (input: unknown) => {
      state.updates.push(input);
      return { count: 1 };
    },
  },
};

const prisma = {
  ...transaction,
  $transaction: async <T>(
    callback: (client: typeof transaction) => Promise<T>,
    options: unknown,
  ): Promise<T> => {
    state.transactionOptions = options;
    return callback(transaction);
  },
};

type PatchModule = typeof import("./patch-czechia-profile-blog-tool-seo-drafts.js");
let patchModule: PatchModule;

before(async () => {
  mock.module("../src/content/czechia-profile-blog-tool-seo-drafts.js", {
    namedExports: {
      ...draftModule,
      CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS: [doctorDraft],
      CZECHIA_BLOG_SEO_DRAFTS: [],
      CZECHIA_TOOL_SEO_DRAFTS: [],
    },
  });
  mock.module("../src/db/prisma.js", {
    namedExports: {
      prisma,
      disconnectDb: async () => undefined,
    },
  });
  patchModule = await import("./patch-czechia-profile-blog-tool-seo-drafts.js");
});

beforeEach(() => {
  state.reviewer = { active: true };
  state.source = doctorSource();
  state.saved = savedDoctorSource();
  state.updates = [];
  state.transactionOptions = null;
});

function approvedOptions(reviewerDoctorId = "cmp5r0if3002kssjug743x0p6") {
  return {
    only: `doctor:${doctorDraft.slug}`,
    apply: true,
    approvedHash: draftModule.czechiaClinicalDraftApprovalSha256(doctorDraft),
    reviewedAt: new Date("2026-09-02T12:00:00.000Z"),
    reviewerDoctorId,
    confirmation: draftModule.czechiaClinicalDraftConfirmationToken(doctorDraft),
    clinicalReviewStatus: "approved",
  };
}

test("doctor apply writes exactly three guarded Czech market SEO fields", async () => {
  await patchModule.runCzechiaProfileBlogToolPatch(approvedOptions(), { log() {} });

  assert.deepEqual(state.updates, [
    {
      where: {
        id: doctorDraft.translationId,
        doctorCountryId: doctorDraft.doctorCountryId,
        locale: "CS",
        updatedAt: new Date(translationUpdatedAt),
      },
      data: {
        seoTitle: doctorDraft.desired.seoTitle,
        seoDescription: doctorDraft.desired.seoDescription,
        seoKeywords: [...doctorDraft.desired.seoKeywords],
      },
    },
  ]);
  assert.deepEqual(state.transactionOptions, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 10_000,
    timeout: 45_000,
  });
});

test("doctor apply binds the delegated reviewer to the canonical register", async () => {
  await assert.rejects(
    patchModule.runCzechiaProfileBlogToolPatch(
      approvedOptions("cmqas8yh9000b01pgpc0yp1la"),
      { log() {} },
    ),
    /reviewer doctor ID does not match the recorded approval/i,
  );
  assert.equal(state.transactionOptions, null);
  assert.deepEqual(state.updates, []);
});

test("doctor apply rejects inactive governance reviewers before writing", async () => {
  state.reviewer = { active: false };
  await assert.rejects(
    patchModule.runCzechiaProfileBlogToolPatch(approvedOptions(), { log() {} }),
    /active doctor delegated for governance review/i,
  );
  assert.deepEqual(state.updates, []);
});

test("doctor apply rejects stale source fingerprints and timestamps before writing", async () => {
  state.source = {
    ...doctorSource(),
    doctor: { ...doctorSource().doctor, qualifications: ["Changed"] },
  };
  await assert.rejects(
    patchModule.runCzechiaProfileBlogToolPatch(approvedOptions(), { log() {} }),
    /source fingerprint changed/i,
  );
  assert.deepEqual(state.updates, []);

  state.source = doctorSource("cz", "CS", "2026-09-01T11:00:00.000Z");
  await assert.rejects(
    patchModule.runCzechiaProfileBlogToolPatch(approvedOptions(), { log() {} }),
    /identity, locale, activity or updatedAt guard failed/i,
  );
  assert.deepEqual(state.updates, []);
});

test("doctor apply rejects non-Czech and non-CS targets before writing", async () => {
  state.source = doctorSource("ie");
  await assert.rejects(
    patchModule.runCzechiaProfileBlogToolPatch(approvedOptions(), { log() {} }),
    /doctor market must belong exclusively to Czechia/i,
  );

  state.source = doctorSource("cz", "EN");
  await assert.rejects(
    patchModule.runCzechiaProfileBlogToolPatch(approvedOptions(), { log() {} }),
    /identity, locale, activity or updatedAt guard failed/i,
  );
  assert.deepEqual(state.updates, []);
});

test("promotion script has no global doctor or FAQ mutation path", () => {
  assert.doesNotMatch(scriptSource, /doctorFaq\.(update|updateMany|create|delete)/);
  assert.doesNotMatch(scriptSource, /transaction\.doctor\.(update|updateMany|create|delete)/);
  assert.doesNotMatch(scriptSource, /transaction\.doctorCountry\.(update|updateMany|create|delete)/);
  assert.doesNotMatch(scriptSource, /writeFile|renameSync|copyFile/);
  assert.match(scriptSource, /doctorMarketTranslation\.updateMany/);
  assert.match(scriptSource, /blogPost\.updateMany/);
  assert.match(scriptSource, /assertCzechiaBlogMetadataReadback\(draft, saved\)/);
});

test("doctor governance review is distinct from Czech clinical review", () => {
  assert.doesNotThrow(() => patchModule.assertActiveGovernanceReviewer({ active: true }));
  assert.throws(
    () => patchModule.assertActiveGovernanceReviewer({ active: false }),
    /active doctor delegated for governance review/i,
  );
  assert.throws(
    () => patchModule.assertActiveGovernanceReviewer(null),
    /active doctor delegated for governance review/i,
  );
  assert.match(scriptSource, /await assertEligibleActiveGovernanceReviewer\(transaction/);
  assert.match(scriptSource, /await assertEligibleCzechReviewer\(transaction/);
});

test("promotion script uses exact source hashes and serializable transactions", () => {
  assert.match(scriptSource, /clinical-review-register\.csv/);
  assert.match(scriptSource, /findCzechiaClinicalRegisterRow/);
  assert.match(scriptSource, /assertCzechiaClinicalApproval/);
  assert.match(scriptSource, /expectedSourceSha256/);
  assert.match(scriptSource, /TransactionIsolationLevel\.Serializable/);
  assert.match(scriptSource, /reviewer-doctor-id/);
  assert.match(scriptSource, /approved-sha256/);
  assert.match(scriptSource, /credentials: \{/);
  assert.match(scriptSource, /assignedServices: \{/);
  assert.match(scriptSource, /availabilities: \{/);
  assert.match(scriptSource, /editorialChecklist: source\.editorialChecklist/);
});

test("tool drafts remain preview-only because shared Czech JSON is not a write target", () => {
  assert.match(scriptSource, /country-scoped frontend overlay/i);
  assert.match(scriptSource, /assetKind === "tool"/);
});

test("doctor and blog country guards reject cross-market rows", () => {
  assert.doesNotThrow(() => patchModule.assertCzechiaDoctorCountryCode({ code: "CZ" }));
  assert.throws(
    () => patchModule.assertCzechiaDoctorCountryCode({ code: "ie" }),
    /doctor market must belong exclusively to Czechia/i,
  );
  assert.doesNotThrow(() =>
    patchModule.assertExclusiveCzechiaBlogCountries([{ country: { code: "cz" } }]),
  );
  assert.throws(
    () =>
      patchModule.assertExclusiveCzechiaBlogCountries([
        { country: { code: "cz" } },
        { country: { code: "ie" } },
      ]),
    /blog must be mapped exclusively to Czechia/i,
  );
});
