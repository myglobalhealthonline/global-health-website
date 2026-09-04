/* eslint-disable no-console */
/**
 * Correct six already-published non-Czech SEO articles and remove stale
 * reviewer attribution while their checklists still require clinical review.
 * Publication and author state are preserved. Dry-run is the default.
 *
 * From backend/:
 *   node --env-file=.env --import tsx scripts/correct-published-seo-blog-safety-2026-09.ts
 *   node --env-file=.env --import tsx scripts/correct-published-seo-blog-safety-2026-09.ts --apply
 */
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";
import { canonicalJson } from "./correct-published-ie-lab-hub-facts-2026-09.js";
import { RO_TENSIUNE_ARTERIALA_NORMALA } from "./content/blog-week1-2026-08/ro-tensiune-arteriala-normala.js";
import { ES_TENSION_ALTA_URGENCIAS } from "./content/blog-week2-2026-08/es-tension-alta-urgencias.js";
import { IE_ILLNESS_BENEFIT_PAYMENT } from "./content/blog-week2-2026-08/ie-illness-benefit-payment.js";
import { PT_ATESTADO_CARTA_CONDUCAO } from "./content/blog-week2-2026-08/pt-atestado-carta-conducao.js";
import { PT_BAIXA_MEDICA_VALOR } from "./content/blog-week2-2026-08/pt-baixa-medica-valor.js";
import { RO_SCADE_TENSIUNEA_RAPID } from "./content/blog-week2-2026-08/ro-scade-tensiunea-rapid.js";
import { renderArticle } from "./content/blog-seo-2026-08/template.js";
import type { PostSet } from "./content/blog-seo-2026-08/types.js";

const APPLY = process.argv.includes("--apply");
const CORRECTION = "2026-09-02 factual and safety correction; pending review attribution removed";

const TARGETS: Array<{ id: string; set: PostSet; translatedFromSource: boolean }> = [
  { id: "cmt5txspa0002s8julxban3bz", set: RO_TENSIUNE_ARTERIALA_NORMALA, translatedFromSource: false },
  { id: "cmt8la5mj0000csjuzvvr49bg", set: PT_BAIXA_MEDICA_VALOR, translatedFromSource: true },
  { id: "cmt8la96q0002csju6spj0o0n", set: IE_ILLNESS_BENEFIT_PAYMENT, translatedFromSource: true },
  { id: "cmt8lahc30006csjuw55xnemg", set: PT_ATESTADO_CARTA_CONDUCAO, translatedFromSource: true },
  { id: "cmt8laldn0008csjufi90oq5x", set: ES_TENSION_ALTA_URGENCIAS, translatedFromSource: true },
  { id: "cmt8lapi9000acsju2l7jkq5m", set: RO_SCADE_TENSIUNEA_RAPID, translatedFromSource: true },
];

const EXPECTED_PENDING_REVIEW_STATE = new Map([
  ["cmt5txspa0002s8julxban3bz", { reviewerDoctorId: "cmrc4j7oc00se01p2gf7y9ldw", reviewerDisplayName: "Dr Andreea Lorena Bica", lastReviewedAt: "2026-08-25T12:58:50.572Z" }],
  ["cmt8la5mj0000csjuzvvr49bg", { reviewerDoctorId: "cmp5r0if3002kssjug743x0p6", reviewerDisplayName: "Dra. Margarida Domingues e Andrade", lastReviewedAt: "2026-08-29T12:15:31.742Z" }],
  ["cmt8la96q0002csju6spj0o0n", { reviewerDoctorId: "cmqas8yh9000b01pgpc0yp1la", reviewerDisplayName: "Dr Ahmed Maklad", lastReviewedAt: "2026-08-29T12:14:05.272Z" }],
  ["cmt8lahc30006csjuw55xnemg", { reviewerDoctorId: "cmp5r0if3002kssjug743x0p6", reviewerDisplayName: "Dra. Margarida Domingues e Andrade", lastReviewedAt: "2026-08-29T12:14:54.509Z" }],
  ["cmt8laldn0008csjufi90oq5x", { reviewerDoctorId: "cmrdpxpi0001v01ruqavjiq79", reviewerDisplayName: "Dr. Eduardo Daniel Rodríguez Olivas", lastReviewedAt: "2026-08-29T12:13:06.743Z" }],
  ["cmt8lapi9000acsju2l7jkq5m", { reviewerDoctorId: "cmrc4j7oc00se01p2gf7y9ldw", reviewerDisplayName: "Dr Andreea Lorena Bica", lastReviewedAt: "2026-08-29T12:17:32.021Z" }],
]);

