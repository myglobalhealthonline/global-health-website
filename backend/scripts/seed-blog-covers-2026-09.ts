/**
 * Cover images for the Week 3 (September 2026) editorial batch. One hero per
 * article, six in total, generated from
 * scripts/content/blog-week3-2026-09/IMAGE-PROMPTS.md. Same pipeline as
 * seed-blog-covers-2026-09.ts; only the cover table differs. The six rows are
 * primary-language DRAFTs with no translation rows, so per-locale alt text is
 * not needed yet — COVER_ALTS is left empty and the loop is a no-op.
 *
 *   node --env-file=.env --import tsx scripts/seed-blog-covers-2026-09.ts           # dry run
 *   node --env-file=.env --import tsx scripts/seed-blog-covers-2026-09.ts --apply   # write
 *
 * What a run does, per article:
 *   1. converts the source PNG to WebP (same pipeline the admin uploader uses),
 *      capping width at 1600px — heroes render at most ~1200px wide,
 *   2. uploads it to a STABLE S3 key, so a re-run overwrites in place instead
 *      of orphaning objects in the bucket,
 *   3. upserts the Asset row on its unique (kind, key) with the SEO fields,
 *   4. points BlogPost.coverAssetId at it.
 *
 * Asset.path MUST be "/api/media/" + the S3 key. A bare key renders as a
 * broken image with no error anywhere — the trap that cost a round on the
 * service-image seed (see scripts/applied/seed-service-images.ts).
 *
 * Alt text is per LOCALE. One image serves all six languages of an article,
 * but its description is prose and belongs in the language of the page around
 * it. The article's authored locale reads Asset.altText (set here, edited with
 * the image in the admin); every other locale reads
 * BlogTranslation.coverImageAlt, whose strings live in
 * scripts/data/blog-cover-alts-2026-08.ts. Missing either one, the public page
 * falls back to the asset's alt and then to the displayed title
 * (blog-post-page.tsx), so a gap degrades to something correct.
 *
 * Existing covers are never replaced: a post that already has a cover this
 * script did not set is reported and skipped, so an admin's choice wins.
 */
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { prisma } from "../src/db/prisma.js";
import { isMediaStorageConfigured, putObject } from "../src/services/object-storage.js";
const COVER_ALTS: Record<string, Record<string, string>> = {};
import type { LocaleCode } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const ONLY_ARG = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const ONLY = ONLY_ARG
  ? new Set(ONLY_ARG.split(",").map((value) => value.trim()).filter(Boolean))
  : null;

const SEEDED_BY = "seed-blog-covers-2026-09";
const SOURCE_DIR = "C:/Users/kingh/Downloads";
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 82;

type Cover = {
  /** Generated file, numbered in IMAGE-PROMPTS.md order. */
  file: string;
  /** The article's authored post — slug + locale identify it uniquely. */
  postSlug: string;
  postLocale: LocaleCode;
  /**
   * Fixed UUID for the S3 key. isSafeMediaKey (src/utils/media-key.ts) only
   * serves `media/<uuid>-<file>` and `media/<scope>/<actorId>/<uuid>-<file>`
   * through /api/media/*, so a descriptive-folder key uploads happily and then
   * 400s for every visitor. These are hardcoded rather than generated so a
   * re-run overwrites the same object instead of orphaning one in the bucket.
   */
  uuid: string;
  /** Stable S3 basename. Also the human-readable half of the media URL. */
  name: string;
  altText: string;
  title: string;
  caption: string;
  description: string;
};

