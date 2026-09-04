import assert from "node:assert/strict";
import test from "node:test";

import {
  portugalDoctorFactSha256,
  readPortugalDoctorFactRecord,
} from "../src/content/portugal-clinical-approval.js";
import {
  loadPortugalSeoMetadataDrafts,
  type PortugalSeoMetadataDraft,
} from "../src/content/portugal-seo-metadata-drafts.js";
import { loadPortugalSeoRemainingDrafts } from "../src/content/portugal-seo-remaining-drafts.js";
import {
  portugalSeoDraftApprovalSha256,
  portugalSeoDraftConfirmationToken,
} from "../src/content/portugal-seo-metadata-patch.js";
import type { prisma as productionPrisma } from "../src/db/prisma.js";
import { runPortugalSeoMetadataPatch } from "./patch-portugal-seo-metadata.js";

type PrismaClient = typeof productionPrisma;
type Failure = "concurrency" | "doctor-identity" | "doctor-registration" | "readback" | "reviewer";

const drafts = loadPortugalSeoMetadataDrafts();
const serviceDraft = drafts.find(({ url }) => url.endsWith("/services/consulta-medica"))!;
const homeDraft = drafts.find(({ targetKind }) => targetKind === "home")!;
const doctorDraft = drafts.find(({ url }) => url.endsWith("/doctors/dr-martim-delgado"))!;
const remainingDrafts = loadPortugalSeoRemainingDrafts();
const pageDraft = remainingDrafts.find(({ targetKind }) => targetKind === "page")!;
const landingDraft = remainingDrafts.find(({ targetKind }) => targetKind === "landing")!;
const blogDraft = remainingDrafts.find(({ targetKind }) => targetKind === "blog")!;

function fakeClient(draft: PortugalSeoMetadataDraft, failure?: Failure, translatedBlog = false) {
  const state = {
    seoTitle: translatedBlog && draft.targetKind === "blog"
      ? draft.originalTitle.replace(/ · Global Health$/, "")
      : draft.originalTitle as string | null,
    seoDescription: draft.originalDescription,
    seoKeywords: ["existing keyword"],
    updatedAt: new Date("2026-09-01T12:00:00.000Z"),
    transactions: 0,
    reads: 0,
    pageContentWrites: 0,
    serviceWrites: 0,
    doctorWrites: 0,
    landingWrites: 0,
    blogPostWrites: 0,
    blogTranslationWrites: 0,
  };
  const translation = () => ({ id: "translation-pt-1", ...state });
  const updateMany = async ({ data }: { data: { seoTitle: string; seoDescription: string; seoKeywords?: string[] } }) => {
    if (failure === "concurrency") return { count: 0 };
    state.seoTitle = data.seoTitle;
    state.seoDescription = failure === "readback" ? "unexpected readback" : data.seoDescription;
    if (data.seoKeywords) state.seoKeywords = data.seoKeywords;
    return { count: 1 };
  };
  const countedUpdateMany = (
    counter: "pageContentWrites" | "serviceWrites" | "doctorWrites" | "landingWrites" | "blogPostWrites",
  ) => async (args: Parameters<typeof updateMany>[0]) => {
    state[counter] += 1;
    return updateMany(args);
  };
  const rawClient: unknown = {
    country: { findUnique: async () => ({ id: "country-pt" }) },
    pageContent: {
      findUnique: async () => {
        state.reads += 1;
        return { id: "home-pt", status: "PUBLISHED", isActive: true, translations: [translation()] };
      },
    },
    service: {
      findUnique: async () => {
        state.reads += 1;
        return { id: "service-pt", visibility: "PUBLIC", isActive: true, translations: [translation()] };
      },
    },
    doctorCountry: {
      findMany: async () => {
        state.reads += 1;
        return [{
          id: "doctor-country-pt",
          chamberEntity: "OM",
          registrationNumber: failure === "doctor-identity" ? "99999" : "70349",
          isVerified: failure !== "doctor-registration",
          doctor: {
            id: "doctor-subject-1",
            slug: draft.slug,
            fullName: "Dr. Martim Delgado",
          },
          translations: [translation()],
        }];
      },
    },
    doctor: {
      findUnique: async () => failure === "reviewer" ? null : ({
        active: true,
        fullName: "Dra. Revisora",
        additionalCountries: [{ isVerified: true, chamberEntity: "OM", registrationNumber: "12345" }],
      }),
    },
    seoLandingPage: {
      findUnique: async () => ({
        id: "landing-pt",
        isPublished: true,
        translations: [translation()],
      }),
    },
    pageContentTranslation: { updateMany: countedUpdateMany("pageContentWrites") },
    serviceTranslation: { updateMany: countedUpdateMany("serviceWrites") },
    doctorMarketTranslation: { updateMany: countedUpdateMany("doctorWrites") },
    seoLandingPageTranslation: { updateMany: countedUpdateMany("landingWrites") },
    blogPost: {
      updateMany: countedUpdateMany("blogPostWrites"),
      findMany: async () => [{
        id: "blog-pt",
        slug: translatedBlog ? "hand-foot-and-mouth-disease-signs-and-treatment" : draft.slug,
        locale: translatedBlog ? "EN" : "PT",
        seoTitle: state.seoTitle,
        seoDescription: state.seoDescription,
        updatedAt: state.updatedAt,
        translations: translatedBlog ? [{
          id: "blog-translation-pt-1",
          slug: draft.slug,
          content: "Conteúdo PT",
          seoTitle: state.seoTitle,
          seoDesc: state.seoDescription,
          updatedAt: state.updatedAt,
        }] : [],
      }],
    },
    blogTranslation: {
      updateMany: async ({ data }: { data: { seoTitle: string; seoDesc: string } }) => {
        state.blogTranslationWrites += 1;
        state.seoTitle = data.seoTitle;
        state.seoDescription = data.seoDesc;
        return { count: 1 };
      },
    },
    $transaction: async (callback: (transaction: unknown) => Promise<unknown>) => {
      state.transactions += 1;
      return callback(rawClient);
    },
  };
  return { client: rawClient as PrismaClient, state };
}

