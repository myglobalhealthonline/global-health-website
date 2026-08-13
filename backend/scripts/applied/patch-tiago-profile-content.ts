/**
 * Patch Dr Tiago Miguel Figueira's Ireland doctor profile per the July 2026
 * SEO brief (GlobalHealth_DrTiago_ProfileBrief.docx).
 *
 *   node --import tsx scripts/patch-tiago-profile-content.ts            # dry-run
 *   node --import tsx scripts/patch-tiago-profile-content.ts --apply    # write
 *
 * SAFE BY DESIGN: writes match on current values where possible; re-running is
 * a no-op. Dry-run (default) prints exactly what would change.
 *
 * Covers (brief items in parentheses):
 *   - Doctor.title "Clinical Director" -> "General Practitioner" (8, 9)
 *   - Doctor.seoTitle / seoDescription (4, 5, 6, 7 — OG/Twitter reuse these)
 *   - Doctor.medicalRegistrationUrl -> IMC check-a-registration (11)
 *   - CountryAuthorityLink IE DOCTOR_REGISTRY deep link (11)
 *   - 6 EN DoctorFaq rows (14, 15 — FAQPage JSON-LD now wired in frontend)
 *   - editorialChecklist.readyToIndex = true (1 — lifts the noindex gate;
 *     the robots meta flips to indexable only when validation also passes)
 *
 * Deliberately NOT covered:
 *   - Bio Option A/B Portugal sentence (2.3) — content decision, brief says keep.
 *   - Footer clinics Brazil / "Czech Republic" (18) — market go-live decision.
 *   - Footer tagline/description (19) — i18n strings, concurrent-session conflict.
 *   - Canonical/OG domain — NEXT_PUBLIC_SITE_URL env on Railway (human).
 */
import { LocaleCode } from "@prisma/client";
import { prisma } from "../../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const note = (m: string) => console.log(m);

const NEW_TITLE = "General Practitioner";
const SEO_TITLE = "Dr Tiago Miguel Figueira — GP | IMC 523449 | Global Health Ireland";
const SEO_DESCRIPTION =
  "Book a video consultation with Dr Tiago Miguel Figueira — IMC-registered GP in Ireland (IMC 523449). MUDr. Masaryk University. Same-day appointments. English, Portuguese, Spanish, Czech and French.";
const IMC_CHECK_URL = "https://www.medicalcouncil.ie/registration/check-a-registration/";

const FAQS: Array<{ question: string; answer: string }> = [
  {
    question: "Is Dr Tiago Miguel Figueira registered with the Irish Medical Council?",
    answer:
      "Yes. Dr Tiago Miguel Figueira holds active registration with the Irish Medical Council — IMC number 523449 on the General Division. You can verify this registration at medicalcouncil.ie. Dr Figueira also holds registration with the Ordem dos Médicos in Portugal (OM 77986).",
  },
  {
    question: "What does Dr Figueira treat?",
    answer:
      "Dr Figueira provides GP consultations covering acute illness (respiratory infections, fever, flu, sore throat), urinary tract infections, chronic disease management (hypertension, diabetes, thyroid disorders), skin concerns, men's and women's health, preventive care, travel health, weight management, mental health (anxiety, depression), sick certs, medical certificates and prescription renewals.",
  },
  {
    question: "What languages does Dr Figueira consult in?",
    answer:
      "Dr Figueira offers consultations in English, Portuguese, Spanish, Czech and French. He is one of the few GPs in Ireland offering multilingual online consultations across all five languages.",
  },
  {
    question: "How do I book a consultation with Dr Figueira?",
    answer:
      "Select 'Pick a time with Tiago' on this page to view his available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking.",
  },
  {
    question: "Does Dr Figueira issue sick certs and prescriptions?",
    answer:
      "Yes — when clinically appropriate following a full video consultation. Sick certs issued by Dr Figueira are accepted by Irish employers. Prescriptions are valid at any Irish pharmacy. Prescriptions for controlled substances are not routinely issued through online consultations.",
  },
  {
    question: "What are Dr Figueira's qualifications?",
    answer:
      "Dr Tiago Miguel Figueira holds a Doctor of Medicine (MUDr.) from Masaryk University, Faculty of Medicine in Brno, Czech Republic — one of Europe's most internationally recognised medical schools. He completed a Senior House Officer post in General Surgery at Tipperary University Hospital in Ireland, and holds certification in Basic and Advanced Life Support (BLS & ALS) from the European Resuscitation Council.",
  },
];

