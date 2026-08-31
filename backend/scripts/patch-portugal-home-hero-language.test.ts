import assert from "node:assert/strict";
import test from "node:test";

import {
  PORTUGAL_HOME_CTA_VERSION,
  runPortugalHomeCtaPatch,
  type PortugalHomeCtaDb,
} from "../src/content/portugal-home-cta-patch.js";

type FakeOptions = Readonly<{
  currentCta?: string | null;
  updateCount?: number;
  savedCta?: string | null;
}>;

function createFakeDb(options: FakeOptions = {}) {
  const calls: {
    transactionCount: number;
    updateWhere: Record<string, unknown> | null;
    transactionOptions: Record<string, unknown> | null;
  } = {
    transactionCount: 0,
    updateWhere: null,
    transactionOptions: null,
  };
  const currentCta = options.currentCta ?? "Book a consultation";
  const updateCount = options.updateCount ?? 1;
  const savedCta = options.savedCta ?? "Marcar consulta";
  const transaction = {
    pageContentTranslation: {
      updateMany: async (input: { where: Record<string, unknown> }) => {
        calls.updateWhere = input.where;
        return { count: updateCount };
      },
      findUnique: async () => ({ ctaLabel: savedCta }),
    },
  };
  const db = {
    country: {
      findFirst: async () => ({ id: "country-pt" }),
    },
    pageContent: {
      findFirst: async () => ({ id: "page-home" }),
    },
    pageContentTranslation: {
      findFirst: async () => ({
        id: "translation-pt",
        updatedAt: new Date("2026-08-31T12:00:00.000Z"),
        ctaLabel: currentCta,
      }),
    },
    $transaction: async (
      callback: (client: typeof transaction) => Promise<void>,
      transactionOptions: Record<string, unknown>,
    ) => {
      calls.transactionCount += 1;
      calls.transactionOptions = transactionOptions;
      await callback(transaction);
    },
  };
  return { db: db as unknown as PortugalHomeCtaDb, calls };
}

const authorizedApply = {
  apply: true,
  confirmation: PORTUGAL_HOME_CTA_VERSION,
  confirmationHost: "db.example.test",
  databaseUrl: "postgresql://user:secret@db.example.test/global_health",
} as const;

test("Portugal homepage CTA patch enforces the complete write contract", async () => {
  const dryRun = createFakeDb();
  const dryRunResult = await runPortugalHomeCtaPatch(dryRun.db, { apply: false });
  assert.equal(dryRunResult, "dry-run");
  assert.equal(dryRun.calls.transactionCount, 0);

  const rejected = createFakeDb();
  await assert.rejects(
    runPortugalHomeCtaPatch(rejected.db, {
      ...authorizedApply,
      confirmation: "wrong",
    }),
    /confirm=/,
  );
  assert.equal(rejected.calls.transactionCount, 0);

  const wrongHost = createFakeDb();
  await assert.rejects(
    runPortugalHomeCtaPatch(wrongHost.db, {
      ...authorizedApply,
      confirmationHost: "other.example.test",
    }),
    /confirm-host/,
  );
  assert.equal(wrongHost.calls.transactionCount, 0);

  const changed = createFakeDb({ currentCta: "Changed elsewhere" });
  await assert.rejects(runPortugalHomeCtaPatch(changed.db, authorizedApply), /reviewed English value/);
  assert.equal(changed.calls.transactionCount, 0);

  const conflict = createFakeDb({ updateCount: 0 });
  await assert.rejects(runPortugalHomeCtaPatch(conflict.db, authorizedApply), /changed after the dry-run/);

  const failedReadback = createFakeDb({ savedCta: "Book a consultation" });
  await assert.rejects(runPortugalHomeCtaPatch(failedReadback.db, authorizedApply), /verification failed/);

  const applied = createFakeDb();
  assert.equal(await runPortugalHomeCtaPatch(applied.db, authorizedApply), "applied");
  assert.equal(applied.calls.transactionCount, 1);
  assert.deepEqual(applied.calls.transactionOptions, { isolationLevel: "Serializable" });
  assert.deepEqual(applied.calls.updateWhere, {
    id: "translation-pt",
    updatedAt: new Date("2026-08-31T12:00:00.000Z"),
    ctaLabel: "Book a consultation",
    locale: "PT",
    pageContent: {
      countryId: "country-pt",
      pageKey: "HOME",
      status: "PUBLISHED",
      isActive: true,
      country: { code: "pt", isActive: true },
    },
  });
});
