/**
 * Correct the Certificate of Incapacity submission route without overwriting
 * later admin edits to the published English article. Dry-run is the default.
 *
 * From backend/:
 *   node --env-file=.env --import tsx scripts/update-published-ie-illness-benefit-2026-08.ts
 *   node --env-file=.env --import tsx scripts/update-published-ie-illness-benefit-2026-08.ts --apply
 */
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const EXPECTED_RECORD_ID = "cmsep1bn500007ojufmljevml";
const EXPECTED_SLUG = "illness-benefit-ireland-how-to-claim";
const EXPECTED_TRANSLATIONS = ["CS", "DE", "ES", "PT", "RO"] as const;
const CORRECTION = "illness-benefit-paper-certificate-2026-08-30";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
type Replacement = readonly [before: string, after: string];
const ADDRESS_REPLACEMENT: Replacement = ["PO Box 1650, Dublin 1", "PO Box 1650, D01 WY03"];

export const ENGLISH_REPLACEMENTS = [
  [
    "which the doctor submits to the Department for you.",
    "The doctor can send the certificate electronically; if they do not, you must post the paper certificate to the Department yourself.",
  ],
  [
    "In practice the certificate does not travel with you. The doctor issues it and sends it to the Department — some practices file electronically, others by post, and either way it is not something you post yourself. Your job is to make sure the doctor has your <strong>PPS number</strong> and your correct personal details, because a mismatch between the certificate and your claim is what stalls payment.",
    "The route depends on the practice. A doctor can complete and send the certificate electronically. If they do not, the doctor gives you a paper certificate and <strong>you must post it</strong> to Social Welfare Services, PO Box 1650, Dublin 1. Ask which route was used, and make sure the doctor has your <strong>PPS number</strong> and correct personal details, because a mismatch between the certificate and your claim can stall payment.",
  ],
  [
    "<strong>The doctor issues the Certificate of Incapacity for Work</strong> and submits it to the Department.",
    "<strong>The doctor completes the Certificate of Incapacity for Work.</strong> They may send it electronically; otherwise, you must post the paper certificate to the Department.",
  ],
  [
    "If the doctor finds you unfit for work, they issue a Certificate of Incapacity for Work and submit it to the Department of Social Protection.",
    "If the doctor finds you unfit for work, they complete a Certificate of Incapacity for Work. The doctor may send it electronically; if they give you a paper certificate, you must post it to the Department of Social Protection.",
  ],
  ["Irish Medical Council, The doctor", "Irish Medical Council. The doctor"],
] as const;

