import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { LocaleCode, PrismaClient, PublishStatus, ServiceKind } from "@prisma/client";
import { Pool } from "pg";

const prismaDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(prismaDir, "..", ".env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Remove all CMS/content data while preserving login tables.
 */
async function wipeContentData(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`
      TRUNCATE TABLE
        "Appointment",
        "Asset",
        "Badge",
        "BlogPost",
        "BookingSetting",
        "Clinic",
        "ConsultationSetting",
        "ContentPage",
        "Country",
        "CountryDomain",
        "CountryLocale",
        "Currency",
        "Doctor",
        "DoctorSpecialty",
        "Faq",
        "PricingPlan",
        "Service",
        "Specialty"
      RESTART IDENTITY CASCADE;
    `);
  });
}

type CountrySeed = {
  code: string;
  name: string;
  slug: string;
  domain: string;
  defaultLocale: LocaleCode;
  locales: LocaleCode[];
};

const wixSpecialties = [
  { name: "Cardiology Consultation", durationMinutes: 15, priceCents: 25000 },
  { name: "Pediatric Consultation", durationMinutes: 15, priceCents: 8500 },
  { name: "Orthopedic Consultation", durationMinutes: 15, priceCents: 10000 },
  { name: "Neurology Consultation", durationMinutes: 20, priceCents: 15000 },
  { name: "Gastroenterology Consultation", durationMinutes: 15, priceCents: 10000 },
  { name: "Urology Consultation", durationMinutes: 15, priceCents: 10000 },
  { name: "Rheumatology Consultation", durationMinutes: 15, priceCents: 15000 },
  { name: "Psychology Consultation", durationMinutes: 45, priceCents: 12000 },
  { name: "Nutrition Consultation", durationMinutes: 30, priceCents: 8900 },
  { name: "Endocrinology Consultation", durationMinutes: 15, priceCents: 14000 },
  { name: "Oncology Consultation", durationMinutes: 30, priceCents: 19000 },
  { name: "Venereology Consultation", durationMinutes: 15, priceCents: 10000 },
  { name: "Genetics Consultation", durationMinutes: 30, priceCents: 18500 },
  { name: "Psychiatry Consultation", durationMinutes: 45, priceCents: 25000 },
  { name: "Physiotherapy Consultation", durationMinutes: 30, priceCents: 8900 },
  { name: "Geriatrics Consultation", durationMinutes: 30, priceCents: 16000 },
  { name: "Dermatology Consultation", durationMinutes: 15, priceCents: 10000 },
  { name: "Immunoallergology Consultation", durationMinutes: 15, priceCents: 15000 },
  { name: "Pneumology Consultation", durationMinutes: 15, priceCents: 15000 },
] as const;

const wixGeneralServices = [
  { name: "Medical Consultation", durationMinutes: 15, priceCents: 4500 },
  { name: "Pain Management Consultation", durationMinutes: 15, priceCents: 4500 },
  { name: "Travel Consultation", durationMinutes: 15, priceCents: 5000 },
  { name: "Online Sexual Health & Sexology Consultation", durationMinutes: 15, priceCents: 4500 },
  { name: "Self Referral", durationMinutes: 15, priceCents: 4500 },
  { name: "Diabetes Consultation", durationMinutes: 15, priceCents: 4500 },
  { name: "Sick Leave", durationMinutes: 15, priceCents: 4500 },
  { name: "Paediatric Primary Care Consultation", durationMinutes: 15, priceCents: 4500 },
  { name: "General Practice / Family Medicine Consultation", durationMinutes: 20, priceCents: 6000 },
  { name: "Respiractory Infections", durationMinutes: 15, priceCents: 4500 },
  { name: "Hypertension Consultation", durationMinutes: 15, priceCents: 4500 },
  { name: "Driving License Medical Certificate", durationMinutes: 15, priceCents: 3500 },
  { name: "Treatment Refill", durationMinutes: 15, priceCents: 2900 },
  { name: "Weight Loss Consultation", durationMinutes: 15, priceCents: 4500 },
  { name: "Mental Health Assessment Consultation", durationMinutes: 20, priceCents: 6000 },
  { name: "Referral Consultation", durationMinutes: 15, priceCents: 4500 },
  { name: "Migraine Consultation", durationMinutes: 15, priceCents: 4500 },
  { name: "Aesthetic Medicine Online Consultation", durationMinutes: 15, priceCents: 6000 },
] as const;

