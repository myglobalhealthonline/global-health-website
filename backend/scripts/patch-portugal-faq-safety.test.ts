import assert from "node:assert/strict";
import test from "node:test";

import {
  PORTUGAL_DISCLAIMER_SAFETY_PATCH,
  PORTUGAL_FAQ_SAFETY_PATCHES,
  portugalFaqSafetyPatchToken,
} from "../src/content/portugal-faq-safety-patches.js";
import {
  runPortugalFaqSafetyPatch,
  type PortugalFaqSafetyDb,
} from "./patch-portugal-faq-safety.js";

const doctorPatch = PORTUGAL_FAQ_SAFETY_PATCHES[0];
const servicePatch = PORTUGAL_FAQ_SAFETY_PATCHES.find((patch) => patch.targetKind === "service");
assert.ok(servicePatch);
const disclaimerPublication = PORTUGAL_DISCLAIMER_SAFETY_PATCH.publication;
assert.ok(disclaimerPublication);
const updatedAt = new Date("2026-09-01T12:00:00.000Z");
const databaseUrl = "postgresql://user:secret@db.example.test/global_health";
const confirmationDatabase = "postgresql://db.example.test:5432/global_health";

function doctorDb(options: Readonly<{
  answer?: string;
  country?: string;
  updateCount?: number;
  savedAnswer?: string;
}> = {}) {
  let answer = options.answer ?? doctorPatch.originalAnswer;
  const calls = {
    transactionCount: 0,
    transactionOptions: null as Record<string, unknown> | null,
    updateWhere: null as Record<string, unknown> | null,
  };
  const reader = {
    doctorCountry: {
      findMany: async () => [{ doctorId: "doctor-1", country: { code: options.country ?? "pt" } }],
    },
    doctorFaq: {
      findMany: async () => [{ id: "faq-1", question: doctorPatch.question, answer, updatedAt }],
      updateMany: async (input: { where: Record<string, unknown> }) => {
        calls.updateWhere = input.where;
        if ((options.updateCount ?? 1) === 1) answer = options.savedAnswer ?? doctorPatch.proposedAnswer;
        return { count: options.updateCount ?? 1 };
      },
    },
  };
  const db = {
    ...reader,
    $transaction: async (
      callback: (transaction: typeof reader) => Promise<void>,
      transactionOptions: Record<string, unknown>,
    ) => {
      calls.transactionCount += 1;
      calls.transactionOptions = transactionOptions;
      await callback(reader);
    },
  };
  return { db: db as unknown as PortugalFaqSafetyDb, calls };
}

async function dryRunSourceHash(db: PortugalFaqSafetyDb, patchId: string): Promise<string> {
  const lines: string[] = [];
  await runPortugalFaqSafetyPatch(db, {
    only: patchId,
    apply: false,
    sourceHash: null,
    confirmation: null,
    databaseUrl,
    confirmationDatabase: null,
  }, { log: (line) => lines.push(line) });
  const line = lines.find((value) => value.trimStart().startsWith("source sha256:"));
  assert.ok(line);
  return line.split(": ")[1];
}

test("Portugal FAQ safety updater enforces dry-run, market, concurrency and readback", async () => {
  const dry = doctorDb();
  const sourceHash = await dryRunSourceHash(dry.db, doctorPatch.id);
  assert.equal(dry.calls.transactionCount, 0);

  const options = {
    only: doctorPatch.id,
    apply: true,
    sourceHash,
    confirmation: portugalFaqSafetyPatchToken(doctorPatch),
    databaseUrl,
    confirmationDatabase,
  } as const;

  await assert.rejects(runPortugalFaqSafetyPatch(doctorDb({ country: "br" }).db, options), /exclusive/i);
  await assert.rejects(runPortugalFaqSafetyPatch(doctorDb({ answer: "drift" }).db, options), /source drift/i);
  await assert.rejects(runPortugalFaqSafetyPatch(doctorDb({ updateCount: 0 }).db, options), /concurrency guard/i);
  await assert.rejects(
    runPortugalFaqSafetyPatch(doctorDb({ savedAnswer: doctorPatch.originalAnswer }).db, options),
    /verification failed/i,
  );

  const applied = doctorDb();
  await runPortugalFaqSafetyPatch(applied.db, options);
  assert.equal(applied.calls.transactionCount, 1);
  assert.deepEqual(applied.calls.transactionOptions, { isolationLevel: "Serializable" });
  assert.deepEqual(applied.calls.updateWhere, {
    id: "faq-1",
    question: doctorPatch.question,
    answer: doctorPatch.originalAnswer,
    updatedAt,
  });

  const idempotent = doctorDb({ answer: doctorPatch.proposedAnswer });
  await runPortugalFaqSafetyPatch(idempotent.db, { ...options, sourceHash: "unused" });
  assert.equal(idempotent.calls.transactionCount, 0);
});

