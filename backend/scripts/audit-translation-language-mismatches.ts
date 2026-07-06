import "dotenv/config";
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

type SupportedLocale = `${LocaleCode}`;

const SUPPORTED_LOCALES: SupportedLocale[] = ["EN", "PT", "ES", "CS", "RO", "DE"];

const STOPWORDS: Record<SupportedLocale, string[]> = {
  EN: [
    "the", "and", "with", "for", "your", "you", "this", "that", "from", "are", "our", "can",
    "online", "doctor", "consultation", "health", "medical", "treatment", "blood", "test",
    "results", "working", "days", "order", "bring", "patient",
  ],
  PT: [
    "com", "para", "uma", "não", "saúde", "médico", "consulta", "tratamento",
    "como", "mais", "pode", "online", "doença", "cuidados", "quaisquer", "traga", "línguas",
    "seguimento", "doentes", "estão", "disponíveis", "consoante", "decorrer",
  ],
  ES: [
    "con", "para", "una", "salud", "médico", "consulta", "tratamiento",
    "como", "más", "puede", "online", "dolor", "cita", "empleador", "papel", "única", "válida",
  ],
  CS: [
    "že", "se", "pro", "jako", "jsou", "lékař", "konzultace", "léčba", "zdraví",
    "které", "pacient", "online", "vaše", "může", "české", "objednejte",
  ],
  RO: [
    "și", "cu", "pentru", "care", "este", "sunt", "consultație", "medic", "tratament", "sănătate",
    "dumneavoastră", "poate", "online", "pacient", "din", "mai",
  ],
  DE: [
    "und", "mit", "für", "die", "der", "das", "ist", "sind", "nicht", "arzt", "beratung",
    "gesundheit", "behandlung", "konsultation", "online", "ihre", "kann", "von", "zu", "hause",
    "fachkundige", "zweitmeinungen",
  ],
};

const DIACRITICS: Record<SupportedLocale, string[]> = {
  EN: [],
  PT: ["ã", "õ", "ç"],
  ES: ["ñ", "¿", "¡"],
  CS: ["č", "ď", "ě", "ň", "ř", "š", "ť", "ů", "ž"],
  RO: ["ă", "â", "î", "ș", "ş", "ț", "ţ"],
  DE: ["ä", "ö", "ü", "ß"],
};

type ScoreBreakdown = {
  stopwords: number;
  diacritics: number;
  markers: number;
};

type Detection = {
  predicted: SupportedLocale;
  scores: Record<SupportedLocale, number>;
  confidence: number;
};

type Suspect = {
  entity: string;
  storedLocale: SupportedLocale;
  predictedLocale: SupportedLocale;
  confidence: number;
  scoreDelta: number;
  ref: string;
  fields: string[];
  preview: string;
};