const TRANSLATION_REPLACEMENTS: Record<string, readonly Replacement[]> = {
  PT: [
    [
      "que o próprio médico submete ao Departamento por si.",
      "O médico pode enviá-lo por via eletrónica; se não o fizer, tem de enviar o certificado em papel ao Departamento.",
    ],
    [
      "Na prática, o certificado não viaja consigo. O médico emite-o e envia-o ao Departamento — há consultórios que o fazem por via eletrónica e outros por correio; em caso algum é o doente que o envia. A sua parte é garantir que o médico tem o seu <strong>número PPS</strong> e os seus dados corretos, porque é a divergência entre o certificado e o pedido que trava o pagamento.",
      "O percurso depende do consultório. O médico pode preencher e enviar o certificado por via eletrónica. Se não o fizer, entrega-lhe um certificado em papel e <strong>é o requerente que tem de o enviar</strong> para Social Welfare Services, PO Box 1650, Dublin 1. Confirme qual foi a via usada e garanta que o médico tem o seu <strong>número PPS</strong> e os dados corretos, porque uma divergência entre o certificado e o pedido pode travar o pagamento.",
    ],
    [
      "<strong>O médico emite o Certificate of Incapacity for Work</strong> e submete-o ao Departamento.",
      "<strong>O médico preenche o Certificate of Incapacity for Work.</strong> Pode enviá-lo eletronicamente; caso contrário, tem de enviar o certificado em papel ao Departamento.",
    ],
    [
      "Se o médico concluir que está incapaz para o trabalho, emite um Certificate of Incapacity for Work e submete-o ao Department of Social Protection.",
      "Se o médico concluir que está incapaz para o trabalho, preenche um Certificate of Incapacity for Work. O médico pode enviá-lo eletronicamente; se lhe entregar um certificado em papel, tem de o enviar ao Department of Social Protection.",
    ],
    ["Irish Medical Council, O médico", "Irish Medical Council. O médico"],
  ],
  ES: [
    [
      "que el propio médico envía al Departamento por usted.",
      "El médico puede enviarlo electrónicamente; si no lo hace, usted debe enviar por correo el certificado en papel al Departamento.",
    ],
    [
      "En la práctica el certificado no viaja con usted. El médico lo emite y lo envía al Departamento: unas consultas lo tramitan electrónicamente y otras por correo postal, pero en ningún caso lo envía usted. Su parte consiste en asegurarse de que el médico tiene su <strong>número PPS</strong> y sus datos correctos, porque lo que bloquea el pago es la discrepancia entre el certificado y la solicitud.",
      "La vía depende de la consulta. El médico puede cumplimentar y enviar el certificado electrónicamente. Si no lo hace, le entrega un certificado en papel y <strong>usted debe enviarlo por correo</strong> a Social Welfare Services, PO Box 1650, Dublin 1. Confirme qué vía se utilizó y asegúrese de que el médico tiene su <strong>número PPS</strong> y sus datos correctos, porque una discrepancia entre el certificado y la solicitud puede bloquear el pago.",
    ],
    [
      "<strong>El médico emite el Certificate of Incapacity for Work</strong> y lo envía al Departamento.",
      "<strong>El médico cumplimenta el Certificate of Incapacity for Work.</strong> Puede enviarlo electrónicamente; si no, usted debe enviar por correo el certificado en papel al Departamento.",
    ],
    [
      "Si el médico concluye que está incapacitado para trabajar, emite un Certificate of Incapacity for Work y lo envía al Department of Social Protection.",
      "Si el médico concluye que está incapacitado para trabajar, cumplimenta un Certificate of Incapacity for Work. El médico puede enviarlo electrónicamente; si le entrega un certificado en papel, usted debe enviarlo por correo al Department of Social Protection.",
    ],
    ["Irish Medical Council, El médico", "Irish Medical Council. El médico"],
  ],
  CS: [
    [
      "které lékař odešle úřadu za vás.",
      "Lékař jej může odeslat elektronicky; pokud to neudělá, musíte papírové potvrzení poslat úřadu sami.",
    ],
    [
      "V praxi potvrzení necestuje s vámi. Lékař jej vystaví a odešle úřadu — některé ordinace elektronicky, jiné poštou; vy jej neposíláte v žádném případě. Vaším úkolem je zajistit, aby měl lékař vaše <strong>PPS číslo</strong> a správné údaje, protože právě nesoulad mezi potvrzením a žádostí výplatu blokuje.",
      "Postup závisí na ordinaci. Lékař může potvrzení vyplnit a odeslat elektronicky. Pokud to neudělá, dostanete papírové potvrzení a <strong>musíte je poslat</strong> na Social Welfare Services, PO Box 1650, Dublin 1. Ověřte si, jaký postup byl použit, a zajistěte, aby měl lékař vaše <strong>PPS číslo</strong> a správné údaje, protože nesoulad mezi potvrzením a žádostí může výplatu zablokovat.",
    ],
    [
      "<strong>Lékař vystaví Certificate of Incapacity for Work</strong> a odešle jej úřadu.",
      "<strong>Lékař vyplní Certificate of Incapacity for Work.</strong> Může jej odeslat elektronicky; jinak musíte papírové potvrzení poslat úřadu sami.",
    ],
    [
      "Pokud dojde k závěru, že jste práce neschopní, vystaví Certificate of Incapacity for Work a odešle jej Department of Social Protection.",
      "Pokud dojde k závěru, že jste práce neschopní, vyplní Certificate of Incapacity for Work. Lékař jej může odeslat elektronicky; pokud vám dá papírové potvrzení, musíte je poslat Department of Social Protection sami.",
    ],
    ["Irish Medical Council, Lékař", "Irish Medical Council. Lékař"],
  ],
  RO: [
    [
      "pe care medicul îl transmite instituției în locul dumneavoastră.",
      "Medicul îl poate transmite electronic; dacă nu o face, dumneavoastră trebuie să trimiteți prin poștă certificatul pe hârtie către instituție.",
    ],
    [
      "În practică, certificatul nu călătorește cu dumneavoastră. Medicul îl eliberează și îl trimite instituției — unele cabinete electronic, altele prin poștă; în niciun caz nu îl trimiteți dumneavoastră. Rolul dumneavoastră este să vă asigurați că medicul are <strong>numărul PPS</strong> și datele corecte, pentru că neconcordanța dintre certificat și cerere blochează plata.",
      "Procedura depinde de cabinet. Medicul poate completa și transmite certificatul electronic. Dacă nu o face, vă dă un certificat pe hârtie și <strong>dumneavoastră trebuie să îl trimiteți prin poștă</strong> la Social Welfare Services, PO Box 1650, Dublin 1. Verificați ce procedură a fost folosită și asigurați-vă că medicul are <strong>numărul PPS</strong> și datele corecte, deoarece o neconcordanță între certificat și cerere poate bloca plata.",
    ],
    [
      "<strong>Medicul eliberează Certificate of Incapacity for Work</strong> și îl transmite instituției.",
      "<strong>Medicul completează Certificate of Incapacity for Work.</strong> Îl poate transmite electronic; în caz contrar, dumneavoastră trebuie să trimiteți prin poștă certificatul pe hârtie către instituție.",
    ],
    [
      "Dacă medicul conchide că sunteți inapt de muncă, eliberează un Certificate of Incapacity for Work și îl transmite către Department of Social Protection.",
      "Dacă medicul conchide că sunteți inapt de muncă, completează un Certificate of Incapacity for Work. Medicul îl poate transmite electronic; dacă vă dă un certificat pe hârtie, dumneavoastră trebuie să îl trimiteți prin poștă către Department of Social Protection.",
    ],
    ["Irish Medical Council, Medicul", "Irish Medical Council. Medicul"],
  ],
  DE: [
    [
      "das die Ärztin oder der Arzt für Sie an die Behörde übermittelt.",
      "Die Praxis kann es elektronisch übermitteln; geschieht das nicht, müssen Sie die Papierbescheinigung selbst per Post an die Behörde senden.",
    ],
    [
      "In der Praxis reisen Sie nicht mit der Bescheinigung. Die Ärztin oder der Arzt stellt sie aus und schickt sie an die Behörde — manche Praxen elektronisch, andere per Post; Sie selbst versenden sie nie. Ihre Aufgabe ist es, dafür zu sorgen, dass Ihre <strong>PPS-Nummer</strong> und Ihre Daten korrekt vorliegen — denn es ist die Abweichung zwischen Bescheinigung und Antrag, die die Zahlung stoppt.",
      "Der Übermittlungsweg hängt von der Praxis ab. Die Ärztin oder der Arzt kann die Bescheinigung elektronisch ausfüllen und übermitteln. Geschieht das nicht, erhalten Sie eine Papierbescheinigung und <strong>müssen sie selbst per Post senden</strong> an Social Welfare Services, PO Box 1650, Dublin 1. Fragen Sie nach, welcher Weg genutzt wurde, und achten Sie auf eine korrekte <strong>PPS-Nummer</strong> und korrekte persönliche Daten, weil Abweichungen zwischen Bescheinigung und Antrag die Zahlung verzögern können.",
    ],
    [
      "<strong>Die Praxis stellt das Certificate of Incapacity for Work aus</strong> und übermittelt es an die Behörde.",
      "<strong>Die Praxis füllt das Certificate of Incapacity for Work aus.</strong> Sie kann es elektronisch übermitteln; andernfalls müssen Sie die Papierbescheinigung selbst per Post an die Behörde senden.",
    ],
    [
      "Wird Arbeitsunfähigkeit festgestellt, wird ein Certificate of Incapacity for Work ausgestellt und an das Department of Social Protection übermittelt.",
      "Wird Arbeitsunfähigkeit festgestellt, wird ein Certificate of Incapacity for Work ausgefüllt. Die Praxis kann es elektronisch übermitteln; erhalten Sie eine Papierbescheinigung, müssen Sie sie selbst per Post an das Department of Social Protection senden.",
    ],
    ["Arzt, Die Praxis", "Arzt. Die Praxis"],
  ],
};