const approvalColumns = [
  "page_or_file", "topic", "risk_level", "claims_requiring_review", "source_status",
  "reviewer_required", "publish_status", "notes", "reviewer_name", "reviewer_doctor_id",
  "clinical_reviewer_professional_body", "clinical_reviewer_specialty_id", "reviewed_at",
  "official_source_references", "approved_sha256", "compliance_reviewer_name",
  "compliance_reviewer_id", "compliance_reviewed_at", "content_owner_name", "content_owner_id",
  "content_owner_reviewed_at", "fact_register_sha256", "credential_subject_doctor_id",
  "delegated_by_doctor_id",
] as const;

const doctorFactRegister = [
  "URL,slug,display_name,professional_body,registration_number,source_status,official_source,verification_status,notes",
  '"https://www.myglobalhealth.online/portugal/pt/doctors/dr-martim-delgado","dr-martim-delgado","Dr. Martim Delgado","OM","70349","Official OM register verified for metadata-only rollout","https://ordemdosmedicos.pt/registo/70349","verified","Metadata only"',
].join("\n");

function approvalRegister(draft: PortugalSeoMetadataDraft): string {
  const fact = draft.targetKind === "doctor"
    ? readPortugalDoctorFactRecord(doctorFactRegister, draft.asset)
    : null;
  const values: Record<(typeof approvalColumns)[number], string> = {
    page_or_file: draft.asset,
    topic: draft.targetKind,
    risk_level: "medium",
    claims_requiring_review: "claims",
    source_status: "evidence",
    reviewer_required: "Portugal-registered clinician",
    publish_status: "approved",
    notes: "reviewed",
    reviewer_name: "Dra. Revisora",
    reviewer_doctor_id: "doctor-pt-1",
    clinical_reviewer_professional_body: "OM",
    clinical_reviewer_specialty_id: "",
    reviewed_at: "2026-08-31T12:00:00Z",
    official_source_references: draft.targetKind === "doctor"
      ? "https://ordemdosmedicos.pt/registo/70349"
      : "https://www.dgs.pt",
    approved_sha256: portugalSeoDraftApprovalSha256(draft),
    compliance_reviewer_name: "",
    compliance_reviewer_id: "",
    compliance_reviewed_at: "",
    content_owner_name: "",
    content_owner_id: "",
    content_owner_reviewed_at: "",
    fact_register_sha256: fact ? portugalDoctorFactSha256(fact) : "",
    credential_subject_doctor_id: fact ? "doctor-subject-1" : "",
    delegated_by_doctor_id: "",
  };
  return `${approvalColumns.join(",")}\n${approvalColumns.map((column) => values[column]).join(",")}\n`;
}

