import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * PHI access recovery plan Task 1 — registerPatient must write a
 * MEDICAL_ACCESS_DIRECT / source=REGISTRATION PatientConsent row on
 * successful signup (see auth.service.ts). The zod-level rejection of a
 * missing/false `acceptMedicalConsent` flag is covered separately in
 * auth.schema.test.ts (registerBodySchema runs before registerPatient is
 * ever called, so the service itself can assume the flag is true).
 *
 * `../../db/prisma.js` and `../../lib/global-health-number.js` are replaced
 * with in-memory fakes via node:test's module mocking (same pattern as
 * medical-access-guard.test.ts) — this test never opens a real database
 * connection, on purpose (constraint: do not run against a database).
 * Requires the runtime's `--experimental-test-module-mocks` support (Node
 * 22+); mock.module must be set up before auth.service.ts (and therefore
 * its imports) is first loaded.
 */

type ConsentRow = {
  patientProfileId: string;
  globalHealthNumber: string | null;
  consentType: string;
  consentValue: boolean;
  source: string;
  changedByUserId: string | null;
  changedByRole: string | null;
};

const state: { consents: ConsentRow[] } = { consents: [] };

let registerPatient: (typeof import("./auth.service.js"))["registerPatient"];

before(async () => {
  mock.module("../../lib/global-health-number.js", {
    namedExports: {
      generateGlobalHealthNumber: async () => "GH-2026-000001",
    },
  });

  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        user: {
          create: async ({ data }: { data: Record<string, unknown> }) => ({
            id: "user_1",
            email: data.email,
            fullName: data.fullName,
            phone: data.phone ?? null,
            dateOfBirth: null,
            role: data.role,
            emailVerifiedAt: null,
            isActive: true,
            mustChangePassword: false,
            deletionScheduledAt: null,
            preferredLocale: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        patientProfile: {
          upsert: async ({ create }: { create: Record<string, unknown> }) => ({
            id: "profile_1",
            globalHealthNumber: create.globalHealthNumber,
          }),
          findUnique: async () => null,
        },
        patientConsent: {
          create: async ({ data }: { data: ConsentRow }) => {
            state.consents.push(data);
            return { id: `consent_${state.consents.length}`, ...data, createdAt: new Date() };
          },
        },
      },
    },
  });

  ({ registerPatient } = await import("./auth.service.js"));
});

beforeEach(() => {
  state.consents = [];
});

describe("registerPatient — mandatory medical-access consent", () => {
  it("writes a MEDICAL_ACCESS_DIRECT consent row (source=REGISTRATION) on successful signup", async () => {
    const result = await registerPatient({
      email: "patient@example.com",
      password: "very-secure-password",
      fullName: "Patient Example",
      phone: "+3531234567",
      acceptTerms: true,
      acceptMedicalConsent: true,
    });

    assert.equal(result.kind, "created");

    const medicalConsent = state.consents.find((c) => c.consentType === "MEDICAL_ACCESS_DIRECT");
    assert.ok(medicalConsent, "expected a MEDICAL_ACCESS_DIRECT consent row to be written");
    assert.equal(medicalConsent?.consentValue, true);
    assert.equal(medicalConsent?.source, "REGISTRATION");
    assert.equal(medicalConsent?.patientProfileId, "profile_1");

    // TERMS_PRIVACY stays a separate row — GDPR: distinct consents, no bundling.
    const termsConsent = state.consents.find((c) => c.consentType === "TERMS_PRIVACY");
    assert.ok(termsConsent, "expected TERMS_PRIVACY to still be recorded separately");
  });
});
