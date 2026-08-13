/**
 * REQUIRES CLINICAL/LEGAL REVIEW BEFORE PUBLISHING.
 *
 * SXO finding: single-purpose competitors (e.g. getsickcert.ie) outrank us on
 * exact-match intent queries ("sick cert online", "e-neschopenka online").
 * Seeds dedicated intent-match landing pages as UNPUBLISHED DRAFTS so they
 * can be reviewed, priced/legal-checked, then published from admin.
 *
 * Follows the same upsert shape as import-ireland-landing-pages.ts /
 * import-portugal-landing-pages.ts, but isPublished stays FALSE here.
 *
 * Compliance notes (do not remove without re-checking):
 *  - IE "online-prescription-ireland" mirrors the wording already live on
 *    /ireland/en/repeat-prescription-request (frontend/locales/en/common.json
 *    `prescriptionsPage`): doctor-led REVIEW of repeat prescription requests
 *    for established patients — never "get a prescription online" / "delivered
 *    electronically" (flagged previously as a Google Ads outcome-claim, see
 *    prescriptions/page.tsx comment). No stronger claim added here.
 *  - Prices: IE GP €39 confirmed live (frontend/lib/content/country-home-copy.ts).
 *    CZ GP 650 Kč confirmed live (backend/scripts/applied/patch-czechia-gp-content.ts).
 *    PT GP price €39 owner-confirmed 2026-07-25.
 *
 *   node --import tsx scripts/seed-intent-landers.ts          # dry-run
 *   node --import tsx scripts/seed-intent-landers.ts --apply  # DO NOT RUN yet
 */
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

type Faq = { question: string; answer: string };
type Lander = {
  countryCode: string;
  locale: LocaleCode;
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  bodyHtml: string;
  faq: Faq[];
};

const steps = (items: [string, string][]) =>
  "<h2>How it works</h2><ol>" +
  items.map(([t, d]) => `<li><strong>${t}</strong> — ${d}</li>`).join("") +
  "</ol>";

