/* eslint-disable no-console */
/**
 * Correct the published Ireland lab hub to match its active catalogue.
 * Product rows are read and verified only; dry-run is the default.
 *
 * From backend/:
 *   node --env-file=.env --import tsx scripts/correct-published-ie-lab-hub-facts-2026-09.ts
 *   node --env-file=.env --import tsx scripts/correct-published-ie-lab-hub-facts-2026-09.ts --apply
 */
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const TRANSLATION_ID = "cmrisftmv0001v4jubuir7v5t";
const PAGE_CONTENT_ID = "cmrisfsbe0000v4jug512ll6b";
const EXPECTED_CURRENT_HASH = "6c710759a26b50dac97ba587332704e9147eadca73e3d41570b6b74a5c6168ae";
const EXPECTED_CATALOGUE_HASH = "f303c0226cc6ea478d7f4b901768ca7226ff346697533cc970c31f452a43d6fe";

const TARGET = {
  heroTitle: "Home Blood Tests Ireland — Randox Lab Kits",
  heroSubtitle:
    "Order a Randox home blood test kit from €57. Kits are posted to Dublin and every other county; turnaround varies by test, from 2–3 working days to 4–6 weeks after the lab receives your sample. Want a doctor to explain your results? Book a follow-up consultation with an IMC-registered Global Health doctor from €45.",
  seoDescription:
    "Order Randox home blood test kits in Dublin or anywhere in Ireland from €57. Turnaround varies by test, from 2–3 working days to 4–6 weeks.",
  intro:
    "Global Health offers Randox home blood test kits in Ireland from €57. Order your kit, collect your sample following the instructions, and post it to the Randox laboratory in the included freepost envelope. Turnaround varies by test, from 2–3 working days to 4–6 weeks after the laboratory receives your sample. If you would like a doctor to explain your results, book an optional follow-up consultation with an IMC-registered Global Health doctor from €45.",
  whyChooseItems: [
    "Order your Randox kit — choose your test and add it to your cart. Your kit is dispatched within 1–2 working days.",
    "Take your sample at home — follow the instructions included in the kit (finger-prick or venous self-collection, depending on the test).",
    "Post your sample to the Randox lab — a freepost return envelope is included in every kit.",
    "Receive your results — turnaround varies by test, from 2–3 working days to 4–6 weeks after your sample reaches the lab.",
    "Optional — book a follow-up consultation with an IMC-registered Global Health doctor from €45 to review your results and advise on next steps.",
  ],
  faq: [
    {
      question: "How does a home blood test kit work?",
      answer:
        "You order your kit online, take your own sample at home following the step-by-step instructions provided, and post it to the Randox laboratory using the included freepost envelope. Randox analyses your sample and delivers your results digitally. Turnaround varies by test, from 2–3 working days to 4–6 weeks after the laboratory receives your sample.",
    },
    {
      question: "Is a venous blood draw difficult to do at home?",
      answer:
        "The venous self-collection kit is designed for home use and comes with clear instructions. The Full Blood Count is also available as a simpler finger-prick sample. You do not need to visit a clinic.",
    },
    {
      question: "How long do home blood test results take in Ireland?",
      answer:
        "Turnaround varies by test. Current estimates range from 2–3 working days to 4–6 weeks after the laboratory receives your sample; check the timeline shown on the individual test page.",
    },
    {
      question: "Who analyses my blood sample?",
      answer:
        "Your sample is analysed by Randox, a UKAS-accredited laboratory trusted across the UK and Ireland. Your results are delivered to you directly by Randox.",
    },
    {
      question: "What happens if my results show something abnormal?",
      answer:
        "Your results are delivered to you by Randox. If anything looks abnormal, or you are unsure what your results mean, we recommend booking a follow-up consultation with an IMC-registered Global Health doctor (from €45), who can explain your results and advise on next steps. In a medical emergency, call 112 or attend your nearest emergency department.",
    },
    {
      question: "Is a doctor consultation included in the home blood test price?",
      answer:
        "No. The listed test price covers the Randox kit and laboratory analysis. A doctor review is optional and booked separately as a follow-up consultation with an IMC-registered Global Health doctor from €45.",
    },
    {
      question: "Can I get these tests on the HSE?",
      answer:
        "Some blood tests may be available through the HSE or your GP, sometimes at no cost. Our home test kits are a convenient private option you can order and complete at home, without a referral or waiting for an appointment.",
    },
    {
      question: "Are Randox tests clinically accurate?",
      answer:
        "Yes. Randox is a UKAS-accredited laboratory and the kits are clinical-grade. Sample quality depends on following the collection instructions provided in your kit.",
    },
  ],
};

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalJson(child)]),
    );
  }
  return value;
}

