/**
 * Corrects one doctor display name to the professionally registered form.
 *
 *   node --env-file=.env --import tsx scripts/patch-beatriz-registered-name.ts          # dry run
 *   node --env-file=.env --import tsx scripts/patch-beatriz-registered-name.ts --apply
 *
 * Why: the profile displayed "Beatriz Carvalho" while OPP cédula 31618 is
 * registered to "Beatriz Sousa" — confirmed by the official OPP directory and
 * by her own signed clinical report (2026-09-04). The page instructs patients
 * to verify the registration at ordemdospsicologos.pt, and that search only
 * resolves under the registered name. Owner directed the correction.
 *
 * Scope is deliberately ONE field: `Doctor.fullName`.
 *   - The slug stays `beatriz-carvalho`. It is the public URL; renaming it
 *     would need redirects and would break inbound links for no gain.
 *   - Biography, qualifications, credentials, registration number, specialty
 *     and per-locale SEO copy are NOT touched. Any of those still naming her
 *     "Beatriz Carvalho" are reported so they can be handled deliberately
 *     rather than by a blind find-and-replace across clinical copy.
 */
import { prisma, disconnectDb } from "../src/db/prisma.js";

const SLUG = "beatriz-carvalho";
const CURRENT = "Beatriz Carvalho";
const REGISTERED = "Beatriz Sousa";
const APPLY = process.argv.includes("--apply");

const count = (value: string | null, needle: string) => (value ?? "").split(needle).length - 1;

async function main(): Promise<void> {
  const doctor = await prisma.doctor.findFirst({
    where: { slug: SLUG },
    select: { id: true, slug: true, fullName: true, seoTitle: true, seoDescription: true, bio: true },
  });
  if (!doctor) throw new Error(`no doctor with slug ${SLUG}`);
  if (doctor.fullName !== CURRENT && doctor.fullName !== REGISTERED) {
    throw new Error(`unexpected current fullName ${JSON.stringify(doctor.fullName)} — refusing to guess`);
  }

  console.log(`fullName: ${JSON.stringify(doctor.fullName)} -> ${JSON.stringify(REGISTERED)}`);
  console.log(`slug:     ${doctor.slug} (unchanged — public URL)`);

  const listings = await prisma.doctorCountry.findMany({
    where: { doctorId: doctor.id },
    select: { country: { select: { code: true } }, translations: { select: { locale: true, seoTitle: true, seoDescription: true, bio: true } } },
  });
  console.log(`\nOther fields still containing "${CURRENT}" — NOT changed by this script:`);
  let residual = 0;
  const report = (label: string, value: string | null) => {
    const n = count(value, CURRENT);
    if (n > 0) { residual += n; console.log(`  ${label.padEnd(34)} ${n}`); }
  };
  report("doctor.seoTitle", doctor.seoTitle);
  report("doctor.seoDescription", doctor.seoDescription);
  report("doctor.bio", doctor.bio);
  for (const l of listings) {
    for (const t of l.translations) {
      const p = `${l.country.code}/${t.locale}`;
      report(`${p} seoTitle`, t.seoTitle);
      report(`${p} seoDescription`, t.seoDescription);
      report(`${p} bio`, t.bio);
    }
  }
  if (residual === 0) console.log("  (none)");

  if (!APPLY) {
    console.log("\nDRY RUN — nothing written. Re-run with --apply.");
    return;
  }

  // Substitute the proper noun only. Every write is verified by asserting the
  // stored value equals the source with exactly that substring replaced — so
  // no other word of clinical copy can change, and a field that drifted between
  // read and write aborts the transaction.
  const swap = (value: string | null) => (value === null ? null : value.split(CURRENT).join(REGISTERED));

  await prisma.$transaction(async (tx) => {
    const updated = await tx.doctor.update({
      where: { id: doctor.id },
      data: {
        fullName: REGISTERED,
        seoTitle: swap(doctor.seoTitle),
        seoDescription: swap(doctor.seoDescription),
        bio: swap(doctor.bio),
      },
      select: { fullName: true, slug: true, seoTitle: true, seoDescription: true, bio: true },
    });
    if (updated.fullName !== REGISTERED) throw new Error("readback failed: fullName");
    if (updated.slug !== SLUG) throw new Error("readback failed: slug changed");
    if (updated.bio !== swap(doctor.bio)) throw new Error("readback failed: bio is not the exact substitution");

    for (const l of listings) {
      for (const t of l.translations) {
        const row = await tx.doctorMarketTranslation.findFirst({
          where: { doctorCountry: { doctorId: doctor.id, country: { code: l.country.code } }, locale: t.locale },
          select: { id: true, seoTitle: true, seoDescription: true, bio: true },
        });
        if (!row) throw new Error(`missing translation ${l.country.code}/${t.locale}`);
        if (row.seoTitle !== t.seoTitle || row.seoDescription !== t.seoDescription || row.bio !== t.bio) {
          throw new Error(`${l.country.code}/${t.locale} changed between read and write — aborting`);
        }
        const next = await tx.doctorMarketTranslation.update({
          where: { id: row.id },
          data: { seoTitle: swap(t.seoTitle), seoDescription: swap(t.seoDescription), bio: swap(t.bio) },
          select: { seoTitle: true, seoDescription: true, bio: true },
        });
        if (
          next.seoTitle !== swap(t.seoTitle) ||
          next.seoDescription !== swap(t.seoDescription) ||
          next.bio !== swap(t.bio)
        ) throw new Error(`readback failed for ${l.country.code}/${t.locale}`);
      }
    }
  }, { isolationLevel: "Serializable" });

  // Her FAQ entries carry the registration claim itself — "A Beatriz ... está
  // registada na Ordem dos Psicólogos" — and are rendered both as visible copy
  // and as FAQPage structured data, so they must use the registered name too.
  const faqs = await prisma.doctorFaq.findMany({
    where: { doctorId: doctor.id },
    select: { id: true, locale: true, question: true, answer: true },
  });
  const stale = faqs.filter((f) => count(f.question, CURRENT) + count(f.answer, CURRENT) > 0);
  if (stale.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const f of stale) {
        const row = await tx.doctorFaq.findUnique({
          where: { id: f.id },
          select: { question: true, answer: true },
        });
        if (row?.question !== f.question || row?.answer !== f.answer) {
          throw new Error(`FAQ ${f.id} changed between read and write — aborting`);
        }
        const next = await tx.doctorFaq.update({
          where: { id: f.id },
          data: { question: swap(f.question), answer: swap(f.answer) },
          select: { question: true, answer: true },
        });
        if (next.question !== swap(f.question) || next.answer !== swap(f.answer)) {
          throw new Error(`readback failed for FAQ ${f.id}`);
        }
      }
      // Each row is read-verified then written, so the round trips add up
      // against a remote database; the 5s default is not enough.
    }, { isolationLevel: "Serializable", timeout: 60_000, maxWait: 15_000 });
  }

  console.log("\nAPPLIED and verified in-transaction.");
  console.log(`  ${1 + residual} profile field(s) updated: fullName plus every "${CURRENT}" occurrence.`);
  console.log(`  ${stale.length} FAQ row(s) updated across locales.`);
  console.log("  slug unchanged; only the name substring was replaced in any copy.");
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(disconnectDb);