export const PENDING_REVIEW_RESET = {
  reviewerDoctorId: null,
  reviewerDisplayName: null,
  lastReviewedAt: null,
} as const;

type PendingReviewState = {
  id: string;
  editorialChecklist: Prisma.JsonValue | null;
  reviewerDoctorId: string | null;
  reviewerDisplayName: string | null;
  lastReviewedAt: Date | null;
};

export function assertPendingReviewState(row: PendingReviewState): void {
  const checklist = row.editorialChecklist;
  if (!checklist || Array.isArray(checklist) || typeof checklist !== "object" || checklist.clinicalReview !== "required") {
    throw new Error(`${row.id}: article is not pending clinical review`);
  }
  if (!row.reviewerDoctorId && !row.reviewerDisplayName && !row.lastReviewedAt) return;
  const expected = EXPECTED_PENDING_REVIEW_STATE.get(row.id);
  if (
    !expected ||
    row.reviewerDoctorId !== expected.reviewerDoctorId ||
    row.reviewerDisplayName !== expected.reviewerDisplayName ||
    row.lastReviewedAt?.toISOString() !== expected.lastReviewedAt
  ) {
    throw new Error(`${row.id}: reviewer state changed; refusing attribution removal`);
  }
}

const EXPECTED_CURRENT_HASHES = new Map<string, string>([
  ["cmt5txspa0002s8julxban3bz", "46346eed118deb432d448628fac6c2427635f798acd0bebac71f8de654757e0c"],
  ["cmt8hc5o50005u0jut456qlz4", "6eded4b2bce05f1727650cd10d3c1559bc284ca2fc5123cfd015ad4aa7206cf8"],
  ["cmt8hc5zg0006u0juatyd46ih", "896daeeab8bad1bb18a8c29b8c09424292329f868170c7afa1c99ad59a46e165"],
  ["cmt8hc6ed0007u0ju7e5zo4x5", "c1b096be21959f7b74ced771c19caec64931e2048b6bfdc2e287ed17225ffecd"],
  ["cmt8hc6pc0008u0jud4ur7o9q", "885eb7ba2714f43274850881936053f7312e6df461270580e73fb1bd973d511c"],
  ["cmt8hc71q0009u0juwp9vd27l", "5f601b8c7ee049c4240e5528e04d526c9cf2395592e766c8b04962c7c14d8819"],
  ["cmt8la5mj0000csjuzvvr49bg", "42af87527f95227456d4d1a9480950a6f3fbd242f98955df11b212f707bb7027"],
  ["cmte4y3dx0001fcjuubhjerst", "229ab5dc4dd686ad952276df786f11c110a85c4df0eff0f8664f109924858da7"],
  ["cmtdvyq7c0001h8juieeimf4y", "46adc2e1cc4ddd4cb3274129f88553538f2beb7715496f70966378f5287a740c"],
  ["cmtdvypr60000h8ju4hcg06a6", "71f2037e642db8701edc27c8823f96e14aa1266f4d0c3e455d97e5ea841e3422"],
  ["cmte4y2zw0000fcju4lqwd4kx", "6c916529c1dccd108ce08b9c1ce1c95d1c1a1aa546e4906afc5cf4765ba527c2"],
  ["cmte4y3nq0002fcjunk1grgz2", "c18500cfa97d68938769bdfaafd004eeacc965ec2108f3c3cd0661cceaad4d1b"],
  ["cmt8la96q0002csju6spj0o0n", "d9e7673f1dc2fe692a7620af78b6e2e2f78c6ac25ac4025ceb5753208747040d"],
  ["cmte4y3xh0003fcjuy03bsgzk", "3802e6ca60270f8ae5d3b12dc14c14b1425534c7111528056c84bb79aa47f93f"],
  ["cmtdvyrjg0005h8ju0u4ksbuo", "e27c6b4e20251f7f00ce49ad484bfd21d64813131eb704798c0e3daa314482df"],
  ["cmtdvyqvk0003h8ju2530re6q", "b10ced0a2d4ed70980412abc328612f73967f0f289d52162723917f54ebb8464"],
  ["cmtdvyr7i0004h8junnxz7us7", "1955a6e1d073bedbe368885d45cb3b00ea37c0042e258bea5d4e326e54fd0b80"],
  ["cmtdvyqjj0002h8juj8r5okra", "1670882685e79febd55b5acfaace27070800fa1cc7e334a365c4c98932c1be79"],
  ["cmt8lahc30006csjuw55xnemg", "a7c05ad40216b75dd6f2834226d89f530a3486f7ecee08656e46022af88a9d08"],
  ["cmte4y5c40008fcjuuqev3o40", "9656b65ef0298da684b1109aa6dbaaa6035f9873cc14c1a3f53a27c6c09c98b2"],
  ["cmtdvysze0009h8ju2ihbsenx", "06922e383526254f6a12ef640911ec5220c62e0bfbc87e973930530e7ffab5c0"],
  ["cmtdvysni0008h8jutez1u5o8", "83c674fb42cd3af958aac54c6d428c7cd98001e4a67c85773ed6f9c521e5fa7c"],
  ["cmte4y52j0007fcjupteckykc", "9458e67a257def5a18b3845184b4f1895c1c09765b14287af3cf17fddddb9958"],
  ["cmte4y5ll0009fcjufmdrrz9o", "c30a827f04c05a988b89627c38bf8210a867b3023b32068cff2c42954416815c"],
  ["cmt8laldn0008csjufi90oq5x", "7cc44aa842a1f6c724d251b725f3dbdde96460b474aaee47ed6eec5ba891ce55"],
  ["cmte4y64k000bfcju1q1bqfkq", "aa51abd4de28d241b55c226fe0c5ea3424c4e5f649ccaed7b37fcdba37a2d7f9"],
  ["cmtdvytrr000bh8juz0lksywk", "412b622edc512517c3cc0f7822059bdf1f69d72bfba3a5a278c861d5196826d9"],
  ["cmtdvytbd000ah8jua4njcutz", "0e6cbfaddbd1242d8966f76e04ea7c5cc50cbfd2cd26cde428d2a5743cadc2c9"],
  ["cmte4y5v5000afcjulyurpijd", "fe1897c0efda38102c64e2d2780736801d94d1f5c912dd2afcfef3fe8e58d8cc"],
  ["cmte4y6du000cfcjuhvxlvi59", "21b3df11bc20c4648cb659ebfa34692a84ea1f0648f70ed54c38c4f244b9864f"],
  ["cmt8lapi9000acsju2l7jkq5m", "7fb4668060c59b9a1d0247628dc422ce08abddb7b85a6c2805fe24aa428cb711"],
  ["cmte4y75t000ffcjubneo7w7w", "ee2d1457eef199d127215dea716b76262fa52d82308a2275d9c86b9dfc00069a"],
  ["cmte4y7f3000gfcjubziz0l8w", "75a71d73053d85e4368226f270f024f82eda88698f9ce02b645ef9815914dc82"],
  ["cmtdvyu84000ch8juyinb2ltk", "5e72c6bd3a83b55eba3c9ac654b2310b00e449d3ae3c207da6f0c81381fa8af4"],
  ["cmte4y6wh000efcjuo7pod9wz", "5371bdcc130b20e0618e2efefaa0c6c443d29c5100de0b2d7a401277d53b09a4"],
  ["cmte4y6n8000dfcjue922hzvp", "a408522cc480e69f42a4d374bd257f730c6e57ba9001de2e72621178c9341a74"],
]);

