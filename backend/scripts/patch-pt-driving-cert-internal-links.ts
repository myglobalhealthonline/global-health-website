/**
 * SEO ranking-growth batch (2026-08-09): internal-link gap on
 * certificado-medico-carta-de-conducao (PT).
 *
 * Measured against prod: 281 impressions / 0 clicks / avg position ~35 over
 * the last 90 days across 23 real queries (exame medico carta condução,
 * atestado médico para carta de condução, ...). Content is already thorough
 * (5.7k-char detailBody, 8 FAQs, IMT-sourced) — this is not a content gap.
 * It is an internal-link gap: the page has ZERO inbound ServiceLinks. Its
 * own hub, certificados-medicos, does not link to it despite being the
 * canonical "atestado médico" listing; its sibling cert type, baixa-medica,
 * doesn't cross-reference it either.
 *
 * Adds two COMPLEMENTARY ServiceLink boxes (PT + EN copy), both within the
 * "4 boxes per page" render cap on the source pages (certificados-medicos
 * had 1, baixa-medica had 3).
 *
 *   node --env-file=.env --import tsx scripts/patch-pt-driving-cert-internal-links.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/patch-pt-driving-cert-internal-links.ts --apply   # write
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const COUNTRY = "pt";
const TARGET_SLUG = "certificado-medico-carta-de-conducao";

type LinkSpec = {
  sourceSlug: string;
  priority: number;
  pt: { heading: string; body: string; ctaLabel: string };
  en: { heading: string; body: string; ctaLabel: string };
};

const LINKS: LinkSpec[] = [
  {
    sourceSlug: "certificados-medicos",
    priority: 1,
    pt: {
      heading: "Atestado para a carta de condução",
      body: "Precisa de um atestado médico para renovar ou obter a carta de condução? A nossa consulta dedicada trata da avaliação de aptidão exigida pelo IMT, para condutores dos Grupos 1 e 2.",
      ctaLabel: "Atestado Médico para Carta de Condução",
    },
    en: {
      heading: "Certificate for a driving licence",
      body: "Need a medical certificate to renew or obtain your driving licence? Our dedicated consultation covers the fitness assessment required by the IMT, for both Group 1 and Group 2 drivers.",
      ctaLabel: "Medical Certificate for Driving Licence",
    },
  },
  {
    sourceSlug: "baixa-medica",
    priority: 3,
    pt: {
      heading: "Precisa de outro tipo de atestado?",
      body: "Se procura um atestado médico para a carta de condução, e não uma justificação de falta ao trabalho, temos uma consulta específica para essa avaliação.",
      ctaLabel: "Atestado para Carta de Condução",
    },
    en: {
      heading: "Need a different kind of certificate?",
      body: "Looking for a medical certificate for your driving licence rather than a work-absence note? We have a dedicated consultation for that assessment.",
      ctaLabel: "Driving Licence Medical Certificate",
    },
  },
];

async function main() {
  const target = await prisma.service.findFirst({
    where: { country: { code: COUNTRY }, slug: TARGET_SLUG },
    select: { id: true },
  });
  if (!target) throw new Error(`target service ${COUNTRY}/${TARGET_SLUG} not found`);

  for (const spec of LINKS) {
    const source = await prisma.service.findFirst({
      where: { country: { code: COUNTRY }, slug: spec.sourceSlug },
      select: { id: true },
    });
    if (!source) {
      console.log(`[SKIPPED] source ${spec.sourceSlug} not found`);
      continue;
    }

    const existing = await prisma.serviceLink.findFirst({
      where: { sourceServiceId: source.id, targetServiceId: target.id },
      select: { id: true },
    });
    if (existing) {
      console.log(`[already] ${spec.sourceSlug} -> ${TARGET_SLUG}`);
      continue;
    }

    console.log(`[change ] ${spec.sourceSlug} -> ${TARGET_SLUG} (COMPLEMENTARY, priority ${spec.priority})`);
    if (APPLY) {
      await prisma.serviceLink.create({
        data: {
          sourceServiceId: source.id,
          targetServiceId: target.id,
          type: "COMPLEMENTARY",
          priority: spec.priority,
          isActive: true,
          translations: {
            create: [
              { locale: "PT", ...spec.pt },
              { locale: "EN", ...spec.en },
            ],
          },
        },
      });
    }
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY-RUN"}.${APPLY ? "" : " Re-run with --apply to write."}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
