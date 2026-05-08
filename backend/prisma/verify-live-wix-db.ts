/**
 * Live Wix HTML ↔ PostgreSQL CMS verification.
 *
 * Fetches public Wix URLs, reads CMS via Prisma, writes docs/live-wix-db-verification-report.md.
 *
 * Mirrors publication-validation rules from frontend/lib/content/publication-validation.ts — update both when rules change.
 */

import { config as loadEnv } from "dotenv";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ServiceKind } from "@prisma/client";
import { Pool } from "pg";

const prismaDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(prismaDir, "..");
const repoRoot = join(backendRoot, "..");
loadEnv({ path: join(backendRoot, ".env") });

const WIX_BASE = "https://www.myglobalhealth.online";

/** CMS hub rows — not duplicated as grid cards on Wix menus when comparing counts. */
const IE_HUB_SLUGS = new Set(["general-consultation", "specialist-overview"]);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/* -------------------------------------------------------------------------- *
 * Publication mirror (keep aligned with frontend publication-validation.ts)
 * -------------------------------------------------------------------------- */

const BLOCKED_PATTERNS = [
  /\bTODO\b/i,
  /\bplaceholder\b/i,
  /\bmigration\b/i,
  /\badapter\b/i,
  /\btemplate-driven\b/i,
  /\badmin-managed\b/i,
  /\bfuture-managed\b/i,
  /\bseeded\b/i,
  /\bfallback\b/i,
  /\bmock\b/i,
  /\bpending\b/i,
  /\blegacy compatibility\b/i,
];

function hasBlockedCopy(value: string | null | undefined): boolean {
  if (!value) return false;
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(value));
}

type ServiceValidationInput = {
  kind: ServiceKind;
  name: string;
  summary: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  detailBody: string | null;
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
};

function validatePublicServiceMirror(service: ServiceValidationInput): { shouldNoindex: boolean; issues: string[] } {
  const issues: string[] = [];
  const title = service.heroTitle ?? service.name;
  const description = service.heroDescription ?? service.summary;
  const body = service.detailBody ?? service.summary;

  if (!title || title.trim().length < 10) issues.push("heroTitle/name too short");
  if (!description || description.trim().length < 30) issues.push("heroDescription/summary too short");
  if (!body || body.trim().length < 120) issues.push("detailBody/summary body too short");
  if (service.durationMinutes == null) issues.push("durationMinutes missing");
  if (service.basePriceCents == null || !service.currencyCode) issues.push("pricing missing");
  if (!body || !/emergency|urgent|severe|chest pain|breathing/i.test(body)) issues.push("emergency wording missing");
  if (!body || !/online|in-person|cannot be handled|not suitable/i.test(body)) issues.push("limitations wording missing");
  if (
    (service.kind === "GENERAL" || service.kind === "SPECIALIST" || service.kind === "PRESCRIPTION") &&
    (!body || !/prescription|referral|certificate|sick note|clinically appropriate/i.test(body))
  ) {
    issues.push("boundary wording missing");
  }
  if (hasBlockedCopy(title) || hasBlockedCopy(description) || hasBlockedCopy(body)) issues.push("blocked copy pattern");

  return { shouldNoindex: issues.length > 0, issues };
}

type DoctorValidationInput = {
  fullName: string;
  title: string;
  bio: string | null;
  languages: string[];
  specialties: string[];
  imcRegistration: string | null;
  medicalRegistrationUrl: string | null;
  qualifications: string[];
};

type CredentialStatus =
  | "valid_visible_imc"
  | "placeholder_zero"
  | "placeholder_n"
  | "missing"
  | "unknown_format";

type CredentialClassification = {
  status: CredentialStatus;
  /** Normalized value used for strict comparisons (only when status is valid_visible_imc). */
  imcValue: string | null;
};

function classifyCredentialImc(raw: string | null | undefined): CredentialClassification {
  if (raw == null) {
    return { status: "missing", imcValue: null };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { status: "missing", imcValue: null };
  }

  const upper = trimmed.toUpperCase();

  // Wix can show placeholder markers like "0" and "N" instead of a verified identifier.
  if (/^IMC\s*0+$/i.test(trimmed) || upper === "0") {
    return { status: "placeholder_zero", imcValue: null };
  }
  if (/^IMC\s*N$/i.test(trimmed) || upper === "N") {
    return { status: "placeholder_n", imcValue: null };
  }

  const numericOnly = upper.match(/^\d+$/);
  if (numericOnly) {
    const n = Number(trimmed);
    if (n > 0 && Number.isFinite(n)) return { status: "valid_visible_imc", imcValue: String(n) };
    return { status: "placeholder_zero", imcValue: null };
  }

  const imcLabelMatch = trimmed.match(/^IMC\s*([1-9]\d*)$/i);
  if (imcLabelMatch?.[1]) {
    return { status: "valid_visible_imc", imcValue: imcLabelMatch[1] };
  }

  return { status: "unknown_format", imcValue: null };
}

function validatePublicDoctorMirror(doctor: DoctorValidationInput): { shouldNoindex: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!doctor.fullName.trim()) issues.push("fullName missing");
  if (!doctor.title.trim()) issues.push("title missing");
  if (!doctor.bio || doctor.bio.trim().length < 120) issues.push("bio too short (<120)");
  const credential = classifyCredentialImc(doctor.imcRegistration);
  // IMPORTANT: We never treat IMC "0" or "N" as verified. They are visible roster placeholders and must remain index blockers.
  if (credential.status !== "valid_visible_imc") {
    issues.push(`credentials invalid (${credential.status})`);
  }
  if (!doctor.languages || doctor.languages.length === 0) issues.push("languages missing (warning-tier)");
  if (!doctor.specialties || doctor.specialties.length === 0) issues.push("specialties missing (warning-tier)");
  if (
    hasBlockedCopy(doctor.bio) ||
    hasBlockedCopy(doctor.title) ||
    doctor.qualifications.some((q) => hasBlockedCopy(q))
  ) {
    issues.push("blocked copy pattern");
  }
  const hardErrors = issues.filter((i) => !i.includes("warning-tier"));
  return { shouldNoindex: hardErrors.length > 0, issues };
}

