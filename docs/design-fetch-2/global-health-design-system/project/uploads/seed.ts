// =====================================================================
// Global Health — Database seed (Stage 4)
// Replaces backend/prisma/seed.ts
// Run: pnpm db:seed
//
// Idempotent: safe to re-run. Uses upsert on stable slugs.
// =====================================================================

import { PrismaClient, CategoryType, ServiceType, PublishStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ----- 1. COUNTRIES (the axis) ----------------------------------------

const COUNTRIES = [
  {
    code: "IE", slug: "ie", name: "Ireland",
    currency: "EUR", currencySymbol: "€",
    languages: ["English", "Portuguese", "Spanish", "Urdu", "Arabic"],
    heroTitle: "Online Medical Consultations in Ireland",
    heroSubtitle: "Licensed doctors, secure consultations, no waiting rooms.",
    ctaLabel: "Book a Consultation",
    sortOrder: 1, status: PublishStatus.PUBLISHED,
  },
  {
    code: "PT", slug: "pt", name: "Portugal",
    currency: "EUR", currencySymbol: "€",
    languages: ["Portuguese", "English", "French", "Spanish"],
    sortOrder: 2, status: PublishStatus.PUBLISHED,
  },
  {
    code: "ES", slug: "es", name: "Spain",
    currency: "EUR", currencySymbol: "€",
    languages: ["Spanish", "Portuguese", "French", "Urdu"],
    sortOrder: 3, status: PublishStatus.PUBLISHED,
  },
  {
    code: "CZ", slug: "cz", name: "Czechia",
    currency: "CZK", currencySymbol: "Kč",
    languages: ["Czech", "English"],
    sortOrder: 4, status: PublishStatus.PUBLISHED,
  },
  {
    code: "RO", slug: "rm", name: "Romania",   // slug stays "rm" to preserve existing URLs
    currency: "RON", currencySymbol: "lei",
    languages: ["Romanian", "English"],
    sortOrder: 5, status: PublishStatus.PUBLISHED,
  },
] as const;

// ----- 2. CATEGORIES (global) -----------------------------------------

const CATEGORIES_SPECIALIST = [
  "cardiology", "pediatric", "orthopedic", "neurology", "gastroenterology",
  "urology", "rheumatology", "psychology", "nutrition", "endocrinology",
  "oncology", "venereology", "genetics", "psychiatry", "physiotherapy",
  "geriatrics", "dermatology", "immunoallergology", "pneumology",
];

const CATEGORIES_GENERAL = [
  "medical-consultation", "pain-management", "travel", "self-referral",
  "diabetes", "sick-leave", "paediatric-primary-care", "family-medicine",
  "respiratory-infections", "hypertension", "driving-license-certificate",
  "treatment-refill", "weight-loss", "mental-health-assessment", "referral",
  "migraine", "aesthetic-medicine", "erectile-dysfunction",
];

function toTitleCase(slug: string) {
  return slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}

// ----- 3. MAIN SEED ---------------------------------------------------

async function main() {
  console.log("→ Seeding countries…");
  for (const c of COUNTRIES) {
    await prisma.country.upsert({
      where: { code: c.code },
      create: c,
      update: c,
    });
  }

  console.log("→ Seeding categories…");
  for (const slug of CATEGORIES_SPECIALIST) {
    await prisma.category.upsert({
      where: { slug },
      create: { slug, name: toTitleCase(slug), type: CategoryType.SPECIALIST },
      update: {},
    });
  }
  for (const slug of CATEGORIES_GENERAL) {
    await prisma.category.upsert({
      where: { slug },
      create: { slug, name: toTitleCase(slug), type: CategoryType.GENERAL },
      update: {},
    });
  }

  console.log("→ Enabling all categories in Ireland by default…");
  // Ireland currently has the full catalogue; other countries get enabled via admin later.
  const ireland = await prisma.country.findUniqueOrThrow({ where: { code: "IE" } });
  const allCats = await prisma.category.findMany();
  for (const cat of allCats) {
    await prisma.categoryCountry.upsert({
      where: { categoryId_countryId: { categoryId: cat.id, countryId: ireland.id } },
      create: { categoryId: cat.id, countryId: ireland.id, active: true },
      update: { active: true },
    });
  }

  console.log("→ Seeding super admin user…");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@myglobalhealth.online";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow!2026";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash,
      name: "Super Admin",
      role: UserRole.SUPER_ADMIN,
    },
    update: { role: UserRole.SUPER_ADMIN },
  });

  console.log("→ Seeding sample Ireland doctor (template)…");
  // Migrate the rest of your existing doctors by copying this pattern.
  const drMirza = await prisma.doctor.upsert({
    where: { slug: "dr-mirza-aun-mohammad" },
    create: {
      slug: "dr-mirza-aun-mohammad",
      name: "Dr. Mirza Aun Mohammad",
      title: "GP",
      bio: "TODO: copy bio from current site.",
      languages: ["English", "Urdu"],
      active: true,
    },
    update: {},
  });
  await prisma.doctorCountry.upsert({
    where: { doctorId_countryId: { doctorId: drMirza.id, countryId: ireland.id } },
    create: { doctorId: drMirza.id, countryId: ireland.id, sortOrder: 1, active: true },
    update: {},
  });

  console.log("→ Seeding sample Ireland service (template)…");
  const cardiologyCat = await prisma.category.findUniqueOrThrow({ where: { slug: "cardiology" } });
  await prisma.service.upsert({
    where: { countryId_slug: { countryId: ireland.id, slug: "cardiology-consultation" } },
    create: {
      slug: "cardiology-consultation",
      title: "Cardiology Consultation",
      summary: "Online consultation with a licensed cardiologist.",
      description: "TODO: copy from current site.",
      type: ServiceType.SPECIALIST,
      status: PublishStatus.PUBLISHED,
      countryId: ireland.id,
      categoryId: cardiologyCat.id,
      priceCents: 7500,
      currency: "EUR",
      durationMin: 30,
      active: true,
    },
    update: {},
  });

  console.log("✓ Seed complete.");
  console.log(`  Admin login: ${adminEmail} / ${adminPassword}  (CHANGE THIS)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
