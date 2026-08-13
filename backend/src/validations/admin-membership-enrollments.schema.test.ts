import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminMembershipDependentCreateBodySchema,
  adminMembershipEnrollmentCreateBodySchema,
  adminMembershipEnrollmentUpdateBodySchema,
  adminMembershipEnrollmentsQuerySchema,
} from "./admin-membership-enrollments.schema.js";

/**
 * Shape rules for the phase 2 enrollment surface (§13.1). The DB-dependent
 * rules — global membership-id uniqueness, the (plan, email) collision, family
 * caps — are covered in membership-enrollments' own tests.
 */

const base = {
  planId: "plan_1",
  // Phase 7c: no `membershipId` — it is generated (§21.5), and the schema no
  // longer accepts one from a caller at all.
  partnerReference: "MEMS-001",
  email: "Member@Example.COM",
  firstName: "Ada",
  lastName: "Lovelace",
  startDate: "2026-01-01",
};

describe("membership enrollment create payload", () => {
  it("lowercases and trims the email — it is the linking key", () => {
    const parsed = adminMembershipEnrollmentCreateBodySchema.parse({
      ...base,
      email: "  Member@Example.COM  ",
    });
    assert.equal(parsed.email, "member@example.com");
  });

  it("accepts a YYYY-MM-DD term and leaves endDate null when blank", () => {
    const parsed = adminMembershipEnrollmentCreateBodySchema.parse({ ...base, endDate: "" });
    assert.equal(parsed.startDate.toISOString().slice(0, 10), "2026-01-01");
    assert.equal(parsed.endDate, undefined);
  });

  it("rejects an endDate before the startDate", () => {
    const result = adminMembershipEnrollmentCreateBodySchema.safeParse({
      ...base,
      endDate: "2025-12-31",
    });
    assert.equal(result.success, false);
  });

  it("accepts endDate === startDate — a one-day term is not an error", () => {
    const result = adminMembershipEnrollmentCreateBodySchema.safeParse({
      ...base,
      endDate: "2026-01-01",
    });
    assert.equal(result.success, true);
  });

  /**
   * The partner's number is theirs: any shape, any length, repeated as often
   * as they like (§21.5). It is not a key, so there is nothing for the schema
   * to enforce beyond "printable, and not absurdly long".
   */
  it("accepts a partner reference of any length, and treats blank as absent", () => {
    const short = adminMembershipEnrollmentCreateBodySchema.parse({
      ...base,
      partnerReference: "A1",
    });
    assert.equal(short.partnerReference, "A1");
    const blank = adminMembershipEnrollmentCreateBodySchema.parse({
      ...base,
      partnerReference: "",
    });
    assert.equal(blank.partnerReference, null);
  });

  it("ignores a membership id a caller tries to supply — it is not theirs to choose", () => {
    const parsed = adminMembershipEnrollmentCreateBodySchema.parse({
      ...base,
      membershipId: "ATTACKER-CHOSEN-1",
    } as Record<string, unknown>);
    assert.equal(
      "membershipId" in parsed,
      false,
      "a caller-supplied id must not reach the service, which generates its own",
    );
  });

  it("accepts a supported welcome-email locale, and rejects a made-up one", () => {
    assert.equal(
      adminMembershipEnrollmentCreateBodySchema.parse({ ...base, preferredLocale: "PT" })
        .preferredLocale,
      "PT",
    );
    assert.equal(
      adminMembershipEnrollmentCreateBodySchema.parse({ ...base, preferredLocale: "" })
        .preferredLocale,
      undefined,
    );
    assert.equal(
      adminMembershipEnrollmentCreateBodySchema.safeParse({ ...base, preferredLocale: "XX" })
        .success,
      false,
    );
  });

  it("rejects a malformed email", () => {
    const result = adminMembershipEnrollmentCreateBodySchema.safeParse({
      ...base,
      email: "not-an-email",
    });
    assert.equal(result.success, false);
  });

  it("treats a blank levelId as absent, so the plan's default level applies", () => {
    const parsed = adminMembershipEnrollmentCreateBodySchema.parse({ ...base, levelId: "" });
    assert.equal(parsed.levelId, undefined);
  });
});

describe("membership enrollment update payload", () => {
  it("is fully partial — a name-only edit is valid", () => {
    const parsed = adminMembershipEnrollmentUpdateBodySchema.parse({ firstName: "Grace" });
    assert.deepEqual(Object.keys(parsed), ["firstName"]);
  });

  it("has no planId — a member cannot be moved between plans", () => {
    const parsed = adminMembershipEnrollmentUpdateBodySchema.parse({
      planId: "another-plan",
      firstName: "Grace",
    } as Record<string, unknown>);
    assert.equal("planId" in parsed, false);
  });

  it("still rejects an inverted term", () => {
    const result = adminMembershipEnrollmentUpdateBodySchema.safeParse({
      startDate: "2026-06-01",
      endDate: "2026-01-01",
    });
    assert.equal(result.success, false);
  });
});

describe("dependent payload", () => {
  it("accepts no membershipId — the service derives one from the primary's", () => {
    const parsed = adminMembershipDependentCreateBodySchema.parse({
      email: "child@example.com",
      firstName: "Ada",
      lastName: "Junior",
    });
    assert.equal(parsed.membershipId, undefined);
  });

  it("has no level or term fields — a dependent inherits both (§3.4)", () => {
    const parsed = adminMembershipDependentCreateBodySchema.parse({
      email: "child@example.com",
      firstName: "Ada",
      lastName: "Junior",
      levelId: "some-level",
      startDate: "2030-01-01",
    } as Record<string, unknown>);
    assert.equal("levelId" in parsed, false);
    assert.equal("startDate" in parsed, false);
  });
});

describe("enrollments query", () => {
  it("clamps an oversized pageSize instead of rejecting it", () => {
    const parsed = adminMembershipEnrollmentsQuerySchema.parse({ pageSize: "5000" });
    assert.equal(parsed.pageSize, 100);
  });

  it("treats empty filter strings as absent", () => {
    const parsed = adminMembershipEnrollmentsQuerySchema.parse({ planId: "", status: "", q: "" });
    assert.equal(parsed.planId, undefined);
    assert.equal(parsed.status, undefined);
    assert.equal(parsed.q, undefined);
  });

  it("rejects an unknown status", () => {
    const result = adminMembershipEnrollmentsQuerySchema.safeParse({ status: "DELETED" });
    assert.equal(result.success, false);
  });
});