const REVIEW_REPLACEMENTS: Record<string, Array<[string, string]>> = {
  CS: [
    ["Po odborné stránce zkontrolovala Dr Andreea Lorena Bica, specialistka v oboru neurologie, Global Health România.", "Před zveřejněním je nutná klinická kontrola."],
    ["Článek napsal Dr Robert Gabriel Brindus, praktický lékař a medicínský ředitel Global Health România. Po odborné stránce jej zkontrolovala Dr Andreea Lorena Bica, specialistka v oboru neurologie.", "Článek vytvořený s pomocí AI čeká před zveřejněním na klinickou kontrolu."],
  ],
  DE: [
    ["Klinisch geprüft von Dr. Andreea Lorena Bica, Fachärztin für Neurologie bei Global Health Rumänien.", "Vor der Veröffentlichung ist eine klinische Prüfung erforderlich."],
    ["Artikel von Dr. Robert Gabriel Brindus, Hausarzt und medizinischer Direktor bei Global Health Rumänien, klinisch geprüft von Dr. Andreea Lorena Bica, Fachärztin für Neurologie.", "KI-unterstützter Artikel, der vor der Veröffentlichung noch klinisch geprüft werden muss."],
  ],
  EN: [
    ["Clinically reviewed by Dr Andreea Lorena Bica, consultant neurologist, Global Health Romania.", "Clinical review is required before publication."],
    ["Written by Dr Robert Gabriel Brindus, general practitioner and medical director at Global Health Romania, and clinically reviewed by Dr Andreea Lorena Bica, consultant neurologist.", "AI-assisted article pending clinical review before publication."],
  ],
  ES: [
    ["Revisado clínicamente por la Dra. Andreea Lorena Bica, especialista en neurología de Global Health România.", "Pendiente de revisión clínica antes de la publicación."],
    ["Artículo escrito por el Dr. Robert Gabriel Brindus, médico de familia y director médico de Global Health România, y revisado clínicamente por la Dra. Andreea Lorena Bica, especialista en neurología.", "Artículo asistido por IA, pendiente de revisión clínica antes de la publicación."],
  ],
  PT: [
    ["Revisto clinicamente pela Dra. Andreea Lorena Bica, médica especialista em Neurologia, Global Health Roménia.", "Pendente de revisão clínica antes da publicação."],
    ["Artigo escrito pelo Dr. Robert Gabriel Brindus, médico de família e diretor médico da Global Health Roménia, e revisto clinicamente pela Dra. Andreea Lorena Bica, médica especialista em Neurologia.", "Artigo assistido por IA, pendente de revisão clínica antes da publicação."],
  ],
};

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const sameJson = (left: unknown, right: unknown) =>
  JSON.stringify(canonicalJson(left)) === JSON.stringify(canonicalJson(right));