function baseOptions(draft: PortugalSeoMetadataDraft) {
  return {
    only: `${draft.targetKind}:${draft.slug}`,
    registerCsv: "",
    factRegisterCsv: doctorFactRegister,
    approvedHash: null,
    sourceHash: null,
    confirmation: null,
    reviewerDoctorId: null,
    reviewedAt: null,
    databaseUrl: undefined,
    confirmationDatabase: null,
  } as const;
}

async function dryRun(client: PrismaClient, draft: PortugalSeoMetadataDraft): Promise<string> {
  const log: string[] = [];
  await runPortugalSeoMetadataPatch(client, { ...baseOptions(draft), apply: false }, {
    log: (message) => log.push(message),
  });
  const hash = log.find((message) => message.includes("source sha256:"))?.split(": ")[1];
  assert.match(hash ?? "", /^[a-f0-9]{64}$/);
  return hash!;
}

function applyOptions(draft: PortugalSeoMetadataDraft, sourceHash: string) {
  return {
    ...baseOptions(draft),
    apply: true,
    registerCsv: approvalRegister(draft),
    approvedHash: portugalSeoDraftApprovalSha256(draft),
    sourceHash,
    confirmation: portugalSeoDraftConfirmationToken(draft),
    reviewerDoctorId: "doctor-pt-1",
    reviewedAt: "2026-08-31",
    databaseUrl: "postgresql://user:secret@db.example.test/global_health",
    confirmationDatabase: "postgresql://db.example.test:5432/global_health",
  } as const;
}

test("Portugal service metadata dry-runs and writes one approved record", async () => {
  const { client, state } = fakeClient(serviceDraft);
  state.seoDescription = serviceDraft.originalDescription.replace(
    / Aceitamos também Medicare para este serviço\.$/,
    "",
  );
  const sourceHash = await dryRun(client, serviceDraft);
  assert.equal(state.transactions, 0);
  await runPortugalSeoMetadataPatch(client, applyOptions(serviceDraft, sourceHash));
  assert.equal(state.transactions, 1);
  assert.equal(state.seoTitle, serviceDraft.proposedTitle);
  assert.equal(state.seoDescription, serviceDraft.proposedDescription);
});

test("Portugal home and verified doctor branches preserve their target-specific fields", async () => {
  const home = fakeClient(homeDraft);
  home.state.seoTitle = null;
  await runPortugalSeoMetadataPatch(home.client, applyOptions(homeDraft, await dryRun(home.client, homeDraft)));
  assert.equal(home.state.seoTitle, homeDraft.proposedTitle);

  const doctor = fakeClient(doctorDraft);
  doctor.state.seoTitle = `${doctorDraft.originalTitle} | Global Health Portugal`;
  await runPortugalSeoMetadataPatch(
    doctor.client,
    applyOptions(doctorDraft, await dryRun(doctor.client, doctorDraft)),
  );
  assert.deepEqual(doctor.state.seoKeywords, [doctorDraft.primaryKeyword, ...doctorDraft.secondaryKeywords]);
});