const wixOnlinePrescriptionServices = [
  "Hair Loss Prescription",
  "Hay Fever Prescription",
  "Herpes Genital Prescription",
  "Asthma Prescription",
  "Premature Ejaculation Prescription",
  "Rosacea Prescription",
  "Psoriase Prescription",
  "Period Delay Prescription",
  "Thrush Prescription",
  "Acne Prescription",
  "Erectile Dysfunction Prescription",
  "Migraine Prescription",
  "Herpes Labial Prescription",
  "Vagynal Dryness Prescription",
  "Conjuntivite Prescription",
  "Eczema Prescription",
  "Contraception Prescription",
  "Bacterial Vaginosis Prescription",
  "Oral Thrush Prescription",
] as const;

const wixHealthTests = [
  { name: "General Health Blood Test", priceCents: 8400, summary: "Finger prick. Results in 2-3 working days after arrival in lab." },
  { name: "Thyroid Home Blood Test", priceCents: 3600, summary: "Finger prick. Results in 2-3 working days after arrival in lab." },
  { name: "AMH Test (Anti-Mullerian Hormone)", priceCents: 5500, summary: "Finger prick. Results in 2-3 working days after arrival in lab." },
  { name: "PSA Test (Prostatic Specific Antigen)", priceCents: 3600, summary: "Finger prick. Results in 2-3 working days after arrival in lab." },
  { name: "Vitamin B12 Blood Test", priceCents: 3500, summary: "Finger prick. Results in 2-3 working days after arrival in lab." },
  { name: "Nutrition and Lifestyle Home DNA Test", priceCents: 21900, summary: "Saliva sample. 3-4 weeks from receipt in lab." },
  { name: "Coeliac Disease Test", priceCents: 11000, summary: "Saliva sample. 1-2 weeks after sample arrives at lab." },
  { name: "Osentia Fracture Risk Assessment Test", priceCents: 9100, summary: "Fingernail or toenail clipping. 7 days from receipt." },
  { name: "Heart Health Home Test", priceCents: 3600, summary: "Finger prick. Results in 2-3 working days after arrival in lab." },
  { name: "Female Hormone Test", priceCents: 3600, summary: "Finger prick. Results in 2-3 working days after arrival in lab." },
  { name: "Male Hormone Test", priceCents: 3600, summary: "Finger prick. Results in 2-3 working days after arrival in lab." },
  { name: "Vitamin D Blood Test", priceCents: 3500, summary: "Finger prick. Results in 2-3 working days after arrival in lab." },
  { name: "Genetic Lactose Intolerance Test", priceCents: 11000, summary: "Saliva sample. 1-2 weeks after sample arrives at lab." },
  { name: "Gut Microbiome Test", priceCents: 21900, summary: "Stool sample. 4-6 weeks from receipt at lab." },
  { name: "Haemochromatosis Test", priceCents: 8400, summary: "Saliva sample. 1-2 weeks after sample arrives at lab." },
] as const;