const MARKERS: Record<SupportedLocale, string[]> = {
  EN: [
    "same day",
    "book",
    "what",
    "your",
    "ongoing",
    "available anywhere",
    "what languages are consultations available in",
    "what should i bring to the consultation",
    "do i need to be insured with a czech health insurance company",
    "results in 3 5 working days",
    "is an eneschopenka e sick note issued automatically after the consultation",
  ],
  PT: [
    "mesmo dia",
    "marque",
    "sua",
    "acompanhamento",
    "qualquer lugar",
    "gestão",
    "em que línguas",
    "na íntegra",
    "apoio ao cliente",
    "ao longo das semanas seguintes",
    "podem decorrer",
  ],
  ES: [
    "mismo día",
    "reserva",
    "su",
    "seguimiento",
    "cualquier lugar",
    "gestión",
    "mi empleador quiere un parte de baja en papel",
    "los partes de baja en papel no existen",
  ],
  CS: ["ještě dnes", "objednejte", "vaše", "dlouhodobé", "kdekoli", "řízení"],
  RO: ["în aceeași zi", "rezervați", "dumneavoastră", "pe termen lung", "oriunde", "gestionare"],
  DE: [
    "noch heute",
    "buchen",
    "ihre",
    "langfristige",
    "überall",
    "behandlung",
    "fachkundige",
    "von zu hause",
    "zweitmeinungen",
  ],
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

function normalizeText(value: string): string {
  return stripHtml(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWordOccurrences(text: string, word: string): number {
  const match = text.match(new RegExp(`(^|\\s)${escapeRegExp(word)}(?=\\s|$)`, "gu"));
  return match?.length ?? 0;
}

function countSubstringOccurrences(text: string, value: string): number {
  if (!value) return 0;
  let count = 0;
  let index = 0;
  while (true) {
    const found = text.indexOf(value, index);
    if (found === -1) break;
    count++;
    index = found + value.length;
  }
  return count;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreLocale(text: string, locale: SupportedLocale): ScoreBreakdown {
  let stopwords = 0;
  for (const word of STOPWORDS[locale]) stopwords += countWordOccurrences(text, word) * 2;

  let diacritics = 0;
  for (const char of DIACRITICS[locale]) diacritics += countSubstringOccurrences(text, char) * 3;

  let markers = 0;
  for (const marker of MARKERS[locale]) markers += countSubstringOccurrences(text, marker) * 4;

  return { stopwords, diacritics, markers };
}

function detectLanguage(raw: string): Detection | null {
  const text = normalizeText(raw);
  if (text.length < 80) return null;

  const scores = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => {
      const parts = scoreLocale(text, locale);
      return [locale, parts.stopwords + parts.diacritics + parts.markers];
    }),
  ) as Record<SupportedLocale, number>;

  const ordered = [...SUPPORTED_LOCALES].sort((a, b) => scores[b] - scores[a]);
  const predicted = ordered[0];
  const top = scores[predicted];
  if (top === 0) return null;

  return {
    predicted,
    scores,
    confidence: Number((top / Math.max(text.length / 120, 1)).toFixed(2)),
  };
}

function summarizeText(values: Array<string | null | undefined>): string {
  return values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function previewText(text: string): string {
  return stripHtml(text).replace(/\s+/g, " ").trim().slice(0, 180);
}

function maybePushSuspect(
  suspects: Suspect[],
  input: {
    entity: string;
    storedLocale: SupportedLocale;
    ref: string;
    fields: string[];
    text: string;
  },
) {
  const detection = detectLanguage(input.text);
  if (!detection) return;
  const ordered = [...SUPPORTED_LOCALES].sort((a, b) => detection.scores[b] - detection.scores[a]);
  const top = ordered[0];
  const runnerUp = ordered[1];
  const scoreDelta = detection.scores[top] - detection.scores[runnerUp];
  if (top === input.storedLocale) return;
  if (scoreDelta < 4) return;

  suspects.push({
    entity: input.entity,
    storedLocale: input.storedLocale,
    predictedLocale: top,
    confidence: detection.confidence,
    scoreDelta,
    ref: input.ref,
    fields: input.fields,
    preview: previewText(input.text),
  });
}

async function main() {
  const suspects: Suspect[] = [];

  const services = await prisma.service.findMany({
    select: {
      id: true,
      slug: true,
      country: { select: { code: true, defaultLocale: true } },
      name: true,
      summary: true,
      seoTitle: true,
      seoDescription: true,
      heroTitle: true,
      heroDescription: true,
      detailBody: true,
      ctaLabel: true,
      translations: {
        select: {
          locale: true,
          name: true,
          summary: true,
          seoTitle: true,
          seoDescription: true,
          heroTitle: true,
          heroDescription: true,
          detailBody: true,
          ctaLabel: true,
        },
      },
      faqs: {
        select: {
          id: true,
          question: true,
          answer: true,
          translations: {
            select: { locale: true, question: true, answer: true },
          },
        },
      },
    },
  });

  for (const service of services) {
    maybePushSuspect(suspects, {
      entity: "Service(base)",
      storedLocale: service.country.defaultLocale as SupportedLocale,
      ref: `${service.country.code}/${service.slug}`,
      fields: ["name", "summary", "seoTitle", "seoDescription", "heroTitle", "heroDescription", "detailBody", "ctaLabel"],
      text: summarizeText([
        service.name,
        service.summary,
        service.seoTitle,
        service.seoDescription,
        service.heroTitle,
        service.heroDescription,
        service.detailBody,
        service.ctaLabel,
      ]),
    });

    for (const tr of service.translations) {
      maybePushSuspect(suspects, {
        entity: "ServiceTranslation",
        storedLocale: tr.locale as SupportedLocale,
        ref: `${service.country.code}/${service.slug}`,
        fields: ["name", "summary", "seoTitle", "seoDescription", "heroTitle", "heroDescription", "detailBody", "ctaLabel"],
        text: summarizeText([
          tr.name,
          tr.summary,
          tr.seoTitle,
          tr.seoDescription,
          tr.heroTitle,
          tr.heroDescription,
          tr.detailBody,
          tr.ctaLabel,
        ]),
      });
    }

    for (const faq of service.faqs) {
      maybePushSuspect(suspects, {
        entity: "ServiceFaq(base)",
        storedLocale: service.country.defaultLocale as SupportedLocale,
        ref: `${service.country.code}/${service.slug}#faq:${faq.id}`,
        fields: ["question", "answer"],
        text: summarizeText([faq.question, faq.answer]),
      });
      for (const tr of faq.translations) {
        maybePushSuspect(suspects, {
          entity: "ServiceFaqTranslation",
          storedLocale: tr.locale as SupportedLocale,
          ref: `${service.country.code}/${service.slug}#faq:${faq.id}`,
          fields: ["question", "answer"],
          text: summarizeText([tr.question, tr.answer]),
        });
      }
    }
  }

  const doctors = await prisma.doctor.findMany({
    select: {
      id: true,
      slug: true,
      country: { select: { code: true, defaultLocale: true } },
      title: true,
      bio: true,
      seoTitle: true,
      seoDescription: true,
      translations: {
        select: {
          locale: true,
          title: true,
          bio: true,
          seoTitle: true,
          seoDescription: true,
        },
      },
    },
  });

  for (const doctor of doctors) {
    maybePushSuspect(suspects, {
      entity: "Doctor(base)",
      storedLocale: doctor.country.defaultLocale as SupportedLocale,
      ref: `${doctor.country.code}/${doctor.slug}`,
      fields: ["title", "bio", "seoTitle", "seoDescription"],
      text: summarizeText([doctor.title, doctor.bio, doctor.seoTitle, doctor.seoDescription]),
    });
    for (const tr of doctor.translations) {
      maybePushSuspect(suspects, {
        entity: "DoctorTranslation",
        storedLocale: tr.locale as SupportedLocale,
        ref: `${doctor.country.code}/${doctor.slug}`,
        fields: ["title", "bio", "seoTitle", "seoDescription"],
        text: summarizeText([tr.title, tr.bio, tr.seoTitle, tr.seoDescription]),
      });
    }
  }

  const specialties = await prisma.specialty.findMany({
    select: {
      slug: true,
      country: { select: { code: true, defaultLocale: true } },
      name: true,
      cardSummary: true,
      translations: {
        select: { locale: true, name: true, cardSummary: true },
      },
    },
  });

  for (const specialty of specialties) {
    maybePushSuspect(suspects, {
      entity: "Specialty(base)",
      storedLocale: specialty.country.defaultLocale as SupportedLocale,
      ref: `${specialty.country.code}/${specialty.slug}`,
      fields: ["name", "cardSummary"],
      text: summarizeText([specialty.name, specialty.cardSummary]),
    });
    for (const tr of specialty.translations) {
      maybePushSuspect(suspects, {
        entity: "SpecialtyTranslation",
        storedLocale: tr.locale as SupportedLocale,
        ref: `${specialty.country.code}/${specialty.slug}`,
        fields: ["name", "cardSummary"],
        text: summarizeText([tr.name, tr.cardSummary]),
      });
    }
  }

  const healthTests = await prisma.healthTest.findMany({
    select: {
      slug: true,
      country: { select: { code: true, defaultLocale: true } },
      title: true,
      shortDescription: true,
      sampleType: true,
      resultsTimeline: true,
      heroButtonLabel: true,
      detailIntro: true,
      seoTitle: true,
      seoDescription: true,
      translations: {
        select: {
          locale: true,
          title: true,
          shortDescription: true,
          sampleType: true,
          resultsTimeline: true,
          heroButtonLabel: true,
          detailIntro: true,
          seoTitle: true,
          seoDescription: true,
        },
      },
    },
  });

  for (const test of healthTests) {
    maybePushSuspect(suspects, {
      entity: "HealthTest(base)",
      storedLocale: test.country.defaultLocale as SupportedLocale,
      ref: `${test.country.code}/${test.slug}`,
      fields: ["title", "shortDescription", "sampleType", "resultsTimeline", "heroButtonLabel", "detailIntro", "seoTitle", "seoDescription"],
      text: summarizeText([
        test.title,
        test.shortDescription,
        test.sampleType,
        test.resultsTimeline,
        test.heroButtonLabel,
        test.detailIntro,
        test.seoTitle,
        test.seoDescription,
      ]),
    });
    for (const tr of test.translations) {
      maybePushSuspect(suspects, {
        entity: "HealthTestTranslation",
        storedLocale: tr.locale as SupportedLocale,
        ref: `${test.country.code}/${test.slug}`,
        fields: ["title", "shortDescription", "sampleType", "resultsTimeline", "heroButtonLabel", "detailIntro", "seoTitle", "seoDescription"],
        text: summarizeText([
          tr.title,
          tr.shortDescription,
          tr.sampleType,
          tr.resultsTimeline,
          tr.heroButtonLabel,
          tr.detailIntro,
          tr.seoTitle,
          tr.seoDescription,
        ]),
      });
    }
  }

  suspects.sort((a, b) => b.scoreDelta - a.scoreDelta || b.confidence - a.confidence);

  console.log(`Checked locales: ${SUPPORTED_LOCALES.join(", ")}`);
  console.log(`Suspect rows: ${suspects.length}`);
  console.log("");

  const byEntity = new Map<string, number>();
  for (const suspect of suspects) {
    byEntity.set(suspect.entity, (byEntity.get(suspect.entity) ?? 0) + 1);
  }
  console.log("By entity:");
  for (const [entity, count] of [...byEntity.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${entity}: ${count}`);
  }

  console.log("");
  console.log("Top suspects:");
  for (const suspect of suspects.slice(0, 120)) {
    console.log(
      [
        `${suspect.entity}`,
        `${suspect.ref}`,
        `stored=${suspect.storedLocale}`,
        `predicted=${suspect.predictedLocale}`,
        `delta=${suspect.scoreDelta}`,
        `confidence=${suspect.confidence}`,
        `fields=${suspect.fields.join(",")}`,
        `preview=${JSON.stringify(suspect.preview)}`,
      ].join(" | "),
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
