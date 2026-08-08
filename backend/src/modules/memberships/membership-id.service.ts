import { randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Generated membership ids (§21.5, decision 40) — phase 7c.
 *
 * The partner used to supply these. They now come from here, and the partner's
 * own number is kept alongside as `partnerReference`, searchable but not a key.
 *
 * The format is `<PLANPREFIX>-<8 base32 chars>`, e.g. `MEMS-7K4QP2X9`.
 * Unguessability is the point, not brevity: the id is half of what the claim
 * form checks (§5.3), and partner numbering is typically sequential, so a
 * partner-supplied id let anyone who could count enumerate a member list.
 *
 * 8 chars from a 32-symbol alphabet is 40 bits — a collision needs roughly a
 * million ids in one plan before it is worth thinking about, and the retry loop
 * below covers it regardless.
 */

/**
 * Crockford's base32: the digits and the uppercase letters, minus I, L, O and
 * U. The excluded four are what makes it readable — this id is printed on a
 * card and read back over the phone, where `I`/`1` and `O`/`0` are the same
 * character to a human. (U is dropped by Crockford to avoid accidental
 * obscenities.) Exactly 32 symbols, so `byte & 31` samples it without bias;
 * a modulo of a non-power-of-two would quietly favour the first symbols.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const SUFFIX_LENGTH = 8;

/** How many times to re-roll before admitting something is wrong. */
const MAX_ATTEMPTS = 10;

export class MembershipIdGenerationError extends Error {
  constructor() {
    super("Could not allocate a unique membership ID");
    this.name = "MembershipIdGenerationError";
  }
}

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * The plan's visible prefix, derived from its slug: alphanumerics only,
 * uppercased, first four. `mems-ireland` → `MEMS`.
 *
 * Derived rather than stored, so there is no column to migrate, no admin
 * decision at plan creation, and no way for the prefix to drift from the plan
 * it names. Prefix collisions between plans are harmless: uniqueness lives
 * entirely in the random suffix, and the index is on the whole id.
 */
export function membershipIdPrefix(planSlug: string): string {
  return planSlug.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 4) || "MEM";
}

/** 8 unbiased base32 characters. */
export function randomMembershipSuffix(): string {
  const bytes = randomBytes(SUFFIX_LENGTH);
  let out = "";
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) out += ALPHABET[bytes[i] & 31];
  return out;
}

/**
 * A membership id that nothing else holds, case-insensitively.
 *
 * The uniqueness index is on `lower("membershipId")` and covers REMOVED rows
 * too (§3.8), so the check has to match that: a removed member still owns their
 * id, and handing it to someone else would make their old card resolve to a
 * stranger.
 */
export async function generateMembershipId(tx: Tx, planSlug: string): Promise<string> {
  const prefix = membershipIdPrefix(planSlug);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = `${prefix}-${randomMembershipSuffix()}`;
    const clash = await tx.membershipEnrollment.findFirst({
      where: { membershipId: { equals: candidate, mode: "insensitive" } },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  throw new MembershipIdGenerationError();
}
