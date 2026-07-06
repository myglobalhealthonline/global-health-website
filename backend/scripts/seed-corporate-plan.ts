/**
 * Seed: Corporate Standard plan (private B2B) + corporate-only services.
 *
 *   pnpm --filter backend exec node --import tsx scripts/seed-corporate-plan.ts [--country=ie]
 *
 * Idempotent (upserts by slug). Creates:
 *   1. CorporatePlan "corporate-standard" — €180/employee/year, EUR, max 5
 *      beneficiaries per employee.
 *   2. CorporateBenefitRule — 10% off GENERAL (GP) consultations, beneficiaries
 *      included. Configurable later from the admin corporate pages.
 *   3. Per active country (or just --country=xx): three hidden services —
 *        corporate-pre-assessment      (CORPORATE_ONLY)
 *        corporate-illness-benefit     (CORPORATE_REQUEST_ONLY)
 *        corporate-fit-for-work        (CORPORATE_REQUEST_ONLY)
 *      All €0 (included in the plan), GENERAL kind, isActive=true. They never
 *      appear on public surfaces (ServiceVisibility gate).
 *
 * AFTER SEEDING an admin still has to:
 *   - assign doctors to the corporate services (ServiceDoctor), otherwise
 *     no slots are bookable;
 *   - set each company's preAssessmentDoctorId ("selected Doctor/Admin").
 *
 * Refuses to run when NODE_ENV=production unless ALLOW_PROD_SEED=1.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
  console.error("Refusing to seed on production without ALLOW_PROD_SEED=1");
  process.exit(1);
}

const countryArg = process.argv.find((a) => a.startsWith("--country="))?.split("=")[1];

const CORPORATE_SERVICES = [
  {
    slug: "corporate-pre-assessment",
    name: "Pre-assessment Consultation",
    summary:
      "Initial corporate onboarding consultation with your company's assigned Global Health doctor.",
    visibility: "CORPORATE_ONLY" as const,
  },
  {
    slug: "corporate-illness-benefit",
    name: "Illness Benefit Consultation",
    summary:
      "Company-requested consultation to assess illness benefit eligibility for an employee.",
    visibility: "CORPORATE_REQUEST_ONLY" as const,
  },
  {
    slug: "corporate-fit-for-work",
    name: "Fit-for-Work Consultation",
    summary:
      "Company-requested consultation to assess an employee's fitness to return to work.",
    visibility: "CORPORATE_REQUEST_ONLY" as const,
  },
];

const CORPORATE_SERVICE_LOCALIZATION: Record<
  string,
  Record<string, { name: string; summary: string }>
> = {
  es: {
    "corporate-pre-assessment": {
      name: "Consulta de preevaluación",
      summary:
        "Consulta inicial de incorporación corporativa con el médico asignado por Global Health para su empresa.",
    },
    "corporate-illness-benefit": {
      name: "Consulta para prestación por enfermedad",
      summary:
        "Consulta solicitada por la empresa para valorar la elegibilidad de un empleado para la prestación por enfermedad.",
    },
    "corporate-fit-for-work": {
      name: "Consulta de aptitud para el trabajo",
      summary:
        "Consulta solicitada por la empresa para valorar si un empleado está en condiciones de reincorporarse al trabajo.",
    },
  },
  pt: {
    "corporate-pre-assessment": {
      name: "Consulta de pré-avaliação",
      summary:
        "Consulta inicial de integração corporativa com o médico da Global Health atribuído à sua empresa.",
    },
    "corporate-illness-benefit": {
      name: "Avaliação para subsídio de doença",
      summary:
        "Consulta clínica solicitada pela empresa para avaliar a condição do colaborador e a elegibilidade para subsídio de doença.",
    },
    "corporate-fit-for-work": {
      name: "Avaliação de aptidão para o trabalho",
      summary:
        "Consulta clínica solicitada pela empresa para confirmar se o colaborador está em condições de regressar ao trabalho com segurança.",
    },
  },
  br: {
    "corporate-pre-assessment": {
      name: "Consulta de pré-avaliação",
      summary:
        "Consulta inicial de integração corporativa com o médico da Global Health designado para a sua empresa.",
    },
    "corporate-illness-benefit": {
      name: "Avaliação para benefício por doença",
      summary:
        "Consulta clínica solicitada pela empresa para avaliar a condição do colaborador e a elegibilidade para benefício por doença.",
    },
    "corporate-fit-for-work": {
      name: "Avaliação de aptidão para o trabalho",
      summary:
        "Consulta clínica solicitada pela empresa para confirmar se o colaborador está em condições de regressar ao trabalho com segurança.",
    },
  },
  ro: {
    "corporate-pre-assessment": {
      name: "Consultație de preevaluare",
      summary:
        "Consultația inițială de integrare corporativă cu medicul Global Health desemnat companiei dumneavoastră.",
    },
    "corporate-illness-benefit": {
      name: "Consultație pentru evaluarea indemnizației de boală",
      summary:
        "Consultație solicitată de companie pentru evaluarea eligibilității unui angajat pentru indemnizație de boală.",
    },
    "corporate-fit-for-work": {
      name: "Consultație pentru aptitudinea de muncă",
      summary:
        "Consultație solicitată de companie pentru a evalua dacă un angajat este apt să revină la muncă.",
    },
  },
  cz: {
    "corporate-pre-assessment": {
      name: "Vstupní lékařská konzultace",
      summary:
        "Úvodní firemní konzultace s lékařem Global Health přiděleným vaší společnosti.",
    },
    "corporate-illness-benefit": {
      name: "Konzultace k nemocenské dávce",
      summary:
        "Konzultace vyžádaná zaměstnavatelem za účelem posouzení nároku zaměstnance na nemocenskou dávku.",
    },
    "corporate-fit-for-work": {
      name: "Konzultace pracovní způsobilosti",
      summary:
        "Konzultace vyžádaná zaměstnavatelem k posouzení, zda je zaměstnanec způsobilý k návratu do práce.",
    },
  },
};

async function main() {
  const plan = await prisma.corporatePlan.upsert({
    where: { slug: "corporate-standard" },
    create: {
      slug: "corporate-standard",
      name: "Corporate Standard",
      annualPricePerEmployeeCents: 18000,
      currencyCode: "EUR",
      maxBeneficiariesPerEmployee: 5,
      isActive: true,
    },
    update: {}, // never overwrite admin-tuned price/limits on re-run
  });
  console.log(`plan ok: ${plan.slug} (${plan.id})`);

  const existingRule = await prisma.corporateBenefitRule.findFirst({
    where: { corporatePlanId: plan.id, serviceKind: "GENERAL", serviceId: null },
  });
  if (!existingRule) {
    await prisma.corporateBenefitRule.create({
      data: {
        corporatePlanId: plan.id,
        serviceKind: "GENERAL",
        discountPercent: 10,
        appliesToBeneficiaries: true,
        isActive: true,
      },
    });
    console.log("rule created: GENERAL 10% (beneficiaries included)");
  } else {
    console.log(
      `rule exists: GENERAL ${existingRule.discountPercent}% — left untouched`,
    );
  }

  const countries = await prisma.country.findMany({
    where: { isActive: true, ...(countryArg ? { code: countryArg.toLowerCase() } : {}) },
    select: { id: true, code: true, name: true },
  });
  if (countries.length === 0) {
    console.error(countryArg ? `country ${countryArg} not found/active` : "no active countries");
    process.exit(1);
  }

  for (const country of countries) {
    for (const svc of CORPORATE_SERVICES) {
      const localized = CORPORATE_SERVICE_LOCALIZATION[country.code]?.[svc.slug];
      await prisma.service.upsert({
        where: { countryId_slug: { countryId: country.id, slug: svc.slug } },
        create: {
          countryId: country.id,
          kind: "GENERAL",
          slug: svc.slug,
          name: localized?.name ?? svc.name,
          summary: localized?.summary ?? svc.summary,
          basePriceCents: 0,
          isActive: true,
          visibility: svc.visibility,
          sortOrder: 999,
        },
        update: {
          visibility: svc.visibility,
          name: localized?.name ?? svc.name,
          summary: localized?.summary ?? svc.summary,
        },
      });
    }
    console.log(`services ok: ${country.code} (${country.name})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