const COVERS: Cover[] = [
  {
    file: "1.png",
    postSlug: "adult-adhd-assessment-ireland-public-private-routes",
    postLocale: "EN",
    uuid: "4f0610fb-9377-4a4e-b0e3-f23fc1669b18",
    name: "adult-adhd-assessment-ireland-consulting-room",
    altText:
      "Clinician listening to a patient during an adult ADHD assessment in a calm Georgian consulting room in Dublin.",
    title: "Adult ADHD assessment conversation in Ireland",
    caption:
      "A proper ADHD assessment is a long, structured conversation and a developmental history, not a questionnaire score.",
    description:
      "Editorial hero for the Irish adult ADHD assessment guide. Two armchairs at an angle, a clinician listening with a closed notebook on his knee, the patient seen from behind the shoulder. Chosen to show the assessment as being heard properly, not as a form or a test.",
  },
  {
    file: "2.png",
    postSlug: "baixa-psicologica-como-pedir-quanto-recebe",
    postLocale: "PT",
    uuid: "96d40f08-bb83-4c68-85cf-1c5cb0a6d854",
    name: "baixa-psicologica-descanso-mesa-cozinha-lisboa",
    altText:
      "Mulher sentada à mesa da cozinha em Lisboa, com o portátil fechado, a olhar pela janela no primeiro dia de baixa psicológica.",
    title: "O primeiro dia de uma baixa psicológica",
    caption:
      "Parar é uma decisão médica e administrativa; recuperar é o que a baixa serve para permitir.",
    description:
      "Imagem principal do guia sobre baixa psicológica em Portugal. Uma mulher em repouso à mesa da cozinha, portátil fechado, telemóvel apagado, luz atlântica pelas portadas de madeira. A cena mostra descanso escolhido, sem dramatizar sofrimento.",
  },
  {
    file: "3.png",
    postSlug: "neschopenka-vychazky-pravidla-kontrola",
    postLocale: "CS",
    uuid: "c352c94a-de6a-4f39-b65e-a25a1b1006cc",
    name: "vychazky-neschopenka-navrat-domu-praha",
    altText:
      "Žena v kabátě se vrací z povolené vycházky během neschopenky k domovním dveřím v Praze, vedle vchodu panel se zvonky.",
    title: "Návrat z povolené vycházky během neschopenky",
    caption:
      "Vycházky povoluje lékař, nejvýše šest hodin denně mezi 7. a 19. hodinou; zvonek se jmenovkou je vaše povinnost.",
    description:
      "Hlavní obrázek k průvodci vycházkami na neschopence. Žena u zahradní branky činžovního domu v podvečerním světle, panel se zvonky u vchodu v popředí, tramvaj a Hrad v pozadí. Klidná, zákonná chvíle venku, bez dramatu.",
  },
  {
    file: "4.png",
    postSlug: "como-bajar-la-tension-que-funciona-segun-la-evidencia",
    postLocale: "ES",
    uuid: "0c71f264-1c34-4e86-be5c-392dd096255e",
    name: "bajar-la-tension-dieta-mediterranea-tensiometro",
    altText:
      "Manos cortando tomates junto a aceite de oliva, perejil y un tensiómetro de brazo con cuaderno en una cocina mediterránea.",
    title: "Lo que baja la tensión de verdad",
    caption:
      "Menos sal, dieta mediterránea y mediciones bien hechas en casa: las medidas con efecto demostrado, sin infusiones milagro.",
    description:
      "Imagen principal de la guía española sobre cómo bajar la tensión. Verduras frescas, aceite de oliva sin etiqueta y un tensiómetro de brazo validado junto a un cuaderno; el salero, apartado al borde del encuadre. Sin tés ni remedios caseros.",
  },
  {
    file: "5.png",
    postSlug: "tensiune-mica-cauze-ce-sa-faci-cand-mergi-la-medic",
    postLocale: "RO",
    uuid: "8b330a38-7227-438b-ac49-9165aa39803e",
    name: "tensiune-mica-asezat-pe-scara-pahar-cu-apa",
    altText:
      "Femeie așezată pe o treaptă în holul unui bloc, cu un pahar cu apă în mână și mâna unei persoane pe umăr, după o amețeală.",
    title: "Ce faci pe loc când ai tensiune mică",
    caption:
      "Așezat, cu apă și cu cineva aproape: manevrele din ghidul european, nu apă cu zahăr sau vitamine.",
    description:
      "Imaginea principală a ghidului românesc despre tensiunea mică. O femeie s-a așezat pe scară după o amețeală, ține un pahar cu apă, o mână prietenoasă pe umăr. Scena arată pauza corectă, fără leșin dramatizat și fără medicamente.",
  },
  {
    file: "6.png",
    postSlug: "atestado-de-comparecimento-abona-falta-diferenca-atestado-medico",
    postLocale: "PT",
    uuid: "26157325-b870-4aa6-9359-835a016a300a",
    name: "atestado-de-comparecimento-recepcao-clinica-carimbo",
    altText:
      "Recepcionista carimba uma declaração de comparecimento no balcão de uma clínica em São Paulo e a entrega ao paciente.",
    title: "Declaração de comparecimento na saída da consulta",
    caption:
      "A declaração comprova o horário do atendimento; abonar o dia inteiro depende do atestado médico ou da política da empresa.",
    description:
      "Imagem principal do guia brasileiro sobre atestado de comparecimento. Mãos da recepcionista carimbando um cartão em branco no balcão, o paciente estendendo a mão com relógio no pulso, rua movimentada ao fundo. O documento é pequeno e rápido; o dia continua.",
  },
];

function s3Key(cover: Cover): string {
  return `media/${cover.uuid}-${cover.name}.webp`;
}

function assetKey(name: string): string {
  return `blog-cover/blog-week3-2026-09-${name}`;
}

