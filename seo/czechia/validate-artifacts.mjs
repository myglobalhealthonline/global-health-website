import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

import {
  CZECHIA_SEO_SERVICE_DRAFTS,
  czechiaSeoApprovalSha256,
} from "../../backend/src/content/czechia-seo-service-drafts.ts";
import {
  CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS,
  CZECHIA_BLOG_SEO_DRAFTS,
  CZECHIA_TOOL_SEO_DRAFTS,
  czechiaClinicalDraftApprovalSha256,
} from "../../backend/src/content/czechia-profile-blog-tool-seo-drafts.ts";
import {
  CZECHIA_PAGE_CONTENT_SEO_DRAFTS,
  czechiaPageContentApprovalSha256,
} from "../../backend/src/content/czechia-page-content-seo-drafts.ts";
import { CZECHIA_APPROVED_DOCTOR_FAQS } from "../../frontend/lib/content/czechia-approved-doctor-faqs.ts";

const root = new URL("./", import.meta.url);

function csvRows(text) {
  return parseCsv(text).length - 1;
}

function parseCsv(text) {
  const clean = text.trim();
  let quoted = false;
  let field = "";
  let row = [];
  const rows = [];
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (char === '"') {
      if (quoted && clean[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if (char === "\n" && !quoted) {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      field = "";
      row = [];
    } else field += char;
  }
  row.push(field.replace(/\r$/, ""));
  rows.push(row);
  assert.equal(quoted, false, "CSV has an unterminated quoted field");
  return rows;
}

function records(text) {
  const [header, ...rows] = parseCsv(text);
  assert.equal(new Set(header).size, header.length, "CSV has duplicate column names");
  for (const row of rows) assert.equal(row.length, header.length, "CSV row width does not match its header");
  return rows.map((row) => Object.fromEntries(header.map((name, index) => [name, row[index] ?? ""])));
}

function strictUtcTimestamp(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,7})?Z$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const timestamp = Date.parse(value);
  const parsed = new Date(timestamp);
  return (
    !Number.isNaN(timestamp) &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day &&
    parsed.getUTCHours() === hour &&
    parsed.getUTCMinutes() === minute &&
    parsed.getUTCSeconds() === second
  );
}

const read = (path) => readFile(new URL(path, root), "utf8");
const keywordFiles = (await readdir(new URL("raw/keywords/", root))).filter((name) =>
  name.startsWith("openseo-keyword-research-batch-"),
);
const rawKeywordRows = (
  await Promise.all(keywordFiles.map(async (name) => csvRows(await read(`raw/keywords/${name}`))))
).reduce((total, rows) => total + rows, 0);

assert.equal(keywordFiles.length, 6);
assert.equal(rawKeywordRows, 10_051);
assert.equal(csvRows(await read("03-keyword-master.csv")), 481);
assert.equal(csvRows(await read("serp-validation.csv")), 30);
assert.equal(csvRows(await read("competitor-domain-summary.csv")), 10);
assert.equal(csvRows(await read("competitor-page-inventory.csv")), 360);
assert.equal((await read("raw/live-sitemap-czechia-2026-08-31.txt")).trim().split(/\r?\n/).length, 281);
assert.equal((await readdir(new URL("content-briefs/", root))).filter((name) => name.endsWith(".md")).length, 9);

const matrixText = await read("page-by-page-completion-matrix.csv");
const matrix = records(matrixText);
const implementationLog = await read("09-implementation-log.md");
assert.match(
  implementationLog,
  /Owner implementation authorization recorded: 2026-09-01, approved baseline `8af7a7e7`/,
  "owner implementation authorization is not recorded",
);
assert.equal(matrix.length, 50);
assert.equal(new Set(matrix.map(({ url }) => url)).size, 50);
const expectedMatrixUrls = [
  ...records(await read("target-page-inventory.csv"))
    .filter(({ locale }) => locale === "cs")
    .map(({ url }) => url),
  "https://www.myglobalhealth.online/czechia/en",
  "https://www.myglobalhealth.online/czechia/en/services/lekar-online-praha",
].sort();
assert.deepEqual(matrix.map(({ url }) => url).sort(), expectedMatrixUrls);
assert.ok(
  matrix.every(({ url }) => {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "www.myglobalhealth.online" &&
      parsed.pathname.startsWith("/czechia/") &&
      !parsed.pathname.endsWith("/") &&
      !parsed.search &&
      !parsed.hash
    );
  }),
  "matrix contains an invalid canonical URL",
);
assert.ok(matrix.every(({ primary_keyword }) => primary_keyword && !primary_keyword.includes("|")));
assert.ok(matrix.every(({ optimized_title }) => optimized_title.length > 0 && optimized_title.length <= 60));
assert.ok(matrix.every(({ optimized_meta_description }) => optimized_meta_description.length > 0));
assert.ok(matrix.every(({ optimized_h1 }) => optimized_h1.length > 0));
assert.ok(
  matrix.every(
    ({ original_meta_description, optimized_meta_description }) =>
      original_meta_description === optimized_meta_description ||
      (optimized_meta_description.length >= 110 && optimized_meta_description.length <= 160),
  ),
);
assert.ok(
  matrix.every(
    ({ description_optimized, optimized_visible_description }) =>
      description_optimized !== "yes" || optimized_visible_description.length > 0,
  ),
);
const allowedFlags = {
  description_optimized: new Set(["yes", "no"]),
  bio_optimized: new Set(["yes", "no", "not applicable"]),
  faqs_optimized: new Set(["yes", "no", "not applicable"]),
  deslop_completed: new Set(["yes", "no"]),
  clinical_review_required: new Set(["yes", "no"]),
};
for (const [field, values] of Object.entries(allowedFlags)) {
  assert.ok(matrix.every((row) => values.has(row[field])), `invalid ${field} value`);
}
const allowedStatuses = new Set([
  "live_verified_2026-09-01",
  "live_verified_2026-09-02",
  "measurement_hold_travel_recrawl",
  "measurement_hold_until_2026-09-08",
  "reviewed_no_change",
  "source_pinned_guarded_draft_pending_clinical_and_native_review",
  "source_pinned_guarded_draft_pending_clinical_review",
]);
assert.ok(matrix.every(({ implementation_status }) => allowedStatuses.has(implementation_status)));
assert.equal(
  matrix.filter(
    ({ clinical_review_required, implementation_status }) =>
      clinical_review_required === "no" && implementation_status === "live_verified_2026-09-01",
  ).length,
  14,
  "all 14 non-clinical pages must record verified live deployment",
);
assert.equal(
  matrix.filter(({ implementation_status }) => implementation_status === "approved_pending_production").length,
  0,
  "no approved page may remain pending after complete production readback",
);
assert.equal(
  matrix.filter(
    ({ clinical_review_required, implementation_status }) =>
      clinical_review_required === "yes" && implementation_status.startsWith("live_verified_"),
  ).length,
  34,
  "all 34 clinically approved or super-admin-overridden pages must record verified deployment",
);

