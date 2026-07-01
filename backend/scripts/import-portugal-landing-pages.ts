/**
 * Seed the Portugal SEO landing pages (Ligações Internas spec, Secção 4 +
 * Regra 6) as published condition pages. Served at /portugal/pt/health/<slug>,
 * indexed in the sitemap, intentionally kept out of the main nav / service
 * listing. Each page funnels to the correct bookable service.
 *
 * The PT market already has dedicated bookable condition services
 * (diabetes-consultation, hypertension-consultation, respiratory-infections),
 * so those are used as the primary CTA alongside the spec's secondary targets.
 *
 *   node --env-file=.env --import tsx scripts/import-portugal-landing-pages.ts          # dry-run
 *   node --env-file=.env --import tsx scripts/import-portugal-landing-pages.ts --apply
 */
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "pt";
const APPLY = process.argv.includes("--apply");

const SVC = (slug: string, label: string) =>
  `<p><a href="/portugal/pt/services/${slug}">${label}</a></p>`;

const PAGES: Array<{
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  bodyHtml: string;
}> = [
  {
    slug: "diabetes",
    title: "Diabetes — Acompanhamento Médico Online em Portugal",
    seoTitle: "Diabetes Portugal | Médico Online",
    seoDescription:
      "Acompanhamento contínuo da diabetes com médico registado na Ordem dos Médicos, por videochamada segura — revisão de controlo, medicação, e apoio nutricional.",
    bodyHtml:
      "<h2>Acompanhamento contínuo da diabetes, online</h2>" +
      "<p>A diabetes é uma condição que se vive todos os dias, e um bom controlo depende de revisão regular e estruturada. Os nossos médicos registados na Ordem dos Médicos avaliam o seu controlo glicémico, medicação, e risco global por videochamada segura, e coordenam exames ou apoio especializado quando necessário.</p>" +
      "<p>Este é um acompanhamento clínico estruturado — não uma renovação automática. Se o seu controlo mudou ou surgiram novos sintomas, avaliamo-los de forma adequada.</p>" +
      "<h2>Marque a sua consulta</h2>" +
      "<p>Continue o acompanhamento da sua diabetes com um médico registado na Ordem dos Médicos.</p>" +
      SVC("diabetes-consultation", "Consulta de Diabetes") +
      SVC("family-and-general-medicine", "Consulta de Medicina Geral e Familiar") +
      SVC("nutrition-consultation", "Consulta de Nutrição"),
  },
  {
    slug: "hipertensao",
    title: "Hipertensão (Tensão Arterial Alta) — Acompanhamento Online em Portugal",
    seoTitle: "Hipertensão Portugal | Médico Online",
    seoDescription:
      "Controlo da tensão arterial alta com médico registado na Ordem dos Médicos, por videochamada segura — revisão, medicação, e avaliação de risco cardiovascular.",
    bodyHtml:
      "<h2>Faça o controlo da tensão arterial a partir de casa</h2>" +
      "<p>A tensão arterial alta raramente dá sintomas — e é precisamente por isso que precisa de revisão regular. Os nossos médicos registados na Ordem dos Médicos avaliam os seus valores, a medicação, e o risco cardiovascular por videochamada segura — e dizem-lhe com clareza quando algo precisa de mudar.</p>" +
      "<p>A hipertensão é melhor gerida como acompanhamento contínuo do que como uma consulta isolada. Quando a tensão está estável, revemos e mantemos o plano; quando não está, ajustamos, coordenamos exames, ou encaminhamos para cardiologia.</p>" +
      "<h2>Marque a sua consulta</h2>" +
      "<p>Fale hoje com um médico registado na Ordem dos Médicos.</p>" +
      SVC("hypertension-consultation", "Consulta de Hipertensão") +
      SVC("family-and-general-medicine", "Consulta de Medicina Geral e Familiar") +
      SVC("cardiology-consultation", "Consulta de Cardiologia"),
  },
  {
    slug: "infecoes-respiratorias",
    title: "Infeções Respiratórias — Médico Online em Portugal",
    seoTitle: "Infeção Respiratória Portugal | Médico no Mesmo Dia",
    seoDescription:
      "Tosse persistente, infeções respiratórias, e sintomas respiratórios avaliados por médico registado na Ordem dos Médicos — consultas por vídeo no mesmo dia.",
    bodyHtml:
      "<h2>Sintomas respiratórios avaliados hoje</h2>" +
      "<p>Tosse, infeções respiratórias, e sintomas do aparelho respiratório estão entre os motivos mais comuns para procurar um médico — e a maioria pode ser avaliada com segurança por vídeo. Os nossos médicos registados na Ordem dos Médicos fazem uma história clínica completa, avaliam os sintomas, e aconselham sobre tratamento, encaminhamento, ou avaliação presencial quando necessário.</p>" +
      "<p>Se o médico considerar que os seus sintomas exigem exame físico ou cuidados urgentes, será informado com clareza e encaminhado para o serviço adequado.</p>" +
      "<h2>Marque uma consulta no mesmo dia</h2>" +
      "<p>Avalie hoje os seus sintomas respiratórios.</p>" +
      SVC("respiratory-infections", "Consulta de Infeções Respiratórias") +
      SVC("medical-consultation", "Consulta de Clínica Geral") +
      SVC("family-and-general-medicine", "Consulta de Medicina Geral e Familiar"),
  },
  {
    slug: "enxaqueca",
    title: "Enxaqueca — Avaliação e Acompanhamento em Portugal",
    seoTitle: "Enxaqueca Portugal | Avaliação Médica Online",
    seoDescription:
      "Avaliação de enxaqueca e cefaleias com médico registado na Ordem dos Médicos, por videochamada — planos de tratamento e referenciação para neurologia quando necessário.",
    bodyHtml:
      "<h2>Avaliação de enxaqueca, online</h2>" +
      "<p>A enxaqueca é mais do que uma dor de cabeça — e merece uma avaliação clínica adequada. Os nossos médicos registados na Ordem dos Médicos avaliam o seu padrão de cefaleias, fatores desencadeantes, e história clínica por videochamada segura, e aconselham sobre tratamento e prevenção.</p>" +
      "<h2>Esta é uma enxaqueca nova ou ocasional, ou tem enxaquecas com frequência?</h2>" +
      "<p>Para uma enxaqueca nova ou ocasional, comece por uma consulta de clínica geral.</p>" +
      SVC("medical-consultation", "Consulta de Clínica Geral") +
      "<p>Para enxaquecas crónicas ou frequentes que exijam acompanhamento contínuo, a nossa consulta de Medicina Geral e Familiar proporciona um plano de gestão a longo prazo.</p>" +
      SVC("family-and-general-medicine", "Consulta de Medicina Geral e Familiar") +
      "<p>Quando os sintomas sugerem necessidade de avaliação especializada ou exames, coordenamos a referenciação para neurologia.</p>" +
      SVC("neurology-consultation", "Consulta de Neurologia"),
  },
];