const LANDERS: Lander[] = [
  // ---------------------------------------------------------------- Ireland
  {
    countryCode: "ie",
    locale: "EN" as LocaleCode,
    slug: "sick-cert-online",
    title: "Sick Cert Online — Same-Day Medical Certificate | Ireland",
    seoTitle: "Sick Cert Online Ireland | Same-Day GP Consultation",
    seoDescription:
      "Get a same-day sick certificate for work, assessed by an Irish-registered doctor over video call. GP consultation from €39.",
    bodyHtml:
      "<h2>A same-day sick cert, assessed by a real doctor</h2>" +
      "<p>Need a sick certificate for work or college? You can be assessed by an Irish-registered doctor over secure video call today, without a trip to a walk-in clinic. The consultation covers your symptoms properly — the certificate is issued where clinically appropriate, based on that assessment, not as an automatic add-on.</p>" +
      "<p>Same-day appointments are available subject to doctor availability. If your doctor judges that your condition needs in-person examination or urgent care, you'll be told clearly and directed to the right service.</p>" +
      "<p>GP consultations from €39.</p>" +
      steps([
        ["Book online", "Choose a same-day slot with an Irish-registered GP."],
        ["See the doctor by video", "A full consultation, not a form-fill — your doctor asks about your symptoms and history."],
        ["Certificate issued if appropriate", "Sent to you securely once your doctor confirms it's clinically warranted."],
      ]) +
      "<h2>Book your consultation</h2>" +
      "<p>See an Irish-registered doctor today.</p>" +
      '<p><a href="/ireland/en/services/sick-certificate-ireland">Sick Leave Medical Assessment</a></p>',
    faq: [
      {
        question: "Can I get a sick cert online in Ireland?",
        answer:
          "Yes — an Irish-registered doctor can assess you by secure video call and issue a sick certificate where it's clinically appropriate, the same day in most cases.",
      },
      {
        question: "Is an online sick cert accepted by employers?",
        answer:
          "A certificate issued by an Irish-registered doctor following a proper consultation is valid the same way an in-person GP cert is. Check your employer's own sick-leave policy for any specific requirements.",
      },
      {
        question: "How much does it cost?",
        answer: "GP consultations start from €39.",
      },
      {
        question: "How fast can I be seen?",
        answer:
          "Same-day appointments are available subject to doctor availability. If your symptoms need in-person care, your doctor will tell you and direct you accordingly.",
      },
    ],
  },
  {
    countryCode: "ie",
    locale: "EN" as LocaleCode,
    slug: "online-prescription-ireland",
    title: "Repeat Prescription Review Online | Ireland",
    seoTitle: "Online Prescription Review Ireland | GP Consultation",
    seoDescription:
      "Doctors registered to practise in Ireland who review repeat prescription requests for established patients, by secure video call.",
    bodyHtml:
      "<h2>Repeat prescription review, online</h2>" +
      "<p>Doctors registered to practise in Ireland review repeat prescription requests for established patients over secure video call. This is a clinical review, not an automatic renewal — your doctor checks your current medication and history before deciding on the appropriate next step.</p>" +
      "<p>GP consultations from €39.</p>" +
      steps([
        ["Book a consultation", "Choose a time with a doctor registered to practise in Ireland."],
        ["Review by video call", "Your doctor reviews your current medication and recent history."],
        ["Outcome confirmed", "You're told clearly what happens next, based on that review."],
      ]) +
      "<h2>Book your review</h2>" +
      "<p>See a doctor registered to practise in Ireland.</p>" +
      '<p><a href="/ireland/en/repeat-prescription-request">Meet our licensed prescribers</a></p>',
    faq: [
      {
        question: "Can I get a repeat prescription reviewed online?",
        answer:
          "Yes — doctors registered to practise in Ireland review repeat prescription requests for established patients by secure video call as part of a regular GP consultation.",
      },
      {
        question: "Is this a new prescription or a renewal?",
        answer:
          "It's a clinical review of your current medication. Your doctor decides the appropriate outcome after assessing you — it isn't an automatic renewal.",
      },
      {
        question: "How much does a consultation cost?",
        answer: "GP consultations start from €39.",
      },
      {
        question: "Do I need to already be a patient?",
        answer:
          "This service is for established patients with an existing prescription to review. New or acute issues are assessed as a standard GP consultation.",
      },
    ],
  },
  // ---------------------------------------------------------------- Czechia
  {
    countryCode: "cz",
    locale: "CS" as LocaleCode,
    slug: "neschopenka-online",
    title: "eNeschopenka Online — Konzultace s Lékařem | Česko",
    seoTitle: "eNeschopenka Online | Konzultace Tentýž Den",
    seoDescription:
      "Vystavení eNeschopenky po konzultaci s lékařem registrovaným u ČLK přes videohovor. Termín tentýž den. Od 650 Kč.",
    bodyHtml:
      "<h2>eNeschopenka po konzultaci s lékařem</h2>" +
      "<p>Potřebujete pracovní neschopnost? Lékař registrovaný u České lékařské komory vás vyšetří prostřednictvím zabezpečeného videohovoru ještě dnes. eNeschopenka je vystavena elektronicky přímo do systému ČSSZ, pokud to lékař na základě vyšetření uzná za vhodné — nejde o automatické vystavení bez posouzení.</p>" +
      "<p>Termíny tentýž den jsou dostupné podle volné kapacity lékařů. Pokud váš stav vyžaduje osobní vyšetření nebo neodkladnou péči, lékař vás na to jasně upozorní.</p>" +
      "<p>Konzultace od 650 Kč.</p>" +
      steps([
        ["Rezervujte si termín", "Vyberte si termín tentýž den u lékaře registrovaného u ČLK."],
        ["Konzultace přes video", "Lékař zhodnotí vaše příznaky a zdravotní stav."],
        ["Vystavení eNeschopenky", "Elektronicky do systému ČSSZ, pokud je to klinicky odůvodněné."],
      ]) +
      "<h2>Rezervujte konzultaci</h2>" +
      "<p>Promluvte si s lékařem registrovaným u ČLK ještě dnes.</p>" +
      '<p><a href="/czechia/cs/book">Rezervovat konzultaci</a></p>',
    faq: [
      {
        question: "Lze vystavit eNeschopenku online?",
        answer:
          "Ano — lékař registrovaný u ČLK vás vyšetří přes videohovor a eNeschopenku vystaví elektronicky do systému ČSSZ, pokud to na základě vyšetření uzná za vhodné.",
      },
      {
        question: "Jak rychle mohu být vyšetřen/a?",
        answer:
          "Termíny tentýž den jsou dostupné podle volné kapacity lékařů. Pokud je potřeba osobní vyšetření, lékař vás na to upozorní.",
      },
      {
        question: "Kolik konzultace stojí?",
        answer: "Konzultace s praktickým lékařem od 650 Kč.",
      },
      {
        question: "Je online eNeschopenka platná stejně jako od osobního lékaře?",
        answer:
          "Ano, pokud ji vystaví lékař registrovaný u ČLK na základě řádné konzultace, je zpracována stejným způsobem jako eNeschopenka od osobního praktického lékaře.",
      },
    ],
  },
  // --------------------------------------------------------------- Portugal
  {
    countryCode: "pt",
    locale: "PT" as LocaleCode,
    slug: "atestado-medico-online",
    title: "Atestado Médico Online — Consulta no Mesmo Dia | Portugal",
    seoTitle: "Atestado Médico Online Portugal | Consulta Mesmo Dia",
    seoDescription:
      "Obtenha um atestado médico após consulta com um médico registado na Ordem dos Médicos, por videochamada segura, ainda hoje. Consultas desde 39 €.",
    bodyHtml:
      "<h2>Atestado médico após consulta com um médico registado</h2>" +
      "<p>Precisa de um atestado médico para o trabalho ou para a escola? Pode ser avaliado por um médico registado na Ordem dos Médicos por videochamada segura, ainda hoje. A consulta avalia devidamente os seus sintomas — o atestado é emitido quando clinicamente apropriado, com base nessa avaliação, e não como um extra automático.</p>" +
      "<p>Consultas no mesmo dia estão sujeitas à disponibilidade dos médicos. Se o seu médico considerar que o seu estado exige avaliação presencial ou cuidados urgentes, será informado com clareza e encaminhado para o serviço adequado.</p>" +
      steps([
        ["Marque a consulta", "Escolha um horário disponível ainda hoje."],
        ["Consulta por videochamada", "O médico avalia os seus sintomas e historial clínico."],
        ["Emissão do atestado", "Enviado de forma segura, caso seja clinicamente indicado."],
      ]) +
      "<h2>Marque a sua consulta</h2>" +
      "<p>Fale hoje com um médico registado na Ordem dos Médicos. Consultas de clínica geral a partir de 39 €.</p>" +
      '<p><a href="/portugal/pt/services/sick-leave">Atestado Médico</a></p>',
    faq: [
      {
        question: "Posso obter um atestado médico online?",
        answer:
          "Sim — um médico registado na Ordem dos Médicos pode avaliá-lo por videochamada segura e emitir um atestado médico quando clinicamente apropriado, muitas vezes no mesmo dia.",
      },
      {
        question: "O atestado médico online é válido para a entidade patronal?",
        answer:
          "Um atestado emitido por um médico registado na Ordem dos Médicos após consulta adequada tem a mesma validade de um atestado emitido presencialmente. Confirme sempre a política interna da sua entidade patronal.",
      },
      {
        question: "Quanto tempo demora a consulta?",
        answer:
          "Consultas no mesmo dia estão disponíveis consoante a disponibilidade dos médicos. As consultas de clínica geral têm um custo a partir de 39 €.",
      },
      {
        question: "E se precisar de avaliação presencial?",
        answer:
          "Se o médico considerar necessária uma avaliação presencial ou cuidados urgentes, será informado com clareza e encaminhado para o serviço adequado.",
      },
    ],
  },
];