const exactFaqDraftUrls = [
  "https://www.myglobalhealth.online/czechia/cs/gp-consultation-online",
  "https://www.myglobalhealth.online/czechia/cs/services/cestovni-medicina-praha",
  "https://www.myglobalhealth.online/czechia/cs/services/kozni-konzultace-praha",
  "https://www.myglobalhealth.online/czechia/cs/services/lekar-online-praha",
  "https://www.myglobalhealth.online/czechia/cs/services/neschopenka-online",
  "https://www.myglobalhealth.online/czechia/cs/services/obnoveni-lecby",
].sort();
assert.deepEqual(
  matrix.filter(({ faqs_optimized }) => faqs_optimized === "yes").map(({ url }) => url).sort(),
  exactFaqDraftUrls,
  "FAQs may be marked optimized only when exact source-level replacements exist",
);
assert.ok(
  matrix.every(
    ({ technical_seo_verification }) =>
      technical_seo_verification.startsWith("200; self-canonical; index/follow; self-hreflang;") &&
      /schema (present|and tab UI share)/i.test(technical_seo_verification) &&
      !/fail|error|mismatch|schema absent|no schema/i.test(technical_seo_verification),
  ),
);
assert.ok(matrix.every(({ fact_comparison }) => fact_comparison.length > 0));

const snapshot = records(await read("raw/live-page-seo-snapshot-2026-09-01.csv"));
assert.equal(snapshot.length, 50);
assert.deepEqual(snapshot.map(({ url }) => url).sort(), expectedMatrixUrls);
const snapshotByUrl = new Map(snapshot.map((row) => [row.url, row]));
const placeholderSchemaTypes = new Set(["none", "absent", "unknown", "missing", "n/a"]);
for (const row of matrix) {
  const live = snapshotByUrl.get(row.url);
  assert.ok(live, `live snapshot missing ${row.url}`);
  assert.ok(strictUtcTimestamp(live.retrieved_at), `invalid retrieval time for ${row.url}`);
  assert.ok(
    Date.parse(live.retrieved_at) >= Date.parse("2026-08-31T19:00:00Z") &&
      Date.parse(live.retrieved_at) < Date.parse("2026-09-01T19:00:00Z"),
    `snapshot is outside the 2026-09-01 Asia/Karachi capture window for ${row.url}`,
  );
  assert.equal(live.status, "200", `non-200 snapshot status for ${row.url}`);
  assert.equal(live.canonical, row.url, `canonical mismatch for ${row.url}`);
  assert.equal(live.robots, "index, follow", `robots mismatch for ${row.url}`);
  assert.equal(live.self_hreflang, "yes", `self-hreflang missing for ${row.url}`);
  assert.ok(Number.isInteger(Number(live.hreflang_count)) && Number(live.hreflang_count) > 0, `hreflang set missing for ${row.url}`);
  assert.ok(
    live.schema_types
      .split("|")
      .every((type) => /^[A-Za-z][A-Za-z0-9]*$/.test(type) && !placeholderSchemaTypes.has(type.toLowerCase())),
    `schema types missing or invalid for ${row.url}`,
  );
  assert.equal(live.title, row.original_title, `original title drift for ${row.url}`);
  assert.equal(live.meta_description, row.original_meta_description, `original meta drift for ${row.url}`);
  assert.equal(live.h1, row.original_h1, `original H1 drift for ${row.url}`);
}

function strictRfc3339Timestamp(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match) return false;
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = [
    ...match.slice(1, 7),
    match[7] ?? "0",
    match[8] ?? "0",
  ].map(Number);
  const daysInMonth = month >= 1 && month <= 12 ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 0;
  const parsed = new Date(value);
  return (
    year > 0 && day >= 1 && day <= daysInMonth && hour <= 23 && minute <= 59 && second <= 59 &&
    offsetHour <= 23 && offsetMinute <= 59 && !Number.isNaN(parsed.getTime()) && parsed <= new Date()
  );
}
assert.equal(strictRfc3339Timestamp("2026-02-30T10:00:00Z"), false, "invalid calendar date accepted");
assert.equal(
  strictRfc3339Timestamp(new Date(Date.now() + 60_000).toISOString()),
  false,
  "future clinical review accepted",
);

const clinicalRegister = records(await read("clinical-review-register.csv"));
assert.equal(
  new Set(clinicalRegister.map(({ asset }) => asset)).size,
  clinicalRegister.length,
  "clinical register contains duplicate assets",
);
assert.equal(clinicalRegister.filter(({ status }) => status === "approved").length, 31);
assert.equal(clinicalRegister.filter(({ status }) => status === "super_admin_override").length, 3);
assert.equal(clinicalRegister.filter(({ status }) => status === "pending").length, 3);
const clinicalByAsset = new Map(clinicalRegister.map((row) => [row.asset, row]));