function checklistObject(value: Prisma.JsonValue | null): Prisma.InputJsonObject {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("Expected an editorial checklist object");
  }
  return value as Prisma.InputJsonObject;
}

function replaceOnceOrAlready(value: string, before: string, after: string, locale: string): string {
  if (value.includes(after)) return value;
  const occurrences = value.split(before).length - 1;
  if (occurrences !== 1) throw new Error(`${locale}: expected one exact review phrase, found ${occurrences}`);
  return value.replace(before, after);
}

function correctWeek1Translation(content: string, locale: string): string {
  let target = content;
  const oldThresholds = target.split("120/80").length - 1;
  if (oldThresholds === 4) target = target.replaceAll("120/80", "120/70");
  else if (oldThresholds !== 0 || !target.includes("120/70")) {
    throw new Error(`${locale}: unexpected normal-blood-pressure threshold state`);
  }
  const replacements = REVIEW_REPLACEMENTS[locale];
  if (!replacements) throw new Error(`${locale}: no review-attribution correction configured`);
  for (const [before, after] of replacements) {
    target = replaceOnceOrAlready(target, before, after, locale);
  }
  return target;
}

const postSelect = {
  id: true,
  slug: true,
  locale: true,
  status: true,
  publishedAt: true,
  lastReviewedAt: true,
  reviewerDoctorId: true,
  reviewerDisplayName: true,
  updatedAt: true,
  excerpt: true,
  body: true,
  editorialChecklist: true,
  translations: {
    select: { id: true, locale: true, slug: true, content: true, updatedAt: true },
    orderBy: { locale: "asc" as const },
  },
} satisfies Prisma.BlogPostSelect;