const wixIrelandDoctors = [
  { fullName: "Dr Tiago Miguel Figueira", title: "Clinical Director", imc: "523449", languages: ["English", "Portuguese", "Spanish", "Czech", "French"] },
  { fullName: "Dr Grainne Ahern", title: "General Practitioner Doctor", imc: "408777", languages: ["English"] },
  { fullName: "Dr Saadia Irfan", title: "Medical Doctor", imc: "419347", languages: ["English", "Urdu", "Punjabi"] },
  { fullName: "Dr MariamFaiz", title: "Medical Doctor", imc: "429554", languages: ["English", "Urdu", "Punjabi"] },
  { fullName: "Dr Mirza Aun Muhammad", title: "Medical Doctor", imc: "429743", languages: ["English"] },
  { fullName: "Dr Yousif Mohamed", title: "Medical Doctor", imc: "424103", languages: ["English"] },
  { fullName: "Dr Muhammad Usman Yoosuf", title: "Medical Doctor", imc: "502797", languages: ["English", "Urdu", "Punjabi"] },
  { fullName: "Dr Fahad Farooq", title: "Neurologist Registrar", imc: "421252", languages: ["English", "Arabic", "Urdu", "Punjabi"] },
  { fullName: "Silvia Alexandra Raminhos Fernandes", title: "Nutritionist", imc: "0", languages: ["English", "Portuguese"] },
  { fullName: "Dr Ahmed Maklad", title: "Medical Doctor", imc: "523450", languages: ["English", "Arab", "Czech"] },
  { fullName: "Dr Emmanuel Dabup", title: "Consultant Psychiatrist", imc: "409877", languages: ["English"] },
  { fullName: "Dr Muhammad Mataro", title: "General Practitioner Doctor", imc: "425239", languages: ["English", "Arab", "Urdu", "Siraiki", "Sindhi"] },
  { fullName: "Dr Arooj Iqbal Lodhi", title: "Medical Doctor", imc: "434132", languages: ["English"] },
  { fullName: "Dr Mala Vili Rajan", title: "Medical Doctor", imc: "512862", languages: ["English"] },
  { fullName: "Dr Maristela Ferro Nepomuceno", title: "Psychologist", imc: "13655", languages: ["English", "Portuguese"] },
  { fullName: "Dr Andra Cristea", title: "Oncologist Registrar", imc: "508372", languages: ["English", "Romanian"] },
  { fullName: "Dr Raafat Ibrahim", title: "Paediatric Consultant", imc: "19801", languages: ["English"] },
  { fullName: "Dr Muhammad Tahir Arain", title: "Medical Doctor", imc: "509406", languages: ["English", "Arabic", "Urdu", "Punjabi", "Sindhi"] },
  { fullName: "Dr Mohammed Omar", title: "Consultant Cardiologist", imc: "412532", languages: ["English", "Arab"] },
  { fullName: "Dr Abdelrahman Mustafa", title: "Medical Doctor", imc: "431361", languages: ["English", "Arab"] },
  { fullName: "Dr Khoiamul Islam", title: "Medical Doctor", imc: "542074", languages: ["English", "Czech", "Urdu", "Hindi", "Bangla"] },
  { fullName: "Dr Raza Khan", title: "Medical Doctor", imc: "520164", languages: ["English", "Urdu", "Arabic", "Pashto", "Punjabi"] },
  { fullName: "Physiotherapeut Priscila Figueiredo", title: "Physiotherapist", imc: "0", languages: ["English", "Portuguese"] },
  { fullName: "Dr Fatima Ali", title: "Oncologist Registrar", imc: "505231", languages: ["English"] },
  { fullName: "Dr Mohamed Fadzly Mustafar", title: "Medical Doctor", imc: "505886", languages: ["English"] },
] as const;

const wixBlogPosts = [
  "SCIATICA: Understanding the Signs and how to manage",
  "Mounjaro vs Ozempic: differences, benefits, and when to use",
  "Omeprazole: Uses, Benefits, Side Effects, and When to Take It Safely",
  "Getting a GP Sick Note Online Simplified",
] as const;

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Seed country + CMS content captured from Wix homepage.
 */
