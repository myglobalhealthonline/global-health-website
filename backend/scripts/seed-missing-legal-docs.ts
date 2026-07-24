/**
 * READY-NOT-RUN. Seeds two gaps in CountryLegalDocument:
 *
 *   1. COOKIE_POLICY (locale "en") for all 6 countries — none exist yet.
 *      Describes the site's actual cookie categories per
 *      frontend/components/compliance/cookie-consent.ts + CookieBanner.tsx:
 *      Essential (always-on, no consent needed), Advertising (Meta Pixel,
 *      off by default), Third-party content (Doctify review widgets, off by
 *      default). Banner defaults to DENY_ALL.
 *
 *   2. MEDICAL_DISCLAIMER for Spain (locale "es") and Brazil (locale "pt") —
 *      translated from the canonical Ireland disclaimer authored in
 *      scripts/import-ireland-finalize.ts (DISCLAIMER_HTML), adapted for
 *      each country's emergency number and regulator.
 *
 * *** REQUIRES LEGAL REVIEW BEFORE PUBLISHING ***
 * All rows are inserted with isPublished:false (draft). Nothing here goes
 * live on the public site until a human sets isPublished:true — draft rows
 * are never returned by the public legal-document read path (see
 * backend/src/routes/legal*.ts / wherever CountryLegalDocument is queried
 * with isPublished:true). The cookie-policy copy and both translations are
 * machine-drafted and MUST be reviewed by qualified legal counsel in each
 * jurisdiction (GDPR for ES, LGPD for BR) before publishing.
 *
 * Idempotent: upserts on the CountryLegalDocument @@unique([countryId, type, locale]).
 * If a row already exists this script leaves isPublished/publishedAt alone
 * (does not un-publish or publish anything) — only touches title/content on
 * an existing draft, and never touches an already-published row's content.
 *
 * Usage (NOT run yet):
 *   pnpm --filter backend exec node --env-file=.env --import tsx scripts/seed-missing-legal-docs.ts
 *
 * Refuses to run when NODE_ENV=production unless ALLOW_PROD_SEED=1 (same
 * convention as scripts/seed-legal-documents.ts).
 */
import "dotenv/config";
import { LegalDocumentType } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
  console.error("Refusing to seed on production without ALLOW_PROD_SEED=1");
  process.exit(1);
}

const COUNTRIES = ["ie", "es", "pt", "cz", "br", "ro"] as const;

// ---------------------------------------------------------------------------
// 1. Cookie Policy — English, one row per country, draft.
// ---------------------------------------------------------------------------

const COOKIE_POLICY_TITLE = "Cookie Policy";

const COOKIE_POLICY_HTML = [
  "This Cookie Policy explains how Global Health uses cookies and similar technologies on this website, and the choices available to you.",
  "<h2>What are cookies</h2>",
  "Cookies are small text files placed on your device when you visit a website. We also use similar technologies such as local storage. This policy refers to all of these collectively as \"cookies\".",
  "<h2>How we use cookies</h2>",
  "We group cookies into three categories, matching the choices presented in our cookie banner:",
  "<ul>" +
    "<li><strong>Essential cookies</strong> — required for the site to function (for example, keeping you signed in, remembering your cookie choices, and load-balancing). These cannot be switched off and do not require consent, as they are strictly necessary to provide the service you request.</li>" +
    "<li><strong>Advertising cookies</strong> — used to measure which advertisements bring visitors to our site (for example, the Meta Pixel). These are off by default and only set once you actively consent.</li>" +
    "<li><strong>Third-party content cookies</strong> — set by embedded third-party widgets, such as Doctify patient-review widgets loaded from doctify.com. These are off by default and only set once you actively consent.</li>" +
    "</ul>",
  "<h2>Your choices</h2>",
  "When you first visit the site, a cookie banner asks you to accept or decline non-essential cookies. Non-essential categories (advertising, third-party content) default to declined until you actively opt in. You can change your choice at any time via the cookie settings link in the site footer.",
  "<h2>How long cookies last</h2>",
  "Essential cookies generally last for your browsing session or a short period needed to keep the site working correctly. Advertising and third-party cookies persist according to the third party's own retention period; see their respective privacy policies for details.",
  "<h2>Managing cookies in your browser</h2>",
  "Most browsers let you see, delete, and block cookies. Refer to your browser's help pages for instructions. Blocking essential cookies may prevent parts of the site — such as booking a consultation — from working correctly.",
  "<h2>Contact</h2>",
  "If you have questions about this Cookie Policy or how we process personal data, please contact our Data Protection Officer using the details in our Privacy Policy.",
]
  .map((block) => (block.startsWith("<") ? block : `<p>${block}</p>`))
  .join("");

// ---------------------------------------------------------------------------
// 2. Medical Disclaimer translations (ES / BR), derived from the canonical
//    Ireland text in scripts/import-ireland-finalize.ts. Country-specific
//    swaps: emergency number, regulator/authority reference, in-person GP
//    fallback body.
// ---------------------------------------------------------------------------

