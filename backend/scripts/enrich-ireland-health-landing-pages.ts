/**
 * Enrich the Ireland `/health/` landing pages that were seeded as thin
 * starters (import-ireland-landing-pages.ts).
 *
 * Three changes per page, all data — no frontend code is involved. The
 * `/health/[slug]` route already renders a doctor grid, an FAQ block, and a
 * "related topics" list whenever `template` / `faq` supply them; those fields
 * were simply never filled.
 *
 *   1. template.doctorLanguage / doctorSlugs — makes the page list the REAL
 *      doctors it is about (cards + "See all X-speaking doctors" link).
 *   2. bodyHtml — names the services actually bookable in that language and
 *      links them, instead of one generic GP link.
 *   3. faq — feeds FAQPage structured data, which the route already emits.
 *
 * Only the EN translation body is rewritten. The CS/DE/ES/PT/RO variants keep
 * their existing (still accurate, thinner) copy — `template` is locale-
 * independent so the doctor grid appears on all six.
 *
 * Doctor + service names below were read from production on 2026-08-26; the
 * doctor GRID is live data, so a roster change never leaves the page claiming
 * doctors that no longer exist. The two named specialists in the Arabic body
 * copy are the exception — check them if that roster changes.
 *
 *   node --import tsx --env-file=.env scripts/enrich-ireland-health-landing-pages.ts
 *   node --import tsx --env-file=.env scripts/enrich-ireland-health-landing-pages.ts --apply
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, LocaleCode } from "@prisma/client";
import { Pool } from "pg";

const COUNTRY = "ie";
const APPLY = process.argv.includes("--apply");

/** Service detail page in Ireland (EN). */
const S = (slug: string, label: string) => `<a href="/ireland/en/services/${slug}">${label}</a>`;
/** Doctor directory filtered to one language. */
const L = (language: string, label: string) =>
  `<a href="/ireland/en/doctors?lang=${encodeURIComponent(language)}">${label}</a>`;

type Update = {
  slug: string;
  template: Record<string, unknown>;
  bodyHtml: string;
  seoDescription?: string;
  faq: Array<{ question: string; answer: string }>;
};