test("Portugal FAQ safety updater targets one public Portugal service FAQ", async () => {
  let answer = servicePatch.originalAnswer;
  const calls = { where: null as Record<string, unknown> | null };
  const reader = {
    country: { findUnique: async () => ({ id: "country-pt" }) },
    service: {
      findUnique: async () => ({ id: "service-1", isActive: true, visibility: "PUBLIC" }),
    },
    serviceFaq: {
      findMany: async () => [{ id: "service-faq-1", question: servicePatch.question, answer, updatedAt }],
      updateMany: async (input: { where: Record<string, unknown> }) => {
        calls.where = input.where;
        answer = servicePatch.proposedAnswer;
        return { count: 1 };
      },
    },
  };
  const db = {
    ...reader,
    $transaction: async (callback: (transaction: typeof reader) => Promise<void>) => callback(reader),
  } as unknown as PortugalFaqSafetyDb;
  const sourceHash = await dryRunSourceHash(db, servicePatch.id);

  await runPortugalFaqSafetyPatch(db, {
    only: servicePatch.id,
    apply: true,
    sourceHash,
    confirmation: portugalFaqSafetyPatchToken(servicePatch),
    databaseUrl,
    confirmationDatabase,
  });

  assert.deepEqual(calls.where, {
    id: "service-faq-1",
    question: servicePatch.question,
    answer: servicePatch.originalAnswer,
    updatedAt,
  });
});

test("Portugal disclaimer safety updater changes exact content and publication metadata", async () => {
  const content = PORTUGAL_DISCLAIMER_SAFETY_PATCH.fragments
    .map(({ original, expectedOccurrences }) => Array(expectedOccurrences).fill(original).join("|"))
    .join("|");
  let savedContent = content;
  let version = disclaimerPublication.expectedVersion;
  let publishedAt = new Date(disclaimerPublication.expectedPublishedAt);
  const calls = {
    data: null as Record<string, unknown> | null,
    where: null as Record<string, unknown> | null,
  };
  const reader = {
    country: { findUnique: async () => ({ id: "country-pt" }) },
    countryLegalDocument: {
      findUnique: async () => ({
        id: "legal-1",
        content: savedContent,
        isPublished: true,
        version,
        publishedAt,
        updatedAt,
      }),
      updateMany: async (input: { data: Record<string, unknown>; where: Record<string, unknown> }) => {
        calls.data = input.data;
        calls.where = input.where;
        savedContent = input.data.content as string;
        version = input.data.version as number;
        publishedAt = input.data.publishedAt as Date;
        return { count: 1 };
      },
    },
  };
  const db = {
    ...reader,
    $transaction: async (callback: (transaction: typeof reader) => Promise<void>) => callback(reader),
  } as unknown as PortugalFaqSafetyDb;
  const sourceHash = await dryRunSourceHash(db, PORTUGAL_DISCLAIMER_SAFETY_PATCH.id);

  await runPortugalFaqSafetyPatch(db, {
    only: PORTUGAL_DISCLAIMER_SAFETY_PATCH.id,
    apply: true,
    sourceHash,
    confirmation: portugalFaqSafetyPatchToken(PORTUGAL_DISCLAIMER_SAFETY_PATCH),
    databaseUrl,
    confirmationDatabase,
  });

  assert.deepEqual(Object.keys(calls.data ?? {}), ["content", "version", "publishedAt"]);
  assert.deepEqual(calls.where, {
    id: "legal-1",
    content,
    version: disclaimerPublication.expectedVersion,
    publishedAt: new Date(disclaimerPublication.expectedPublishedAt),
    updatedAt,
    isPublished: true,
    type: "MEDICAL_DISCLAIMER",
    locale: "pt",
  });
  assert.doesNotMatch(savedContent, /808 200 204|Linha de Vida Segura/);
  assert.equal(savedContent.match(/1411/g)?.length, 6);
  assert.match(savedContent, /Última atualização: Setembro 2026/);
  assert.equal(version, disclaimerPublication.proposedVersion);
  assert.equal(publishedAt.toISOString(), disclaimerPublication.proposedPublishedAt);
});

test("Portugal disclaimer safety updater completes metadata after an earlier content-only fix", async () => {
  let content = PORTUGAL_DISCLAIMER_SAFETY_PATCH.fragments
    .map((fragment, index) => Array(fragment.expectedOccurrences)
      .fill(index < 2 ? fragment.proposed : fragment.original)
      .join("|"))
    .join("|");
  let version = disclaimerPublication.expectedVersion;
  let publishedAt = new Date(disclaimerPublication.expectedPublishedAt);
  const calls = { data: null as Record<string, unknown> | null };
  const reader = {
    country: { findUnique: async () => ({ id: "country-pt" }) },
    countryLegalDocument: {
      findUnique: async () => ({
        id: "legal-1",
        content,
        isPublished: true,
        version,
        publishedAt,
        updatedAt,
      }),
      updateMany: async (input: { data: Record<string, unknown> }) => {
        calls.data = input.data;
        content = input.data.content as string;
        version = input.data.version as number;
        publishedAt = input.data.publishedAt as Date;
        return { count: 1 };
      },
    },
  };
  const db = {
    ...reader,
    $transaction: async (callback: (transaction: typeof reader) => Promise<void>) => callback(reader),
  } as unknown as PortugalFaqSafetyDb;
  const sourceHash = await dryRunSourceHash(db, PORTUGAL_DISCLAIMER_SAFETY_PATCH.id);

  await runPortugalFaqSafetyPatch(db, {
    only: PORTUGAL_DISCLAIMER_SAFETY_PATCH.id,
    apply: true,
    sourceHash,
    confirmation: portugalFaqSafetyPatchToken(PORTUGAL_DISCLAIMER_SAFETY_PATCH),
    databaseUrl,
    confirmationDatabase,
  });

  assert.deepEqual(Object.keys(calls.data ?? {}), ["content", "version", "publishedAt"]);
  assert.equal(version, disclaimerPublication.proposedVersion);
  assert.equal(publishedAt.toISOString(), disclaimerPublication.proposedPublishedAt);
  assert.match(content, /Última atualização: Setembro 2026/);
});
