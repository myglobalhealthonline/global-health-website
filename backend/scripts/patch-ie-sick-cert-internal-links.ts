/**
 * SEO fix (2026-08-04, OpenSEO pass): close the sick-cert cluster's two open
 * gaps — no internal link to the money page, and no copy containing the terms
 * the cluster already ranks for.
 *
 * Measured before this patch (audit-sick-cert-cluster.ts against prod):
 *   - The blog post "sick-certificate-ireland-employee-rights" (790 impressions,
 *     position 14.8, the single biggest Ireland entry point) carries 22 links
 *     and NOT ONE points at /services/sick-certificate-ireland. Its only booking
 *     CTA links to the bare homepage, which drops the reader on the country gate
 *     and throws away the topical relevance the article earned.
 *   - "medical chit" (1,900/mo, KD 0) sits at position 66 and "sick note online"
 *     (260/mo) at 59, both pointing at pages whose copy never contains the term.
 *     The service detailBody says "medical certificate" 6x, "sick cert" 0x.
 *
 * So: three link insertions with descriptive money anchors, one synonym
 * sentence on the service page, and one FAQ that answers the "medical chit"
 * query directly. The link target is the CANONICAL service URL
 * (/ireland/en/services/... — the clean /ireland/en/sick-certificate-ireland
 * alias also returns 200 but declares the former as canonical, verified live
 * 2026-08-04), so no link equity is spent on a rewrite hop.
 *
 * Idempotent and guarded: every edit is an exact-substring replacement that is
 * skipped when the BEFORE string is absent, and reported as already-patched
 * when the AFTER string is present. A row edited in the admin UI since
 * 2026-08-04 is never overwritten.
 *
 *   node --env-file=.env --import tsx scripts/patch-ie-sick-cert-internal-links.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/patch-ie-sick-cert-internal-links.ts --apply   # write
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const COUNTRY = "ie";
const SERVICE_SLUG = "sick-certificate-ireland";
const BLOG_SLUG = "sick-certificate-ireland-employee-rights";

/** Canonical target, verified live 2026-08-04. */
const HREF = "https://www.myglobalhealth.online/ireland/en/services/sick-certificate-ireland";

type Edit = { label: string; before: string; after: string };

const BLOG_EDITS: Edit[] = [
  {
    label: "section-06 lead — inline 'sick note online' link",
    before:
      '<p class="section-lead">A same-day online GP consultation can issue a valid medical certificate without the need to travel to a clinic while unwell.</p>',
    after:
      '<p class="section-lead">A same-day online GP consultation can issue a valid medical certificate — a ' +
      `<a href="${HREF}">sick note online</a>` +
      " — without the need to travel to a clinic while unwell.</p>",
  },
  {
    label: "section-06 CTA — homepage link retargeted to the service page",
    before:
      '<a class="btn-primary" href="https://www.myglobalhealth.online">Book an online GP consultation</a>',
    after: `<a class="btn-primary" href="${HREF}">Get a sick cert online in Ireland</a>`,
  },
];

/** Appended after the final existing FAQ — a position, not a substring swap. */
const FAQ_ITEM =
  '<details class="faq-item"><summary class="faq-q">Is a “medical chit” the same as a sick cert?</summary>' +
  '<div class="faq-a"><p>Yes — they are informal names for the same document. “Medical chit”, “sick note”, ' +
  '“sick cert” and “medical certificate” all mean a written confirmation from a doctor that you were medically ' +
  "unfit for work, and for how long. What matters to an Irish employer is not the name but that it is signed by a " +
  'doctor registered with the Irish Medical Council. You can <a href="' +
  HREF +
  '">get a sick cert online</a> from an IMC-registered GP the same day, where it is clinically appropriate.</p></div></details>';

/** Marks the end of the FAQ list; the new item is inserted immediately before. */
const FAQ_LIST_CLOSE = "</details></div></div></section>";

const SERVICE_EDITS: Edit[] = [
  {
    label: "detailBody — synonym sentence naming 'sick cert' and 'sick note'",
    before:
      "<p>Medical certificates issued through our platform are accepted by employers and educational institutions nationwide.</p>",
    after:
      "<p>A sick cert — also called a sick note or a medical certificate — is written confirmation from your doctor " +
      "that you were medically unfit for work, and for how long. Medical certificates issued through our platform are " +
      "accepted by employers and educational institutions nationwide.</p>",
  },
];

type Outcome = "planned" | "already" | "skipped";