export function replaceExactly(input: string, replacements: readonly Replacement[], locale: string): string {
  const corrected = replacements.reduce((body, [before, after]) => {
    const normalizedAfter = after.replace(ADDRESS_REPLACEMENT[0], ADDRESS_REPLACEMENT[1]);
    const beforeCount = body.split(before).length - 1;
    const afterCount = body.split(normalizedAfter).length - 1;
    if (beforeCount === 0 && afterCount === 1) return body;
    if (beforeCount !== 1 || afterCount !== 0) {
      throw new Error(`Expected one ${locale} correction target: ${before.slice(0, 70)}…`);
    }
    return body.replace(before, normalizedAfter);
  }, input);
  const [oldAddress, currentAddress] = ADDRESS_REPLACEMENT;
  const oldCount = corrected.split(oldAddress).length - 1;
  const currentCount = corrected.split(currentAddress).length - 1;
  if (oldCount === 0 && currentCount === 1) return corrected;
  if (oldCount !== 1 || currentCount !== 0) {
    throw new Error(`Expected one ${locale} postal address target`);
  }
  return corrected.replace(oldAddress, currentAddress);
}

async function readPost() {
  return prisma.blogPost.findUnique({
    where: { id: EXPECTED_RECORD_ID },
    select: {
      id: true,
      slug: true,
      locale: true,
      countryId: true,
      status: true,
      body: true,
      publishedAt: true,
      lastReviewedAt: true,
      updatedAt: true,
      editorialChecklist: true,
      translations: {
        select: { id: true, locale: true, content: true, updatedAt: true },
        orderBy: { locale: "asc" },
      },
    },
  });
}

