import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MembershipIdGenerationError,
  generateMembershipId,
  membershipIdPrefix,
  randomMembershipSuffix,
} from "./membership-id.service.js";

/**
 * §21.5 / §27 — generated membership ids.
 *
 * The generator is pure apart from one uniqueness lookup, so the collision
 * behaviour is exercised with a fake `tx` rather than a database. That is the
 * part worth pinning: a retry that silently returns a duplicate would hand two
 * members the same card and make the claim form resolve to the wrong person.
 */

describe("membership id — prefix", () => {
  it("takes the first four alphanumerics of the plan slug, uppercased", () => {
    assert.equal(membershipIdPrefix("mems-ireland"), "MEMS");
    assert.equal(membershipIdPrefix("import-plan-abc123"), "IMPO");
  });

  it("ignores separators rather than counting them", () => {
    // `a-b-c-d-e` is five characters of signal, not one prefix of hyphens.
    assert.equal(membershipIdPrefix("a-b-c-d-e"), "ABCD");
  });

  it("keeps digits, which a partner slug may be mostly made of", () => {
    assert.equal(membershipIdPrefix("2026-cohort"), "2026");
  });

  it("falls back to MEM when the slug carries no alphanumerics at all", () => {
    assert.equal(membershipIdPrefix("---"), "MEM");
    assert.equal(membershipIdPrefix(""), "MEM");
  });

  it("returns what there is when the slug is shorter than four", () => {
    assert.equal(membershipIdPrefix("gp"), "GP");
  });
});

describe("membership id — suffix", () => {
  it("is eight characters from the ambiguity-free base32 alphabet", () => {
    for (let i = 0; i < 200; i += 1) {
      // No I, L, O or U: this is read off a printed card and back over the
      // phone, where I/1 and O/0 are the same character to a human.
      assert.match(randomMembershipSuffix(), /^[0-9A-HJKMNP-TV-Z]{8}$/);
    }
  });

  it("does not repeat itself across many draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) seen.add(randomMembershipSuffix());
    // 40 bits of entropy: 500 draws colliding would mean the generator is not
    // random at all, which is the failure this catches.
    assert.equal(seen.size, 500);
  });
});

describe("membership id — generation", () => {
  /** A `tx` stand-in whose lookup reports the ids in `taken` as clashing. */
  const fakeTx = (taken: Set<string>, calls: string[] = []) =>
    ({
      membershipEnrollment: {
        findFirst: async (args: {
          where: { membershipId: { equals: string } };
        }) => {
          const id = args.where.membershipId.equals;
          calls.push(id);
          return taken.has(id.toLowerCase()) ? { id: "existing" } : null;
        },
      },
    }) as unknown as Parameters<typeof generateMembershipId>[0];

  it("returns a prefixed id that nothing else holds", async () => {
    const id = await generateMembershipId(fakeTx(new Set()), "mems-ireland");
    assert.match(id, /^MEMS-[0-9A-HJKMNP-TV-Z]{8}$/);
  });

  it("retries past a collision instead of returning the taken id", async () => {
    const calls: string[] = [];
    // Everything the generator offers on its first try is taken; the second
    // draw is free. Without the retry loop it would return a duplicate, and
    // the raw-SQL unique index would then fail the insert instead.
    let first = true;
    const tx = {
      membershipEnrollment: {
        findFirst: async (args: { where: { membershipId: { equals: string } } }) => {
          calls.push(args.where.membershipId.equals);
          if (first) {
            first = false;
            return { id: "existing" };
          }
          return null;
        },
      },
    } as unknown as Parameters<typeof generateMembershipId>[0];

    const id = await generateMembershipId(tx, "mems-ireland");
    assert.equal(calls.length, 2, "it tried again rather than giving up or reusing");
    assert.equal(id, calls[1]);
  });

  it("compares case-insensitively, matching the lower() unique index", async () => {
    const calls: string[] = [];
    // The index is on `lower("membershipId")` (§3.8), so an id differing only
    // in case IS a collision. A case-sensitive check here would pass and the
    // insert would then blow up at the database.
    const tx = {
      membershipEnrollment: {
        findFirst: async (args: {
          where: { membershipId: { equals: string; mode?: string } };
        }) => {
          calls.push(args.where.membershipId.mode ?? "default");
          return null;
        },
      },
    } as unknown as Parameters<typeof generateMembershipId>[0];
    await generateMembershipId(tx, "mems-ireland");
    assert.equal(calls[0], "insensitive");
  });

  it("gives up loudly rather than looping forever when everything collides", async () => {
    const alwaysTaken = {
      membershipEnrollment: { findFirst: async () => ({ id: "existing" }) },
    } as unknown as Parameters<typeof generateMembershipId>[0];
    await assert.rejects(
      () => generateMembershipId(alwaysTaken, "mems-ireland"),
      MembershipIdGenerationError,
    );
  });
});