async function main() {
  let count = 0;
  for (const l of LANDERS) {
    const country = await prisma.country.findUnique({
      where: { code: l.countryCode },
      select: { id: true },
    });
    if (!country) {
      console.warn(`SKIP  ${l.countryCode}/${l.slug}  — country not found`);
      continue;
    }
    const existing = await prisma.seoLandingPage.findUnique({
      where: { countryId_slug: { countryId: country.id, slug: l.slug } },
      select: { id: true },
    });
    console.log(
      `${existing ? "UPDATE" : "CREATE"}  DRAFT  /${l.countryCode}/health/${l.slug}  "${l.title}"`,
    );
    if (!APPLY) {
      count += 1;
      continue;
    }
    await prisma.$transaction(async (tx) => {
      const page = await tx.seoLandingPage.upsert({
        where: { countryId_slug: { countryId: country.id, slug: l.slug } },
        // isPublished intentionally omitted from `update` — never flips a
        // page live that was already published by someone else; new rows
        // default to false (draft) via the schema default.
        create: { countryId: country.id, slug: l.slug, isPublished: false },
        update: {},
        select: { id: true },
      });
      await tx.seoLandingPageTranslation.upsert({
        where: { landingPageId_locale: { landingPageId: page.id, locale: l.locale } },
        create: {
          landingPageId: page.id,
          locale: l.locale,
          title: l.title,
          seoTitle: l.seoTitle,
          seoDescription: l.seoDescription,
          bodyHtml: l.bodyHtml,
          faq: l.faq,
        },
        update: {
          title: l.title,
          seoTitle: l.seoTitle,
          seoDescription: l.seoDescription,
          bodyHtml: l.bodyHtml,
          faq: l.faq,
        },
      });
    });
    count += 1;
  }

  console.log("\n────────────");
  console.log(
    APPLY
      ? `APPLIED: ${count} intent-lander drafts upserted (isPublished: false).`
      : `DRY-RUN: ${count} intent-lander drafts would be upserted as DRAFT. Pass --apply.`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
