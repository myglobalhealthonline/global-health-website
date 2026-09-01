import { prisma } from "../../db/prisma.js";
import { decryptPhi } from "../../lib/crypto/phi-crypto.js";
import type { PayoutBankByMarket, PayoutBankInfo } from "./report-datasets.js";

/**
 * Every payout account a doctor can be paid into, decrypted for the payout
 * statement: the doctor-level account (`DoctorBankAccount`) plus one per market
 * they bank separately (`DoctorMarketBankAccount`, set on their own market
 * profile — a doctor working IE + PT typically has a Revolut IBAN for one and a
 * domestic IBAN for the other).
 *
 * Decryption ONLY — the reveal audit (DOCTOR_BANK_VIEWED) belongs to the admin
 * route, which is the caller reading another clinician's account numbers.
 * `marketsWithIban` is returned so that route can record what it revealed.
 */
export type DoctorPayoutBanks = {
  /** Doctor-level account. Used for any market with no account of its own. */
  fallback: PayoutBankInfo;
  /** Per-market accounts, keyed by LOWER-CASE country code. */
  byMarket: PayoutBankByMarket;
  /** Lower-case codes of the markets whose account carried a full IBAN. */
  marketsWithIban: string[];
  /** True when the doctor-level account carried a full IBAN. */
  fallbackHasIban: boolean;
  /** Accounts whose stored IBAN could not be decrypted ("doctor", or a market
   *  code). The statement renders these as "not on file" rather than failing —
   *  see `safeDecryptIban`. Empty in the normal case. */
  undecryptable: string[];
};

/**
 * Decrypt a stored IBAN, or give up on THAT account only.
 *
 * A statement covers every account a doctor holds, so one unreadable ciphertext
 * — a row written under a rotated/legacy PHI key, say — used to throw and take
 * the whole export down with it ("Could not export report"), including the
 * markets that were perfectly readable. A doctor with one bad row could not be
 * paid at all. Now the bad account degrades to "not on file", the rest of the
 * statement still renders, and the failure is logged and reported back through
 * `undecryptable` so it can be found and repaired.
 */
function safeDecryptIban(
  encrypted: string | null,
  label: string,
  failures: string[],
): string | null {
  if (!encrypted) return null;
  try {
    return decryptPhi(encrypted);
  } catch (error) {
    failures.push(label);
    console.error("[payout-bank] IBAN could not be decrypted", {
      account: label,
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }
}

export async function loadDoctorPayoutBanks(doctorId: string): Promise<DoctorPayoutBanks> {
  const [globalRow, marketRows] = await Promise.all([
    prisma.doctorBankAccount.findUnique({
      where: { doctorId },
      select: { accountHolder: true, ibanEncrypted: true, bic: true },
    }),
    prisma.doctorCountry.findMany({
      where: { doctorId, bankAccount: { isNot: null } },
      select: {
        country: { select: { code: true } },
        bankAccount: { select: { accountHolder: true, ibanEncrypted: true, bic: true } },
      },
    }),
  ]);

  const undecryptable: string[] = [];
  const fallbackIban = safeDecryptIban(
    globalRow?.ibanEncrypted ?? null,
    "doctor",
    undecryptable,
  );
  const byMarket: PayoutBankByMarket = {};
  const marketsWithIban: string[] = [];
  for (const row of marketRows) {
    const account = row.bankAccount;
    if (!account) continue;
    const code = row.country.code.toLowerCase();
    const iban = safeDecryptIban(account.ibanEncrypted, code, undecryptable);
    byMarket[code] = {
      accountHolder: account.accountHolder,
      iban,
      bic: account.bic,
    };
    if (iban) marketsWithIban.push(code);
  }

  return {
    fallback: {
      accountHolder: globalRow?.accountHolder ?? null,
      iban: fallbackIban,
      bic: globalRow?.bic ?? null,
    },
    byMarket,
    marketsWithIban,
    fallbackHasIban: Boolean(fallbackIban),
    undecryptable,
  };
}