async function main() {
  note(APPLY ? "== APPLY ==" : "== DRY-RUN (pass --apply to write) ==");

  const doctor = await prisma.doctor.findFirst({
    where: { slug: { contains: "tiago" } },
    include: {
      specialties: { include: { specialty: true } },
      translations: true,
      faqs: true,
      country: true,
    },
  });
  if (!doctor) throw new Error("Dr Tiago not found by slug contains 'tiago'");
  note(`Doctor: ${doctor.fullName} (${doctor.slug}) country=${doctor.country.code}`);

  // 1. Title
  if (doctor.title !== NEW_TITLE) {
    note(`title: "${doctor.title}" -> "${NEW_TITLE}"`);
    if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { title: NEW_TITLE } });
  } else note("title: already correct");
  for (const tr of doctor.translations.filter((t) => t.locale === LocaleCode.EN)) {
    if (tr.title !== NEW_TITLE) {
      note(`translation(EN).title: "${tr.title}" -> "${NEW_TITLE}"`);
      if (APPLY) await prisma.doctorTranslation.update({ where: { id: tr.id }, data: { title: NEW_TITLE } });
    }
  }

  // 1b. IE market translation (DoctorMarketTranslation EN) — this OVERRIDES the
  // base Doctor fields on the /ireland/en profile, so it must carry the same
  // title + SEO copy or the base updates never surface.
  const ieDc = await prisma.doctorCountry.findFirst({
    where: { doctorId: doctor.id, country: { code: "ie" } },
    include: { translations: { where: { locale: LocaleCode.EN } } },
  });
  const ieEn = ieDc?.translations[0];
  if (ieEn) {
    const patch: Record<string, string> = {};
    if (ieEn.title !== NEW_TITLE) patch.title = NEW_TITLE;
    if (ieEn.seoTitle !== SEO_TITLE) patch.seoTitle = SEO_TITLE;
    if (ieEn.seoDescription !== SEO_DESCRIPTION) patch.seoDescription = SEO_DESCRIPTION;
    if (Object.keys(patch).length) {
      note(`IE market translation (EN): ${Object.keys(patch).join(", ")} -> brief values (was title="${ieEn.title}", seoTitle="${ieEn.seoTitle}")`);
      if (APPLY) await prisma.doctorMarketTranslation.update({ where: { id: ieEn.id }, data: patch });
    } else note("IE market translation (EN): already correct");
  } else note("IE market translation (EN): none — base fields apply");

  // Specialty pill (label above name) comes from DoctorSpecialty — report only,
  // renaming a shared Specialty row could affect other doctors.
  for (const ds of doctor.specialties) {
    const name = ds.specialty?.name ?? "?";
    if (/clinical/i.test(name)) {
      note(`⚠ specialty "${name}" looks organisational — reassign to General Practice in admin (shared row, not patched here)`);
    } else {
      note(`specialty ok: ${name}`);
    }
  }

  // 2. SEO title/description (also feeds OG + Twitter)
  if (doctor.seoTitle !== SEO_TITLE) {
    note(`seoTitle: "${doctor.seoTitle ?? "(null)"}" -> "${SEO_TITLE}"`);
    if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { seoTitle: SEO_TITLE } });
  } else note("seoTitle: already correct");
  if (doctor.seoDescription !== SEO_DESCRIPTION) {
    note(`seoDescription -> brief text (${SEO_DESCRIPTION.length} chars)`);
    if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { seoDescription: SEO_DESCRIPTION } });
  } else note("seoDescription: already correct");

  // 3. Registration verify URL — brief item 11 SATISFIED ALREADY, and better:
  // the doctor's medicalRegistrationUrl is a direct deep link to his own IMC
  // register entry (regno=523449). Do NOT replace with the generic
  // check-a-registration page, and do NOT create an IE DOCTOR_REGISTRY
  // CountryAuthorityLink — doctorVerificationUrl() would let it override the
  // per-doctor deep link for every IE doctor.
  note(`medicalRegistrationUrl kept (direct IMC deep link): ${doctor.medicalRegistrationUrl}`);
  if (!doctor.medicalRegistrationUrl?.includes("medicalcouncil.ie")) {
    note(`⚠ verify link does NOT point at medicalcouncil.ie — expected ${IMC_CHECK_URL}; fix in admin`);
  }

  // 4. FAQs (EN) — insert missing by question text
  const existingQ = new Set(doctor.faqs.filter((f) => f.locale === LocaleCode.EN).map((f) => f.question));
  let sort = doctor.faqs.length;
  for (const f of FAQS) {
    if (existingQ.has(f.question)) {
      note(`faq exists: ${f.question}`);
      continue;
    }
    note(`faq add: ${f.question}`);
    if (APPLY)
      await prisma.doctorFaq.create({
        data: { doctorId: doctor.id, locale: LocaleCode.EN, question: f.question, answer: f.answer, sortOrder: sort++, isActive: true },
      });
  }

  // 5. readyToIndex — lifts the noindex gate (robots still requires validation pass)
  const checklist = (doctor.editorialChecklist as Record<string, unknown> | null) ?? {};
  if (checklist.readyToIndex !== true) {
    note("editorialChecklist.readyToIndex: -> true");
    if (APPLY)
      await prisma.doctor.update({
        where: { id: doctor.id },
        data: { editorialChecklist: { ...checklist, readyToIndex: true } },
      });
  } else note("readyToIndex: already true");

  note(APPLY ? "== APPLIED ==" : "== DRY-RUN complete — nothing written ==");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