function readReadyToIndex(editorialChecklist: unknown): boolean {
  if (!editorialChecklist || typeof editorialChecklist !== "object" || Array.isArray(editorialChecklist)) return false;
  return (editorialChecklist as { readyToIndex?: unknown }).readyToIndex === true;
}

/* -------------------------------------------------------------------------- *
 * Wix fetch + parse (heuristic)
 * -------------------------------------------------------------------------- */

async function fetchWixHtml(path: string): Promise<string> {
  const url = `${WIX_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "GlobalHealthCMSVerification/1.0 (+internal; contact ops)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) {
    throw new Error(`Wix fetch failed ${response.status} ${url}`);
  }
  return response.text();
}

function htmlToLines(html: string): string[] {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/gi, " and ")
    .replace(/&#0*38;/gi, " and ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, " ")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0 && !/^top of page$|^bottom of page$/i.test(line));
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/respiractory/g, "respiratory")
    .replace(/\s+/g, " ")
    .replace(/[""'`]/g, "")
    .trim();
}

/** Rows where line i is "N minutes", i-1 title, i+1 price */
function parseMinutePriceRows(lines: string[]): Array<{ title: string; minutes: number; euros: number }> {
  const out: Array<{ title: string; minutes: number; euros: number }> = [];
  for (let i = 1; i < lines.length - 1; i++) {
    const minMatch = lines[i].match(/^(\d+)\s*minutes?$/i);
    if (!minMatch) continue;
    const minutes = Number.parseInt(minMatch[1], 10);
    const title = lines[i - 1];
    if (!title || /^(€|\$)/.test(title)) continue;
    const priceLine = lines[i + 1] ?? "";
    const euroMatch = priceLine.replace(/\s/g, "").match(/€\s*(\d+)/i);
    if (!euroMatch) continue;
    const euros = Number.parseInt(euroMatch[1], 10);
    out.push({ title: title.trim(), minutes, euros });
  }
  return out;
}

/** Online prescription: title, then €25, then 5 minutes — scan sliding window */
function parsePrescriptionRows(lines: string[]): Array<{ title: string; minutes: number; euros: number }> {
  const out: Array<{ title: string; minutes: number; euros: number }> = [];
  for (let i = 0; i < lines.length - 2; i++) {
    const title = lines[i];
    if (/how our|choose your|pick up|partner pharmacy|available in ireland/i.test(title)) continue;
    const euroLine = lines[i + 1]?.replace(/\s/g, "") ?? "";
    const minLine = lines[i + 2] ?? "";
    const em = euroLine.match(/^€(\d+)/i);
    const mm = minLine.match(/^(\d+)\s*minutes?$/i);
    if (em && mm && title.length > 3 && /prescription$/i.test(title)) {
      out.push({ title: title.trim(), minutes: Number.parseInt(mm[1], 10), euros: Number.parseInt(em[1], 10) });
    }
  }
  return out;
}

/** Health tests: line with test-like title followed by €NN (skip Finger Prick etc.) */
function parseHealthTestRows(lines: string[]): Array<{ title: string; euros: number }> {
  const out: Array<{ title: string; euros: number }> = [];
  const skipNext = new Set(["finger prick", "saliva", "stool sample", "results in", "weeks", "days"]);

  for (let i = 1; i < lines.length; i++) {
    const euroMatch = lines[i].replace(/\s/g, "").match(/^€(\d+)$/);
    if (!euroMatch) continue;
    const title = lines[i - 1];
    if (!title || title.length < 6) continue;
    const t = title.toLowerCase();
    if ([...skipNext].some((s) => t.includes(s))) continue;
    if (/^€/.test(title)) continue;
    out.push({ title: title.trim(), euros: Number.parseInt(euroMatch[1], 10) });
  }
  return out;
}

type WixDoctorCredentialEntry = {
  doctorName: string;
  credentialMarker: string | null;
  credentialStatus: CredentialStatus;
  /** Only set when credentialStatus === "valid_visible_imc" */
  imcValue: string | null;
  /** Whether the doctor card shows a placeholder `0` token anywhere in the credential area. */
  placeholderZeroVisible: boolean;
  /** Whether the doctor card shows a placeholder `N` token anywhere in the credential area. */
  placeholderNVisible: boolean;
};

function isLikelyWixDoctorName(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 80) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  if (!/\s/.test(t)) return false;

  const upper = t.toUpperCase();
  const excludedExact = new Set([
    "TEAM",
    "MEET OUR DOCTORS",
    "CLINICAL DIRECTOR",
    "GENERAL PRACTITIONER DOCTOR",
    "MEDICAL DOCTOR",
    "NEUROLOGIST REGISTRAR",
    "NUTRITIONIST",
    "CONSULTANT PSYCHIATRIST",
    "PAEDIATRIC CONSULTANT",
    "ONCOLOGIST REGISTRAR",
    "PHYSIOTHERAPIST",
    "PSYCHOLOGIST",
    "CONSULTANT CARDIOLOGIST",
    "IMC",
    "PSI",
    "LEARN MORE",
    "LANGUAGE",
    "LANGUAGES",
    "BOTÃO",
  ]);
  if (excludedExact.has(upper)) return false;

  // Avoid capturing role headings (often all-caps).
  if (t === upper && /[A-Z]/.test(t)) return false;

  return true;
}

