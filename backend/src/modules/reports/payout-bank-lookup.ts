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
};

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

  const fallbackIban = globalRow?.ibanEncrypted ? decryptPhi(globalRow.ibanEncrypted) : null;
  const byMarket: PayoutBankByMarket = {};
  const marketsWithIban: string[] = [];
  for (const row of marketRows) {
    const account = row.bankAccount;
    if (!account) continue;
    const code = row.country.code.toLowerCase();
    const iban = account.ibanEncrypted ? decryptPhi(account.ibanEncrypted) : null;
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
  };
}