function kb(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

async function main(): Promise<void> {
  const targets = ONLY
    ? COVERS.filter((c) => ONLY.has(c.file) || ONLY.has(c.postSlug) || ONLY.has(c.name))
    : COVERS;
  if (targets.length === 0) {
    console.error(`No cover matches --only=${ONLY_ARG}`);
    process.exitCode = 1;
    return;
  }

  if (APPLY && !isMediaStorageConfigured()) {
    console.error("Object storage is not configured — refusing to run with --apply.");
    process.exitCode = 1;
    return;
  }

  console.log(`${APPLY ? "APPLY" : "DRY RUN"} — ${targets.length} cover image(s)\n`);

  // ---- resolve everything before writing anything ----
  const errors: string[] = [];
  const prepared: Array<{ cover: Cover; postId: string; postTitle: string; webp: Buffer | null; source: number; width: number; height: number; existingCover: { key: string } | null }> = [];

  for (const cover of targets) {
    const post = await prisma.blogPost.findFirst({
      where: { slug: cover.postSlug, locale: cover.postLocale },
      select: { id: true, title: true, coverAsset: { select: { key: true } } },
    });
    if (!post) {
      errors.push(`${cover.file}: no ${cover.postLocale} post with slug "${cover.postSlug}"`);
      continue;
    }

    // The generated PNGs live outside the repo and get cleared out of
    // Downloads eventually. Once an image is in the bucket the source is no
    // longer needed: a re-run then refreshes the metadata and the per-locale
    // alt text without re-uploading. Only a cover that exists in NEITHER place
    // is an error.
    let source: Buffer | null = null;
    try {
      source = await readFile(`${SOURCE_DIR}/${cover.file}`);
    } catch {
      const existingAsset = await prisma.asset.findUnique({
        where: { kind_key: { kind: "IMAGE", key: assetKey(cover.name) } },
        select: { id: true },
      });
      if (!existingAsset) {
        errors.push(`${cover.file}: not in ${SOURCE_DIR} and never uploaded — nothing to seed`);
        continue;
      }
    }

    const webp = source
      ? await sharp(source, { animated: false })
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer()
      : null;
    const meta = webp ? await sharp(webp).metadata() : null;

    prepared.push({
      cover,
      postId: post.id,
      postTitle: post.title,
      webp,
      source: source?.length ?? 0,
      width: meta?.width ?? 0,
      height: meta?.height ?? 0,
      existingCover: post.coverAsset,
    });
  }

  if (errors.length > 0) {
    console.error(`REFUSING TO RUN — ${errors.length} problem(s):\n`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exitCode = 1;
    return;
  }

  // ---- report + write ----
  let created = 0, updated = 0, skipped = 0, altsWritten = 0;

  for (const item of prepared) {
    const { cover, postId, postTitle, webp, source, width, height, existingCover } = item;
    const key = s3Key(cover);
    const ours = assetKey(cover.name);
    const foreignCover = existingCover && existingCover.key !== ours;

    console.log(`${cover.file} → ${cover.postLocale} ${cover.postSlug}`);
    console.log(`    "${postTitle}"`);
    console.log(
      webp
        ? `    ${width}×${height} · ${kb(source)} PNG → ${kb(webp.length)} WebP · /api/media/${key}`
        : `    already uploaded, source gone — metadata and alt text only · /api/media/${key}`,
    );
    console.log(`    alt (${cover.postLocale}): ${cover.altText}`);
    console.log(`    per-locale alt: ${Object.keys(COVER_ALTS[cover.name] ?? {}).join(", ") || "none"}`);
    if (foreignCover) {
      console.log(`    ! post already has a different cover (${existingCover.key}) — leaving it alone`);
    }

    if (!APPLY) {
      console.log("");
      continue;
    }

    if (foreignCover) {
      skipped++;
      console.log("");
      continue;
    }

    if (webp) await putObject(key, webp, "image/webp");

    const assetData = {
      path: `/api/media/${key}`,
      altText: cover.altText,
      title: cover.title,
      caption: cover.caption,
      description: cover.description,
      usageNote: `Blog cover · ${SEEDED_BY} · ${cover.postLocale} ${cover.postSlug}`,
      isActive: true,
    };
    const asset = await prisma.asset.upsert({
      where: { kind_key: { kind: "IMAGE", key: ours } },
      create: { kind: "IMAGE", key: ours, ...assetData },
      update: assetData,
      select: { id: true },
    });

    await prisma.blogPost.update({ where: { id: postId }, data: { coverAssetId: asset.id } });
    if (existingCover) updated++; else created++;

    // Per-locale alt text. The asset's own altText covers the article's
    // authored locale; every other locale reads BlogTranslation.coverImageAlt,
    // so a Czech reader gets a Czech description of the same photograph.
    // A locale with no translation row yet is skipped rather than created —
    // the article seeder owns those rows.
    const alts = COVER_ALTS[cover.name] ?? {};
    for (const [locale, alt] of Object.entries(alts)) {
      if (locale === cover.postLocale) continue;
      const translation = await prisma.blogTranslation.findUnique({
        where: { postId_locale: { postId, locale } },
        select: { id: true },
      });
      if (!translation) {
        console.log(`    ! no ${locale} translation row — alt text skipped`);
        continue;
      }
      await prisma.blogTranslation.update({ where: { id: translation.id }, data: { coverImageAlt: alt } });
      altsWritten++;
    }
    console.log("");
  }

  if (!APPLY) {
    console.log("Dry run only — pass --apply to upload and link.\n");
    return;
  }
  console.log(`Done. linked ${created} · re-linked ${updated} · skipped ${skipped}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