function parseWixDoctorCredentials(html: string): WixDoctorCredentialEntry[] {
  const lines = htmlToLines(html);
  const byName = new Map<string, WixDoctorCredentialEntry>();

  for (let i = 0; i < lines.length; i++) {
    const maybeName = lines[i];
    if (!isLikelyWixDoctorName(maybeName)) continue;

    let credentialMarker: string | null = null;
    let credentialStatus: CredentialStatus = "missing";
    let imcValue: string | null = null;
    let placeholderZeroVisible = false;
    let placeholderNVisible = false;

    // Look ahead within the likely doctor card for IMC/PSI or placeholder markers (0/N).
    for (let j = i + 1; j < i + 14 && j < lines.length; j++) {
      const token = lines[j];
      const upper = token.toUpperCase();

      if (upper === "IMC" || upper === "PSI") {
        const value = (lines[j + 1] ?? "").trim();
        const classified = classifyCredentialImc(value || null);
        if (classified.status === "valid_visible_imc") {
          credentialMarker = value ? `${upper} ${value}` : upper;
          credentialStatus = classified.status;
          imcValue = classified.imcValue;
          break;
        }
        if (classified.status === "placeholder_zero") {
          placeholderZeroVisible = true;
        } else if (classified.status === "placeholder_n") {
          placeholderNVisible = true;
        } else if (classified.status === "unknown_format") {
          // Keep as unknown format via status later if no valid markers exist.
        }
        continue;
      }

      if (upper === "0") {
        placeholderZeroVisible = true;
        continue;
      }

      if (upper === "N") {
        placeholderNVisible = true;
        continue;
      }

      if (upper === "LANGUAGE" || upper === "LANGUAGES") {
        // If we hit language section without seeing credentials, treat as missing.
        break;
      }
    }

    if (credentialStatus !== "valid_visible_imc") {
      if (placeholderZeroVisible && placeholderNVisible) {
        credentialMarker = "0 + N";
        credentialStatus = "placeholder_n";
      } else if (placeholderNVisible) {
        credentialMarker = "N";
        credentialStatus = "placeholder_n";
      } else if (placeholderZeroVisible) {
        credentialMarker = "0";
        credentialStatus = "placeholder_zero";
      }
    }

    const key = maybeName.trim();
    byName.set(key, {
      doctorName: maybeName.trim(),
      credentialMarker,
      credentialStatus,
      imcValue,
      placeholderZeroVisible,
      placeholderNVisible,
    });
  }

  return [...byName.values()];
}