async function readPosts() {
  return prisma.blogPost.findMany({
    where: { id: { in: TARGETS.map(({ id }) => id) } },
    select: postSelect,
    orderBy: { id: "asc" },
  });
}

type Existing = Awaited<ReturnType<typeof readPosts>>[number];

function fingerprint(post: Existing): string {
  return hash(JSON.stringify({
    status: post.status,
    publishedAt: post.publishedAt,
    lastReviewedAt: post.lastReviewedAt,
    reviewerDoctorId: post.reviewerDoctorId,
    reviewerDisplayName: post.reviewerDisplayName,
    updatedAt: post.updatedAt,
    excerpt: post.excerpt,
    body: post.body,
    editorialChecklist: canonicalJson(post.editorialChecklist),
    translations: post.translations,
  }));
}

function assertExpected(id: string, current: string, target: string): void {
  const currentHash = hash(current);
  const targetHash = hash(target);
  const expectedHash = EXPECTED_CURRENT_HASHES.get(id);
  if (!expectedHash) throw new Error(`${id}: no approved current hash`);
  if (currentHash !== expectedHash && currentHash !== targetHash) {
    throw new Error(`${id}: production content changed; refusing overwrite`);
  }
}

type Prepared = {
  existing: Existing;
  targetExcerpt: string;
  targetBody: string;
  targetChecklist: Prisma.InputJsonObject;
  translations: Array<{ id: string; locale: string; updatedAt: Date; current: string; target: string }>;
};

async function prepare(): Promise<Prepared[]> {
  const rows = await readPosts();
  if (rows.length !== TARGETS.length) throw new Error(`Expected ${TARGETS.length} published articles, found ${rows.length}`);

  return TARGETS.map((config) => {
    const existing = rows.find(({ id }) => id === config.id);
    if (!existing || existing.status !== "PUBLISHED" || !existing.publishedAt) {
      throw new Error(`${config.set.key}: expected published production record`);
    }
    assertPendingReviewState(existing);
    if (existing.translations.length !== 5) throw new Error(`${config.set.key}: expected five translations`);
    const primary = config.set.posts.find(({ locale }) => locale === existing.locale);
    if (!primary || primary.slug !== existing.slug) throw new Error(`${config.set.key}: primary identity mismatch`);
    const targetExcerpt = primary.excerpt;
    const oldRomanianExcerpt = "Ce valori sunt normală de fapt la adulți, de ce nu există o altă „normă” doar pentru că înaintezi în vârstă și când o tensiune repetat crescută trebuie discutată cu medicul.";
    if (
      existing.excerpt !== targetExcerpt &&
      !(existing.id === "cmt5txspa0002s8julxban3bz" && existing.excerpt === oldRomanianExcerpt)
    ) {
      throw new Error(`${config.set.key}: production excerpt changed; refusing overwrite`);
    }
    const targetBody = renderArticle(primary.article);
    assertExpected(existing.id, existing.body, targetBody);

    const translations = existing.translations.map((translation) => {
      const current = translation.content ?? "";
      let target: string;
      if (config.translatedFromSource) {
        const source = config.set.posts.find(({ locale }) => locale === translation.locale);
        if (!source || source.slug !== translation.slug) {
          throw new Error(`${config.set.key}/${translation.locale}: translation identity mismatch`);
        }
        target = renderArticle(source.article);
      } else {
        target = correctWeek1Translation(current, translation.locale);
      }
      assertExpected(translation.id, current, target);
      return { id: translation.id, locale: translation.locale, updatedAt: translation.updatedAt, current, target };
    });

    const currentChecklist = checklistObject(existing.editorialChecklist);
    return {
      existing,
      targetExcerpt,
      targetBody,
      targetChecklist: { ...currentChecklist, factualCorrection: CORRECTION },
      translations,
    };
  });
}