function fingerprint(post: NonNullable<Awaited<ReturnType<typeof readPost>>>): string {
  return hash(JSON.stringify({
    status: post.status,
    body: post.body,
    publishedAt: post.publishedAt,
    lastReviewedAt: post.lastReviewedAt,
    editorialChecklist: post.editorialChecklist,
    translations: post.translations,
  }));
}

async function main() {
  const existing = await readPost();
  if (
    !existing ||
    existing.slug !== EXPECTED_SLUG ||
    existing.locale !== "EN" ||
    existing.countryId !== null ||
    existing.status !== "PUBLISHED"
  ) {
    throw new Error("Expected published Illness Benefit article not found");
  }

  const locales = existing.translations.map(({ locale }) => locale);
  if (JSON.stringify(locales) !== JSON.stringify(EXPECTED_TRANSLATIONS)) {
    throw new Error(`Translation set changed: ${locales.join(", ")}`);
  }

  const currentChecklist = (existing.editorialChecklist ?? {}) as Prisma.InputJsonObject;
  const storedHashes = (currentChecklist.seedHashes ?? {}) as Record<string, string>;
  const nextBody = replaceExactly(existing.body, ENGLISH_REPLACEMENTS, "EN");

  const translations = existing.translations.map((translation) => {
    const replacements = TRANSLATION_REPLACEMENTS[translation.locale];
    if (!replacements) throw new Error(`No corrections configured for ${translation.locale}`);
    const target = replaceExactly(translation.content ?? "", replacements, translation.locale);
    return { ...translation, target, targetHash: hash(target) };
  });
  const preparedFingerprint = fingerprint(existing);

  console.table([
    { locale: "EN", id: existing.id, currentHash: hash(existing.body), nextHash: hash(nextBody) },
    ...translations.map(({ id, locale, content, targetHash }) => ({
      locale,
      id,
      currentHash: hash(content ?? ""),
      nextHash: targetHash,
    })),
  ]);
  console.log(APPLY ? "APPLY" : "DRY RUN");
  if (!APPLY) return;

  const nextSeedHashes = {
    ...storedHashes,
    ...Object.fromEntries(translations.map(({ locale, targetHash }) => [locale, targetHash])),
  };
  const editorialChecklist: Prisma.InputJsonObject = {
    ...currentChecklist,
    seedHashes: nextSeedHashes,
    factualCorrection: CORRECTION,
  };

  await prisma.$transaction(async (tx) => {
    const locked = await tx.blogPost.findUnique({
      where: { id: existing.id },
      select: {
        id: true,
        slug: true,
        locale: true,
        countryId: true,
        status: true,
        body: true,
        publishedAt: true,
        lastReviewedAt: true,
        updatedAt: true,
        editorialChecklist: true,
        translations: {
          select: { id: true, locale: true, content: true, updatedAt: true },
          orderBy: { locale: "asc" },
        },
      },
    });
    if (!locked || fingerprint(locked) !== preparedFingerprint) {
      throw new Error("Production article changed after preparation");
    }

    const postUpdate = await tx.blogPost.updateMany({
      where: { id: existing.id, updatedAt: existing.updatedAt },
      data: { body: nextBody, editorialChecklist },
    });
    if (postUpdate.count !== 1) throw new Error("Published article changed before update");
    for (const translation of translations) {
      const translationUpdate = await tx.blogTranslation.updateMany({
        where: { id: translation.id, updatedAt: translation.updatedAt },
        data: { content: translation.target },
      });
      if (translationUpdate.count !== 1) {
        throw new Error(`${translation.locale} translation changed before update`);
      }
    }
  }, { isolationLevel: "Serializable" });

  const saved = await readPost();
  if (
    !saved ||
    saved.status !== "PUBLISHED" ||
    saved.publishedAt?.toISOString() !== existing.publishedAt?.toISOString() ||
    saved.lastReviewedAt?.toISOString() !== existing.lastReviewedAt?.toISOString() ||
    hash(saved.body) !== hash(nextBody) ||
    saved.translations.length !== translations.length ||
    saved.translations.some((item) => {
      const target = translations.find(({ locale }) => locale === item.locale);
      return !target || hash(item.content ?? "") !== target.targetHash;
    })
  ) {
    throw new Error("Post-write verification failed");
  }
  console.log("VERIFIED: Illness Benefit submission guidance corrected; publication state preserved");
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