function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type WixBlogPost = {
  title: string;
  slug: string;
  excerpt: string | null;
  author: string | null;
  date: string | null;
  reviewer: string | null;
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseWixBlogPostsFromHtml(html: string): { requiresBrowserMode: boolean; posts: WixBlogPost[] } {
  if (!html) return { requiresBrowserMode: true, posts: [] };

  const postSlugSet = new Set<string>();
  // Wix blog feed sometimes renders links in a way that doesn't match a strict `href="/post/..."` pattern.
  // As a resilient fallback, extract `/post/<slug>` anywhere in the HTML.
  const slugAnywhereRe = /\/post\/([A-Za-z0-9-]+)/gi;
  let slugMatch: RegExpExecArray | null;
  while ((slugMatch = slugAnywhereRe.exec(html))) {
    const slug = slugMatch[1];
    if (slug) postSlugSet.add(slug);
  }

  const postsBySlug = new Map<string, WixBlogPost>();

  // Wix can render the blog cards as standard anchors.
  const anchorRe =
    /href=["']\/post\/([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    const slug = m[1];
    const inner = m[2] ?? "";
    const title = decodeHtmlEntities(stripHtmlTags(inner));
    if (!title || title.length < 5) continue;
    if (/read more|more actions/i.test(title)) continue;

    if (!postsBySlug.has(slug)) {
      postsBySlug.set(slug, {
        title,
        slug,
        excerpt: null,
        author: null,
        date: null,
        reviewer: null,
      });
    }
  }

  const anchorParsedCount = postsBySlug.size;

  // If we found slugs but couldn't reliably parse titles/excerpts, we still return the items
  // (count accuracy) and mark that metadata details require browser confirmation.
  for (const slug of postSlugSet) {
    if (!postsBySlug.has(slug)) {
      postsBySlug.set(slug, {
        title: slug,
        slug,
        excerpt: null,
        author: null,
        date: null,
        reviewer: null,
      });
    }
  }

  const posts = [...postsBySlug.values()];
  if (posts.length === 0) {
    return { requiresBrowserMode: true, posts: [] };
  }

  const requiresBrowserMode = anchorParsedCount === 0 || anchorParsedCount !== postSlugSet.size;
  return { requiresBrowserMode, posts };
}

function readStaticBlogSlugCount(): number {
  const blogPath = join(repoRoot, "frontend", "data", "blog-posts.ts");
  try {
    const raw = readFileSync(blogPath, "utf8");
    const empty = /export const blogPosts:\s*BlogPost\[\]\s*=\s*\[\s*\]\s*;/m.test(raw);
    if (empty) return 0;
    const matches = raw.match(/\bslug:\s*"/g);
    return matches?.length ?? 0;
  } catch {
    return -1;
  }
}

function parseSitemapNoindexStatic(): string[] {
  const smPath = join(repoRoot, "frontend", "app", "sitemap.ts");
  const raw = readFileSync(smPath, "utf8");
  const block = raw.match(/noindexStatic\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (!block) return [];
  const paths: string[] = [];
  const re = /"(\/[^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block[1]))) {
    paths.push(m[1]);
  }
  return paths;
}

type ReportRow = {
  area: string;
  wixValue: string;
  dbValue: string;
  match: string;
  risk: string;
  requiredFix: string;
};

function row(area: string, wixValue: string, dbValue: string, match: string, risk: string, requiredFix: string): ReportRow {
  return { area, wixValue, dbValue, match, risk, requiredFix };
}

function escapeMdCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

/**
 * Loads live Wix HTML, queries PostgreSQL via Prisma, and overwrites `docs/live-wix-db-verification-report.md`.
 *
 * @example
 * cd backend && npx tsx prisma/verify-live-wix-db.ts
 */
async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();

  const [generalHtml, specialtyHtml, prescriptionHtml, healthHtml, teamHtml, blogHtml] = await Promise.all([
    fetchWixHtml("/general-consultation-ie"),
    fetchWixHtml("/specialty-ie"),
    fetchWixHtml("/online-prescription"),
    fetchWixHtml("/home-health-test"),
    fetchWixHtml("/ireland-team"),
    fetchWixHtml("/blog").catch(() => ""),
  ]);

  const wixGeneral = parseMinutePriceRows(htmlToLines(generalHtml));
  const wixSpecialty = parseMinutePriceRows(htmlToLines(specialtyHtml));
  const wixRx = parsePrescriptionRows(htmlToLines(prescriptionHtml));
  const wixTests = parseHealthTestRows(htmlToLines(healthHtml));
  const wixDoctorEntries = parseWixDoctorCredentials(teamHtml);
  const wixDoctorUniqueCount = new Set(wixDoctorEntries.map((d) => d.doctorName)).size;
  const wixValidImcCount = wixDoctorEntries.filter((d) => d.credentialStatus === "valid_visible_imc").length;
  const wixPlaceholderZeroCount = wixDoctorEntries.filter((d) => d.placeholderZeroVisible).length;
  const wixPlaceholderNCount = wixDoctorEntries.filter((d) => d.placeholderNVisible).length;
  const wixMissingCount = wixDoctorEntries.filter((d) => d.credentialStatus === "missing").length;

  const wixValidImcSet = new Set(wixDoctorEntries.filter((d) => d.credentialStatus === "valid_visible_imc" && d.imcValue).map((d) => d.imcValue as string));

  const wixBlog = parseWixBlogPostsFromHtml(blogHtml);

  const services = await prisma.service.findMany({
    include: {
      country: { select: { code: true } },
      specialty: { select: { name: true } },
    },
    orderBy: [{ countryId: "asc" }, { kind: "asc" }, { slug: "asc" }],
  });

  const doctors = await prisma.doctor.findMany({
    include: {
      country: { select: { code: true } },
      specialties: { include: { specialty: { select: { name: true } } } },
    },
  });

  const blogDbCount = await prisma.blogPost.count();
  const blogDbExamples = await prisma.blogPost.findMany({
    take: 6,
    orderBy: { updatedAt: "desc" },
    select: {
      title: true,
      slug: true,
      status: true,
      isActive: true,
      authorDisplayName: true,
      reviewerDisplayName: true,
      lastReviewedAt: true,
      editorialChecklist: true,
    },
  });
  const contentPages = await prisma.contentPage.findMany({
    select: { pageKey: true, title: true, countryId: true, locale: true },
  });
  const countries = await prisma.country.findMany({ select: { code: true, name: true, slug: true } });

  const ieServices = services.filter((s) => s.country.code === "ie");

  const countsByKindDb = (code: string) => {
    const sub = services.filter((s) => s.country.code === code);
    const map = new Map<ServiceKind, number>();
    for (const k of Object.values(ServiceKind)) {
      map.set(k, sub.filter((s) => s.kind === k).length);
    }
    return map;
  };

  const ieKindDb = countsByKindDb("ie");

  const dbGeneralTitles = new Map(
    ieServices
      .filter((s) => s.kind === "GENERAL" && !IE_HUB_SLUGS.has(s.slug))
      .map((s) => [normalizeTitle(s.name), s] as const),
  );
  const wixGeneralNorm = wixGeneral.map((w) => ({
    ...w,
    key: normalizeTitle(w.title),
    slugGuess: slugFromTitle(w.title),
  }));

  let generalTitleMatches = 0;
  let generalDurationMatches = 0;
  let generalPriceMatches = 0;
  const wixOnlyGeneral: string[] = [];
  const dbOnlyGeneral: string[] = [];

  for (const w of wixGeneralNorm) {
    const dbRow = dbGeneralTitles.get(w.key);
    if (dbRow) {
      generalTitleMatches++;
      if (dbRow.durationMinutes === w.minutes) generalDurationMatches++;
      const dbEur = dbRow.basePriceCents != null ? Math.round(dbRow.basePriceCents / 100) : null;
      if (dbEur === w.euros) generalPriceMatches++;
    } else {
      wixOnlyGeneral.push(w.title);
    }
  }

  for (const [norm] of dbGeneralTitles) {
    if (!wixGeneralNorm.some((w) => w.key === norm)) {
      const row = [...dbGeneralTitles.entries()].find(([k]) => k === norm)?.[1];
      if (row) dbOnlyGeneral.push(`${row.name} (${row.slug})`);
    }
  }

  const dbSpecTitles = new Map(
    ieServices
      .filter((s) => s.kind === "SPECIALIST" && !IE_HUB_SLUGS.has(s.slug))
      .map((s) => [normalizeTitle(s.name), s] as const),
  );
  const wixSpecNorm = wixSpecialty.map((w) => ({ ...w, key: normalizeTitle(w.title) }));

  let specMatches = 0;
  const wixOnlySpec: string[] = [];
  for (const w of wixSpecNorm) {
    const dbRow = dbSpecTitles.get(w.key);
    if (dbRow) {
      specMatches++;
      const dbEur = dbRow.basePriceCents != null ? Math.round(dbRow.basePriceCents / 100) : null;
      if (dbRow.durationMinutes !== w.minutes || dbEur !== w.euros) {
        /* mismatch tracked below */
      }
    } else {
      const fuzzyKey = [...dbSpecTitles.keys()].find((k) =>
        k.includes(normalizeTitle(w.title).replace(/\s+consultation$/, "")),
      );
      if (!fuzzyKey) wixOnlySpec.push(w.title);
    }
  }

  const dbRxTitles = new Map(
    ieServices.filter((s) => s.kind === "PRESCRIPTION").map((s) => [normalizeTitle(s.name), s] as const),
  );
  let rxMatches = 0;
  const wixOnlyRx: string[] = [];
  for (const w of wixRx) {
    const dbRow = dbRxTitles.get(normalizeTitle(w.title));
    if (dbRow) rxMatches++;
    else wixOnlyRx.push(w.title);
  }

  const dbTestTitles = new Map(
    ieServices.filter((s) => s.kind === "HEALTH_TEST").map((s) => [normalizeTitle(s.name), s] as const),
  );
  let testMatches = 0;
  const wixOnlyTests: string[] = [];
  for (const w of wixTests) {
    const key = normalizeTitle(w.title);
    let dbRow = dbTestTitles.get(key);
    if (!dbRow) {
      dbRow = [...dbTestTitles.entries()].find(([k]) => k.includes(key) || key.includes(k))?.[1];
    }
    if (dbRow) {
      testMatches++;
      const dbEur = dbRow.basePriceCents != null ? Math.round(dbRow.basePriceCents / 100) : null;
      if (dbEur !== w.euros) {
        /* price drift */
      }
    } else {
      wixOnlyTests.push(w.title);
    }
  }

  const ieDoctors = doctors.filter((d) => d.country.code === "ie");
  const dbCredentialClassifications = ieDoctors.map((d) => ({
    doctor: d,
    credential: classifyCredentialImc(d.imcRegistration),
  }));
  const dbValidImcCount = dbCredentialClassifications.filter((d) => d.credential.status === "valid_visible_imc").length;
  const dbPlaceholderZeroCount = dbCredentialClassifications.filter((d) => d.credential.status === "placeholder_zero").length;
  const dbPlaceholderNCount = dbCredentialClassifications.filter((d) => d.credential.status === "placeholder_n").length;
  const dbMissingCount = dbCredentialClassifications.filter((d) => d.credential.status === "missing").length;

  const dbValidImcSet = new Set(
    dbCredentialClassifications
      .filter((d) => d.credential.status === "valid_visible_imc" && d.credential.imcValue)
      .map((d) => d.credential.imcValue as string),
  );

  const wixDbValidImcOverlap = [...wixValidImcSet].filter((id) => dbValidImcSet.has(id)).length;

  const staticBlogCount = readStaticBlogSlugCount();

  /** Indexing blockers */
  const ieBlockingServices = ieServices.filter((s) => {
    const v = validatePublicServiceMirror({
      kind: s.kind,
      name: s.name,
      summary: s.summary,
      heroTitle: s.heroTitle,
      heroDescription: s.heroDescription,
      detailBody: s.detailBody,
      durationMinutes: s.durationMinutes,
      basePriceCents: s.basePriceCents,
      currencyCode: s.currencyCode,
    });
    const ready = readReadyToIndex(s.editorialChecklist);
    return v.shouldNoindex || !ready;
  });

  const doctorBlocking = ieDoctors.filter((d) => {
    const specs = d.specialties.map((x) => x.specialty.name);
    const v = validatePublicDoctorMirror({
      fullName: d.fullName,
      title: d.title,
      bio: d.bio,
      languages: d.languages,
      specialties: specs,
      imcRegistration: d.imcRegistration,
      medicalRegistrationUrl: d.medicalRegistrationUrl,
      qualifications: d.qualifications,
    });
    const ready = readReadyToIndex(d.editorialChecklist);
    return v.shouldNoindex || !ready;
  });

  const ieGeneralMenuCount = ieServices.filter((s) => s.kind === "GENERAL" && !IE_HUB_SLUGS.has(s.slug)).length;
  const ieSpecialistMenuCount = ieServices.filter((s) => s.kind === "SPECIALIST" && !IE_HUB_SLUGS.has(s.slug)).length;

  const rows: ReportRow[] = [];

  const generalMenuDelta = ieGeneralMenuCount - wixGeneral.length;
  rows.push(
    row(
      "1. IE GENERAL grid rows vs CMS menu services",
      String(wixGeneral.length),
      String(ieGeneralMenuCount),
      generalMenuDelta === 0 ? "Yes" : "Partial",
      "Excludes CMS hub slug `general-consultation`. Parser may miss rows.",
      generalMenuDelta === 0
        ? "Counts align — spot-check slug/copy/pricing per row."
        : `Δ=${generalMenuDelta}: reconcile parser coverage vs CMS.`,
    ),
  );

  const specialistMenuDelta = ieSpecialistMenuCount - wixSpecialty.length;
  rows.push(
    row(
      "1b. IE SPECIALIST grid vs CMS (excl. `specialist-overview` hub)",
      String(wixSpecialty.length),
      String(ieSpecialistMenuCount),
      specialistMenuDelta === 0 ? "Yes" : "Partial",
      "Medium",
      specialistMenuDelta === 0 ? "Counts align." : `Δ=${specialistMenuDelta}: verify CMS duplicates vs Wix grid.`,
    ),
  );

  rows.push(
    row(
      "1c. IE PRESCRIPTION count",
      String(wixRx.length),
      String(ieKindDb.get("PRESCRIPTION") ?? 0),
      wixRx.length === (ieKindDb.get("PRESCRIPTION") ?? 0) ? "Yes" : "No",
      "Medium",
      wixOnlyRx.length ? `Wix titles missing in DB: ${wixOnlyRx.slice(0, 5).join("; ")}` : "Confirm parity.",
    ),
  );

  rows.push(
    row(
      "1d. IE HEALTH_TEST count (parsed)",
      String(wixTests.length),
      String(ieKindDb.get("HEALTH_TEST") ?? 0),
      Math.abs(wixTests.length - (ieKindDb.get("HEALTH_TEST") ?? 0)) <= 2 ? "Partial" : "No",
      "High",
      "HTML heuristic may duplicate/skip tests — manual spot-check.",
    ),
  );

  rows.push(
    row(
      "2–4. IE GENERAL titles / durations / €",
      `${generalTitleMatches}/${wixGeneral.length} titles; ${generalDurationMatches}/${wixGeneral.length} durations; ${generalPriceMatches}/${wixGeneral.length} prices`,
      `${dbGeneralTitles.size} DB GENERAL menu rows (hubs excluded)`,
      generalTitleMatches === wixGeneral.length && generalDurationMatches === wixGeneral.length && generalPriceMatches === wixGeneral.length
        ? "Yes"
        : "Partial",
      "Commercial + clinical",
      `Wix-only: ${wixOnlyGeneral.slice(0, 4).join("; ") || "none"}. DB-only: ${dbOnlyGeneral.slice(0, 4).join("; ") || "none"}.`,
    ),
  );

  rows.push(
    row(
      "2–4. IE SPECIALIST alignment",
      `${specMatches}/${wixSpecialty.length} title matches (strict key)`,
      `${dbSpecTitles.size} DB SPECIALIST menu rows (hub excluded)`,
      specMatches === wixSpecialty.length ? "Yes" : "Partial",
      "Medium",
      `Wix-only samples: ${wixOnlySpec.slice(0, 3).join("; ") || "none"}.`,
    ),
  );

  const ieCurrencySet = new Set(ieServices.map((s) => s.currencyCode).filter(Boolean));
  const ieMissingCurrencyWithPrice = ieServices.filter(
    (s) => s.basePriceCents != null && !s.currencyCode,
  ).length;
  rows.push(
    row(
      "5. Currency",
      "EUR on Wix menus",
      [...ieCurrencySet].join(", ") || "(no currency codes set)",
      ieMissingCurrencyWithPrice === 0 && [...ieCurrencySet].every((c) => c === "EUR") ? "Yes" : "Partial",
      "Low",
      ieMissingCurrencyWithPrice ? `Rows with price but no currencyCode: ${ieMissingCurrencyWithPrice}` : "Confirm commercial alignment.",
    ),
  );

  const readyTrueServices = ieServices.filter((s) => readReadyToIndex(s.editorialChecklist)).length;
  rows.push(
    row(
      "6. readyToIndex (IE services)",
      "Not applicable on Wix",
      `${readyTrueServices}/${ieServices.length} rows true`,
      "N/A",
      readyTrueServices === 0 ? "Low (expected)" : "Medium",
      readyTrueServices === 0 ? "None enabled — correct until explicit ops release." : "Confirm each `true` was intentional.",
    ),
  );

  rows.push(
    row(
      "7. Service publication mirror + readyToIndex (IE)",
      "N/A",
      `${ieBlockingServices.length}/${ieServices.length} remain non-indexable (validator fails OR !readyToIndex)`,
      ieBlockingServices.length === ieServices.length ? "Yes (all gated)" : "Partial",
      "High until content complete",
      "Expand clinical body copy + boundaries; enable indexing only via deliberate checklist.",
    ),
  );

  rows.push(
    row(
      "8. Doctors IE — roster count",
      `${wixDoctorUniqueCount} doctors parsed (valid IMC=${wixValidImcCount}, placeholder 0=${wixPlaceholderZeroCount}, placeholder N=${wixPlaceholderNCount}, missing=${wixMissingCount})`,
      `${ieDoctors.length} DB doctors (valid IMC=${dbValidImcCount}, placeholder 0=${dbPlaceholderZeroCount}, placeholder N=${dbPlaceholderNCount}, missing=${dbMissingCount})`,
      Math.abs(wixDoctorUniqueCount - ieDoctors.length) <= 3 ? "Partial" : "No",
      "Medium",
      `Valid IMC overlap (Wix vs DB): ${wixDbValidImcOverlap}.`,
    ),
  );

  rows.push(
    row(
      "8b. Doctor publication mirror + readyToIndex",
      "N/A",
      `${doctorBlocking.length}/${ieDoctors.length} profiles remain non-indexable`,
      doctorBlocking.length === ieDoctors.length ? "Yes (all gated)" : "Partial",
      "High",
      "Credential placeholders (IMC 0 / N) and/or missing verified details are blocking indexing.",
    ),
  );

  rows.push(
    row(
      "9. Blog Verification (3-source: Wix vs Postgres vs Replacement)",
      `Wix /blog: ${wixBlog.posts.length} posts${wixBlog.requiresBrowserMode ? " (details need browser)" : ""}`,
      `DB BlogPost=${blogDbCount}; replacement static slugs=${staticBlogCount}`,
      wixBlog.posts.length > 0 && staticBlogCount === 0 ? "No" : "Partial",
      "High",
      "If Wix posts are approved, either wire DB BlogPost to public routes or migrate approved Wix posts into the replacement frontend source.",
    ),
  );

  rows.push(
    row(
      "10. ContentPage / countries",
      `${countries.length} markets on Wix strategy (manual)`,
      `${contentPages.length} ContentPage rows; ${countries.map((c) => c.code).join(", ")}`,
      "N/A",
      "Low",
      `Sample keys: ${[...new Set(contentPages.map((p) => p.pageKey))].slice(0, 12).join(", ")}`,
    ),
  );

  rows.push(
    row(
      "11. Legal routes vs CMS",
      "Wix legal/footer (manual)",
      "Many legal URLs are Next templates with robots noindex — see grep / plan",
      "N/A",
      "Legal",
      "Counsel owns copy; CMS `global-legal-footer` is not full substitute.",
    ),
  );

  const smNoindex = parseSitemapNoindexStatic();
  rows.push(
    row(
      "12. Sitemap / indexability",
      `robots.txt allows crawl; ${smNoindex.length} noindexStatic paths in sitemap.ts`,
      "Dynamic `/ireland/*`, `/post/*`, `/category/*` excluded from sitemap XML",
      "N/A",
      "Medium",
      "Dynamic URLs still discoverable — metadata gates matter.",
    ),
  );

  /** Executive summary bullets */
  const dbMatchesWix =
    wixOnlyGeneral.length === 0 &&
    wixOnlySpec.length === 0 &&
    wixOnlyRx.length === 0 &&
    wixOnlyTests.length === 0 &&
    generalTitleMatches === wixGeneral.length;

  const dbDiffers =
    generalDurationMatches !== wixGeneral.length ||
    generalPriceMatches !== wixGeneral.length ||
    specMatches !== wixSpecialty.length ||
    rxMatches !== wixRx.length;

  const wixBlogCount = wixBlog.posts.length;
  const wixBlogExampleTitles = wixBlog.posts.slice(0, 3).map((p) => p.title).join("; ") || "(none parsed)";

  const replacementBlogCount = staticBlogCount;
  const replacementBlogPubliclyExposed = replacementBlogCount > 0 ? "Yes" : "No";

  const dbBlogExampleTitles = blogDbExamples.map((p) => p.title).slice(0, 3).join("; ") || "(none in sample)";
  const dbBlogReviewerDataPresent = blogDbExamples.some((p) => Boolean(p.reviewerDisplayName) && Boolean(p.lastReviewedAt)) ? "Yes" : "No";

  const wixBlogReviewerDataPresent = "Unknown";

  const blogRisk =
    wixBlogCount > 0 && replacementBlogCount === 0
      ? "Risk: Blog migration/public exposure gap. Replacing Wix with the new frontend would hide or lose currently visible Wix blog content unless DB blog routing or static blog migration is completed."
      : "Risk: Blog exposure differs across sources; verify wiring before any public indexing changes.";

  const blogRequiredFix = "Decide whether to migrate Wix posts into CMS, wire DB `BlogPost` to public routes, or intentionally keep blog noindex/unpublished until editorial review.";

  const wixCredentialRisk =
    wixPlaceholderZeroCount + wixPlaceholderNCount + wixMissingCount > 0
      ? "Risk: Visible placeholder credential marker. Not valid for public trust or indexing."
      : "Low risk.";
  const dbCredentialRisk =
    dbPlaceholderZeroCount + dbPlaceholderNCount + dbMissingCount > 0
      ? "Risk: Visible placeholder credential marker. Not valid for public trust or indexing."
      : "Low risk.";

  const normalizeDoctorNameForMatch = (name: string) =>
    name
      .toLowerCase()
      .replace(/dr\.?\s+/g, "dr ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const wixDoctorByName = new Map(wixDoctorEntries.map((e) => [normalizeDoctorNameForMatch(e.doctorName), e]));

  const doctorCredentialDetailRows = ieDoctors
    .slice()
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((d) => {
      const key = normalizeDoctorNameForMatch(d.fullName);
      const wixEntry = wixDoctorByName.get(key);
      const wixMarker = wixEntry?.credentialMarker ?? "—";
      const wixStatus = wixEntry?.credentialStatus ?? "missing";
      const wixImcValue = wixEntry?.imcValue ?? null;

      const dbCredential = classifyCredentialImc(d.imcRegistration);
      const dbMarker = d.imcRegistration ?? "—";
      const dbStatus = dbCredential.status;
      const dbImcValue = dbCredential.imcValue;

      const match = wixStatus === "valid_visible_imc" && dbStatus === "valid_visible_imc" && wixImcValue && dbImcValue ? wixImcValue === dbImcValue : false;
      // If we can't find a Wix roster entry for this doctor (parser noise), we only rely on the DB credential status.
      // If we *can* find it, Wix placeholder credentials are also blockers for public indexing.
      const indexBlocker =
        dbStatus !== "valid_visible_imc" || (wixEntry ? wixStatus !== "valid_visible_imc" : false);

      const requiredFix = indexBlocker ? "Provide verified registration number or primary-source verification URL before `readyToIndex` can be true." : "—";

      return `| ${escapeMdCell(d.fullName)} | ${escapeMdCell(wixMarker)} | ${escapeMdCell(
        wixStatus,
      )} | ${escapeMdCell(dbMarker)} | ${escapeMdCell(dbStatus)} | ${match ? "Yes" : "No"} | ${
        indexBlocker ? "Yes" : "No"
      } | ${escapeMdCell(requiredFix)} |`;
    });

  const generalMenuMatch = ieServices.filter((s) => s.kind === "GENERAL" && !IE_HUB_SLUGS.has(s.slug)).length === wixGeneral.length;
  const specialistMenuMatch = ieServices.filter((s) => s.kind === "SPECIALIST" && !IE_HUB_SLUGS.has(s.slug)).length === wixSpecialty.length;
  const prescriptionMatch = (ieKindDb.get("PRESCRIPTION") ?? 0) === wixRx.length;
  const healthTestMatch = (ieKindDb.get("HEALTH_TEST") ?? 0) === wixTests.length;

  const servicesPricingRisk = dbDiffers
    ? "Risk: Commercial or booking inconsistency. Requires operations confirmation before indexing."
    : "Risk: Counts align; still requires operations confirmation before any indexing changes.";

  const servicesRequiredFix = "Confirm against live booking/commercial source of truth. Do not auto-sync from Wix.";

  const threeSourceExposureRows = [
    `| General services (IE menu grid) | Wix=${wixGeneral.length} | CMS=${ieServices.filter((s) => s.kind === "GENERAL" && !IE_HUB_SLUGS.has(s.slug)).length} | Replacement=${ieServices.filter((s) => s.kind === "GENERAL" && !IE_HUB_SLUGS.has(s.slug)).length} | ${
      generalMenuMatch ? "Yes" : "No"
    } | ${servicesPricingRisk} | ${escapeMdCell(servicesRequiredFix)} |`,
    `| Specialist services (IE menu grid) | Wix=${wixSpecialty.length} | CMS=${ieServices.filter((s) => s.kind === "SPECIALIST" && !IE_HUB_SLUGS.has(s.slug)).length} | Replacement=${ieServices.filter((s) => s.kind === "SPECIALIST" && !IE_HUB_SLUGS.has(s.slug)).length} | ${
      specialistMenuMatch ? "Yes" : "No"
    } | ${servicesPricingRisk} | ${escapeMdCell(servicesRequiredFix)} |`,
    `| Prescriptions (IE) | Wix=${wixRx.length} | CMS=${ieKindDb.get("PRESCRIPTION") ?? 0} | Replacement=${ieKindDb.get("PRESCRIPTION") ?? 0} | ${
      prescriptionMatch ? "Yes" : "No"
    } | ${servicesPricingRisk} | ${escapeMdCell(servicesRequiredFix)} |`,
    `| Health tests (IE) | Wix=${wixTests.length} | CMS=${ieKindDb.get("HEALTH_TEST") ?? 0} | Replacement=${ieKindDb.get("HEALTH_TEST") ?? 0} | ${
      healthTestMatch ? "Yes" : "No"
    } | Route detail is currently noindexed by metadata; confirm desired SEO policy | Manual policy decision; keep noindex until allowed. |`,
    `| Doctors (IE) | Wix=${wixDoctorUniqueCount} | CMS=${ieDoctors.length} | Replacement=${ieDoctors.length} | ${
      wixDoctorUniqueCount === ieDoctors.length ? "Yes" : "Partial"
    } | ${dbCredentialRisk} | Replace placeholders (IMC 0/N) with verified reg/URL before indexing |`,
    `| Blog | Wix=${wixBlogCount} | CMS=${blogDbCount} | Replacement static=${replacementBlogCount} | ${
      wixBlogCount === replacementBlogCount ? "Yes" : "No"
    } | ${blogRisk} | ${escapeMdCell(blogRequiredFix)} |`,
    `| Legal pages | Wix=N/A (manual) | CMS contentPages=${contentPages.filter((p) => /privacy|terms|cookies|refund|return|legal|gdpr/i.test(p.pageKey)).length} | Replacement routes=${"noindex templates"} | N/A | Legal counsel sign-off required | Update legal route content/robots only after counsel approval |`,
    `| Country pages | Wix=manual | CMS countries=${countries.length} | Replacement hubs vary by locale/noindex | N/A | Country hub indexing policy must be intentional | Confirm each locale hub’s robots/noindex and ensure roster/pricing/workflow parity |`,
  ];

  const summaryLines = [
    `Generated (UTC): ${generatedAt}`,
    "",
    "## Executive summary",
    "",
    `- **CMS hub rows:** \`general-consultation\`, \`specialist-overview\` excluded from Wix grid ↔ CMS menu comparisons.`,
    `- **DB matches Wix (IE menu title parity, hubs excluded):** ${dbMatchesWix ? "Titles align — still verify durations/€ row-by-row." : "No — see Wix-only / DB-only lists in matrix."}`,
    `- **DB differs from Wix on numeric fields:** ${dbDiffers ? "Yes — duration/price mismatches possible per row." : "Partial — run row-level diff in admin."}`,
    `- **DB has extra records:** ${dbOnlyGeneral.length ? `Yes (e.g. GENERAL not on Wix menu: ${dbOnlyGeneral.slice(0, 5).join("; ")})` : "None flagged by title parser — export slugs to confirm."}`,
    `- **Wix has items missing from DB:** ${wixOnlyGeneral.length || wixOnlySpec.length || wixOnlyRx.length || wixOnlyTests.length ? "Yes — see table Required Fix columns." : "None detected by parser (heuristic)."}`,
    `- **Records blocking indexing:** IE services ${ieBlockingServices.length}/${ieServices.length}; IE doctors ${doctorBlocking.length}/${ieDoctors.length}.`,
    "",
    "## Evidence notes",
    "",
    `- Wix URLs: ${WIX_BASE}/general-consultation-ie , /specialty-ie , /online-prescription , /home-health-test , /ireland-team`,
    "- Parser limitations: Wix HTML changes may alter counts.",
    "- `readyToIndex` is never modified by this script.",
    "",
    "## Matrix",
    "",
    "| Area | Wix/Production Value | DB Value | Match? | Risk | Required Fix |",
    "|------|----------------------|----------|--------|------|--------------|",
    ...rows.map((r) =>
      `| ${escapeMdCell(r.area)} | ${escapeMdCell(r.wixValue)} | ${escapeMdCell(r.dbValue)} | ${r.match} | ${escapeMdCell(r.risk)} | ${escapeMdCell(r.requiredFix)} |`,
    ),
    "",
    "## Blog Verification: Wix Live vs CMS vs Replacement Frontend",
    "",
    "| Source | Count | Example Titles | Publicly Exposed? | Reviewer Data Present? | Risk | Required Fix |",
    "|---|---:|---|---|---|---|---|",
    `| Wix live \`/blog\` | ${wixBlogCount} | ${escapeMdCell(wixBlogExampleTitles)} | Yes | ${wixBlogReviewerDataPresent} | ${escapeMdCell(blogRisk)} | ${escapeMdCell(blogRequiredFix)} |`,
    `| PostgreSQL \`BlogPost\` | ${blogDbCount} | ${escapeMdCell(dbBlogExampleTitles)} | No (public routes use replacement frontend source) | ${dbBlogReviewerDataPresent} | ${escapeMdCell(blogRisk)} | ${escapeMdCell(blogRequiredFix)} |`,
    `| Replacement frontend static blog | ${replacementBlogCount} | ${replacementBlogCount === 0 ? "(empty)" : "(non-empty)"} | ${replacementBlogPubliclyExposed} | ${
      replacementBlogCount === 0 ? "No (empty source)" : "Unknown"
    } | ${escapeMdCell(blogRisk)} | ${escapeMdCell(blogRequiredFix)} |`,
    "",
    "## Doctor Credential Verification",
    "",
    "| Source | Doctors Found | Valid IMC Count | Placeholder `0` Count | Placeholder `N` Count | Missing Count | Risk |",
    "|---|---:|---:|---:|---:|---:|---|",
    `| Wix live \`/ireland-team\` | ${wixDoctorUniqueCount} | ${wixValidImcCount} | ${wixPlaceholderZeroCount} | ${wixPlaceholderNCount} | ${wixMissingCount} | ${escapeMdCell(wixCredentialRisk)} |`,
    `| PostgreSQL doctors (IE) | ${ieDoctors.length} | ${dbValidImcCount} | ${dbPlaceholderZeroCount} | ${dbPlaceholderNCount} | ${dbMissingCount} | ${escapeMdCell(dbCredentialRisk)} |`,
    "",
    "| Doctor | Wix Credential Marker | Wix Credential Status | DB Credential | DB Credential Status | Match? | Index Blocker? | Required Fix |",
    "|---|---|---|---|---|---|---|---|",
    ...doctorCredentialDetailRows,
    "",
    "## Three-Source Exposure Summary",
    "",
    "| Area | Wix Live | PostgreSQL CMS | Replacement Frontend Exposure | Match? | Risk | Required Fix |",
    "|---|---|---|---|---|---|---|",
    ...threeSourceExposureRows,
    "",
    "## IE services — publication mirror sample (first 12 blocking slugs)",
    "",
    ...ieBlockingServices.slice(0, 12).map((s) => {
      const v = validatePublicServiceMirror({
        kind: s.kind,
        name: s.name,
        summary: s.summary,
        heroTitle: s.heroTitle,
        heroDescription: s.heroDescription,
        detailBody: s.detailBody,
        durationMinutes: s.durationMinutes,
        basePriceCents: s.basePriceCents,
        currencyCode: s.currencyCode,
      });
      return `- **${s.slug}** (${s.kind}): ${v.issues.join("; ") || "ok"}; readyToIndex=${readReadyToIndex(s.editorialChecklist)}`;
    }),
    "",
    "## Appendix — service counts all countries × kind",
    "",
    ...countries.map((c) => {
      const m = countsByKindDb(c.code);
      const parts = [...m.entries()].map(([k, v]) => `${k}=${v}`);
      return `- **${c.code}**: ${parts.join(", ")}`;
    }),
    "",
    "# Verification Accuracy Update",
    "",
    "| Question | Answer |",
    "|---|---|",
    `| Does verifier now parse or browser-confirm Wix blog? | ${wixBlogCount > 0 ? "Yes" : "No"} (details: see Browser Mode evidence if needed) |`,
    "| Does verifier separate Wix blog from replacement frontend static blog? | Yes |",
    "| Does verifier compare Wix live, DB CMS, and replacement frontend exposure separately? | Yes |",
    "| Does verifier classify IMC `0` as placeholder/invalid? | Yes |",
    "| Does verifier classify `N` as placeholder/invalid? | Yes |",
    "| Are any pages made indexable automatically? | No |",
    "| Is human sign-off still required? | Yes |",
  ];

  const outPath = join(repoRoot, "docs", "live-wix-db-verification-report.md");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, summaryLines.join("\n"), "utf8");

  console.log(`Wrote ${outPath}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