async function importWixContent(): Promise<void> {
  const eur = await prisma.currency.create({
    data: { code: "EUR", symbol: "EUR", decimals: 2 },
  });

  const countries: CountrySeed[] = [
    {
      code: "ie",
      name: "Ireland",
      slug: "ireland",
      domain: "ie.myglobalhealth.online",
      defaultLocale: LocaleCode.EN,
      locales: [LocaleCode.EN, LocaleCode.PT, LocaleCode.ES],
    },
    {
      code: "pt",
      name: "Portugal",
      slug: "portugal",
      domain: "pt.myglobalhealth.online",
      defaultLocale: LocaleCode.PT,
      locales: [LocaleCode.PT, LocaleCode.EN],
    },
    {
      code: "sp",
      name: "Spain",
      slug: "spain",
      domain: "es.myglobalhealth.online",
      defaultLocale: LocaleCode.ES,
      locales: [LocaleCode.ES, LocaleCode.EN],
    },
    {
      code: "cz",
      name: "Czechia",
      slug: "czechia",
      domain: "cz.myglobalhealth.online",
      defaultLocale: LocaleCode.CS,
      locales: [LocaleCode.CS, LocaleCode.EN],
    },
    {
      code: "rm",
      name: "Romania",
      slug: "romania",
      domain: "ro.myglobalhealth.online",
      defaultLocale: LocaleCode.RO,
      locales: [LocaleCode.RO, LocaleCode.EN],
    },
  ];

  const countryByCode = new Map<string, { id: string; name: string; code: string }>();

  for (const c of countries) {
    const country = await prisma.country.create({
      data: {
        code: c.code,
        name: c.name,
        slug: c.slug,
        legacyHomePath: `/home-${c.code}`,
        teamPath: `/${c.slug}-team`,
        generalConsultationPath: `/general-consultation-${c.code}`,
        specialistConsultationPath: `/specialty-${c.code}`,
        defaultLocale: c.defaultLocale,
        currencyId: eur.id,
        isActive: true,
      },
    });

    await prisma.countryDomain.create({
      data: {
        countryId: country.id,
        domain: c.domain,
        isPrimary: true,
      },
    });

    await prisma.consultationSetting.create({
      data: {
        countryId: country.id,
        enableGeneral: true,
        enableSpecialist: true,
        defaultDurationMinutes: 20,
        leadTimeMinutes: 60,
      },
    });

    await prisma.bookingSetting.create({
      data: {
        countryId: country.id,
        bookingEnabled: true,
        requirePhone: true,
        requireDateOfBirth: true,
        timezone: "Europe/Dublin",
      },
    });

    for (const locale of c.locales) {
      await prisma.countryLocale.create({
        data: {
          countryId: country.id,
          locale,
          isDefault: locale === c.defaultLocale,
        },
      });
    }

    await prisma.service.createMany({
      data: [
        {
          countryId: country.id,
          kind: ServiceKind.GENERAL,
          slug: "general-consultation",
          name: "General Consultation",
          summary: "General online medical consultation with licensed doctors.",
          heroTitle: "Medical Consultations Wherever You Are",
          heroDescription: "Choose the country and connect with specialized doctors.",
          detailBody: "Browse and search for the type of consultation and fill out the form.",
          ctaLabel: "Start Your Online Consultation",
          currencyCode: "EUR",
          isActive: true,
        },
        {
          countryId: country.id,
          kind: ServiceKind.SPECIALIST,
          slug: "specialist-overview",
          name: "Specialist Consultation",
          summary: "Specialized doctor consultations online.",
          currencyCode: "EUR",
          isActive: true,
        },
      ],
    });

    countryByCode.set(c.code, { id: country.id, name: c.name, code: c.code });
  }

  const ireland = countryByCode.get("ie");
  if (ireland) {
    const specialtyBySlug = new Map<string, string>();

    for (const [index, specialty] of wixSpecialties.entries()) {
      const specialtySlug = toSlug(specialty.name.replace(/\s+consultation$/i, ""));
      const createdSpecialty = await prisma.specialty.create({
        data: {
          countryId: ireland.id,
          slug: specialtySlug,
          name: specialty.name.replace(/\s+consultation$/i, ""),
          cardSummary: `${specialty.durationMinutes} minutes`,
          sortOrder: index + 1,
          active: true,
        },
      });
      specialtyBySlug.set(specialtySlug, createdSpecialty.id);

      await prisma.service.create({
        data: {
          countryId: ireland.id,
          specialtyId: createdSpecialty.id,
          kind: ServiceKind.SPECIALIST,
          slug: toSlug(specialty.name),
          name: specialty.name,
          summary: `Specialist consultation in ${specialty.name.replace(/\s+consultation$/i, "")}.`,
          durationMinutes: specialty.durationMinutes,
          basePriceCents: specialty.priceCents,
          currencyCode: "EUR",
          isActive: true,
        },
      });

      await prisma.pricingPlan.create({
        data: {
          countryId: ireland.id,
          slug: `${toSlug(specialty.name)}-price`,
          name: specialty.name,
          description: `${specialty.durationMinutes} minutes`,
          priceCents: specialty.priceCents,
          currencyCode: "EUR",
          interval: "one_time",
          isActive: true,
        },
      });
    }

    for (const [index, service] of wixGeneralServices.entries()) {
      await prisma.service.create({
        data: {
          countryId: ireland.id,
          kind: ServiceKind.GENERAL,
          slug: toSlug(service.name),
          name: service.name,
          summary: "GP consultation service from Ireland general consultation page.",
          durationMinutes: service.durationMinutes,
          basePriceCents: service.priceCents,
          currencyCode: "EUR",
          sortOrder: index + 1,
          isActive: true,
        },
      });
    }

    for (const [index, prescription] of wixOnlinePrescriptionServices.entries()) {
      await prisma.service.create({
        data: {
          countryId: ireland.id,
          kind: ServiceKind.PRESCRIPTION,
          slug: toSlug(prescription),
          name: prescription,
          summary: "Available in Ireland only. 5 minutes.",
          durationMinutes: 5,
          basePriceCents: 2500,
          currencyCode: "EUR",
          sortOrder: index + 1,
          isActive: true,
        },
      });
    }

    for (const [index, test] of wixHealthTests.entries()) {
      await prisma.service.create({
        data: {
          countryId: ireland.id,
          kind: ServiceKind.HEALTH_TEST,
          slug: toSlug(test.name),
          name: test.name,
          summary: test.summary,
          basePriceCents: test.priceCents,
          currencyCode: "EUR",
          sortOrder: index + 1,
          isActive: true,
        },
      });
    }

    await prisma.pricingPlan.createMany({
      data: [
        ...wixOnlinePrescriptionServices.map((name) => ({
          countryId: ireland.id,
          slug: `${toSlug(name)}-price`,
          name,
          description: "5 minutes",
          priceCents: 2500,
          currencyCode: "EUR",
          interval: "one_time",
          isActive: true,
        })),
        ...wixHealthTests.map((test) => ({
          countryId: ireland.id,
          slug: `${toSlug(test.name)}-price`,
          name: test.name,
          description: test.summary,
          priceCents: test.priceCents,
          currencyCode: "EUR",
          interval: "one_time",
          isActive: true,
        })),
        {
          countryId: ireland.id,
          slug: "home-delivery-same-day-dublin-except-1-2-4-6-8-price",
          name: "Same Day Delivery (All Dublin except 1,2,4,6,8)",
          description: "Home delivery of prescriptions",
          priceCents: 1900,
          currencyCode: "EUR",
          interval: "one_time",
          isActive: true,
        },
        {
          countryId: ireland.id,
          slug: "home-delivery-same-day-dublin-1-2-4-6-8-price",
          name: "Same Day Delivery (Dublin 1,2,4,6,8)",
          description: "Home delivery of prescriptions",
          priceCents: 1500,
          currencyCode: "EUR",
          interval: "one_time",
          isActive: true,
        },
      ],
    });

    for (const doctor of wixIrelandDoctors) {
      const doctorSlug = toSlug(doctor.fullName);
      const createdDoctor = await prisma.doctor.create({
        data: {
          countryId: ireland.id,
          slug: doctorSlug,
          fullName: doctor.fullName,
          title: doctor.title,
          bio: `${doctor.title}. IMC registration: ${doctor.imc}.`,
          imcRegistration: doctor.imc,
          languages: doctor.languages,
          active: true,
        },
      });

      const mappedSpecialtySlug =
        doctor.title.toLowerCase().includes("psycho")
          ? "psychology"
          : doctor.title.toLowerCase().includes("neuro")
            ? "neurology"
            : doctor.title.toLowerCase().includes("onco")
              ? "oncology"
              : "cardiology";
      const specialtyId = specialtyBySlug.get(mappedSpecialtySlug);
      if (specialtyId) {
        await prisma.doctorSpecialty.create({
          data: {
            doctorId: createdDoctor.id,
            specialtyId,
          },
        });
      }

      await prisma.asset.create({
        data: {
          kind: "IMAGE",
          key: `doctor-${doctorSlug}-profile`,
          path: "/images/how-it-works/step-3.png",
          altText: `${doctor.fullName} profile image`,
          doctorId: createdDoctor.id,
          usageNote: "Doctor profile image",
          isActive: true,
        },
      });
    }
  }

  await prisma.blogPost.createMany({
    data: wixBlogPosts.map((title) => ({
      slug: toSlug(title),
      title,
      excerpt: "Imported from Global Health Wix blog feed.",
      body: title,
      status: PublishStatus.PUBLISHED,
      locale: LocaleCode.EN,
      category: "blog",
      authorDisplayName: "Global Health Team",
      seoTitle: title,
      seoDescription: "Imported from Global Health Wix blog feed.",
      publishedAt: new Date(),
      isActive: true,
    })),
  });

  await prisma.contentPage.createMany({
    data: [
      {
        pageKey: "global-home",
        title: "Global Health | Medical Clinic",
        body: [
          "Medical Consultations Wherever You Are",
          "Choose the country and connect with specialized doctors.",
          "",
          "How does it work?",
          "Simple Scheduling in 3 Steps",
          "1) Choose Your Location and Specialty",
          "Selecione o pais onde se encontra (Irlanda, Portugal, Republica Checa, Romenia ou Espanha).",
          "2) Choose the Type of Consultation",
          "Browse and search for the type of consultation and fill out the form.",
          "3) Sent to Your Email",
          "You will receive an email confirming the day and time of your consultation.",
          "",
          "Trusted by thousands of patients across Europe",
          "Your Health. Our Priority.",
          "4,9/5 average rating based on 2,000+ reviews",
          "",
          "Start Your Online Consultation",
          "Choose your country and connect with a licensed doctor in minutes",
          "100% online",
          "No waiting rooms",
          "Confidential",
          "Licensed Doctors",
          "Secure & Confidential",
          "All Consultations are provided by qualified and registered doctors in your country",
          "Your Personal Data is protected under strict GDPR standards.",
          "Fast Access",
          "Book in minutes and get the care you need, when you need it.",
          "Available across Europe",
          "Proudly serving patients in multiple EU countries with trusted healthcare.",
        ].join("\n"),
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        seoTitle: "Global Health | Medical Clinic | Online Doctor",
        seoDescription: "Medical consultations wherever you are. Choose your country and connect with specialized doctors.",
        isActive: true,
      },
      {
        pageKey: "global-legal-footer",
        title: "Legal & Information",
        body: [
          "Legal Notices",
          "Terms and Conditions",
          "Cookies Policy",
          "Refund and Return Policy",
          "Privacy Policy",
          "In case of a dispute, the consumer can resort to an Alternative Dispute Resolution Entity for Consumer Disputes.",
          "globalhealth@myglobalhealth.online",
        ].join("\n"),
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        isActive: true,
      },
      {
        pageKey: "about-us",
        title: "About Us",
        body: "Country team links: Ireland Team, Portugal Team, Romania Team, Czechia Team, Spain Team.",
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        isActive: true,
      },
      {
        pageKey: "careers",
        title: "Careers",
        body: "Careers page link from navigation and footer.",
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        isActive: true,
      },
      {
        pageKey: "blog",
        title: "Blog",
        body: wixBlogPosts.join("\n"),
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        isActive: true,
      },
      {
        pageKey: "faq",
        title: "FAQ",
        body: "FAQ page link from navigation and footer.",
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        isActive: true,
      },
      {
        pageKey: "egift-card",
        title: "eGift Card",
        body: "eGift Card page link from top navigation.",
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        isActive: true,
      },
      {
        pageKey: "how-it-works",
        title: "How it works",
        body: "Simple Scheduling in 3 Steps: choose location and specialty, choose consultation type, receive email confirmation.",
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        isActive: true,
      },
      {
        pageKey: "contact-us",
        title: "Contact us",
        body: "globalhealth@myglobalhealth.online",
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        isActive: true,
      },
      {
        pageKey: "legal-notices",
        title: "Legal Notices",
        body: "Legal notices page from footer legal links.",
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        isActive: true,
      },
      {
        pageKey: "terms-and-conditions",
        title: "Terms and Conditions",
        body: "Terms and conditions page from footer legal links.",
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        isActive: true,
      },
      {
        pageKey: "cookies-policy",
        title: "Cookies Policy",
        body: "Cookies policy page from footer legal links.",
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        isActive: true,
      },
      {
        pageKey: "refund-and-return-policy",
        title: "Refund and Return Policy",
        body: "Refund and return policy page from footer legal links.",
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        isActive: true,
      },
      {
        pageKey: "privacy-policy",
        title: "Privacy Policy",
        body: "Privacy policy page from footer legal links.",
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        isActive: true,
      },
      {
        pageKey: "gdpr-compliance",
        title: "GDPR compliance",
        body: "GDPR compliance information section from footer.",
        locale: LocaleCode.EN,
        status: PublishStatus.PUBLISHED,
        isActive: true,
      },
    ],
  });

  const irelandForPages = countryByCode.get("ie");
  if (irelandForPages) {
    await prisma.contentPage.createMany({
      data: [
        {
          countryId: irelandForPages.id,
          pageKey: "online-prescriptions",
          title: "Ireland Online Prescriptions",
          body: "Available in Ireland only. Choose your prescription type, complete booking form and payment, then pick up at your chosen pharmacy.",
          locale: LocaleCode.EN,
          status: PublishStatus.PUBLISHED,
          isActive: true,
        },
        {
          countryId: irelandForPages.id,
          pageKey: "home-delivery",
          title: "Ireland Home Delivery",
          body: "Home Delivery of Prescriptions (Dublin only). Same-day delivery for bookings between 9:00 AM and 5:00 PM. Pricing: EUR19 (all Dublin except Dublin 1,2,4,6,8) and EUR15 (Dublin 1,2,4,6,8).",
          locale: LocaleCode.EN,
          status: PublishStatus.PUBLISHED,
          isActive: true,
        },
        {
          countryId: irelandForPages.id,
          pageKey: "plans-pricing",
          title: "Ireland Plans & Pricing",
          body: "Pricing shown across Ireland service cards (general, specialist, online prescription, health tests, home delivery).",
          locale: LocaleCode.EN,
          status: PublishStatus.PUBLISHED,
          isActive: true,
        },
        {
          countryId: irelandForPages.id,
          pageKey: "health-tests",
          title: "Ireland Health Tests",
          body: "Available in Ireland only. Sample collection -> send to lab -> get results. Includes General Health Blood Test, Thyroid Home Blood Test, AMH Test, PSA Test, Vitamin B12, DNA tests, Gut Microbiome, Heart Health, Female and Male Hormone tests.",
          locale: LocaleCode.EN,
          status: PublishStatus.PUBLISHED,
          isActive: true,
        },
        {
          countryId: irelandForPages.id,
          pageKey: "partner-clinics",
          title: "Ireland Partner Clinics",
          body: "Partner Pharmacy",
          locale: LocaleCode.EN,
          status: PublishStatus.PUBLISHED,
          isActive: true,
        },
      ],
    });
  }
}

/**
 * Script entrypoint.
 */
async function main(): Promise<void> {
  await wipeContentData();
  await importWixContent();
  console.log("[wipe-and-import-wix] complete");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error("[wipe-and-import-wix] failed", error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });

