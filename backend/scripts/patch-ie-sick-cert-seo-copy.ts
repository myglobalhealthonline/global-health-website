/**
 * SEO fix (2026-08-04, OpenSEO live-data pass): the Ireland sick-certificate
 * service page ranks #24 desktop / #17 mobile for "sick cert online"
 * (880/mo, KD 0, €3.77 CPC) plus "sick cert" (480), "medical certificate
 * online" (590) and "online sick cert ireland" (320) — ~2,700/mo of KD-0
 * demand — while its title says "Sick Leave Medical Assessment Ireland |
 * Same-Day Appointments". Not one of those queries appears in it.
 *
 * Every locale's title also overran Google's ~60-char budget (EN 61, PT 74,
 * ES 67, CS 73, RO 76, DE 59) so the live <title> renders truncated with an
 * ellipsis ("… | Same-Day…"), and every description overran the ~155-char
 * SERP budget (177-238).
 *
 * This rewrites ServiceTranslation.seoTitle/seoDescription for all six IE
 * locales, plus the Service base row (the fallback when a locale row is
 * missing), to lead with the query each market actually types and to fit both
 * budgets. €45 is the live IE sick-cert price (matches the page's own Offer
 * schema) — do not restate it here if that price changes.
 *
 * Idempotent and guarded: each field is only written when the stored value
 * still equals the BEFORE string captured from prod on 2026-08-04. A row that
 * has since been edited in the admin UI is reported as SKIPPED, never
 * overwritten.
 *
 *   node --env-file=.env --import tsx scripts/patch-ie-sick-cert-seo-copy.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/patch-ie-sick-cert-seo-copy.ts --apply   # write
 */
import "dotenv/config";
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const COUNTRY = "ie";
const SLUG = "sick-certificate-ireland";

/** Google clips on pixel width; these are the practical character budgets. */
const TITLE_BUDGET = 60;
const DESC_BUDGET = 155;

const len = (v: string) => Array.from(v).length;

type Copy = { title: { before: string; after: string }; desc: { before: string; after: string } };

/** `null` locale = the Service base row (used when a locale row is absent). */
const COPY: Array<{ locale: LocaleCode | null } & Copy> = [
  {
    locale: null,
    title: {
      before: "Sick Leave Medical Assessment Ireland | Same-Day Appointments",
      after: "Sick Cert Online Ireland | Same-Day Medical Cert",
    },
    desc: {
      before:
        "See an Irish-registered doctor today for a sick leave medical assessment. Certificates accepted by employers and educational institutions nationwide. Book via secure video call.",
      after:
        "Get a sick cert online from an IMC-registered Irish GP, same day. Medical certificates accepted by employers and colleges nationwide. €45, video call.",
    },
  },
  {
    locale: "EN",
    title: {
      before: "Sick Leave Medical Assessment Ireland | Same-Day Appointments",
      after: "Sick Cert Online Ireland | Same-Day Medical Cert",
    },
    desc: {
      before:
        "See an Irish-registered doctor today for a sick leave medical assessment. Certificates accepted by employers and educational institutions nationwide. Book via secure video call.",
      after:
        "Get a sick cert online from an IMC-registered Irish GP, same day. Medical certificates accepted by employers and colleges nationwide. €45, video call.",
    },
  },
  {
    locale: "PT",
    title: {
      before: "Avaliação Médica para Baixa por Doença na Irlanda | Consultas no Mesmo Dia",
      after: "Atestado Médico Online Irlanda | No Mesmo Dia",
    },
    desc: {
      before:
        "Consulte hoje um médico registado na Irlanda para uma avaliação médica de baixa por doença. Atestados aceites por empregadores e instituições de ensino em todo o país. Marque por videochamada segura.",
      after:
        "Obtenha um atestado médico online na Irlanda com médico registado, no mesmo dia. Aceite por empregadores e escolas. €45, videochamada segura.",
    },
  },
  {
    locale: "ES",
    title: {
      before: "Evaluación médica para baja laboral en Irlanda | Citas el mismo día",
      after: "Justificante Médico Online Irlanda | Mismo Día",
    },
    desc: {
      before:
        "Consulte hoy mismo con un médico registrado en Irlanda para una evaluación médica de baja laboral. Certificados aceptados por empleadores e instituciones educativas en todo el país. Reserve mediante videollamada segura.",
      after:
        "Consigue un justificante médico online en Irlanda con médico registrado, el mismo día. Aceptado por empresas y centros educativos. €45, videollamada.",
    },
  },
  {
    locale: "CS",
    title: {
      before: "Lékařské posouzení pracovní neschopnosti Irsko | Konzultace ve stejný den",
      after: "Neschopenka online Irsko | Ve stejný den",
    },
    desc: {
      before:
        "Navštivte ještě dnes irsky registrovaného lékaře kvůli lékařskému posouzení pracovní neschopnosti. Potvrzení akceptují zaměstnavatelé i vzdělávací instituce po celé zemi. Objednejte se prostřednictvím zabezpečeného videohovoru.",
      after:
        "Potvrzení o pracovní neschopnosti online v Irsku od registrovaného lékaře, ještě dnes. Uznávají zaměstnavatelé i školy. €45, videohovor.",
    },
  },
  {
    locale: "RO",
    title: {
      before: "Evaluare medicală pentru concediu medical Irlanda | Programări în aceeași zi",
      after: "Concediu medical online Irlanda | În aceeași zi",
    },
    desc: {
      before:
        "Consultați astăzi un medic înregistrat în Irlanda pentru o evaluare medicală în vederea concediului medical. Certificatele sunt acceptate de angajatori și instituții de învățământ la nivel național. Programați-vă prin videoapel securizat.",
      after:
        "Certificat de concediu medical online în Irlanda, de la un medic înregistrat, în aceeași zi. Acceptat de angajatori și școli. €45, videoapel.",
    },
  },
  {
    locale: "DE",
    title: {
      before: "Krankschreibungs-Beurteilung Irland | Termine am selben Tag",
      after: "Krankschreibung online Irland | Am selben Tag",
    },
    desc: {
      before:
        "Lassen Sie sich noch heute von einem in Irland registrierten Arzt für eine Krankschreibungs-Beurteilung untersuchen. Atteste werden landesweit von Arbeitgebern und Bildungseinrichtungen akzeptiert. Buchung per sicherem Videoanruf.",
      after:
        "Krankschreibung online in Irland von einem registrierten Arzt – am selben Tag. Von Arbeitgebern und Schulen anerkannt. €45, sicherer Videoanruf.",
    },
  },
];

/** Fails loudly before touching prod if any proposed string blows its budget. */
function assertBudgets() {
  const over: string[] = [];
  for (const row of COPY) {
    const label = row.locale ?? "base";
    if (len(row.title.after) > TITLE_BUDGET) {
      over.push(`${label} title ${len(row.title.after)} > ${TITLE_BUDGET}`);
    }
    if (len(row.desc.after) > DESC_BUDGET) {
      over.push(`${label} description ${len(row.desc.after)} > ${DESC_BUDGET}`);
    }
  }
  if (over.length > 0) throw new Error(`Proposed copy over budget:\n  ${over.join("\n  ")}`);
}

async function main() {
  assertBudgets();

  const service = await prisma.service.findFirst({
    where: { country: { code: COUNTRY }, slug: SLUG },
    select: {
      id: true,
      seoTitle: true,
      seoDescription: true,
      translations: { select: { id: true, locale: true, seoTitle: true, seoDescription: true } },
    },
  });
  if (!service) throw new Error(`Service ${COUNTRY}/${SLUG} not found`);

  let planned = 0;
  let skipped = 0;

  for (const row of COPY) {
    const label = row.locale ?? "base";
    const current =
      row.locale === null
        ? { id: service.id, seoTitle: service.seoTitle, seoDescription: service.seoDescription }
        : service.translations.find((t) => t.locale === row.locale);

    if (!current) {
      console.log(`[${label}] SKIPPED — no row`);
      skipped += 1;
      continue;
    }

    const titleMatches = current.seoTitle === row.title.before;
    const descMatches = current.seoDescription === row.desc.before;

    if (current.seoTitle === row.title.after && current.seoDescription === row.desc.after) {
      console.log(`[${label}] already patched`);
      continue;
    }
    if (!titleMatches || !descMatches) {
      console.log(
        `[${label}] SKIPPED — stored copy differs from the 2026-08-04 baseline` +
          `${titleMatches ? "" : "\n    title now: " + (current.seoTitle ?? "(null)")}` +
          `${descMatches ? "" : "\n    desc  now: " + (current.seoDescription ?? "(null)")}`,
      );
      skipped += 1;
      continue;
    }

    console.log(`[${label}]`);
    console.log(`  title  [${len(row.title.before)}] ${row.title.before}`);
    console.log(`      -> [${len(row.title.after)}] ${row.title.after}`);
    console.log(`  desc   [${len(row.desc.before)}] ${row.desc.before}`);
    console.log(`      -> [${len(row.desc.after)}] ${row.desc.after}`);
    planned += 1;

    if (!APPLY) continue;

    if (row.locale === null) {
      await prisma.service.update({
        where: { id: service.id },
        data: { seoTitle: row.title.after, seoDescription: row.desc.after },
      });
    } else {
      await prisma.serviceTranslation.update({
        where: { id: current.id },
        data: { seoTitle: row.title.after, seoDescription: row.desc.after },
      });
    }
  }

  console.log(
    `\n${APPLY ? "APPLIED" : "DRY-RUN"}: ${planned} row(s) ${APPLY ? "written" : "would change"}, ${skipped} skipped.`,
  );
  if (!APPLY && planned > 0) console.log("Re-run with --apply to write.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