const staticProductionReadback = records(await read("raw/static-page-production-readback-2026-09-01.csv"));
const clinicalProductionReadback = records(await read("raw/clinical-production-readback-2026-09-01.csv"));
const clinicalProductionReadbackSep2 = records(await read("raw/clinical-production-readback-2026-09-02.csv"));
const clinicalProductionReadbackSep2SuperAdminText = await read(
  "raw/clinical-production-readback-2026-09-02-super-admin.csv",
);
assert.equal(
  createHash("sha256").update(clinicalProductionReadbackSep2SuperAdminText.replaceAll("\r\n", "\n")).digest("hex"),
  "6e2e34d1d0ea7df524a351886e0490072b14e8a24ad42780231d525d2dd46c1c",
  "Czech super-admin production readback drift",
);
const clinicalProductionReadbackSep2SuperAdmin = records(clinicalProductionReadbackSep2SuperAdminText);
const superAdminProductionReceiptText = await read("raw/production-write-receipt-2026-09-02-super-admin.json");
assert.equal(
  createHash("sha256").update(superAdminProductionReceiptText.replaceAll("\r\n", "\n")).digest("hex"),
  "5a1828b15d67c49699eb0293680d66eaaca8376e16e36f748ccea34210d79b19",
  "Czech super-admin production receipt drift",
);
const superAdminProductionReceipt = JSON.parse(superAdminProductionReceiptText);
const superAdminIsolationReadbackText = await read("raw/locale-isolation-readback-2026-09-02-super-admin.json");
assert.equal(
  createHash("sha256").update(superAdminIsolationReadbackText.replaceAll("\r\n", "\n")).digest("hex"),
  "5952659e1cec4b9eb8a778170a53aa180807dcff876ab00a773e79181dbcd24c",
  "Czech super-admin locale-isolation readback drift",
);
const superAdminIsolationReadback = JSON.parse(superAdminIsolationReadbackText);
assert.ok(strictUtcTimestamp(superAdminIsolationReadback.retrieved_at));
assert.equal(superAdminIsolationReadback.checks.length, 9);
assert.ok(superAdminIsolationReadback.checks.every(({ status }) => status === 200));
assert.ok(
  superAdminIsolationReadback.checks.every(
    ({ czech_phrases_absent, czech_tool_copy_absent, czech_faq_overlay_absent }) =>
      [czech_phrases_absent, czech_tool_copy_absent, czech_faq_overlay_absent].filter(
        (value) => value !== undefined,
      ).length === 1 &&
      [czech_phrases_absent, czech_tool_copy_absent, czech_faq_overlay_absent].includes(true),
  ),
  "Czech approved copy leaked into another locale or market",
);
const clinicalProductionReceiptText = await read("raw/production-write-receipt-2026-09-01-clinical-seo.json");
assert.equal(
  createHash("sha256").update(clinicalProductionReceiptText.replaceAll("\r\n", "\n")).digest("hex"),
  "3aaa8bc2c4ad9601f2f6dd13850f480dda719cdaa827516f60d2cb06b3770a92",
  "clinical production receipt drift",
);
const clinicalProductionReceipt = JSON.parse(clinicalProductionReceiptText);
const pragueProductionReceiptText = await read("raw/production-write-receipt-2026-09-02-cs-prague.json");
assert.equal(
  createHash("sha256").update(pragueProductionReceiptText.replaceAll("\r\n", "\n")).digest("hex"),
  "a6dd4c83aaa916638102fc4c9d6148666c660f137660836e6d1d095bf67af4c2",
  "Czech Prague production receipt drift",
);
const pragueProductionReceipt = JSON.parse(pragueProductionReceiptText);
const pragueApprovalRecordText = await read("raw/owner-recorded-clinical-approval-2026-09-02-cs-prague.json");
assert.equal(
  createHash("sha256").update(pragueApprovalRecordText.replaceAll("\r\n", "\n")).digest("hex"),
  "3ccd3ef39349509ca022e03a36ce7192f99214175cf2567e3a47a432c76f33db",
  "Czech Prague owner-recorded approval drift",
);
const pragueApprovalRecord = JSON.parse(pragueApprovalRecordText);
const pragueProductionReadbackText = await read("raw/production-readback-2026-09-02-cs-prague.json");
assert.equal(
  createHash("sha256").update(pragueProductionReadbackText.replaceAll("\r\n", "\n")).digest("hex"),
  "8a258fd95aa88bd029e3c971735bfe9c464c9e4c344f8f24f5b09cb5f451156a",
  "Czech Prague production readback drift",
);
const pragueProductionReadback = JSON.parse(pragueProductionReadbackText);
const dermatologyApprovalRecordText = await read("raw/reviewer-supplied-clinical-approval-2026-09-02-1030.md");
assert.equal(
  createHash("sha256").update(dermatologyApprovalRecordText.replaceAll("\r\n", "\n")).digest("hex"),
  "ea50ff1e8ddaa9c927655ec5244bbe57c0207f488cb5681fb35f120922739c4b",
  "Czech dermatology reviewer-supplied approval drift",
);
const dermatologyProductionReceiptText = await read("raw/production-write-receipt-2026-09-02-dermatology.json");
assert.equal(
  createHash("sha256").update(dermatologyProductionReceiptText.replaceAll("\r\n", "\n")).digest("hex"),
  "0bd90b55ccca878bdcce3390d32d85bf6608d8213de2c3a085cc9bd6114a2b77",
  "Czech dermatology production receipt drift",
);
const dermatologyProductionReceipt = JSON.parse(dermatologyProductionReceiptText);
const dermatologyProductionReadbackText = await read("raw/production-readback-2026-09-02-dermatology.json");
assert.equal(
  createHash("sha256").update(dermatologyProductionReadbackText.replaceAll("\r\n", "\n")).digest("hex"),
  "bccac1db082936cc9f9a85e86c128235bfbd4096d9bf802bebfdd66d3df084c0",
  "Czech dermatology production readback drift",
);
const dermatologyProductionReadback = JSON.parse(dermatologyProductionReadbackText);
const dualReviewerHeadApprovalText = await read("raw/dual-reviewer-head-resolution-approval-2026-09-02.md");
assert.equal(
  createHash("sha256").update(dualReviewerHeadApprovalText.replaceAll("\r\n", "\n")).digest("hex"),
  "5d7f8558c49ba148363260bf271b0168377926ba8da6a1208e1d874353648555",
  "Czech dual-reviewer and Head approval evidence drift",
);
assert.match(dualReviewerHeadApprovalText, /30161c8bd7913acbd98e2aac0820499b21e4bc1bb951c38aef8d8eac97ec024c/);
assert.match(dualReviewerHeadApprovalText, /13ed9273e65b6954fce8b83c386791e9630dae52bcf27c513bd7fc3b420466c0/);