function applyEdits(source: string, edits: Edit[], indent = "  "): { next: string; results: Outcome[] } {
  let next = source;
  const results: Outcome[] = [];
  for (const edit of edits) {
    if (edit.before === edit.after) continue; // placeholder rows carry no swap
    if (next.includes(edit.after)) {
      console.log(`${indent}[already] ${edit.label}`);
      results.push("already");
      continue;
    }
    if (!next.includes(edit.before)) {
      console.log(`${indent}[SKIPPED] ${edit.label} — BEFORE string not found`);
      results.push("skipped");
      continue;
    }
    console.log(`${indent}[change ] ${edit.label}`);
    console.log(`${indent}    -  ${edit.before}`);
    console.log(`${indent}    +  ${edit.after}`);
    next = next.replace(edit.before, edit.after);
    results.push("planned");
  }
  return { next, results };
}

async function patchBlog(): Promise<Outcome[]> {
  const post = await prisma.blogPost.findFirst({
    where: { slug: BLOG_SLUG },
    select: { id: true, slug: true, locale: true, status: true, body: true },
  });
  if (!post) {
    console.log(`\n[SKIPPED] BlogPost ${BLOG_SLUG} not found`);
    return ["skipped"];
  }

  console.log(`\n=== BlogPost ${post.slug} (${post.locale}, ${post.status})`);
  const { next, results } = applyEdits(post.body, BLOG_EDITS);
  let body = next;

  // FAQ append — positional, so it gets its own guard.
  if (body.includes('Is a “medical chit” the same as a sick cert?')) {
    console.log("  [already] FAQ — 'medical chit' item");
    results.push("already");
  } else {
    const at = body.lastIndexOf(FAQ_LIST_CLOSE);
    if (at === -1) {
      console.log("  [SKIPPED] FAQ — could not locate the end of the FAQ list");
      results.push("skipped");
    } else {
      console.log("  [change ] FAQ — append 'medical chit' item");
      console.log(`      +  ${FAQ_ITEM}`);
      body = body.slice(0, at + "</details>".length) + FAQ_ITEM + body.slice(at + "</details>".length);
      results.push("planned");
    }
  }

  if (APPLY && body !== post.body) {
    await prisma.blogPost.update({ where: { id: post.id }, data: { body } });
  }
  return results;
}

async function patchService(): Promise<Outcome[]> {
  const service = await prisma.service.findFirst({
    where: { country: { code: COUNTRY }, slug: SERVICE_SLUG },
    select: {
      id: true,
      slug: true,
      detailBody: true,
      translations: { where: { locale: "EN" }, select: { id: true, detailBody: true } },
    },
  });
  if (!service) {
    console.log(`\n[SKIPPED] Service ${COUNTRY}/${SERVICE_SLUG} not found`);
    return ["skipped"];
  }

  const results: Outcome[] = [];

  // Base row — the fallback when a locale row is missing.
  console.log(`\n=== Service ${service.slug} — base detailBody`);
  if (!service.detailBody) {
    console.log("  [SKIPPED] base detailBody is null");
    results.push("skipped");
  } else {
    const { next, results: r } = applyEdits(service.detailBody, SERVICE_EDITS);
    results.push(...r);
    if (APPLY && next !== service.detailBody) {
      await prisma.service.update({ where: { id: service.id }, data: { detailBody: next } });
    }
  }

  // EN locale row — what an English visitor actually reads.
  const en = service.translations[0];
  console.log(`\n=== Service ${service.slug} — EN detailBody`);
  if (!en?.detailBody) {
    console.log("  [SKIPPED] EN detailBody is null or absent");
    results.push("skipped");
  } else {
    const { next, results: r } = applyEdits(en.detailBody, SERVICE_EDITS);
    results.push(...r);
    if (APPLY && next !== en.detailBody) {
      await prisma.serviceTranslation.update({ where: { id: en.id }, data: { detailBody: next } });
    }
  }

  return results;
}

async function main() {
  const results = [...(await patchBlog()), ...(await patchService())];
  const planned = results.filter((r) => r === "planned").length;
  const already = results.filter((r) => r === "already").length;
  const skipped = results.filter((r) => r === "skipped").length;

  console.log(
    `\n${APPLY ? "APPLIED" : "DRY-RUN"}: ${planned} edit(s) ${APPLY ? "written" : "would change"}, ` +
      `${already} already patched, ${skipped} skipped.`,
  );
  if (!APPLY && planned > 0) console.log("Re-run with --apply to write.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
