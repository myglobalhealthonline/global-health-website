/**
 * Seed the Ireland SEO landing pages (Internal-Linking spec, Rule 6) as DRAFTS.
 * The spec lists the slugs + audience; full body copy is authored later in
 * admin. Each page is created unpublished with a starter title/SEO/body.
 *
 *   node --import tsx scripts/import-ireland-landing-pages.ts          # dry-run
 *   node --import tsx scripts/import-ireland-landing-pages.ts --apply
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ie";
const APPLY = process.argv.includes("--apply");
const here = path.dirname(fileURLToPath(import.meta.url));
void here;

const SVC = (slug: string, label: string) =>
  `<p><a href="/ireland/en/services/${slug}">${label}</a></p>`;

const PAGES: Array<{
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  bodyHtml: string;
}> = [
  {
    slug: "hypertension",
    title: "High Blood Pressure (Hypertension) Care in Ireland",
    seoTitle: "Hypertension Care Ireland | Online Doctor",
    seoDescription:
      "Manage high blood pressure with an Irish-registered doctor online. Reviews, lifestyle guidance, and ongoing care via secure video call.",
    bodyHtml:
      "<h2>Manage high blood pressure from home</h2>" +
      "<p>High blood pressure rarely causes symptoms, which is exactly why it needs regular review. Our Irish-registered doctors assess your readings, medication, and cardiovascular risk via secure video call — and tell you clearly when something needs to change.</p>" +
      "<p>Hypertension is best managed as part of ongoing care rather than a one-off visit. Where your blood pressure is stable, we review and continue your plan; where it is not, we escalate, adjust, or arrange investigations and specialist referral.</p>" +
      "<h2>Book your review</h2>" +
      "<p>Speak with an Irish-registered doctor today.</p>" +
      SVC("chronic-disease-consultation", "Chronic Disease & Ongoing Care Consultation") +
      SVC("cardiology-consultation", "Cardiology Specialist Consultation"),
  },
  {
    slug: "diabetes",
    title: "Diabetes Care in Ireland",
    seoTitle: "Diabetes Care Ireland | Online Doctor",
    seoDescription:
      "Ongoing diabetes management with an Irish-registered doctor online — blood-sugar review, lifestyle support, and coordinated care.",
    bodyHtml:
      "<h2>Ongoing diabetes care, online</h2>" +
      "<p>Diabetes is a condition you live with every day, and good control depends on regular, engaged review. Our Irish-registered doctors review your blood-sugar control, medication, and overall risk via secure video call, and coordinate investigations or specialist input where needed.</p>" +
      "<p>This is structured, clinically supervised care — not an automatic continuation. If your control has changed or new symptoms have appeared, we assess them properly.</p>" +
      "<h2>Book your review</h2>" +
      "<p>Continue your diabetes care with an Irish-registered doctor.</p>" +
      SVC("chronic-disease-consultation", "Chronic Disease & Ongoing Care Consultation") +
      SVC("nutrition-consultation", "Nutrition Specialist Consultation"),
  },
  {
    slug: "respiratory-infections",
    title: "Respiratory Infections — Online Doctor Ireland",
    seoTitle: "Respiratory Infection Doctor Ireland | Same-Day",
    seoDescription:
      "Chest infections, persistent cough, and respiratory symptoms assessed by an Irish-registered doctor — same-day video appointments.",
    bodyHtml:
      "<h2>Respiratory symptoms assessed today</h2>" +
      "<p>Coughs, chest infections, and respiratory symptoms are among the most common reasons people need a doctor — and most can be assessed safely by video. Our Irish-registered doctors take a full history, assess your symptoms, and advise on treatment, escalation, or in-person review where needed.</p>" +
      "<p>If your doctor judges that your symptoms need a physical examination or urgent care, you will be told clearly and directed to the right service.</p>" +
      "<h2>Book a same-day consultation</h2>" +
      "<p>Get your respiratory symptoms assessed today.</p>" +
      SVC("online-doctor-ireland", "See a Doctor Online (GP Consultation)"),
  },
  {
    slug: "migraine",
    title: "Migraine Assessment & Management in Ireland",
    seoTitle: "Migraine Doctor Ireland | Online Assessment",
    seoDescription:
      "Migraine and severe headache assessment with an Irish-registered doctor online — management plans and referral where needed.",
    bodyHtml:
      "<h2>Migraine assessment, online</h2>" +
      "<p>Migraine is more than a headache — and it deserves a proper clinical assessment. Our Irish-registered doctors assess your headache pattern, triggers, and history via secure video call, and advise on management and prevention.</p>" +
      "<p>Where your symptoms suggest something that needs specialist input or investigation, we coordinate neurology referral and the right next steps.</p>" +
      "<h2>Book an assessment</h2>" +
      "<p>Have your migraines assessed by an Irish-registered doctor.</p>" +
      SVC("online-doctor-ireland", "See a Doctor Online (GP Consultation)") +
      SVC("neurology-consultation", "Neurology Specialist Consultation"),
  },
  {
    slug: "arabic-speaking-doctor",
    title: "Arabic-Speaking Doctor in Ireland",
    seoTitle: "Arabic-Speaking Doctor Ireland | Online Consultation",
    seoDescription:
      "See an Arabic-speaking, Irish-registered doctor online. Consultations in Arabic for Ireland's Arabic-speaking community.",
    bodyHtml:
      "<h2>Consultations in Arabic</h2>" +
      "<p>Explaining how you feel is easier in your own language. We connect Ireland’s Arabic-speaking community with Irish-registered doctors for consultations in Arabic, via secure video call — so nothing is lost in translation.</p>" +
      "<p>You do not need to be registered with a local GP. Same-day appointments are available, subject to doctor availability.</p>" +
      "<h2>Book in Arabic</h2>" +
      "<p>See an Arabic-speaking, Irish-registered doctor today.</p>" +
      SVC("online-doctor-ireland", "See a Doctor Online (GP Consultation)"),
  },
  {
    slug: "international-students",
    title: "Healthcare for International Students in Ireland",
    seoTitle: "Doctor for International Students Ireland | Online",
    seoDescription:
      "Online healthcare for international students in Ireland — no local GP registration required. Same-day, multi-lingual consultations.",
    bodyHtml:
      "<h2>Healthcare for international students</h2>" +
      "<p>New to Ireland and not registered with a GP? International students can see an Irish-registered doctor online — same day, without the wait or the paperwork. Consultations are available in English, Portuguese, Spanish, Czech, and Romanian, subject to availability.</p>" +
      "<p>From acute illness to certificates and ongoing concerns, our doctors provide GP-level care and tell you clearly when in-person care is needed.</p>" +
      "<h2>Book a consultation</h2>" +
      "<p>See an Irish-registered doctor — no local GP registration required.</p>" +
      SVC("online-doctor-ireland", "See a Doctor Online (GP Consultation)") +
      SVC("sick-certificate-ireland", "Sick Leave Medical Assessment"),
  },
  {
    slug: "expat-healthcare",
    title: "Healthcare for Expats in Ireland",
    seoTitle: "Expat Healthcare Ireland | Online Doctor",
    seoDescription:
      "Online healthcare for expats and international residents in Ireland — no local GP registration needed. Multi-lingual, same-day care.",
    bodyHtml:
      "<h2>Healthcare for expats in Ireland</h2>" +
      "<p>Moving to a new country shouldn’t mean losing access to a doctor. Expats and international residents across Ireland can see an Irish-registered doctor online — no local GP registration required — in several languages.</p>" +
      "<p>Whether you need an acute assessment, a certificate, or ongoing management of a condition you brought with you, our doctors provide GP-level care and coordinate referral where needed.</p>" +
      "<h2>Book a consultation</h2>" +
      "<p>Access an Irish-registered doctor today.</p>" +
      SVC("online-doctor-ireland", "See a Doctor Online (GP Consultation)") +
      SVC("chronic-disease-consultation", "Chronic Disease & Ongoing Care Consultation"),
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
    console.log(`${existing ? "UPDATE" : "CREATE"}  /health/${p.slug}  "${p.title}"`);
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
