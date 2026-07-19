/**
 * Renames active PUBLIC service slugs for Portugal / Czechia / Romania to
 * localized (default-locale) slugs.
 *
 * Collision handling: if the target slug is already held by an INACTIVE row
 * (stale Wix import), that row is renamed to `<slug>-retired-wix` first —
 * nothing is deleted, so FK references (appointments etc.) are untouched.
 * A collision with an ACTIVE row aborts that one rename and reports it.
 *
 * Idempotent: already-renamed services are skipped.
 *
 * Run:
 *   pnpm --filter backend exec tsx --env-file=.env scripts/migrate-localized-service-slugs.ts
 */
import { prisma } from "../src/db/prisma.js";

const MAPPINGS: Record<string, Record<string, string>> = {
  pt: {
    "cardiology-consultation": "consulta-cardiologia",
    "driving-license-medical-certificate": "certificado-medico-carta-de-conducao",
    "family-and-general-medicine": "medicina-geral-e-familiar",
    "hair-loss-consultation": "consulta-queda-de-cabelo",
    "medical-certificates-consultation": "certificados-medicos",
    "medical-consultation": "consulta-medica",
    "mens-health-consultation": "saude-do-homem",
    "mental-health-consultation": "saude-mental",
    "nutrition-consultation": "consulta-de-nutricao",
    "oncology-consultation": "consulta-de-oncologia",
    "paediatric-primary-care-consultation": "pediatria-geral",
    "pain-management-consultation": "gestao-da-dor",
    "pediatric-consultation": "consulta-de-pediatria",
    "psychiatry-consultation": "consulta-de-psiquiatria",
    "psychology-consultation": "consulta-de-psicologia",
    "referral-consultation": "consulta-de-referenciacao",
    "second-opinion-consultation": "segunda-opiniao-medica",
    "sick-leave": "baixa-medica",
    "skin-dermatology-consultation": "consulta-dermatologia",
    "smoking-cessation-consultation": "deixar-de-fumar",
    "travelers-consultation": "consulta-do-viajante",
    "treatment-renewal": "renovacao-de-tratamento",
    "weight-loss-consultation": "perda-de-peso",
    "womens-health-consultation": "saude-da-mulher",
  },
  cz: {
    "chronic-disease-management": "chronicka-onemocneni",
    "hair-loss-online": "vypadavani-vlasu-online",
    "mens-health-online": "muzske-zdravi-online",
    "mental-health-online": "dusevni-zdravi-online",
    "musculoskeletal-pain": "bolesti-pohyboveho-aparatu",
    "paediatric-gp-online": "detsky-lekar-online",
    "prague-doctor-online": "lekar-online-praha",
    "referrals-and-investigations": "doporuceni-a-vysetreni",
    "second-opinion-prague": "druhy-nazor-praha",
    "sick-note-czech-republic": "neschopenka-online",
    "skin-consultation-prague": "kozni-konzultace-praha",
    "travel-health-prague": "cestovni-medicina-praha",
    "treatment-renewal": "obnoveni-lecby",
    "weight-management-online": "kontrola-vahy-online",
    "womens-health-online": "zenske-zdravi-online",
  },
  ro: {
    "chronic-disease-romania": "boli-cronice-online",
    "hair-loss-romania": "caderea-parului-online",
    "mens-health-romania": "sanatatea-barbatului-online",
    "mental-health-romania": "sanatate-mintala-online",
    "musculoskeletal-pain-romania": "dureri-musculo-scheletice",
    "neurology-consultation-romania": "consultatie-neurologie",
    "online-doctor-romania": "medic-online-romania",
    "paediatric-gp-romania": "medic-pediatru-online",
    "referrals-and-investigations-romania": "trimiteri-si-investigatii",
    "second-opinion-romania": "a-doua-opinie-medicala",
    "skin-consultation-romania": "consultatie-dermatologica",
    "specialist-paediatrician-romania": "consultatie-pediatrie",
    "specialist-pain-assessment-romania": "evaluare-durere",
    "travel-health-romania": "medicina-calatoriei",
    "treatment-renewal-romania": "reinnoire-tratament",
    "weight-management-romania": "controlul-greutatii",
    "womens-health-romania": "sanatatea-femeii-online",
  },
};

async function main() {
  for (const [code, map] of Object.entries(MAPPINGS)) {
    const country = await prisma.country.findFirst({ where: { code } });
    if (!country) {
      console.log(`!! country ${code} not found — skipping`);
      continue;
    }
    console.log(`\n=== ${code} ===`);
    for (const [oldSlug, newSlug] of Object.entries(map)) {
      const svc = await prisma.service.findUnique({
        where: { countryId_slug: { countryId: country.id, slug: oldSlug } },
      });
      if (!svc) {
        const done = await prisma.service.findUnique({
          where: { countryId_slug: { countryId: country.id, slug: newSlug } },
        });
        console.log(
          done
            ? `ok (already) ${oldSlug} -> ${newSlug}`
            : `!! MISSING ${oldSlug} (no row with old or new slug)`,
        );
        continue;
      }
      const holder = await prisma.service.findUnique({
        where: { countryId_slug: { countryId: country.id, slug: newSlug } },
      });
      await prisma.$transaction(async (tx) => {
        if (holder) {
          if (holder.isActive) {
            console.log(`!! CONFLICT ${newSlug} held by ACTIVE ${holder.id} — skipped`);
            return;
          }
          await tx.service.update({
            where: { id: holder.id },
            data: { slug: `${newSlug}-retired-wix` },
          });
          console.log(`   retired inactive holder of ${newSlug} -> ${newSlug}-retired-wix`);
        }
        await tx.service.update({ where: { id: svc.id }, data: { slug: newSlug } });
        console.log(`ok ${oldSlug} -> ${newSlug}`);
      });
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
