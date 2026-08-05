/**
 * One-off backfill: attach Medicare (PT) insurance card details to existing
 * PatientProfile rows, from a CSV of already-verified Medicare cardholders
 * (source: pt-insurance.csv, provided 2026-08-06).
 *
 * Sets, for each row whose email matches a PatientProfile:
 *   - insuranceProviderName = "Medicare"
 *   - insurancePolicyNumber = <insurance_plan_number>  (encrypted)
 *   - utenteNumber          = <numero_de_utente>        (encrypted, only if present)
 *
 * Idempotent: re-running just overwrites with the same values. Rows with no
 * matching PatientProfile, or a profile that already has a DIFFERENT
 * insurer set, are skipped and reported — never silently overwritten.
 *
 * Run once:
 *   npx tsx scripts/backfill-medicare-pt-insurance.ts
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { encryptPhi } from "../src/lib/crypto/phi-crypto.js";

const ROWS: { email: string; planNumber: string; utenteNumber: string | null }[] = [
  { email: "ccs13022005@gmail.com", planNumber: "022006432", utenteNumber: "796110089" },
  { email: "sam.eslava91@gmail.com", planNumber: "022095835", utenteNumber: "254826891" },
  { email: "arnolfmarialaura@gmail.com", planNumber: "021937909", utenteNumber: "587391262" },
  { email: "jessicavieirasantos2233@gmail.com", planNumber: "021985591", utenteNumber: "256569948" },
  { email: "silvia.fmsilva03@gmail.com", planNumber: "021470096", utenteNumber: "368443240" },
  { email: "luizotavio.tpa@gmail.com", planNumber: "021454526", utenteNumber: "587729510" },
  { email: "shaden@outlook.fr", planNumber: "022159222", utenteNumber: null },
  { email: "ssultangy@gmail.com", planNumber: "022000292", utenteNumber: null },
  { email: "ngolajoao10@gmail.com", planNumber: "021836254", utenteNumber: null },
  { email: "edite_soc@hotmail.com", planNumber: "21797753", utenteNumber: "291796999" },
  { email: "m4nunes@hotmail.com", planNumber: "021700709", utenteNumber: null },
  { email: "ruben.freitas222@gmail.com", planNumber: "990189978", utenteNumber: "165459896" },
  { email: "ravillasnts@gmail.com", planNumber: "021951267", utenteNumber: null },
  { email: "maiaralorellay@gmail.com", planNumber: "022052219", utenteNumber: "256024196" },
  { email: "feli.1985.nunes@gmail.com", planNumber: "022110946", utenteNumber: "323216110" },
  { email: "duarte@condominioativo.net", planNumber: "021867345", utenteNumber: "370968184" },
  { email: "riky.nobre.95@gmail.com", planNumber: "021159138", utenteNumber: "376994526" },
  { email: "ana.pereira.cristina56@gmail.com", planNumber: "022155761", utenteNumber: "388348209" },
  { email: "essencialcasas@gmail.com", planNumber: "022140229", utenteNumber: null },
];

async function main(): Promise<void> {
  let updated = 0;
  let noProfile = 0;
  let conflicting = 0;

  for (const row of ROWS) {
    const email = row.email.trim().toLowerCase();
    const profile = await prisma.patientProfile.findUnique({
      where: { email },
      select: { id: true, insuranceProviderName: true },
    });

    if (!profile) {
      console.warn(`[skip] no PatientProfile for ${email}`);
      noProfile += 1;
      continue;
    }
    if (profile.insuranceProviderName && profile.insuranceProviderName !== "Medicare") {
      console.warn(
        `[skip] ${email} already has insurer "${profile.insuranceProviderName}" set — not overwriting`,
      );
      conflicting += 1;
      continue;
    }

    await prisma.patientProfile.update({
      where: { id: profile.id },
      data: {
        insuranceProviderName: "Medicare",
        insurancePolicyNumber: encryptPhi(row.planNumber),
        ...(row.utenteNumber ? { utenteNumber: encryptPhi(row.utenteNumber) } : {}),
      },
    });
    updated += 1;
  }

  console.log(
    `[backfill-medicare-pt-insurance] updated ${updated}, no profile ${noProfile}, conflicting insurer ${conflicting}.`,
  );
}

main()
  .catch((err) => {
    console.error("[backfill-medicare-pt-insurance] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