async function main() {
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true, defaultLocale: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);
  const locale = country.defaultLocale as LocaleCode;

  let count = 0;
  for (const p of PAGES) {
    const existing = await prisma.seoLandingPage.findUnique({
      where: { countryId_slug: { countryId: country.id, slug: p.slug } },
      select: { id: true },
    });
    console.log(`${existing ? "UPDATE" : "CREATE"}  /portugal/pt/health/${p.slug}  "${p.title}"`);
    if (!APPLY) {
      count += 1;
      continue;
    }
    await prisma.$transaction(async (tx) => {
      const page = await tx.seoLandingPage.upsert({
        where: { countryId_slug: { countryId: country.id, slug: p.slug } },
        create: { countryId: country.id, slug: p.slug, isPublished: true, sortOrder: count },
        update: { isPublished: true },
        select: { id: true },
      });
      await tx.seoLandingPageTranslation.deleteMany({ where: { landingPageId: page.id } });
      await tx.seoLandingPageTranslation.create({
        data: {
          landingPageId: page.id,
          locale,
          title: p.title,
          seoTitle: p.seoTitle,
          seoDescription: p.seoDescription,
          bodyHtml: p.bodyHtml,
        },
      });
    });
    count += 1;
  }

  console.log("\n────────────");
  console.log(
    APPLY
      ? `APPLIED: ${count} landing pages upserted + published.`
      : `DRY-RUN: ${count} landing pages would be upserted + published. Pass --apply.`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
