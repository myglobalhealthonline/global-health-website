import "../../test-module-mocks.js";
import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * Guest-account claim. A guest booking creates a PATIENT User row with a
 * random password; when that person later registers with the same email,
 * registerPatient hits P2002 and must park the chosen password hash on a
 * verification token (never on the user — the row may already own PHI),
 * and consumeEmailVerificationToken must apply it once the mailbox is
 * proven. Verified accounts and non-patient roles keep the old
 * duplicate-registration notice. In-memory prisma fake, same pattern as
 * auth.service.consent.test.ts — no database.
 */

type Existing = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  deletionScheduledAt: Date | null;
};

const state: {
  existing: Existing | null;
  tokens: Array<Record<string, unknown>>;
  userUpdates: Array<Record<string, unknown>>;
  emails: Array<{ kind: string; to: string }>;
} = { existing: null, tokens: [], userUpdates: [], emails: [] };

let svc: typeof import("./auth.service.js");

before(async () => {
  mock.module("../../lib/global-health-number.js", {
    namedExports: { generateGlobalHealthNumber: async () => "GH-2026-000001" },
  });
  mock.module("../memberships/membership-linking.service.js", {
    namedExports: { linkMembershipsInBackground: () => undefined },
  });
  mock.module("../../lib/email/templates.js", {
    namedExports: {
      sendAccountClaimEmail: async (o: { to: string }) => {
        state.emails.push({ kind: "claim", to: o.to });
      },
      sendDuplicateRegistrationNoticeEmail: async (o: { to: string }) => {
        state.emails.push({ kind: "duplicate", to: o.to });
      },
    },
  });
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        user: {
          create: async () => {
            throw Object.assign(new Error("unique"), { code: "P2002" });
          },
          findUnique: async () => state.existing,
          update: async ({ data }: { data: Record<string, unknown> }) => {
            state.userUpdates.push(data);
            return { id: state.existing?.id, email: state.existing?.email };
          },
        },
        emailVerificationToken: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            state.tokens.push(data);
            return data;
          },
          updateMany: async () => ({ count: 1 }),
          findUnique: async () => state.tokens[0] ?? null,
        },
        appointment: { updateMany: async () => ({ count: 0 }) },
        order: { updateMany: async () => ({ count: 0 }) },
      },
    },
  });
  svc = await import("./auth.service.js");
});

beforeEach(() => {
  state.existing = null;
  state.tokens = [];
  state.userUpdates = [];
  state.emails = [];
});

const flush = () => new Promise((r) => setTimeout(r, 20));

const patient = (over: Partial<Existing> = {}): Existing => ({
  id: "user_guest",
  email: "guest@example.com",
  fullName: "Guest",
  role: "PATIENT",
  isActive: true,
  emailVerifiedAt: null,
  deletionScheduledAt: null,
  ...over,
});

const body = {
  email: "Guest@Example.com",
  password: "correct horse battery",
  fullName: "Guest Person",
  acceptTerms: true as const,
  acceptMedicalConsent: true as const,
};

describe("guest-account claim", () => {
  it("unverified patient row: parks the hash on a verification token, sends claim email", async () => {
    state.existing = patient();
    const result = await svc.registerPatient(body);
    await flush();
    assert.equal(result.kind, "exists");
    assert.equal(state.tokens.length, 1);
    assert.equal(state.tokens[0].userId, "user_guest");
    assert.match(String(state.tokens[0].pendingPasswordHash), /^\$2[aby]\$12\$/);
    assert.deepEqual(state.emails, [{ kind: "claim", to: "guest@example.com" }]);
    assert.equal(state.userUpdates.length, 0, "password must not touch the user before verification");
  });

  it("consuming that token applies the password, clears mustChangePassword, bumps tokenVersion", async () => {
    state.existing = patient();
    await svc.registerPatient(body);
    await flush();
    const consumed = await svc.consumeEmailVerificationToken("x".repeat(43));
    assert.ok(consumed);
    assert.equal(consumed.passwordApplied, true);
    const update = state.userUpdates[0];
    assert.equal(update.passwordHash, state.tokens[0].pendingPasswordHash);
    assert.equal(update.mustChangePassword, false);
    assert.deepEqual(update.tokenVersion, { increment: 1 });
    assert.ok(update.emailVerifiedAt instanceof Date);
  });

  it("verified account: no token, duplicate notice instead", async () => {
    state.existing = patient({ emailVerifiedAt: new Date() });
    await svc.registerPatient(body);
    await flush();
    assert.equal(state.tokens.length, 0);
    assert.deepEqual(state.emails, [{ kind: "duplicate", to: "guest@example.com" }]);
  });

  it("non-patient role: never claimable", async () => {
    state.existing = patient({ role: "DOCTOR" });
    await svc.registerPatient(body);
    await flush();
    assert.equal(state.tokens.length, 0);
    assert.deepEqual(state.emails, [{ kind: "duplicate", to: "guest@example.com" }]);
  });

  it("plain verification token (no pending hash) leaves the password alone", async () => {
    state.existing = patient();
    await svc.issueEmailVerificationToken("user_guest");
    const consumed = await svc.consumeEmailVerificationToken("x".repeat(43));
    assert.ok(consumed);
    assert.equal(consumed.passwordApplied, false);
    assert.equal("passwordHash" in state.userUpdates[0], false);
  });
});
