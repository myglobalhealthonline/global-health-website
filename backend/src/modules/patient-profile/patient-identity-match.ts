import { prisma } from "../../db/prisma.js";
import {
  computePhoneBlindIndex,
  computeNameDobBlindIndex,
} from "../../lib/blind-index.js";

export type PatientIdentityMatch = {
  patientProfileId: string;
  globalHealthNumber: string | null;
  fullName: string | null;
  email: string;
  /** Which identifiers matched: "phone", "name_dob", or both. */
  matchReasons: string[];
};

/**
 * Find existing patients who look like the same person as the details being
 * entered, WITHOUT matching on email.
 *
 * Email is deliberately excluded because this exists to answer the question
 * email cannot: "the address I typed belongs to nobody — is this person
 * nevertheless already a patient?". `upsertPatientProfileByEmail` keys identity
 * on email alone, so any address that isn't currently in use mints a brand-new
 * patient. That is how GH-2026-001488 came to exist: a placeholder address was
 * corrected on one record, which freed the placeholder, and the next booking
 * typed the same placeholder and got a second record for a patient whose name,
 * date of birth and phone number already matched an existing one exactly.
 *
 * Matching uses the same blind indexes as `findPotentialDuplicates`, so it
 * works with PHI encryption on: the plaintext columns may be ciphertext, but
 * `phoneHash` and `nameDobHash` are HMACs of the normalised values and stay
 * comparable. Phone normalisation ignores spacing, so "+351 964978155" and
 * "+351964978155" match; name+DOB normalisation ignores case and spacing.
 *
 * Returns [] when the blind-index key is unset (hashes can't be derived),
 * when neither a phone nor a date of birth was supplied, or on any lookup
 * failure — this is a safety net around a booking, and it must never be the
 * reason a booking cannot be taken.
 */
export async function findPatientsMatchingIdentity(input: {
  email: string;
  fullName?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | null;
}): Promise<PatientIdentityMatch[]> {
  const email = input.email.trim().toLowerCase();
  const phoneHash = input.phone?.trim()
    ? computePhoneBlindIndex(input.phone)
    : null;
  const nameDobHash =
    input.fullName?.trim() && input.dateOfBirth
      ? computeNameDobBlindIndex(input.fullName, input.dateOfBirth)
      : null;

  const orClauses: Record<string, unknown>[] = [];
  if (phoneHash) orClauses.push({ phoneHash });
  if (nameDobHash) orClauses.push({ nameDobHash });
  if (orClauses.length === 0) return [];

  try {
    const candidates = await prisma.patientProfile.findMany({
      where: {
        AND: [
          { isMerged: false },
          // An existing record on this very address is the normal path — the
          // upsert will reuse it and no duplicate can arise. Only records
          // under a DIFFERENT address are interesting here.
          { email: { not: email } },
          { OR: orClauses },
        ],
      },
      select: {
        id: true,
        globalHealthNumber: true,
        fullName: true,
        email: true,
        phoneHash: true,
        nameDobHash: true,
      },
      // A generic name with no date of birth can match broadly; enough to
      // show the admin the collision without scanning the whole table.
      take: 10,
    });

    return candidates.map((candidate) => {
      const matchReasons: string[] = [];
      if (phoneHash && candidate.phoneHash === phoneHash) {
        matchReasons.push("phone");
      }
      if (nameDobHash && candidate.nameDobHash === nameDobHash) {
        matchReasons.push("name_dob");
      }
      return {
        patientProfileId: candidate.id,
        globalHealthNumber: candidate.globalHealthNumber,
        fullName: candidate.fullName,
        email: candidate.email,
        matchReasons,
      };
    });
  } catch {
    return [];
  }
}