test("Portugal page, landing and authored-PT blog branches update metadata only", async () => {
  for (const draft of [pageDraft, landingDraft, blogDraft]) {
    const target = fakeClient(draft);
    await runPortugalSeoMetadataPatch(
      target.client,
      applyOptions(draft, await dryRun(target.client, draft)),
    );
    assert.equal(target.state.seoTitle, draft.proposedTitle);
    assert.equal(target.state.seoDescription, draft.proposedDescription);
    assert.equal(target.state.transactions, 1);
    const writes = [
      target.state.pageContentWrites,
      target.state.serviceWrites,
      target.state.doctorWrites,
      target.state.landingWrites,
      target.state.blogPostWrites,
      target.state.blogTranslationWrites,
    ];
    assert.equal(writes.reduce((total, count) => total + count, 0), 1);
    assert.equal(
      draft.targetKind === "page" ? target.state.pageContentWrites
        : draft.targetKind === "landing" ? target.state.landingWrites
          : target.state.blogPostWrites,
      1,
    );
  }
});

test("Portugal translated blog branch updates and reads back only the PT translation", async () => {
  const target = fakeClient(blogDraft, undefined, true);
  await runPortugalSeoMetadataPatch(
    target.client,
    applyOptions(blogDraft, await dryRun(target.client, blogDraft)),
  );
  assert.equal(target.state.seoTitle, blogDraft.proposedTitle);
  assert.equal(target.state.seoDescription, blogDraft.proposedDescription);
  assert.equal(target.state.blogPostWrites, 0);
  assert.equal(target.state.blogTranslationWrites, 1);
  assert.equal(target.state.transactions, 1);
});

test("Portugal metadata writer rejects source drift, reviewer failure, concurrency and bad readback", async () => {
  const staleDryRun = fakeClient(serviceDraft);
  staleDryRun.state.seoTitle = "Changed after audit";
  await assert.rejects(dryRun(staleDryRun.client, serviceDraft), /does not match the source reviewed/);

  const drift = fakeClient(serviceDraft);
  const driftHash = await dryRun(drift.client, serviceDraft);
  drift.state.seoTitle = "Changed after review";
  await assert.rejects(runPortugalSeoMetadataPatch(drift.client, applyOptions(serviceDraft, driftHash)), /does not match the source reviewed/);

  for (const [failure, message] of [
    ["reviewer", /Reviewer must have/],
    ["concurrency", /concurrency guard failed/],
    ["readback", /verification failed/],
  ] as const) {
    const target = fakeClient(serviceDraft, failure);
    const sourceHash = await dryRun(target.client, serviceDraft);
    await assert.rejects(runPortugalSeoMetadataPatch(target.client, applyOptions(serviceDraft, sourceHash)), message);
  }

  const doctorRegistration = fakeClient(doctorDraft, "doctor-registration");
  await assert.rejects(
    dryRun(doctorRegistration.client, doctorDraft),
    /verified professional registration/,
  );
  assert.equal(doctorRegistration.state.transactions, 0);

  const doctorIdentity = fakeClient(doctorDraft, "doctor-identity");
  const doctorIdentityHash = await dryRun(doctorIdentity.client, doctorDraft);
  await assert.rejects(
    runPortugalSeoMetadataPatch(doctorIdentity.client, applyOptions(doctorDraft, doctorIdentityHash)),
    /does not match the approved fact record/,
  );
});

test("Portugal metadata patch rejects an apply before reading the database", async () => {
  const { client, state } = fakeClient(serviceDraft);
  await assert.rejects(runPortugalSeoMetadataPatch(client, { ...baseOptions(serviceDraft), apply: true }), /confirmation token/);
  assert.equal(state.reads, 0);
  assert.equal(state.transactions, 0);

  const blocked = fakeClient(pageDraft);
  const options = applyOptions(pageDraft, "0".repeat(64));
  await assert.rejects(
    runPortugalSeoMetadataPatch(blocked.client, {
      ...options,
      registerCsv: options.registerCsv.replace(",approved,", ",blocked_pending_review,"),
    }),
    /Clinical review status is blocked_pending_review/,
  );
  assert.equal(blocked.state.reads, 0);
  assert.equal(blocked.state.transactions, 0);
});
