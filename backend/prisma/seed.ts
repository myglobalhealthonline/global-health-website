import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, LocaleCode, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const prismaDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(prismaDir, "..", ".env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

type SeedDoctor = { slug: string; fullName: string; title: string; bio?: string };
type SeedService = {
  slug: string;
  name: string;
  legacyPath: string;
  summary?: string;
  durationMinutes?: number;
};

async function main() {
  await prisma.currency.upsert({
    where: { code: "EUR" },
    update: {},
    create: { code: "EUR", symbol: "EUR" },
  });

  const countrySeeds = [
    {
      code: "ie",
      name: "Ireland",
      slug: "ireland",
      legacyHomePath: "/home",
      teamPath: "/ireland-team",
      generalConsultationPath: "/general-consultation-ie",
      specialistConsultationPath: "/specialty-ie",
      defaultLocale: LocaleCode.EN,
      locales: [LocaleCode.EN, LocaleCode.PT, LocaleCode.ES],
      domain: "ie.myglobalhealth.online",
      doctor: {
        slug: "dr-mirza-aun-mohammad",
        fullName: "Dr Mirza Aun Mohammad",
        title: "General Practitioner",
        bio: "Ireland-based GP supporting first-contact online consultations, continuity of care, and clear next-step guidance.",
      },
      specialty: { slug: "cardiology", name: "Cardiology" },
      service: {
        slug: "medical-consultation",
        name: "Medical Consultation",
        legacyPath: "/ireland/medical-consultation",
        summary:
          "First-contact medical consultation for common symptoms, assessments, and referral or follow-up planning after intake review.",
        durationMinutes: 25,
      },
      plan: { slug: "starter", name: "Starter Plan", priceCents: 4900 },
      heroPath: "/images/hero/ireland-hero-ai.svg",
    },
    {
      code: "pt",
      name: "Portugal",
      slug: "portugal",
      legacyHomePath: "/home-pt",
      teamPath: "/portugal-team",
      generalConsultationPath: "/general-consultation-pt",
      specialistConsultationPath: "/specialty-pt",
      defaultLocale: LocaleCode.PT,
      locales: [LocaleCode.PT, LocaleCode.EN],
      domain: "pt.myglobalhealth.online",
      doctor: { slug: "dr-tiago-miguel-figueira", fullName: "Dr Tiago Miguel Figueira", title: "General Practitioner" },
      specialty: { slug: "nutrition", name: "Nutrition" },
      service: { slug: "medical-consultation", name: "Consulta Medica", legacyPath: "/general-consultation-pt" },
      plan: { slug: "starter", name: "Plano Inicial", priceCents: 4500 },
      heroPath: "/images/hero/country-home-hero-ai.svg",
    },
    {
      code: "sp",
      name: "Spain",
      slug: "spain",
      legacyHomePath: "/home-sp",
      teamPath: "/spain-team",
      generalConsultationPath: "/general-consultation-sp",
      specialistConsultationPath: "/specialty-sp",
      defaultLocale: LocaleCode.ES,
      locales: [LocaleCode.ES, LocaleCode.EN],
      domain: "es.myglobalhealth.online",
      doctor: { slug: "dr-fatima-ali", fullName: "Dr Fatima Ali", title: "General Practitioner" },
      specialty: { slug: "dermatology", name: "Dermatology" },
      service: { slug: "medical-consultation", name: "Consulta Medica", legacyPath: "/general-consultation-sp" },
      plan: { slug: "starter", name: "Plan Inicial", priceCents: 4700 },
      heroPath: "/images/hero/country-home-hero-ai.svg",
    },
    {
      code: "cz",
      name: "Czechia",
      slug: "czechia",
      legacyHomePath: "/home-cz",
      teamPath: "/czechia-team",
      generalConsultationPath: "/general-consultation-cz",
      specialistConsultationPath: "/specialty-cz",
      defaultLocale: LocaleCode.CS,
      locales: [LocaleCode.CS, LocaleCode.EN],
      domain: "cz.myglobalhealth.online",
      doctor: { slug: "dr-emmanuel-dabup", fullName: "Dr Emmanuel Dabup", title: "General Practitioner" },
      specialty: { slug: "urology", name: "Urology" },
      service: { slug: "medical-consultation", name: "Lekarska Konzultace", legacyPath: "/general-consultation-cz" },
      plan: { slug: "starter", name: "Zakladni Plan", priceCents: 4300 },
      heroPath: "/images/hero/country-home-hero-ai.svg",
    },
    {
      code: "rm",
      name: "Romania",
      slug: "romania",
      legacyHomePath: "/home-rm",
      teamPath: "/romania-team",
      generalConsultationPath: "/general-consultation-rm",
      specialistConsultationPath: "/specialty-rm",
      defaultLocale: LocaleCode.RO,
      locales: [LocaleCode.RO, LocaleCode.EN],
      domain: "ro.myglobalhealth.online",
      doctor: { slug: "dr-maristela-ferro-nepomuceno", fullName: "Dr Maristela Ferro Nepomuceno", title: "General Practitioner" },
      specialty: { slug: "neurology", name: "Neurology" },
      service: { slug: "medical-consultation", name: "Consultatie Medicala", legacyPath: "/general-consultation-rm" },
      plan: { slug: "starter", name: "Plan Initial", priceCents: 4200 },
      heroPath: "/images/hero/country-home-hero-ai.svg",
    },
  ];

  for (const seed of countrySeeds) {
    const country = await prisma.country.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        slug: seed.slug,
        legacyHomePath: seed.legacyHomePath,
        teamPath: seed.teamPath,
        generalConsultationPath: seed.generalConsultationPath,
        specialistConsultationPath: seed.specialistConsultationPath,
        defaultLocale: seed.defaultLocale,
      },
      create: {
        code: seed.code,
        name: seed.name,
        slug: seed.slug,
        legacyHomePath: seed.legacyHomePath,
        teamPath: seed.teamPath,
        generalConsultationPath: seed.generalConsultationPath,
        specialistConsultationPath: seed.specialistConsultationPath,
        defaultLocale: seed.defaultLocale,
        currency: { connect: { code: "EUR" } },
      },
    });

    await prisma.countryDomain.upsert({
      where: { domain: seed.domain },
      update: { isPrimary: true, countryId: country.id },
      create: { domain: seed.domain, isPrimary: true, countryId: country.id },
    });

    await prisma.consultationSetting.upsert({
      where: { countryId: country.id },
      update: {},
      create: { countryId: country.id, enableGeneral: true, enableSpecialist: true },
    });

    await prisma.bookingSetting.upsert({
      where: { countryId: country.id },
      update: {},
      create: { countryId: country.id, bookingEnabled: true, timezone: "Europe/Dublin" },
    });

    for (const locale of seed.locales) {
      await prisma.countryLocale.upsert({
        where: { countryId_locale: { countryId: country.id, locale } },
        update: { isDefault: locale === seed.defaultLocale },
        create: { countryId: country.id, locale, isDefault: locale === seed.defaultLocale },
      });
    }

    const specialty = await prisma.specialty.upsert({
      where: { countryId_slug: { countryId: country.id, slug: seed.specialty.slug } },
      update: { name: seed.specialty.name },
      create: { countryId: country.id, slug: seed.specialty.slug, name: seed.specialty.name },
    });

    const doctorPayload: SeedDoctor = seed.doctor;

    const doctor = await prisma.doctor.upsert({
      where: { countryId_slug: { countryId: country.id, slug: doctorPayload.slug } },
      update: {
        fullName: doctorPayload.fullName,
        title: doctorPayload.title,
        ...(doctorPayload.bio !== undefined ? { bio: doctorPayload.bio } : {}),
      },
      create: {
        countryId: country.id,
        slug: doctorPayload.slug,
        fullName: doctorPayload.fullName,
        title: doctorPayload.title,
        ...(doctorPayload.bio !== undefined ? { bio: doctorPayload.bio } : {}),
      },
    });

    await prisma.doctorSpecialty.upsert({
      where: { doctorId_specialtyId: { doctorId: doctor.id, specialtyId: specialty.id } },
      update: {},
      create: { doctorId: doctor.id, specialtyId: specialty.id },
    });

    const svc: SeedService = seed.service;

    await prisma.service.upsert({
      where: { countryId_slug: { countryId: country.id, slug: svc.slug } },
      update: {
        name: svc.name,
        legacyPath: svc.legacyPath,
        specialtyId: specialty.id,
        ...(svc.summary !== undefined ? { summary: svc.summary } : {}),
        ...(svc.durationMinutes !== undefined ? { durationMinutes: svc.durationMinutes } : {}),
      },
      create: {
        countryId: country.id,
        slug: svc.slug,
        name: svc.name,
        legacyPath: svc.legacyPath,
        specialtyId: specialty.id,
        currencyCode: "EUR",
        basePriceCents: 3900,
        ...(svc.summary !== undefined ? { summary: svc.summary } : {}),
        ...(svc.durationMinutes !== undefined ? { durationMinutes: svc.durationMinutes } : {}),
      },
    });

    await prisma.pricingPlan.upsert({
      where: { countryId_slug: { countryId: country.id, slug: seed.plan.slug } },
      update: { name: seed.plan.name, priceCents: seed.plan.priceCents },
      create: { countryId: country.id, slug: seed.plan.slug, name: seed.plan.name, priceCents: seed.plan.priceCents, currencyCode: "EUR", interval: "month" },
    });

    const logoAsset = await prisma.asset.upsert({
      where: { kind_key: { kind: "LOGO", key: `${seed.code}-primary-logo` } },
      update: { path: `/public/logos/${seed.code}-primary-logo.svg` },
      create: { kind: "LOGO", key: `${seed.code}-primary-logo`, path: `/public/logos/${seed.code}-primary-logo.svg`, countryId: country.id, altText: `${seed.name} logo` },
    });

    await prisma.asset.upsert({
      where: { kind_key: { kind: "IMAGE", key: `${seed.code}-hero` } },
      update: {
        path: seed.heroPath,
        altText: `${seed.name} online clinic hero illustration`,
        countryId: country.id,
      },
      create: {
        kind: "IMAGE",
        key: `${seed.code}-hero`,
        path: seed.heroPath,
        countryId: country.id,
        altText: `${seed.name} online clinic hero illustration`,
      },
    });

    await prisma.asset.upsert({
      where: { kind_key: { kind: "IMAGE", key: `${seed.code}-doctor-${seed.doctor.slug}` } },
      update: {
        path: "/images/ireland/doctor-spotlight-ai.svg",
        altText: `Illustrative doctor portrait for ${seed.doctor.fullName}`,
        doctorId: doctor.id,
      },
      create: {
        kind: "IMAGE",
        key: `${seed.code}-doctor-${seed.doctor.slug}`,
        path: "/images/ireland/doctor-spotlight-ai.svg",
        doctorId: doctor.id,
        altText: `Illustrative doctor portrait for ${seed.doctor.fullName}`,
      },
    });

    await prisma.asset.upsert({
      where: { kind_key: { kind: "ICON", key: `${seed.code}-secure-care-icon` } },
      update: {
        path: "/icons/trust/secure-confidential-ai.svg",
        altText: `${seed.name} secure care icon`,
        countryId: country.id,
      },
      create: {
        kind: "ICON",
        key: `${seed.code}-secure-care-icon`,
        path: "/icons/trust/secure-confidential-ai.svg",
        altText: `${seed.name} secure care icon`,
        countryId: country.id,
      },
    });

    await prisma.badge.upsert({
      where: { id: `${seed.code}-secure-care-badge` },
      update: {},
      create: { id: `${seed.code}-secure-care-badge`, countryId: country.id, assetId: logoAsset.id, label: "Secure Care", sortOrder: 1 },
    });

    await prisma.clinic.upsert({
      where: { countryId_slug: { countryId: country.id, slug: `${seed.code}-main-clinic` } },
      update: { name: `${seed.name} Main Clinic` },
      create: { countryId: country.id, slug: `${seed.code}-main-clinic`, name: `${seed.name} Main Clinic` },
    });
  }

  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
  const seedAdminFullName = process.env.SEED_ADMIN_FULL_NAME?.trim();

  const hasAnyAdminSeedEnv = Boolean(seedAdminEmail || seedAdminPassword || seedAdminFullName);
  const hasAllAdminSeedEnv = Boolean(seedAdminEmail && seedAdminPassword && seedAdminFullName);

  if (hasAnyAdminSeedEnv && !hasAllAdminSeedEnv) {
    console.warn(
      "[seed] Skipping admin user seed: set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, and SEED_ADMIN_FULL_NAME together.",
    );
  }

  if (hasAllAdminSeedEnv) {
    const passwordHash = await bcrypt.hash(seedAdminPassword as string, 12);
    await prisma.user.upsert({
      where: { email: seedAdminEmail as string },
      update: {
        fullName: seedAdminFullName as string,
        passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
      },
      create: {
        email: seedAdminEmail as string,
        fullName: seedAdminFullName as string,
        passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });
    console.log(`[seed] Admin user ensured for ${seedAdminEmail}`);
  }
}

main()
  .then(async () => { await prisma.$disconnect(); await pool.end(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); await pool.end(); process.exit(1); });