const MEDICAL_DISCLAIMER_TITLE_ES = "Aviso Médico";
const MEDICAL_DISCLAIMER_HTML_ES = [
  "Todos los servicios en España se prestan a nivel de médico de atención primaria, de acuerdo con la normativa española de telemedicina y práctica médica. Todos los médicos de nuestra plataforma están colegiados para ejercer en España ante el Colegio Oficial de Médicos correspondiente.",
  "Nuestros médicos realizan evaluaciones clínicas a distancia y pueden ofrecer recomendaciones clínicas, derivaciones o documentación médica únicamente cuando sea clínicamente apropiado y a discreción profesional del médico. Nuestros médicos no prescriben habitualmente sustancias controladas a través de videoconsultas.",
  "Los partes médicos emitidos a través de nuestra plataforma son aceptados por empleadores e instituciones educativas en todo el país. Cuando un empleador requiera un parte médico durante un periodo de baja, este podrá emitirse tras una evaluación clínica completa, a discreción del médico, en función de la naturaleza y el resultado de la consulta.",
  "Tenga en cuenta que los partes de baja para su presentación ante la Seguridad Social (INSS) no están disponibles a través de nuestro servicio. Los pacientes que necesiten esta documentación para trámites de la Seguridad Social deben acudir a una consulta presencial con su médico de cabecera. Puede obtener más información a través de los servicios oficiales españoles en seg-social.es.",
  "Los partes retroactivos no se emiten habitualmente debido a la ausencia de una evaluación clínica directa en el momento de la enfermedad.",
  "Las videoconsultas no son adecuadas para emergencias médicas. Si tiene una emergencia médica, llame al 112 inmediatamente o acuda al servicio de urgencias más cercano.",
]
  .map((p) => `<p>${p}</p>`)
  .join("");

const MEDICAL_DISCLAIMER_TITLE_BR = "Aviso Médico";
const MEDICAL_DISCLAIMER_HTML_BR = [
  "Todos os serviços no Brasil são prestados em nível de clínico geral, de acordo com as normas brasileiras de telemedicina e prática médica. Todos os médicos da nossa plataforma são registrados para exercer no Brasil junto ao Conselho Regional de Medicina (CRM) competente.",
  "Nossos médicos realizam avaliações clínicas remotamente e podem fornecer recomendações clínicas, encaminhamentos ou documentação médica somente quando clinicamente apropriado e a critério profissional do médico. Nossos médicos não prescrevem rotineiramente substâncias controladas por meio de teleconsultas.",
  "Atestados médicos emitidos por meio da nossa plataforma são aceitos por empregadores e instituições de ensino em todo o país. Quando um empregador exigir um atestado médico durante um período de afastamento, este poderá ser emitido após uma avaliação clínica completa, a critério do médico, dependendo da natureza e do resultado da consulta.",
  "Atestados para fins de benefícios previdenciários (INSS) não estão disponíveis por meio do nosso serviço. Pacientes que necessitem dessa documentação para fins previdenciários devem comparecer a uma consulta presencial com um médico. Mais informações estão disponíveis nos serviços oficiais brasileiros em gov.br/inss.",
  "Atestados retroativos não são emitidos rotineiramente devido à ausência de avaliação clínica direta no momento da doença.",
  "Teleconsultas não são adequadas para emergências médicas. Em caso de emergência médica, ligue para o SAMU (192) ou para o 193 (Corpo de Bombeiros) imediatamente, ou dirija-se ao pronto-socorro mais próximo.",
]
  .map((p) => `<p>${p}</p>`)
  .join("");

type DocSeed = {
  countryCode: string;
  type: LegalDocumentType;
  locale: string;
  title: string;
  content: string;
};

const DOCS: DocSeed[] = [
  ...COUNTRIES.map((code) => ({
    countryCode: code,
    type: LegalDocumentType.COOKIE_POLICY,
    locale: "en",
    title: COOKIE_POLICY_TITLE,
    content: COOKIE_POLICY_HTML,
  })),
  {
    countryCode: "es",
    type: LegalDocumentType.MEDICAL_DISCLAIMER,
    locale: "es",
    title: MEDICAL_DISCLAIMER_TITLE_ES,
    content: MEDICAL_DISCLAIMER_HTML_ES,
  },
  {
    countryCode: "br",
    type: LegalDocumentType.MEDICAL_DISCLAIMER,
    locale: "pt",
    title: MEDICAL_DISCLAIMER_TITLE_BR,
    content: MEDICAL_DISCLAIMER_HTML_BR,
  },
];

async function main(): Promise<void> {
  for (const doc of DOCS) {
    const country = await prisma.country.findFirst({
      where: { code: { equals: doc.countryCode, mode: "insensitive" } },
      select: { id: true },
    });
    if (!country) {
      console.warn(`[missing-legal-doc] skip ${doc.countryCode}/${doc.locale}/${doc.type}: country not found`);
      continue;
    }

    const existing = await prisma.countryLegalDocument.findUnique({
      where: {
        countryId_type_locale: { countryId: country.id, type: doc.type, locale: doc.locale },
      },
      select: { id: true, isPublished: true },
    });

    if (existing) {
      // Never touch isPublished/publishedAt of an existing row here — this
      // script only fills in a draft's content, it never (un)publishes.
      await prisma.countryLegalDocument.update({
        where: { id: existing.id },
        data: { title: doc.title, content: doc.content, version: { increment: 1 } },
      });
      console.log(
        `[missing-legal-doc] updated ${doc.countryCode}/${doc.locale}/${doc.type} (isPublished=${existing.isPublished} unchanged)`,
      );
    } else {
      await prisma.countryLegalDocument.create({
        data: {
          countryId: country.id,
          type: doc.type,
          locale: doc.locale,
          title: doc.title,
          content: doc.content,
          isPublished: false, // DRAFT — requires legal review before publishing
        },
      });
      console.log(`[missing-legal-doc] created ${doc.countryCode}/${doc.locale}/${doc.type} (draft)`);
    }
  }

  console.log("\nDone. All rows are isPublished:false — REQUIRES LEGAL REVIEW BEFORE PUBLISHING.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