const translationSelect = {
  id: true,
  pageContentId: true,
  locale: true,
  updatedAt: true,
  heroTitle: true,
  heroSubtitle: true,
  seoDescription: true,
  intro: true,
  whyChooseItems: true,
  faq: true,
} as const;

type ContentFields = {
  heroTitle: string | null;
  heroSubtitle: string | null;
  seoDescription: string | null;
  intro: string | null;
  whyChooseItems: unknown;
  faq: unknown;
};

const content = (row: ContentFields | null) => ({
  heroTitle: row?.heroTitle,
  heroSubtitle: row?.heroSubtitle,
  seoDescription: row?.seoDescription,
  intro: row?.intro,
  whyChooseItems: canonicalJson(row?.whyChooseItems),
  faq: canonicalJson(row?.faq),
});

type ReadClient = Pick<Prisma.TransactionClient, "healthTest" | "pageContentTranslation">;

function readTranslation(db: ReadClient = prisma) {
  return db.pageContentTranslation.findUnique({
    where: { id: TRANSLATION_ID },
    select: translationSelect,
  });
}

function readCatalogue(db: ReadClient = prisma) {
  return db.healthTest.findMany({
    where: { country: { code: "ie" }, isActive: true },
    select: { id: true, priceCents: true, currencyCode: true, resultsTimeline: true, updatedAt: true },
    orderBy: { id: "asc" },
  });
}

export function assertCatalogue(rows: ReadonlyArray<{
  priceCents: number;
  currencyCode: string;
  resultsTimeline: string | null;
}>): void {
  const timelines = rows.map(({ resultsTimeline }) => (resultsTimeline ?? "").toLowerCase().replaceAll("–", "-"));
  if (
    rows.length !== 14 ||
    rows.some(({ currencyCode }) => currencyCode !== "EUR") ||
    Math.min(...rows.map(({ priceCents }) => priceCents)) !== 5_700 ||
    !timelines.some((value) => value.includes("2-3 working days")) ||
    !timelines.some((value) => value.includes("4-6 weeks"))
  ) {
    throw new Error("Ireland lab catalogue changed; refusing hub overwrite");
  }
}

export function assertCatalogueFingerprint(rows: unknown): void {
  if (hash(rows) !== EXPECTED_CATALOGUE_HASH) {
    throw new Error("Ireland lab catalogue fingerprint changed; refusing hub overwrite");
  }
}

async function main(): Promise<void> {
  const [existing, catalogue] = await Promise.all([readTranslation(), readCatalogue()]);
  if (!existing || existing.pageContentId !== PAGE_CONTENT_ID || existing.locale !== "EN") {
    throw new Error("Published Ireland HEALTH_TESTS translation identity mismatch");
  }
  assertCatalogue(catalogue);
  assertCatalogueFingerprint(catalogue);
  const currentHash = hash(content(existing));
  const targetHash = hash(content(TARGET));
  console.table([{ mode: APPLY ? "APPLY" : "DRY RUN", currentHash, targetHash }]);
  if (currentHash !== EXPECTED_CURRENT_HASH && currentHash !== targetHash) {
    throw new Error("Ireland lab hub content changed; refusing overwrite");
  }
  if (!APPLY) return;

  await prisma.$transaction(async (tx) => {
    const [locked, lockedCatalogue] = await Promise.all([
      readTranslation(tx),
      readCatalogue(tx),
    ]);
    assertCatalogue(lockedCatalogue);
    assertCatalogueFingerprint(lockedCatalogue);
    if (!locked || hash(content(locked)) !== currentHash) {
      throw new Error("Ireland lab hub changed after preparation");
    }

    if (currentHash !== targetHash) {
      const updated = await tx.pageContentTranslation.updateMany({
        where: { id: TRANSLATION_ID, updatedAt: existing.updatedAt },
        data: TARGET,
      });
      if (updated.count !== 1) throw new Error("Concurrent Ireland lab hub update detected");
    }

    const [saved, savedCatalogue] = await Promise.all([
      readTranslation(tx),
      readCatalogue(tx),
    ]);
    if (
      !saved ||
      hash(content(saved)) !== targetHash ||
      hash(savedCatalogue) !== hash(lockedCatalogue)
    ) {
      throw new Error("Ireland lab hub transactional verification failed");
    }
  }, { isolationLevel: "Serializable", timeout: 30_000 });
  console.log("VERIFIED: Ireland lab hub facts corrected; product catalogue unchanged");
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