async function main(): Promise<void> {
  const prepared = await prepare();
  console.log(APPLY ? "APPLY" : "DRY RUN");
  console.table(prepared.flatMap(({ existing, targetBody, translations }) => [
    { article: existing.slug, locale: existing.locale, id: existing.id, currentHash: hash(existing.body), targetHash: hash(targetBody) },
    ...translations.map(({ id, locale, current, target }) => ({ article: existing.slug, locale, id, currentHash: hash(current), targetHash: hash(target) })),
  ]));
  if (!APPLY) return;

  await prisma.$transaction(async (tx) => {
    for (const item of prepared) {
      const { existing, targetExcerpt, targetBody, targetChecklist, translations } = item;
      const locked = await tx.blogPost.findUnique({ where: { id: existing.id }, select: postSelect });
      if (!locked || fingerprint(locked) !== fingerprint(existing)) {
        throw new Error(`${existing.slug}: production article changed after preparation`);
      }

      if (
        hash(existing.body) !== hash(targetBody) ||
        existing.excerpt !== targetExcerpt ||
        !sameJson(existing.editorialChecklist, targetChecklist) ||
        existing.reviewerDoctorId !== null ||
        existing.reviewerDisplayName !== null ||
        existing.lastReviewedAt !== null
      ) {
        const updated = await tx.blogPost.updateMany({
          where: { id: existing.id, updatedAt: existing.updatedAt },
          data: {
            body: targetBody,
            excerpt: targetExcerpt,
            editorialChecklist: targetChecklist,
            ...PENDING_REVIEW_RESET,
          },
        });
        if (updated.count !== 1) throw new Error(`${existing.slug}: concurrent update detected`);
      }

      for (const translation of translations) {
        if (hash(translation.current) === hash(translation.target)) continue;
        const updated = await tx.blogTranslation.updateMany({
          where: { id: translation.id, updatedAt: translation.updatedAt },
          data: { content: translation.target },
        });
        if (updated.count !== 1) throw new Error(`${existing.slug}/${translation.locale}: concurrent update detected`);
      }
    }
  }, { isolationLevel: "Serializable", timeout: 30_000 });

  const verified = await readPosts();
  for (const item of prepared) {
    const { existing, targetExcerpt, targetBody, targetChecklist, translations } = item;
    const saved = verified.find(({ id }) => id === existing.id);
    if (
      !saved ||
      saved.status !== "PUBLISHED" ||
      saved.publishedAt?.toISOString() !== existing.publishedAt?.toISOString() ||
      saved.lastReviewedAt !== null ||
      saved.reviewerDoctorId !== null ||
      saved.reviewerDisplayName !== null ||
      saved.excerpt !== targetExcerpt ||
      !sameJson(saved.editorialChecklist, targetChecklist) ||
      hash(saved.body) !== hash(targetBody) ||
      translations.some((target) => {
        const translation = saved.translations.find(({ id }) => id === target.id);
        return !translation || hash(translation.content ?? "") !== hash(target.target);
      })
    ) {
      throw new Error(`${existing.slug}: post-write verification failed`);
    }
  }
  console.log("VERIFIED: six published articles corrected; stale reviewer attribution removed");
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
