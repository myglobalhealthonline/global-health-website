/**
 * Cover images for the August 2026 blog SEO and editorial batches. One hero
 * per article, twenty in total. The original twelve briefs live in
 * scripts/content/blog-seo-2026-08/IMAGE-PROMPTS.md; covers 13-20 extend that
 * editorial system to the Week 1 follow-up and Week 2 CMS drafts.
 *
 *   node --env-file=.env --import tsx scripts/seed-blog-covers-2026-08.ts           # dry run
 *   node --env-file=.env --import tsx scripts/seed-blog-covers-2026-08.ts --apply   # write
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
import { COVER_ALTS } from "./data/blog-cover-alts-2026-08.js";
import type { LocaleCode } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const ONLY_ARG = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const ONLY = ONLY_ARG
  ? new Set(ONLY_ARG.split(",").map((value) => value.trim()).filter(Boolean))
  : null;

const SEEDED_BY = "seed-blog-covers-2026-08";
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
    postSlug: "illness-benefit-ireland-how-to-claim",
    postLocale: "EN",
    uuid: "0b0745fb-651a-4da4-ab78-45b10585be38",
    name: "illness-benefit-ireland-claim-form-at-home",
    altText:
      "Woman at a kitchen table in a Dublin house completing an Illness Benefit claim beside a laptop, rain on the window.",
    title: "Claiming Illness Benefit from home in Ireland",
    caption:
      "Most of an Illness Benefit claim is paperwork done at home — the medical certificate is only one part of it.",
    description:
      "Editorial hero for the Irish Illness Benefit guide. A claimant works through the form at her kitchen table on a wet Dublin day, laptop open beside her. Chosen to show the claim as an ordinary administrative task done while unwell, not a clinical scene.",
  },
  {
    file: "2.png",
    postSlug: "blood-tests-dublin-what-to-know",
    postLocale: "EN",
    uuid: "47c24c5e-1295-4893-aefe-678dd378d661",
    name: "blood-test-dublin-phlebotomy-sample-tubes",
    altText:
      "Phlebotomist applying a tourniquet to a patient's arm in a Dublin clinic, colour-capped blood sample tubes ready on a steel tray.",
    title: "Blood test appointment in Dublin",
    caption:
      "The colour of each cap tells the laboratory which test the tube is for — which is why the request matters as much as the draw.",
    description:
      "Editorial hero for the Dublin blood tests guide. The calm moment before a venous draw: tourniquet going on, labelled-free sample tubes lined up by cap colour. No needle in skin, no blood — the frame explains the panel, not the puncture.",
  },
  {
    file: "3.png",
    postSlug: "neschopenka-jak-funguje-eneschopenka",
    postLocale: "CS",
    uuid: "0dca4cbc-5dd0-4352-9e10-22742e43a730",
    name: "eneschopenka-lekar-odesila-z-ordinace",
    altText:
      "Praktický lékař odesílá eNeschopenku z počítače v ordinaci, pacientka v kabátě odchází od stolu.",
    title: "eNeschopenka odeslaná přímo z ordinace",
    caption:
      "Papír už mezi rukama nekoluje: lékař odešle eNeschopenku elektronicky a zaměstnavatel i ČSSZ ji uvidí bez vás.",
    description:
      "Hlavní obrázek k průvodci eNeschopenkou. Lékař odesílá záznam z počítače, papírový blok leží zavřený stranou — celý příběh je přenos dokladu bez papíru. Pacientka odchází, protože už nic dalšího roznášet nemusí.",
  },
  {
    file: "4.png",
    postSlug: "lekar-online-24-7-co-vyresi",
    postLocale: "CS",
    uuid: "e239cb1f-86fc-4680-9a68-9beb3d6031f9",
    name: "lekar-online-24-7-vecerni-konzultace-doma",
    altText:
      "Žena v pražském bytě konzultuje večer zdravotní potíže s lékařem přes tablet, za oknem noční střechy.",
    title: "Lékař online ve chvíli, kdy je jinde zavřeno",
    caption:
      "Většina večerních dotazů nepatří na pohotovost — patří někomu, kdo je právě dostupný.",
    description:
      "Hlavní obrázek k článku o lékaři online 24/7. Klidná noční scéna v bytě: jediné světlo je z tabletu a lampy. Ukazuje typickou situaci, kdy ordinace nefungují, ale stav není urgentní.",
  },
  {
    file: "5.png",
    postSlug: "autodeclaracao-de-doenca-ou-baixa-medica",
    postLocale: "PT",
    uuid: "a380b0f8-18a9-47ab-be5d-d4e9eabec1ad",
    name: "autodeclaracao-de-doenca-no-telemovel",
    altText:
      "Mulher sentada na cama, num quarto em Lisboa, a preencher a autodeclaração de doença no telemóvel.",
    title: "Autodeclaração de doença, feita do telemóvel",
    caption:
      "A autodeclaração resolve-se em minutos e sem médico — o que não substitui um certificado de incapacidade temporária.",
    description:
      "Imagem principal do guia sobre autodeclaração de doença. Um gesto administrativo curto, feito de casa e no início da doença. Deliberadamente sem bata, sem consultório e sem dramatização clínica, porque o artigo distingue autodeclaração de baixa médica.",
  },
  {
    file: "6.png",
    postSlug: "consulta-do-viajante-quando-marcar",
    postLocale: "PT",
    uuid: "c29ae6e2-3cee-4053-8fa4-436b7fada7cd",
    name: "consulta-do-viajante-preparacao-antes-da-viagem",
    altText:
      "Médico pousa o boletim de vacinas sobre um mapa, ao lado de uma mochila meio arrumada, semanas antes da viagem.",
    title: "Consulta do viajante, semanas antes de partir",
    caption:
      "A consulta do viajante vale pelo calendário: algumas vacinas precisam de semanas para proteger.",
    description:
      "Imagem principal do guia da consulta do viajante. Mochila por fazer, mapa aberto, repelente e chapéu — a preparação e não o aeroporto. A mão do médico a pousar o boletim liga a viagem ao ato clínico.",
  },
  {
    file: "7.png",
    postSlug: "baja-laboral-por-ansiedad-como-funciona",
    postLocale: "ES",
    uuid: "0f7ad600-3527-44d6-af31-7dae8f80d479",
    name: "baja-laboral-por-ansiedad-oficina-madrid",
    altText:
      "Trabajadora sentada en una oficina de Madrid con la silla girada hacia la ventana y la pantalla apagada al final de la jornada.",
    title: "Ansiedad y capacidad para trabajar",
    caption:
      "Lo que valora el médico no es la palabra «ansiedad», sino hasta qué punto le impide hacer su trabajo.",
    description:
      "Imagen principal de la guía sobre la baja laboral por ansiedad en España. Oficina vacía a última hora, silla girada, monitor apagado: deterioro funcional mostrado con sobriedad, sin manos en la cabeza ni estigma.",
  },
  {
    file: "8.png",
    postSlug: "dermatologo-online-que-puede-resolver",
    postLocale: "ES",
    uuid: "35a2760b-e362-437b-ad7a-2bdfd9ef3910",
    name: "dermatologo-online-fotografia-de-la-lesion",
    altText:
      "Paciente fotografía con el móvil una lesión del antebrazo junto a la ventana, con una tira de referencia para dar escala.",
    title: "La foto que hace posible la consulta de dermatología",
    caption:
      "Luz natural, tres distancias y una referencia de tamaño: la calidad de la foto decide la calidad de la consulta.",
    description:
      "Imagen principal de la guía de dermatología online en España. Enseña exactamente la técnica que explica el artículo — luz de ventana, sin flash, referencia de escala — con el portátil de revisión desenfocado al fondo. Sin lesión alarmante.",
  },
  {
    file: "9.png",
    postSlug: "scrisoare-medicala-cine-o-elibereaza",
    postLocale: "RO",
    uuid: "9d4d0698-77e1-4253-8058-d51ba6c58fe5",
    name: "scrisoare-medicala-completata-in-doua-exemplare",
    altText:
      "Medic specialist completează scrisoarea medicală în două exemplare, cu ștampila pe birou și pacientul în fața sa.",
    title: "Scrisoarea medicală, completată în cabinet",
    caption:
      "Documentul se întocmește în două exemplare: unul rămâne la medicul care îl eliberează.",
    description:
      "Imaginea principală a ghidului despre scrisoarea medicală. Formular generic, ștampilă și tușieră pe birou, dosarul pacientului la marginea cadrului. Documentar și fără accente comerciale, pentru că articolul explică un act între medici.",
  },
  {
    file: "10.png",
    postSlug: "boli-cronice-programe-nationale-de-sanatate",
    postLocale: "RO",
    uuid: "9018a672-ffca-4a9f-b65c-e7bcd5dfd34a",
    name: "boli-cronice-monitorizare-acasa-intre-controale",
    altText:
      "Pacientă își măsoară tensiunea la masa din bucătărie și își notează valorile într-un caiet, lângă cutia cu medicamente.",
    title: "Monitorizarea unei boli cronice între controale",
    caption:
      "Lunile dintre controale decid evoluția — nu ziua diagnosticului.",
    description:
      "Imaginea principală a ghidului despre bolile cronice și programele naționale de sănătate. Automonitorizare de rutină acasă: tensiune, caiet de valori, organizator săptămânal de medicamente. Fără spital și fără dramatizare.",
  },
  {
    file: "11.png",
    postSlug: "atestado-medico-online-validade",
    postLocale: "PT",
    uuid: "d7c47843-5922-4a91-b781-5319a8e90f3c",
    name: "atestado-medico-online-assinatura-digital",
    altText:
      "Paciente confere no celular o atestado médico em PDF com assinatura digital, logo após a teleconsulta no notebook.",
    title: "Atestado médico com assinatura digital verificável",
    caption:
      "O que a empresa confere não é o carimbo: é a assinatura digital, e qualquer pessoa pode validá-la.",
    description:
      "Imagem principal do guia sobre atestado médico online no Brasil. A consulta por vídeo aparece ao fundo e o documento assinado no primeiro plano, nessa ordem de propósito: o atestado existe porque houve consulta. Nenhum carimbo em cena.",
  },
  {
    file: "12.png",
    postSlug: "solicitacao-de-exames-laboratoriais-online",
    postLocale: "PT",
    uuid: "97441478-1a12-47a0-a911-f045f23a8d30",
    name: "solicitacao-de-exames-pedido-medico-no-consultorio",
    altText:
      "Médico compara resultados anteriores enquanto monta a solicitação de exames no computador, com tubos de coleta ao lado.",
    title: "A solicitação de exames começa pela pergunta clínica",
    caption:
      "Exames pedidos sem uma pergunta por trás produzem achados, não respostas.",
    description:
      "Imagem principal do guia sobre solicitação de exames laboratoriais no Brasil. Resultados antigos na mão do médico e a lista sendo montada na tela — o raciocínio antes da coleta. Os tubos aparecem pequenos e ao fundo, de propósito.",
  },
  {
    file: "13.png",
    postSlug: "tension-arterial-normal-tabla-edad-sexo",
    postLocale: "ES",
    uuid: "44108f54-5dd3-4f3e-ac9b-6916dbe7653d",
    name: "tension-arterial-normal-medicion-correcta-en-casa",
    altText:
      "Hombre se mide la tensión arterial correctamente en casa, sentado con el brazo apoyado sobre la mesa.",
    title: "Medición correcta de la tensión arterial en casa",
    caption:
      "La postura, el manguito y varios días de mediciones importan más que una cifra aislada.",
    description:
      "Imagen principal de la guía sobre tensión arterial normal. Un hombre se mide la presión en casa con el manguito en el brazo y la extremidad apoyada sobre la mesa. La escena muestra una técnica tranquila y repetible, sin convertir una sola lectura en un diagnóstico.",
  },
  {
    file: "14.png",
    postSlug: "tensiune-arteriala-normala-varsta-adulti",
    postLocale: "RO",
    uuid: "fe80b93d-7bd5-4868-8943-9800d63ff1bf",
    name: "tensiune-arteriala-jurnal-revizuit-cu-medicul",
    altText:
      "Medic și pacient în vârstă analizează împreună un jurnal de tensiune arterială în cabinet.",
    title: "Interpretarea jurnalului de tensiune arterială",
    caption:
      "Un tipar măsurat corect valorează mai mult decât o singură cifră sau un tabel generic.",
    description:
      "Imagine principală pentru ghidul românesc despre tensiunea arterială normală. Medicul și un pacient mai în vârstă revizuiesc împreună un jurnal de măsurători, cu tensiometrul pe birou. Scena pune accentul pe interpretarea unui tipar, nu pe o valoare izolată.",
  },
  {
    file: "15.png",
    postSlug: "baixa-medica-quanto-se-recebe-como-calcular",
    postLocale: "PT",
    uuid: "af6201b0-6393-41fc-ba38-968d07bdda77",
    name: "baixa-medica-calculo-do-valor-em-casa",
    altText:
      "Mulher calcula em casa o valor da baixa médica com documentos, calendário e calculadora sobre a mesa.",
    title: "Calcular o valor da baixa médica",
    caption:
      "O valor depende da remuneração de referência, da duração e dos dias abrangidos.",
    description:
      "Imagem principal do guia português sobre o valor da baixa médica. Uma mulher recupera em casa enquanto organiza documentos genéricos, calendário e calculadora para perceber o impacto no orçamento familiar.",
  },
  {
    file: "16.png",
    postSlug: "illness-benefit-payment-ireland-rate-tax-timing",
    postLocale: "EN",
    uuid: "db1bc472-27f0-45fc-af8e-ac5974cb232e",
    name: "illness-benefit-ireland-payment-calendar-planning",
    altText:
      "Man reviews a calendar and household finances at home while planning around Ireland's Illness Benefit payments.",
    title: "Planning around Illness Benefit payments",
    caption:
      "Rate, tax treatment and payment timing all matter when planning the weeks away from work.",
    description:
      "Editorial cover for the Ireland Illness Benefit payment guide. A worker reviews an unreadable weekly calendar, calculator and household finances at a rainy Dublin kitchen table, focusing on payment timing rather than the claim form.",
  },
  {
    file: "17.png",
    postSlug: "vypocet-nemocenske-2026-co-plati-zamestnavatel-a-co-cssz",
    postLocale: "CS",
    uuid: "dcdc1582-4a0a-465f-9691-caf6431a7d3a",
    name: "vypocet-nemocenske-zamestnavatel-cssz-kalendar",
    altText:
      "Muž doma počítá nemocenskou podle kalendáře a dvou sad podkladů od zaměstnavatele a ČSSZ.",
    title: "Výpočet nemocenské ve dvou fázích",
    caption:
      "První období hradí zaměstnavatel a další dny přebírá ČSSZ.",
    description:
      "Hlavní obrázek průvodce výpočtem nemocenské v roce 2026. Zaměstnanec pracuje s kalendářem, kalkulačkou a dvěma oddělenými sadami podkladů, které vizuálně vyjadřují platbu od zaměstnavatele a následně od ČSSZ.",
  },
  {
    file: "18.png",
    postSlug: "atestado-medico-para-carta-de-conducao",
    postLocale: "PT",
    uuid: "d52397a6-9ae7-45ba-bb27-f9d6e3eb613a",
    name: "atestado-carta-conducao-avaliacao-da-visao",
    altText:
      "Médica avalia a visão de um condutor numa consulta para o atestado da carta de condução.",
    title: "Avaliação médica para a carta de condução",
    caption:
      "A consulta confirma aptidão clínica e visual antes do envio eletrónico do atestado.",
    description:
      "Imagem principal do guia português sobre o atestado médico para a carta de condução. Uma médica realiza uma avaliação visual a um condutor numa consulta luminosa, com chaves e carteira discretamente sobre a secretária.",
  },
  {
    file: "19.png",
    postSlug: "tension-alta-sintomas-cuando-urgencias",
    postLocale: "ES",
    uuid: "a1dec5f6-9528-45e8-957f-6b9aae7970dd",
    name: "tension-alta-familiar-pide-ayuda-medica",
    altText:
      "Mujer se mide la tensión mientras un familiar llama por teléfono para pedir ayuda médica.",
    title: "Pedir ayuda ante una tensión alta con síntomas",
    caption:
      "La combinación de la cifra y los síntomas decide si corresponde llamar al 112.",
    description:
      "Imagen principal de la guía española sobre tensión alta y urgencias. Una mujer permanece sentada y se mide la presión mientras un familiar solicita orientación por teléfono. La escena muestra una decisión serena de pedir ayuda, sin dramatizar una emergencia.",
  },
  {
    file: "20.png",
    postSlug: "ce-scade-tensiunea-arteriala-rapid-sigur",
    postLocale: "RO",
    uuid: "8db71f07-2244-4c9a-8916-2b2f0bbfe3b7",
    name: "tensiune-mare-repetare-masurare-sfat-medical",
    altText:
      "Femeie repetă măsurarea tensiunii acasă în timp ce familia cere sfatul unui medic prin video.",
    title: "Repetarea măsurării și sfat medical sigur",
    caption:
      "Opriți-vă, repetați corect măsurarea și cereți ajutor clinic în locul tratamentelor improvizate.",
    description:
      "Imaginea principală a ghidului românesc despre scăderea sigură a tensiunii. O femeie repetă măsurarea acasă, cu brațul sprijinit, în timp ce un membru al familiei notează recomandările unui medic prin apel video. Nu apar medicamente sau soluții improvizate.",
  },
];

function s3Key(cover: Cover): string {
  return `media/${cover.uuid}-${cover.name}.webp`;
}

function assetKey(name: string): string {
  return `blog-cover/blog-seo-2026-08-${name}`;
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