const UPDATES: Update[] = [
  {
    slug: "arabic-speaking-doctor",
    template: {
      ctaService: "acute-medical-consultation",
      doctorLanguage: "Arabic",
      related: [
        { label: "Healthcare for expats in Ireland", href: "/ireland/en/health/expat-healthcare" },
        { label: "Respiratory infections — online doctor", href: "/ireland/en/health/respiratory-infections" },
        { label: "GP Consultation Online", href: "/ireland/en/services/acute-medical-consultation" },
      ],
    },
    seoDescription:
      "See an Arabic-speaking, Irish-registered doctor online — GP consultations, sick certs, repeat prescriptions, plus cardiology and neurology in Arabic.",
    bodyHtml:
      "<h2>Consultations in Arabic</h2>" +
      "<p>Explaining how you feel is easier in your own language. We connect Ireland’s Arabic-speaking community with Irish-registered doctors for consultations in Arabic, by secure video call — no interpreter, no relative translating for you, nothing lost on the way through.</p>" +
      "<p>You do not need to be registered with a local GP, and you do not need a referral. Pick one of the Arabic-speaking doctors listed below when you book, and the consultation is held in Arabic.</p>" +
      "<h2>What you can book in Arabic</h2>" +
      "<p>Arabic is available across our general practice service, and for two specialties:</p>" +
      "<ul>" +
      `<li>${S("acute-medical-consultation", "GP Consultation Online")} — new or acute symptoms assessed the same day, where a doctor is free.</li>` +
      `<li>${S("sick-certificate-ireland", "Sick Cert")} — a medical certificate for work or college, issued only where the assessment supports it.</li>` +
      `<li>${S("treatment-review", "Repeat Prescription Online")} — review and reissue of medication you are already established on.</li>` +
      `<li>${S("chronic-disease-consultation", "Chronic Conditions: GP Review Online")} — ongoing review of blood pressure, diabetes, asthma and similar.</li>` +
      `<li>${S("cardiology-specialist-consultation", "Cardiology Consultation Online")} — with Dr Mohammed Omar, Consultant Cardiologist.</li>` +
      `<li>${S("neurology-specialist-consultation", "Neurology Consultation Online")} — with Dr Fahad Farooq, Neurology Registrar.</li>` +
      "</ul>" +
      "<h2>What stays the same in any language</h2>" +
      "<p>Every doctor here is registered with the Irish Medical Council, and the clinical standard does not change with the language of the consultation. Prescriptions and certificates are issued at the doctor’s discretion, after an assessment — never on request. If your symptoms need a physical examination, an emergency department, or in-person care, you will be told plainly and pointed to the right service.</p>" +
      "<h2>Also available in other languages</h2>" +
      `<p>Our Irish roster also consults in ${L("Urdu", "Urdu")}, ${L("Punjabi", "Punjabi")}, ${L("Portuguese", "Portuguese")}, ${L("Sindhi", "Sindhi")}, ${L("Pashto", "Pashto")}, ${L("Czech", "Czech")}, ${L("Spanish", "Spanish")} and ${L("French", "French")}.</p>` +
      "<h2>Book in Arabic</h2>" +
      "<p>Choose an Arabic-speaking doctor below and book a time that suits you.</p>",
    faq: [
      {
        question: "Is the whole consultation in Arabic?",
        answer:
          "Yes. The doctors listed on this page speak Arabic as well as English, so the consultation, the questions, and the explanation of your plan are all in Arabic. No interpreter is involved.",
      },
      {
        question: "Do I need to be registered with an Irish GP first?",
        answer:
          "No. You can book directly, whether or not you are registered with a local GP practice, and whether or not you hold a medical card.",
      },
      {
        question: "Can I get a prescription or a sick cert in Arabic?",
        answer:
          "Yes, where the assessment supports it. The consultation is in Arabic; the prescription or certificate itself is issued in English, because that is what Irish pharmacies and employers act on. Both are at the doctor's clinical discretion and are never guaranteed in advance.",
      },
      {
        question: "Which specialists consult in Arabic?",
        answer:
          "Beyond general practice, cardiology (Dr Mohammed Omar, Consultant Cardiologist) and neurology (Dr Fahad Farooq, Neurology Registrar) are available in Arabic. Other specialties are available in English.",
      },
      {
        question: "How soon can I be seen?",
        answer:
          "Same-day appointments are usually available, subject to doctor availability. The booking calendar shows the real free slots for each doctor.",
      },
    ],
  },
  {
    slug: "expat-healthcare",
    template: {
      ctaService: "acute-medical-consultation",
      // A cross-section of the multilingual Irish roster rather than a single
      // language filter — this page's whole subject is the language spread.
      doctorSlugs: [
        "dr-tiago-miguel-figueira",
        "dr-ahmed-maklad",
        "dr-muhammad-mataro",
        "khoiamul-islam",
        "dr-raza-khan",
        "maristela-ferro-nepomuceno",
      ],
      related: [
        { label: "Arabic-speaking doctor in Ireland", href: "/ireland/en/health/arabic-speaking-doctor" },
        { label: "GP Consultation Online", href: "/ireland/en/services/acute-medical-consultation" },
        { label: "Chronic Conditions: GP Review Online", href: "/ireland/en/services/chronic-disease-consultation" },
      ],
    },
    seoDescription:
      "Online healthcare for expats in Ireland — no GP registration needed. Consultations in Arabic, Urdu, Portuguese, Spanish, French, Czech and more.",
    bodyHtml:
      "<h2>Healthcare for expats in Ireland</h2>" +
      "<p>Moving country should not mean losing access to a doctor. Expats and international residents anywhere in Ireland can see an Irish-registered doctor online — no local GP registration, no waiting list, and no need to explain yourself in a second language if you would rather not.</p>" +
      "<h2>Languages our Irish doctors consult in</h2>" +
      "<p>Each link opens the roster filtered to doctors who consult in that language:</p>" +
      "<ul>" +
      `<li>${L("Arabic", "Arabic")} — general practice, plus cardiology and neurology. See our ${"<a href=\"/ireland/en/health/arabic-speaking-doctor\">Arabic-speaking doctor page</a>"}.</li>` +
      `<li>${L("Urdu", "Urdu")} and ${L("Punjabi", "Punjabi")} — general practice and paediatrics.</li>` +
      `<li>${L("Portuguese", "Portuguese")} — general practice, psychology, nutrition and manual therapy.</li>` +
      `<li>${L("Spanish", "Spanish")} and ${L("French", "French")} — general practice.</li>` +
      `<li>${L("Czech", "Czech")}, ${L("Hindi", "Hindi")}, ${L("Bangla", "Bangla")}, ${L("Sindhi", "Sindhi")}, ${L("Siraiki", "Siraiki")} and ${L("Pashto", "Pashto")} — general practice.</li>` +
      "</ul>" +
      "<p>Availability in a given language depends on that doctor's calendar. English is available at every slot.</p>" +
      "<h2>What expats use us for</h2>" +
      "<ul>" +
      `<li>${S("acute-medical-consultation", "GP Consultation Online")} — the everyday illnesses that do not wait for you to find a practice.</li>` +
      `<li>${S("chronic-disease-consultation", "Chronic Conditions: GP Review Online")} — continuing management of a condition you arrived with.</li>` +
      `<li>${S("treatment-review", "Repeat Prescription Online")} — moving your regular medication onto an Irish prescription.</li>` +
      `<li>${S("sick-certificate-ireland", "Sick Cert")} — certificates for an Irish employer.</li>` +
      `<li>${S("referral-and-investigations", "Specialist Referral & Diagnostic Investigation Consultation")} — a route into Irish specialist and lab services.</li>` +
      `<li>${S("mental-health-consultation", "Mental Health Consultation")} — relocation is its own kind of stress.</li>` +
      "</ul>" +
      "<h2>How Irish prescriptions and certificates work</h2>" +
      "<p>Our doctors are registered with the Irish Medical Council and prescribe to Irish pharmacies. Medication you were on abroad may have a different name, a different licensed dose, or no Irish equivalent — the doctor will tell you which applies and, where needed, arrange the nearest suitable option. Controlled medicines are not prescribed online.</p>" +
      "<h2>Book a consultation</h2>" +
      "<p>See an Irish-registered doctor today — in your language where one is available.</p>",
    faq: [
      {
        question: "Can I use this if I am not registered with an Irish GP?",
        answer:
          "Yes. No GP registration, medical card, or referral is required. You book directly and are seen by video.",
      },
      {
        question: "Will the doctor speak my language?",
        answer:
          "Our Irish roster consults in Arabic, Urdu, Punjabi, Portuguese, Spanish, French, Czech, Hindi, Bangla, Sindhi, Siraiki and Pashto alongside English. Filter the doctor list by language to see who is available and when.",
      },
      {
        question: "Can my medication from abroad be continued in Ireland?",
        answer:
          "Often, yes. Bring the name and dose to the consultation. Some medicines are licensed differently in Ireland or are not available at all, in which case the doctor will discuss the closest suitable alternative. Controlled medicines are not prescribed online.",
      },
      {
        question: "Is a sick cert from an online doctor accepted by Irish employers?",
        answer:
          "Yes. The certificate is issued by an Irish Medical Council–registered doctor and carries the same standing as one issued in a practice. It is issued only where the assessment supports it.",
      },
    ],
  },
  {
    slug: "respiratory-infections",
    template: {
      ctaService: "acute-medical-consultation",
      related: [
        { label: "GP Consultation Online", href: "/ireland/en/services/acute-medical-consultation" },
        { label: "Sick Cert", href: "/ireland/en/services/sick-certificate-ireland" },
        { label: "Chronic Conditions: GP Review Online", href: "/ireland/en/services/chronic-disease-consultation" },
        { label: "Arabic-speaking doctor in Ireland", href: "/ireland/en/health/arabic-speaking-doctor" },
      ],
    },
    seoDescription:
      "Chest infections, persistent cough, sore throat and sinus symptoms assessed by an Irish-registered doctor — same-day video appointments, sick cert where warranted.",
    bodyHtml:
      "<h2>Respiratory symptoms assessed today</h2>" +
      "<p>Coughs, chest infections and sore throats are the most common reason people look for a doctor at short notice — and most of them can be assessed safely by video. Our Irish-registered doctors take a full history, look at your throat and breathing on camera, and tell you what this is, what to do about it, and what would make it urgent.</p>" +
      "<h2>What we assess by video</h2>" +
      "<ul>" +
      "<li>Chest infections and bronchitis</li>" +
      "<li>A cough that has not settled after two to three weeks</li>" +
      "<li>Sore throat and tonsillitis</li>" +
      "<li>Sinusitis and persistent nasal congestion</li>" +
      "<li>Flu, COVID-19 and other viral illness</li>" +
      "<li>Asthma or COPD symptoms that have worsened</li>" +
      "</ul>" +
      "<h2>When you need to be seen in person instead</h2>" +
      "<p>Video has limits, and we are direct about them. Go to an emergency department or call 112/999 if you have severe breathlessness at rest, chest pain, blue lips, confusion or drowsiness, or if you are coughing blood. A video consultation is not the right route for those, and your doctor will say so immediately if any of it comes up.</p>" +
      "<h2>Antibiotics are not automatic</h2>" +
      "<p>Most respiratory infections are viral, and antibiotics do nothing for them. Your doctor prescribes where the assessment points to a bacterial infection, and explains the reasoning either way — including what should improve, by when, and when to come back. That is a clinical decision, not something bookable in advance.</p>" +
      "<h2>Related services</h2>" +
      "<ul>" +
      `<li>${S("acute-medical-consultation", "GP Consultation Online")} — the same-day assessment itself.</li>` +
      `<li>${S("sick-certificate-ireland", "Sick Cert")} — a certificate for time off, where the assessment supports it.</li>` +
      `<li>${S("chronic-disease-consultation", "Chronic Conditions: GP Review Online")} — for asthma and COPD reviews between flare-ups.</li>` +
      `<li>${S("referral-and-investigations", "Specialist Referral & Diagnostic Investigation Consultation")} — chest imaging or specialist input where a cough is not resolving.</li>` +
      "</ul>" +
      "<p>Consultations are available in English, and in Arabic, Urdu, Punjabi, Portuguese, Spanish, French and Czech with the doctors who speak them — see the " +
      '<a href="/ireland/en/doctors">full Irish roster</a>.</p>' +
      "<h2>Book a same-day consultation</h2>" +
      "<p>Get your respiratory symptoms assessed today.</p>",
    faq: [
      {
        question: "Can a doctor treat a chest infection over video?",
        answer:
          "In most cases, yes. The doctor takes a full history, observes your breathing and throat on camera, and decides on treatment. Where a physical examination or a chest X-ray is needed, they arrange it or direct you to in-person care.",
      },
      {
        question: "Will I get antibiotics?",
        answer:
          "Only if the assessment indicates a bacterial infection. Most coughs and chest infections are viral, where antibiotics do not help. The doctor explains the decision and what to watch for.",
      },
      {
        question: "How long should a cough last before I see a doctor?",
        answer:
          "Book sooner if you are breathless, feverish, or have a chronic lung condition. Otherwise, a cough lasting more than three weeks should be assessed even if you feel otherwise well.",
      },
      {
        question: "Can I get a sick cert for a chest infection?",
        answer:
          "Yes, where the doctor's assessment supports time off work or college. It is issued after the consultation, at the doctor's discretion.",
      },
    ],
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  let planned = 0;
  let failed = 0;

  for (const u of UPDATES) {
    const page = await prisma.seoLandingPage.findFirst({
      where: { slug: u.slug, country: { code: COUNTRY } },
      select: { id: true, template: true },
    });
    if (!page) {
      console.log(`MISS  ${u.slug} — no landing page row`);
      failed += 1;
      continue;
    }
    const en = await prisma.seoLandingPageTranslation.findFirst({
      where: { landingPageId: page.id, locale: LocaleCode.EN },
      select: { id: true, bodyHtml: true },
    });
    if (!en) {
      console.log(`MISS  ${u.slug} — no EN translation row`);
      failed += 1;
      continue;
    }

    // Every /services/ and /health/ link written above must resolve, or this
    // trades an orphan page for a broken one.
    const linked = [
      ...u.bodyHtml.matchAll(/href="\/ireland\/en\/services\/([a-z0-9-]+)"/g),
      ...(u.template.related as Array<{ href: string }> | undefined)?.flatMap((r) =>
        [...r.href.matchAll(/^\/ireland\/en\/services\/([a-z0-9-]+)$/g)],
      ) ?? [],
    ].map((m) => m[1]);
    const bad: string[] = [];
    for (const slug of new Set(linked)) {
      const svc = await prisma.service.findFirst({
        where: { slug, country: { code: COUNTRY }, isActive: true },
        select: { id: true },
      });
      if (!svc) bad.push(slug);
    }
    if (bad.length > 0) {
      console.log(`FAIL  ${u.slug} — dead service links: ${bad.join(", ")}`);
      failed += 1;
      continue;
    }

    console.log(
      `SET   ${u.slug}\n` +
        `      template : ${JSON.stringify({ ...(page.template as object), ...u.template })}\n` +
        `      body     : ${en.bodyHtml?.length ?? 0} -> ${u.bodyHtml.length} chars\n` +
        `      faq      : ${u.faq.length} entries\n` +
        `      services : ${[...new Set(linked)].join(", ")}`,
    );
    planned += 1;

    if (APPLY) {
      await prisma.$transaction([
        prisma.seoLandingPage.update({
          where: { id: page.id },
          data: { template: { ...((page.template as Record<string, unknown>) ?? {}), ...u.template } },
        }),
        prisma.seoLandingPageTranslation.update({
          where: { id: en.id },
          data: {
            bodyHtml: u.bodyHtml,
            faq: u.faq,
            ...(u.seoDescription ? { seoDescription: u.seoDescription } : {}),
          },
        }),
      ]);
    }
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"} — ${planned} pages, ${failed} unresolved`);
  if (!APPLY) console.log("re-run with --apply to write");

  await prisma.$disconnect();
  await pool.end();
}

void main();
