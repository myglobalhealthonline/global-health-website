import assert from "node:assert/strict";
import test from "node:test";

import {
  portugalDoctorFactSha256,
  readPortugalDoctorFactRecord,
} from "../src/content/portugal-clinical-approval.js";
import {
  loadPortugalSeoMetadataDrafts,
  portugalSeoApprovalSha256,
  portugalSeoConfirmationToken,
  type PortugalSeoMetadataDraft,
} from "../src/content/portugal-seo-metadata-drafts.js";
import type { prisma as productionPrisma } from "../src/db/prisma.js";
import { runPortugalSeoMetadataPatch } from "./patch-portugal-seo-metadata.js";

type PrismaClient = typeof productionPrisma;
type Failure = "concurrency" | "doctor-identity" | "doctor-registration" | "readback" | "reviewer";

const drafts = loadPortugalSeoMetadataDrafts();
const serviceDraft = drafts.find(({ url }) => url.endsWith("/services/consulta-medica"))!;
const homeDraft = drafts.find(({ targetKind }) => targetKind === "home")!;
const doctorDraft = drafts.find(({ url }) => url.endsWith("/doctors/dr-martim-delgado"))!;

function fakeClient(draft: PortugalSeoMetadataDraft, failure?: Failure) {
  const state = {
    seoTitle: draft.originalTitle as string | null,
    seoDescription: draft.originalDescription,
    seoKeywords: ["existing keyword"],
    updatedAt: new Date("2026-09-01T12:00:00.000Z"),
    transactions: 0,
    reads: 0,
  };
  const translation = () => ({ id: "translation-pt-1", ...state });
  const updateMany = async ({ data }: { data: { seoTitle: string; seoDescription: string; seoKeywords?: string[] } }) => {
    if (failure === "concurrency") return { count: 0 };
    state.seoTitle = data.seoTitle;
    state.seoDescription = failure === "readback" ? "unexpected readback" : data.seoDescription;
    if (data.seoKeywords) state.seoKeywords = data.seoKeywords;
    return { count: 1 };
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
    pageContentTranslation: { updateMany },
    serviceTranslation: { updateMany },
    doctorMarketTranslation: { updateMany },
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
    approved_sha256: portugalSeoApprovalSha256(draft),
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
    approvedHash: portugalSeoApprovalSha256(draft),
    sourceHash,
    confirmation: portugalSeoConfirmationToken(draft),
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

test("Portugal metadata writer rejects source drift, reviewer failure, concurrency and bad readback", async () => {
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
  const doctorHash = await dryRun(doctorRegistration.client, doctorDraft);
  await assert.rejects(
    runPortugalSeoMetadataPatch(doctorRegistration.client, applyOptions(doctorDraft, doctorHash)),
    /verified professional registration/,
  );

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
});