const remainingApprovalText = await read("raw/super-admin-verbal-approval-override-2026-09-02.md");
assert.equal(
  createHash("sha256").update(remainingApprovalText.replaceAll("\r\n", "\n")).digest("hex"),
  "1c573bf54b574a5b8c3870c3db89802bdd2a15f990f47be96e1cf7faec9e31e4",
  "remaining-pages verbal approval record drift",
);
const remainingProductionReadbackText = await read("raw/production-readback-2026-09-02-remaining-pages.json");
assert.equal(
  createHash("sha256").update(remainingProductionReadbackText.replaceAll("\r\n", "\n")).digest("hex"),
  "aac5866b14d048b05dcae032bf1345dc7fe8dba40b0adb93d27ee1c54dbb6774",
  "remaining-pages production readback drift",
);
const remainingProductionReadback = JSON.parse(remainingProductionReadbackText);
assert.equal(remainingProductionReadback.pages.length, 3);
assert.ok(remainingProductionReadback.pages.every(({ status, html_sha256 }) => status === 200 && /^[a-f0-9]{64}$/.test(html_sha256)));
const gpOverrideDraft = CZECHIA_PAGE_CONTENT_SEO_DRAFTS.find(({ key }) => key === "gp-safety-cs");
const blogOverrideDraft = CZECHIA_BLOG_SEO_DRAFTS.find(({ slug }) => slug === "lekar-online-24-7-co-vyresi");
const travelOverrideDraft = CZECHIA_SEO_SERVICE_DRAFTS.find(
  ({ slug, locale }) => slug === "cestovni-medicina-praha" && locale === "CS",
);
assert.ok(gpOverrideDraft && blogOverrideDraft && travelOverrideDraft);
const travelOverridePath = `/czechia/${travelOverrideDraft.locale.toLowerCase()}/services/${travelOverrideDraft.slug}`;
const overrideDraftHashes = new Map([
  [gpOverrideDraft.canonicalPath, czechiaPageContentApprovalSha256(gpOverrideDraft)],
  [blogOverrideDraft.assetPath, czechiaClinicalDraftApprovalSha256(blogOverrideDraft)],
  [travelOverridePath, czechiaSeoApprovalSha256(travelOverrideDraft)],
]);
for (const page of remainingProductionReadback.pages) {
  const asset = new URL(page.url).pathname;
  const gate = clinicalByAsset.get(asset);
  assert.equal(gate?.status, "super_admin_override", `missing super-admin override for ${asset}`);
  assert.equal(page.approved_payload_sha256, gate.approved_sha256, `override/readback hash drift for ${asset}`);
  assert.equal(page.approved_payload_sha256, overrideDraftHashes.get(asset), `override/draft hash drift for ${asset}`);
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const gpOverrideReadback = remainingProductionReadback.pages.find(
  ({ url }) => new URL(url).pathname === gpOverrideDraft.canonicalPath,
);
assert.equal(gpOverrideReadback.api_body_sha256, sha256(gpOverrideDraft.copy.body));
assert.equal(gpOverrideReadback.api_faq_sha256, sha256(JSON.stringify(gpOverrideDraft.copy.faq)));
assert.equal(gpOverrideReadback.api_faq_count, gpOverrideDraft.copy.faq.length);
const travelOverrideReadback = remainingProductionReadback.pages.find(
  ({ url }) => new URL(url).pathname === travelOverridePath,
);
assert.equal(travelOverrideReadback.api_body_sha256, sha256(travelOverrideDraft.detailBody));
assert.equal(travelOverrideReadback.api_faq_sha256, sha256(JSON.stringify(travelOverrideDraft.faqs)));
assert.equal(travelOverrideReadback.api_faq_count, travelOverrideDraft.faqs.length);
const blogOverrideReadback = remainingProductionReadback.pages.find(
  ({ url }) => new URL(url).pathname === blogOverrideDraft.assetPath,
);
assert.equal(blogOverrideReadback.api_metadata_exact, true);
assert.equal(blogOverrideReadback.protected_body_and_faqs_transactionally_unchanged, true);
assert.match(blogOverrideReadback.api_body_sha256, /^[a-f0-9]{64}$/);
assert.match(blogOverrideReadback.api_excerpt_sha256, /^[a-f0-9]{64}$/);
const clinicalDeploymentReadback = [
  ...clinicalProductionReadback,
  ...clinicalProductionReadbackSep2,
  ...clinicalProductionReadbackSep2SuperAdmin,
];
const remainingProductionRows = remainingProductionReadback.pages.map((row) => ({
  ...row,
  status: String(row.status),
  retrieved_at: remainingProductionReadback.retrieved_at,
}));
const productionReadback = [...staticProductionReadback, ...clinicalDeploymentReadback, ...remainingProductionRows];
const deploymentVerifiedMatrixRows = matrix.filter(
  ({ implementation_status }) => implementation_status.startsWith("live_verified_"),
);
assert.equal(staticProductionReadback.length, 14);
assert.equal(clinicalProductionReadback.length, 17);
assert.equal(clinicalProductionReadbackSep2.length, 1);
assert.equal(clinicalProductionReadbackSep2SuperAdmin.length, 13);
assert.equal(remainingProductionReadback.pages.length, 3);
assert.equal(new Set(productionReadback.map(({ url }) => url)).size, productionReadback.length);
const approvedClinicalAssets = new Set(
  clinicalRegister.filter(({ status }) => ["approved", "super_admin_override"].includes(status)).map(({ asset }) => asset),
);
assert.ok(
  [...clinicalDeploymentReadback, ...remainingProductionReadback.pages].every(({ url }) =>
    approvedClinicalAssets.has(new URL(url).pathname),
  ),
  "production readback contains an asset without clinical approval",
);
assert.deepEqual(
  [...clinicalDeploymentReadback, ...remainingProductionReadback.pages]
    .map(({ url }) => new URL(url).pathname)
    .sort(),
  [...approvedClinicalAssets].sort(),
  "approved clinical assets and production readback must match exactly",
);
assert.equal(superAdminProductionReceipt.operation, "czechia-super-admin-approved-clinical-rollout");
assert.ok(strictUtcTimestamp(superAdminProductionReceipt.recorded_at));
assert.equal(superAdminProductionReceipt.production_commit, "3ada17c6eac1aceebcf21443649ea8c8d6dc70f1");
assert.equal(superAdminProductionReceipt.deployments.frontend.id, "393990d9-1122-40ee-808b-5c543cab42a7");
assert.equal(superAdminProductionReceipt.deployments.frontend.status, "SUCCESS");
assert.equal(superAdminProductionReceipt.deployments.backend.id, "5e8b701e-9895-444e-ad54-50d38ae40a50");
assert.equal(superAdminProductionReceipt.deployments.backend.status, "SUCCESS");
assert.deepEqual(superAdminProductionReceipt.database_writes, {
  page_content: 2,
  doctor_market_translations: 5,
  services: 3,
  result: "verified transactionally; unrelated and protected fields unchanged",
});
assert.equal(superAdminProductionReceipt.frontend_scoped_copy.doctor_profiles_with_approved_faq_overlays, 5);
assert.equal(superAdminProductionReceipt.frontend_scoped_copy.tools_with_approved_metadata_and_h1_overlays, 3);
assert.equal(superAdminProductionReceipt.frontend_scoped_copy.scope, "Czechia/Czech only");
assert.equal(superAdminProductionReceipt.public_verification.artifact, "clinical-production-readback-2026-09-02-super-admin.csv");
assert.equal(superAdminProductionReceipt.public_verification.passed, 13);
assert.equal(superAdminProductionReceipt.public_verification.total, 13);
assert.equal(superAdminProductionReceipt.public_verification.english_home_czech_copy_absent, true);
assert.equal(superAdminProductionReceipt.public_verification.approved_doctor_faq_copy_present, true);
const initiallyApprovedClinicalAssets = clinicalProductionReadback
  .map(({ url }) => new URL(url).pathname)
  .sort();
const receiptAssets = Object.values(clinicalProductionReceipt.applied).flat().sort();
assert.equal(clinicalProductionReceipt.operation, "czechia-approved-clinical-seo-rollout");
assert.ok(strictUtcTimestamp(clinicalProductionReceipt.performed_at), "invalid clinical production receipt time");
assert.equal(clinicalProductionReceipt.approval.reviewer_name, "MUDr. Ahmed Maklad");
assert.equal(clinicalProductionReceipt.approval.reviewer_doctor_id, "cmqas8yh9000b01pgpc0yp1la");
assert.equal(clinicalProductionReceipt.approval.reviewed_at, "2026-09-01T18:30:00+02:00");
assert.equal(clinicalProductionReceipt.approval.approved_assets, initiallyApprovedClinicalAssets.length);
assert.equal(clinicalProductionReceipt.repository_commit, "04b98cdc3b86e54961e0916be823c7605f3f6c36");
assert.equal(clinicalProductionReceipt.production_base_commit, "6c0c7fcf2aa7f31c7d434ce4ee46589761532ffd");
assert.equal(clinicalProductionReceipt.railway_frontend_deployment_id, "52843a4c-059c-4441-9baf-510020683f70");
assert.deepEqual(receiptAssets, initiallyApprovedClinicalAssets, "clinical production receipt asset drift");
assert.equal(new Set(receiptAssets).size, receiptAssets.length, "clinical production receipt contains duplicate assets");
assert.equal(clinicalProductionReceipt.database_readback, "verified transactionally; protected operational and non-target locale fields preserved");
assert.equal(clinicalProductionReceipt.public_verification.artifact, "clinical-production-readback-2026-09-01.csv");
assert.equal(clinicalProductionReceipt.public_verification.passed, clinicalProductionReadback.length);
assert.equal(clinicalProductionReceipt.public_verification.total, clinicalProductionReadback.length);
assert.equal(clinicalProductionReceipt.isolation_verification.passed, 7);
assert.equal(clinicalProductionReceipt.isolation_verification.total, 7);
assert.deepEqual([...clinicalProductionReceipt.preserved].sort(), [
  "booking behavior",
  "doctor assignments and availability",
  "doctor biographies and credentials",
  "non-target countries and locales",
  "service prices and durations",
  "tool algorithms and clinical thresholds",
]);
const pragueApproval = clinicalByAsset.get(pragueProductionReceipt.asset);
assert.equal(pragueProductionReceipt.operation, "czechia-cs-prague-expanded-copy-rollout");
assert.ok(strictUtcTimestamp(pragueProductionReceipt.recorded_at), "invalid Czech Prague receipt time");
assert.equal(pragueProductionReceipt.service_id, "cmr85xq6u000070jufztsgfec");
assert.equal(pragueProductionReceipt.locale, "CS");
assert.equal(pragueProductionReceipt.approval.reviewer_name, pragueApproval?.reviewer_name);
assert.equal(pragueProductionReceipt.approval.reviewer_doctor_id, pragueApproval?.reviewer_doctor_id);
assert.equal(pragueProductionReceipt.approval.reviewed_at, pragueApproval?.reviewed_at);
assert.equal(pragueProductionReceipt.approval.approved_sha256, pragueApproval?.approved_sha256);
assert.equal(pragueProductionReceipt.approval.owner_record_artifact, "owner-recorded-clinical-approval-2026-09-02-cs-prague.json");
assert.equal(pragueProductionReceipt.approval.owner_record_sha256, "3ccd3ef39349509ca022e03a36ce7192f99214175cf2567e3a47a432c76f33db");
assert.equal(pragueApprovalRecord.normalized_reviewer_name, pragueApproval?.reviewer_name);
assert.equal(pragueApprovalRecord.normalized_reviewed_at, pragueApproval?.reviewed_at);
assert.equal(pragueApprovalRecord.asset, pragueProductionReceipt.asset);
assert.equal(pragueApprovalRecord.approved_payload_sha256, pragueApproval?.approved_sha256);
assert.match(pragueApprovalRecord.signature_status, /^No cryptographic reviewer signature was supplied;/);
assert.match(pragueProductionReceipt.approval.source_sha256, /^[a-f0-9]{64}$/);
assert.equal(pragueProductionReceipt.database_readback.status, "verified_transactionally");
assert.equal(pragueProductionReceipt.database_readback.faq_records_updated_in_place, 8);
assert.equal(pragueProductionReceipt.public_readback.artifact, "production-readback-2026-09-02-cs-prague.json");
assert.equal(pragueProductionReceipt.public_readback.status, "verified_exact_body_and_faqs");
assert.equal(pragueProductionReadback.asset, pragueProductionReceipt.asset);
assert.equal(pragueProductionReadback.approved_payload_sha256, pragueApproval?.approved_sha256);
assert.ok(strictUtcTimestamp(pragueProductionReadback.database.retrieved_at));
assert.ok(strictUtcTimestamp(pragueProductionReadback.database.service_updated_at));
assert.ok(strictUtcTimestamp(pragueProductionReadback.database.cs_translation_updated_at));
assert.equal(pragueProductionReadback.database.service_id, pragueProductionReceipt.service_id);
assert.equal(
  pragueProductionReadback.database.source_sha256,
  "ce0462f59a854476b6061e5b0d4b253fdd09e3ce15066776935fa5ee949eacf6",
);
assert.match(pragueProductionReadback.database.detail_body_sha256, /^[a-f0-9]{64}$/);
assert.equal(pragueProductionReadback.database.faq_records.length, 8);
assert.ok(pragueProductionReadback.database.faq_records.every(({ id, sha256 }) => id && /^[a-f0-9]{64}$/.test(sha256)));
assert.ok(strictUtcTimestamp(pragueProductionReadback.public.retrieved_at));
assert.ok(
  Date.parse(pragueProductionReadback.public.retrieved_at) > Date.parse(pragueProductionReadback.database.service_updated_at),
  "Czech Prague public readback predates the production write",
);
assert.equal(pragueProductionReadback.public.url, "https://www.myglobalhealth.online/czechia/cs/services/lekar-online-praha");
assert.equal(pragueProductionReadback.public.status, 200);
assert.match(pragueProductionReadback.public.html_sha256, /^[a-f0-9]{64}$/);
assert.ok(
  [
    pragueProductionReadback.public.approved_title_present,
    pragueProductionReadback.public.approved_h1_present,
    pragueProductionReadback.public.approved_description_present,
    pragueProductionReadback.public.approved_body_present,
  ].every(Boolean),
  "Czech Prague public copy readback failed",
);
assert.deepEqual(
  pragueProductionReadback.public.faq_records.map(({ id }) => id).sort(),
  pragueProductionReadback.database.faq_records.map(({ id }) => id).sort(),
);
assert.ok(
  pragueProductionReadback.public.faq_records.every(({ question_present, answer_present }) => question_present && answer_present),
  "Czech Prague public FAQ readback failed",
);
const dermatologyApproval = clinicalByAsset.get(dermatologyProductionReceipt.asset);
const dermatologyDraft = CZECHIA_SEO_SERVICE_DRAFTS.find(
  ({ locale, slug }) => locale === "CS" && slug === "kozni-konzultace-praha",
);
assert.ok(dermatologyDraft, "Czech dermatology source draft is missing");
assert.equal(
  czechiaSeoApprovalSha256(dermatologyDraft),
  dermatologyApproval?.approved_sha256,
  "Czech dermatology approval no longer matches the source draft",
);
const dermatologyMatrixRow = matrix.find(
  ({ url }) => url === "https://www.myglobalhealth.online/czechia/cs/services/kozni-konzultace-praha",
);
assert.ok(dermatologyMatrixRow, "Czech dermatology matrix row is missing");
assert.equal(dermatologyDraft.seoTitle, dermatologyMatrixRow.optimized_title);
assert.equal(dermatologyDraft.seoDescription, dermatologyMatrixRow.optimized_meta_description);
assert.equal(dermatologyDraft.heroTitle, dermatologyMatrixRow.optimized_h1);
assert.equal(dermatologyDraft.heroDescription, dermatologyMatrixRow.optimized_visible_description);
assert.equal(dermatologyProductionReceipt.operation, "czechia-cs-dermatology-copy-rollout");
assert.ok(strictUtcTimestamp(dermatologyProductionReceipt.recorded_at), "invalid Czech dermatology receipt time");
assert.equal(dermatologyProductionReceipt.service_id, "cmr85y394002e70ju6x2wqb0h");
assert.equal(dermatologyProductionReceipt.locale, "CS");
assert.equal(dermatologyProductionReceipt.approval.reviewer_name, dermatologyApproval?.reviewer_name);
assert.equal(dermatologyProductionReceipt.approval.reviewer_doctor_id, dermatologyApproval?.reviewer_doctor_id);
assert.equal(dermatologyProductionReceipt.approval.reviewed_at, dermatologyApproval?.reviewed_at);
assert.equal(dermatologyProductionReceipt.approval.approved_sha256, dermatologyApproval?.approved_sha256);
assert.equal(
  dermatologyProductionReceipt.approval.reviewer_record_artifact,
  "reviewer-supplied-clinical-approval-2026-09-02-1030.md",
);
assert.equal(
  dermatologyProductionReceipt.approval.reviewer_record_sha256,
  "ea50ff1e8ddaa9c927655ec5244bbe57c0207f488cb5681fb35f120922739c4b",
);
assert.match(dermatologyApprovalRecordText, /Reviewer:\*\* MUDr\. Ahmed Maklad/);
assert.match(dermatologyApprovalRecordText, /Reviewer confirmation\/signature:\*\* AM/);
assert.match(dermatologyApprovalRecordText, new RegExp(dermatologyApproval.approved_sha256));
assert.match(dermatologyApprovalRecordText, /not be marked fully review-complete/);
assert.equal(dermatologyProductionReceipt.database_readback.status, "verified_transactionally");
assert.equal(dermatologyProductionReceipt.database_readback.faq_records_updated_in_place, 6);
assert.equal(dermatologyProductionReceipt.public_readback.artifact, "production-readback-2026-09-02-dermatology.json");
assert.equal(dermatologyProductionReceipt.public_readback.status, "verified_exact_body_and_faqs");
assert.equal(dermatologyProductionReadback.asset, dermatologyProductionReceipt.asset);
assert.equal(dermatologyProductionReadback.approved_payload_sha256, dermatologyApproval?.approved_sha256);
assert.ok(strictUtcTimestamp(dermatologyProductionReadback.database.retrieved_at));
assert.ok(strictUtcTimestamp(dermatologyProductionReadback.database.service_updated_at));
assert.ok(strictUtcTimestamp(dermatologyProductionReadback.database.cs_translation_updated_at));
assert.equal(dermatologyProductionReadback.database.service_id, dermatologyProductionReceipt.service_id);
assert.match(dermatologyProductionReadback.database.source_sha256, /^[a-f0-9]{64}$/);
assert.equal(
  dermatologyProductionReadback.database.detail_body_sha256,
  createHash("sha256").update(dermatologyDraft.detailBody).digest("hex"),
  "deployed Czech dermatology body no longer matches the approved draft",
);
assert.equal(dermatologyProductionReadback.database.faq_records.length, 6);
assert.deepEqual(
  dermatologyProductionReadback.database.faq_records,
  dermatologyDraft.faqs.map(({ id, question, answer }) => ({
    id,
    sha256: createHash("sha256").update(JSON.stringify({ id, question, answer })).digest("hex"),
  })),
  "deployed Czech dermatology FAQs no longer match the approved draft",
);
assert.ok(strictUtcTimestamp(dermatologyProductionReadback.public.retrieved_at));
assert.ok(
  Date.parse(dermatologyProductionReadback.public.retrieved_at) >
    Date.parse(dermatologyProductionReadback.database.service_updated_at),
  "Czech dermatology public readback predates the production write",
);
assert.equal(
  dermatologyProductionReadback.public.url,
  "https://www.myglobalhealth.online/czechia/cs/services/kozni-konzultace-praha",
);
assert.equal(dermatologyProductionReadback.public.status, 200);
assert.match(dermatologyProductionReadback.public.html_sha256, /^[a-f0-9]{64}$/);
assert.ok(
  [
    dermatologyProductionReadback.public.approved_title_present,
    dermatologyProductionReadback.public.approved_h1_present,
    dermatologyProductionReadback.public.approved_description_present,
    dermatologyProductionReadback.public.approved_body_present,
  ].every(Boolean),
  "Czech dermatology public copy readback failed",
);
assert.deepEqual(
  dermatologyProductionReadback.public.faq_records.map(({ id }) => id).sort(),
  dermatologyProductionReadback.database.faq_records.map(({ id }) => id).sort(),
);
assert.ok(
  dermatologyProductionReadback.public.faq_records.every(
    ({ question_present, answer_present }) => question_present && answer_present,
  ),
  "Czech dermatology public FAQ readback failed",
);
assert.deepEqual(
  productionReadback.map(({ url }) => url).sort(),
  deploymentVerifiedMatrixRows.map(({ url }) => url).sort(),
);
const productionByUrl = new Map(productionReadback.map((row) => [row.url, row]));
const sep2ProductionReadbackUrls = new Set(
  [...clinicalProductionReadbackSep2, ...clinicalProductionReadbackSep2SuperAdmin, ...remainingProductionRows].map(
    ({ url }) => url,
  ),
);
const remainingProductionReadbackUrls = new Set(remainingProductionRows.map(({ url }) => url));
for (const row of deploymentVerifiedMatrixRows) {
  const live = productionByUrl.get(row.url);
  assert.ok(live, `production readback missing ${row.url}`);
  assert.ok(strictUtcTimestamp(live.retrieved_at), `invalid production retrieval time for ${row.url}`);
  const readbackWindow = remainingProductionReadbackUrls.has(row.url)
    ? ["2026-09-02T19:00:00Z", "2026-09-03T19:00:00Z"]
    : sep2ProductionReadbackUrls.has(row.url)
      ? ["2026-09-01T19:00:00Z", "2026-09-02T19:00:00Z"]
      : ["2026-08-31T19:00:00Z", "2026-09-01T19:00:00Z"];
  assert.ok(
    Date.parse(live.retrieved_at) >= Date.parse(readbackWindow[0]) &&
      Date.parse(live.retrieved_at) < Date.parse(readbackWindow[1]),
    `production readback is outside its recorded Asia/Karachi capture window for ${row.url}`,
  );
  assert.equal(live.status, "200", `non-200 production status for ${row.url}`);
  assert.ok(
    [row.optimized_title, `${row.optimized_title} · Global Health`, `${row.optimized_title} · Czechia`].includes(live.title),
    `deployed title mismatch for ${row.url}`,
  );
  assert.equal(live.meta_description, row.optimized_meta_description, `deployed meta mismatch for ${row.url}`);
  assert.equal(live.h1, row.optimized_h1, `deployed H1 mismatch for ${row.url}`);
  assert.equal(live.canonical, row.url, `deployed canonical mismatch for ${row.url}`);
  assert.equal(live.robots, "index, follow", `deployed robots mismatch for ${row.url}`);
  assert.equal(live.self_hreflang, "yes", `deployed self-hreflang missing for ${row.url}`);
  assert.ok(Number.isInteger(Number(live.hreflang_count)) && Number(live.hreflang_count) > 0, `deployed hreflang set missing for ${row.url}`);
  assert.ok(
    live.schema_types
      .split("|")
      .every((type) => /^[A-Za-z][A-Za-z0-9]*$/.test(type) && !placeholderSchemaTypes.has(type.toLowerCase())),
    `deployed schema types missing or invalid for ${row.url}`,
  );
  assert.ok(Number.isInteger(Number(live.internal_link_count)) && Number(live.internal_link_count) > 0, `deployed internal links missing for ${row.url}`);
}
const approvedDoctorFaqReadback = clinicalProductionReadbackSep2SuperAdmin.filter(({ url }) =>
  url.includes("/czechia/cs/doctors/"),
);
assert.equal(approvedDoctorFaqReadback.length, 5);
assert.ok(
  approvedDoctorFaqReadback.every(({ approved_doctor_faqs_present }) => approved_doctor_faqs_present === "yes"),
  "approved Czech doctor FAQ copy is missing from public readback",
);
assert.equal(
  clinicalProductionReadbackSep2SuperAdmin.find(({ url }) => url === "https://www.myglobalhealth.online/czechia/en")
    ?.english_home_czech_copy_absent,
  "yes",
  "Czech copy remains visible on the Czechia English home page",
);

const czechiaApprovedToolSeo = JSON.parse(
  await readFile(new URL("../../frontend/lib/tools/czechia-approved-tool-seo.json", root), "utf8"),
);
assert.deepEqual(
  Object.keys(czechiaApprovedToolSeo).sort(),
  [
    "adhd-test",
    "blood-pressure-chart",
    "bmi-calculator",
    "calorie-calculator",
    "due-date-calculator",
    "osteoporosis-risk-checker",
    "ovulation-calculator",
  ].sort(),
  "served Czech tool approval set drift",
);
for (const [slug, desired] of Object.entries(czechiaApprovedToolSeo)) {
  const asset = `/czechia/cs/tools/${slug}`;
  const gate = clinicalByAsset.get(asset);
  assert.equal(gate?.status, "approved", `served Czech tool copy is not approved for ${asset}`);
  const approvalHash = createHash("sha256")
    .update(JSON.stringify({ assetKind: "tool", assetPath: asset, locale: "CS", desired, faqReplacements: [] }))
    .digest("hex");
  assert.equal(gate.approved_sha256, approvalHash, `served Czech tool copy approval hash drift for ${asset}`);
}

assert.deepEqual(
  Object.keys(CZECHIA_APPROVED_DOCTOR_FAQS).sort(),
  CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS.map(({ slug }) => slug).sort(),
  "served Czech doctor FAQ approval set drift",
);
for (const draft of CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS) {
  assert.deepEqual(
    CZECHIA_APPROVED_DOCTOR_FAQS[draft.slug],
    draft.faqReplacements,
    `served Czech doctor FAQ copy drift for ${draft.assetPath}`,
  );
  const gate = clinicalByAsset.get(draft.assetPath);
  assert.equal(gate?.status, "approved", `served Czech doctor copy is not approved for ${draft.assetPath}`);
  assert.equal(
    gate.approved_sha256,
    czechiaClinicalDraftApprovalSha256(draft),
    `served Czech doctor copy approval hash drift for ${draft.assetPath}`,
  );
}

for (const row of matrix.filter(({ clinical_review_required }) => clinical_review_required === "yes")) {
  const asset = new URL(row.url).pathname;
  const gate = clinicalByAsset.get(asset);
  assert.ok(gate, `clinical register missing ${asset}`);
  assert.equal(new URL(gate.official_source).protocol, "https:", `clinical source must use HTTPS for ${asset}`);
  assert.ok(gate.reviewer_requirement, `clinical reviewer missing for ${asset}`);
  assert.ok(["pending", "approved", "super_admin_override"].includes(gate.status), `unexpected clinical status for ${asset}`);
  if (["approved", "super_admin_override"].includes(gate.status)) {
    const deployedSep2 =
      asset === new URL(pragueProductionReadback.public.url).pathname ||
      [...clinicalProductionReadbackSep2, ...clinicalProductionReadbackSep2SuperAdmin].some(
        ({ url }) => new URL(url).pathname === asset,
      ) || remainingProductionReadback.pages.some(({ url }) => new URL(url).pathname === asset);
    assert.equal(
      row.implementation_status,
      deployedSep2 ? "live_verified_2026-09-02" : "live_verified_2026-09-01",
      `approved clinical row has the wrong deployment state for ${asset}`,
    );
    assert.match(gate.approved_sha256, /^[a-f0-9]{64}$/, `invalid approved hash for ${asset}`);
    if (gate.status === "approved") {
      assert.ok(gate.reviewer_name, `approved clinical reviewer name missing for ${asset}`);
      assert.ok(gate.reviewer_doctor_id, `approved clinical reviewer ID missing for ${asset}`);
      assert.ok(strictRfc3339Timestamp(gate.reviewed_at), `invalid clinical review time for ${asset}`);
    } else {
      assert.ok(
        [gate.reviewer_name, gate.reviewer_doctor_id, gate.reviewed_at].every((value) => value === ""),
        `super-admin override must not impersonate a named clinical reviewer for ${asset}`,
      );
    }
    if (gate.status === "approved" && (asset === "/czechia/en" || asset === "/czechia/en/services/lekar-online-praha")) {
      assert.ok(gate.native_reviewer_name, `native reviewer name missing for ${asset}`);
      assert.ok(gate.native_reviewer_id, `native reviewer ID missing for ${asset}`);
      assert.ok(strictRfc3339Timestamp(gate.native_reviewed_at), `invalid native review time for ${asset}`);
    }
  } else {
    assert.ok(!row.implementation_status.startsWith("live_verified_"), `pending clinical row is marked live for ${asset}`);
    assert.ok(
      [
        gate.reviewer_name,
        gate.reviewer_doctor_id,
        gate.reviewed_at,
        gate.approved_sha256,
        gate.native_reviewer_name,
        gate.native_reviewer_id,
        gate.native_reviewed_at,
      ].every((value) => value === ""),
      `pending clinical row contains approval data for ${asset}`,
    );
  }
}

const pageTypeCounts = Object.groupBy(matrix, ({ page_type }) => page_type);
const count = (...types) => types.reduce((total, type) => total + (pageTypeCounts[type]?.length ?? 0), 0);
assert.deepEqual(
  {
    static: count("blog-hub", "standalone", "legal-hub", "legal-detail"),
    pageContent: count("home", "gp-hub", "doctor-directory"),
    service: count("service"),
    blog: count("blog-post"),
    doctor: count("doctor-profile"),
    tool: count("tool"),
  },
  { static: 14, pageContent: 4, service: 16, blog: 4, doctor: 5, tool: 7 },
);

for (const url of [
  "https://www.myglobalhealth.online/czechia/cs/gp-consultation-online",
  "https://www.myglobalhealth.online/czechia/cs/blog/lekar-online-24-7-co-vyresi",
  "https://www.myglobalhealth.online/czechia/cs/services/cestovni-medicina-praha",
]) {
  assert.equal(matrix.find((row) => row.url === url)?.implementation_status, "live_verified_2026-09-02");
}

const rewrittenFields = matrix.flatMap((row) => [
  row.optimized_title,
  row.optimized_meta_description,
  row.optimized_h1,
  row.optimized_visible_description,
]);
const rewrittenText = rewrittenFields.join("\n");
assert.ok(!/[—–]/.test(rewrittenText), "deslop: rewritten copy contains long dashes");
assert.ok(!/zde je|pojďme|v dnešní|stojí za zmínku|zásadně|robustní|landscape/i.test(rewrittenText), "deslop: formulaic wording remains");

const keywordRows = records(await read("03-keyword-master.csv"));
const matrixUrls = new Set(matrix.map(({ url }) => url));
assert.equal(keywordRows.length, 481);
assert.ok(keywordRows.every(({ owner_url }) => owner_url && matrixUrls.has(owner_url)), "keyword owner missing from completion matrix");

const mappedUrls = records(await read("05-url-keyword-map.csv")).map(
  ({ url }) => `https://www.myglobalhealth.online${url}`,
);
assert.ok(mappedUrls.every((url) => matrixUrls.has(url)), "URL map owner missing from completion matrix");

const ownership = `${await read("05-url-keyword-map.csv")}\n${await read("06-proposed-site-architecture.md")}`;
for (const obsolete of [
  "kozni-konzultace-online",
  "doporuceni-ke-specialistovi-a-zadanky",
  "druhy-lekarsky-nazor",
  "blood-pressure-calculator",
]) {
  assert.ok(!ownership.includes(obsolete), `obsolete slug found: ${obsolete}`);
}

/**
 * Draft-versus-matrix equality (§38.1, 2026-09-03).
 *
 * The approval gates bind the SHA-256 of the DRAFT FILE, but a reviewer reads
 * the completion matrix. When those two disagree the clinician approves text
 * they were never shown — which is exactly what happened to `gpSafetyCs` and
 * `cestovni-medicina-praha` in the 08-31→09-02 batch. Asserting the equality
 * here turns that governance question into a build failure, so nobody has to
 * remember it on the next batch.
 *
 * Doctor rows carry no hero field, so their H1 is not compared; every other
 * family compares title, description, H1, primary keyword and the secondary
 * keyword list.
 */
const matrixByPath = new Map(matrix.map((row) => [new URL(row.url).pathname, row]));
const toolPath = (draft) => draft.assetPath;
const draftMatrixExpectations = [
  ...CZECHIA_PAGE_CONTENT_SEO_DRAFTS.filter(({ locale }) => locale === "CS").map((draft) => ({
    label: `page:${draft.key}`,
    path: draft.canonicalPath,
    title: draft.copy.seoTitle,
    description: draft.copy.seoDescription,
    h1: draft.copy.heroTitle,
    primaryKeyword: draft.primaryKeyword,
    secondaryKeywords: draft.secondaryKeywords,
  })),
  ...CZECHIA_SEO_SERVICE_DRAFTS.filter(({ locale }) => locale === "CS").map((draft) => ({
    label: `service:${draft.slug}`,
    path: `/czechia/cs/services/${draft.slug}`,
    title: draft.seoTitle,
    description: draft.seoDescription,
    h1: draft.heroTitle,
    primaryKeyword: draft.primaryKeyword,
    secondaryKeywords: draft.secondaryKeywords,
  })),
  ...CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS.map((draft) => ({
    label: `doctor:${draft.slug}`,
    path: draft.assetPath,
    title: draft.desired.seoTitle,
    description: draft.desired.seoDescription,
    h1: null,
    primaryKeyword: draft.primaryKeyword,
    secondaryKeywords: draft.secondaryKeywords,
  })),
  ...CZECHIA_BLOG_SEO_DRAFTS.map((draft) => ({
    label: `blog:${draft.slug}`,
    path: draft.assetPath,
    title: draft.desired.seoTitle,
    description: draft.desired.seoDescription,
    h1: draft.desired.title,
    primaryKeyword: draft.primaryKeyword,
    secondaryKeywords: draft.secondaryKeywords,
  })),
  ...CZECHIA_TOOL_SEO_DRAFTS.map((draft) => ({
    label: `tool:${draft.slug}`,
    path: toolPath(draft),
    title: draft.desired.metaTitle,
    description: draft.desired.metaDescription,
    h1: [draft.desired.h1Lead, draft.desired.h1Accent, draft.desired.h1Trail]
      .filter((part) => part && part.trim() !== "")
      .join(" "),
    primaryKeyword: draft.primaryKeyword,
    secondaryKeywords: draft.secondaryKeywords,
  })),
];
assert.ok(draftMatrixExpectations.length >= 30, "draft/matrix comparison covered too few drafts");
for (const draft of draftMatrixExpectations) {
  const row = matrixByPath.get(draft.path);
  assert.ok(row, `${draft.label}: no completion-matrix row for ${draft.path}`);
  assert.equal(row.optimized_title, draft.title, `${draft.label}: draft title differs from the matrix row a reviewer reads`);
  assert.equal(
    row.optimized_meta_description,
    draft.description,
    `${draft.label}: draft meta description differs from the matrix row a reviewer reads`,
  );
  if (draft.h1 !== null) {
    assert.equal(row.optimized_h1, draft.h1, `${draft.label}: draft H1 differs from the matrix row a reviewer reads`);
  }
  assert.equal(
    row.primary_keyword,
    draft.primaryKeyword,
    `${draft.label}: draft primary keyword differs from the matrix row a reviewer reads`,
  );
  assert.deepEqual(
    row.secondary_keywords.split("|").map((keyword) => keyword.trim()).filter(Boolean),
    [...draft.secondaryKeywords],
    `${draft.label}: draft secondary keywords differ from the matrix row a reviewer reads`,
  );
}

console.log("Czechia SEO artifacts: OK");
