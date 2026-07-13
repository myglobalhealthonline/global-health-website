import { LocaleCode, PageKey, Prisma, PublishStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type { PageContentUpsertBody } from "../../validations/admin-page-content.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { sanitizeRichHtml } from "../../utils/sanitize-html.js";

export class PageContentCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "PageContentCountryNotFoundError";
  }
}

export class PageContentLocaleNotSupportedError extends Error {
  constructor(message = "Locale is not enabled for this country") {
    super(message);
    this.name = "PageContentLocaleNotSupportedError";
  }
}

export class PageContentNotConfiguredError extends Error {
  constructor() {
    super("Page content is not configured for this country/page yet — create it in the editor first");
    this.name = "PageContentNotConfiguredError";
  }
}

async function assertCountryExists(countryId: string): Promise<void> {
  const row = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!row) throw new PageContentCountryNotFoundError();
}

async function assertLocaleSupported(countryId: string, locale: LocaleCode): Promise<void> {
  const row = await prisma.countryLocale.findUnique({
    where: { countryId_locale: { countryId, locale } },
    select: { id: true },
  });
  if (!row) {
    const def = await prisma.country.findUnique({
      where: { id: countryId },
      select: { defaultLocale: true },
    });
    if (def?.defaultLocale !== locale) {
      throw new PageContentLocaleNotSupportedError();
    }
  }
}

const adminPageContentInclude = {
  translations: true,
} satisfies Prisma.PageContentInclude;

export type AdminPageContentRecord = Prisma.PageContentGetPayload<{
  include: typeof adminPageContentInclude;
}>;

/**
 * Admin upsert by (countryId, pageKey): replaces the base row and the full
 * translations array (delete-then-recreate per locale, keyed by the unique
 * (pageContentId, locale) constraint — simplest correct approach for a
 * small, admin-authored translation set).
 */
export async function upsertPageContent(
  countryId: string,
  pageKey: PageKey,
  input: PageContentUpsertBody,
): Promise<AdminPageContentRecord> {
  await assertCountryExists(countryId);
  for (const t of input.translations) {
    await assertLocaleSupported(countryId, t.locale);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const base = await tx.pageContent.upsert({
        where: { countryId_pageKey: { countryId, pageKey } },
        create: {
          countryId,
          pageKey,
          status: input.status ?? PublishStatus.DRAFT,
          isActive: input.isActive ?? true,
          heroImagePath: input.heroImagePath ?? null,
          ogImagePath: input.ogImagePath ?? null,
          ctaHref: input.ctaHref ?? null,
          showIntro: input.showIntro ?? false,
          showWhoFor: input.showWhoFor ?? false,
          showWhyChoose: input.showWhyChoose ?? false,
          showFaq: input.showFaq ?? false,
          showDisclaimer: input.showDisclaimer ?? false,
          showBody: input.showBody ?? false,
        },
        update: {
          ...(input.status !== undefined && { status: input.status }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.heroImagePath !== undefined && { heroImagePath: input.heroImagePath }),
          ...(input.ogImagePath !== undefined && { ogImagePath: input.ogImagePath }),
          ...(input.ctaHref !== undefined && { ctaHref: input.ctaHref }),
          ...(input.showIntro !== undefined && { showIntro: input.showIntro }),
          ...(input.showWhoFor !== undefined && { showWhoFor: input.showWhoFor }),
          ...(input.showWhyChoose !== undefined && { showWhyChoose: input.showWhyChoose }),
          ...(input.showFaq !== undefined && { showFaq: input.showFaq }),
          ...(input.showDisclaimer !== undefined && { showDisclaimer: input.showDisclaimer }),
          ...(input.showBody !== undefined && { showBody: input.showBody }),
        },
      });

      await tx.pageContentTranslation.deleteMany({ where: { pageContentId: base.id } });
      await tx.pageContentTranslation.createMany({
        data: input.translations.map((t) => ({
          pageContentId: base.id,
          locale: t.locale,
          heroTitle: t.heroTitle,
          heroSubtitle: t.heroSubtitle,
          heroTitleLead: t.heroTitleLead,
          heroTitleAccent: t.heroTitleAccent,
          ctaLabel: t.ctaLabel,
          intro: t.intro,
          whoForTitle: t.whoForTitle,
          whoForIntro: t.whoForIntro,
          whoForItems: t.whoForItems,
          whyChooseTitle: t.whyChooseTitle,
          whyChooseItems: t.whyChooseItems,
          faq: t.faq,
          disclaimerParagraphs: t.disclaimerParagraphs,
          disclaimerShort: t.disclaimerShort,
          body: sanitizeRichHtml(t.body ?? undefined) ?? null,
          seoTitle: t.seoTitle,
          seoDescription: t.seoDescription,
        })),
      });

      return tx.pageContent.findUniqueOrThrow({
        where: { id: base.id },
        include: adminPageContentInclude,
      });
    });
  } catch (error) {
    throw normalizeDbError(error, "Page content data is unavailable");
  }
}

export type PageContentFlagsPatch = { status?: PublishStatus; isActive?: boolean };

/**
 * Lightweight flags-only patch for the overview grid's inline toggles.
 * Plain `update` (not `upsertPageContent`'s upsert) — never creates a row,
 * so an unconfigured page can't be silently toggled into existence, and
 * never touches translations (upsert's delete+recreate would be wasteful
 * and risky for a two-field flip).
 */
export async function setPageContentFlags(
  countryId: string,
  pageKey: PageKey,
  patch: PageContentFlagsPatch,
) {
  try {
    return await prisma.pageContent.update({
      where: { countryId_pageKey: { countryId, pageKey } },
      data: {
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.isActive !== undefined && { isActive: patch.isActive }),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new PageContentNotConfiguredError();
    }
    throw normalizeDbError(error, "Page content data is unavailable");
  }
}

export async function getAdminPageContent(
  countryId: string,
  pageKey: PageKey,
): Promise<AdminPageContentRecord | null> {
  try {
    return await prisma.pageContent.findUnique({
      where: { countryId_pageKey: { countryId, pageKey } },
      include: adminPageContentInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Page content data is unavailable");
  }
}

export type ListPageContentItem = {
  countryId: string;
  countryCode: string;
  countryName: string;
  pageKey: PageKey;
  status: PublishStatus | null;
  isActive: boolean | null;
  configured: boolean;
  enabledSectionCount: number;
};

/**
 * Overview grid: every active country x every PageKey, with a row only
 * when a PageContent has been configured (admin cell shows "Not configured"
 * otherwise).
 */
export async function listAdminPageContent(): Promise<ListPageContentItem[]> {
  try {
    const [countries, rows] = await Promise.all([
      prisma.country.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.pageContent.findMany({
        select: {
          countryId: true,
          pageKey: true,
          status: true,
          isActive: true,
          showIntro: true,
          showWhoFor: true,
          showWhyChoose: true,
          showFaq: true,
          showDisclaimer: true,
          showBody: true,
        },
      }),
    ]);

    const byKey = new Map(rows.map((r) => [`${r.countryId}:${r.pageKey}`, r]));
    const items: ListPageContentItem[] = [];
    for (const country of countries) {
      for (const pageKey of Object.values(PageKey)) {
        const row = byKey.get(`${country.id}:${pageKey}`);
        items.push({
          countryId: country.id,
          countryCode: country.code,
          countryName: country.name,
          pageKey,
          status: row?.status ?? null,
          isActive: row?.isActive ?? null,
          configured: !!row,
          enabledSectionCount: row
            ? [
                row.showIntro,
                row.showWhoFor,
                row.showWhyChoose,
                row.showFaq,
                row.showDisclaimer,
                row.showBody,
              ].filter(Boolean).length
            : 0,
        });
      }
    }
    return items;
  } catch (error) {
    throw normalizeDbError(error, "Page content data is unavailable");
  }
}

export type PageContentBase = {
  showIntro: boolean;
  showWhoFor: boolean;
  showWhyChoose: boolean;
  showFaq: boolean;
  showDisclaimer: boolean;
  showBody: boolean;
};

export type MergedTranslation = {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroTitleLead: string | null;
  heroTitleAccent: string | null;
  ctaLabel: string | null;
  intro: string | null;
  whoForTitle: string | null;
  whoForIntro: string | null;
  whoForItems: unknown;
  whyChooseTitle: string | null;
  whyChooseItems: unknown;
  faq: unknown;
  disclaimerParagraphs: unknown;
  disclaimerShort: string | null;
  body: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

/**
 * Section-visibility computation, shared by getPublicPageContent and (for
 * the admin "no content — hidden" warning badge) the admin editor payload.
 * Pure function, exhaustively unit-tested — see page-content.service.test.ts.
 */
export function computeSectionVisibility(row: PageContentBase, t: MergedTranslation) {
  const nonEmpty = (s?: string | null) => !!s && s.trim().length > 0;
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : [];
  return {
    intro: row.showIntro && nonEmpty(t.intro),
    whoFor: row.showWhoFor && list(t.whoForItems).length > 0,
    whyChoose: row.showWhyChoose && list(t.whyChooseItems).length > 0,
    faq: row.showFaq && Array.isArray(t.faq) && t.faq.length > 0,
    disclaimer:
      row.showDisclaimer && (list(t.disclaimerParagraphs).length > 0 || nonEmpty(t.disclaimerShort)),
    body: row.showBody && nonEmpty(t.body),
  };
}

export type PublicPageContentResult = {
  record:
    | (PageContentBase & {
        heroImagePath: string | null;
        ogImagePath: string | null;
        ctaHref: string | null;
      } & MergedTranslation & { sections: ReturnType<typeof computeSectionVisibility> })
    | null;
  disabled: boolean;
};

/**
 * Public read: (countryCode, pageKey, locale) -> merged record with computed
 * section visibility. Locale resolution is per-field: requested-locale
 * translation row value, else the country defaultLocale translation row
 * value, else null. Never falls back across countries (legal copy).
 */
export async function getPublicPageContent(
  countryCode: string,
  pageKey: PageKey,
  locale: LocaleCode,
): Promise<PublicPageContentResult> {
  try {
    const country = await prisma.country.findUnique({
      where: { code: countryCode },
      select: { id: true, defaultLocale: true, isActive: true },
    });
    if (!country || !country.isActive) return { record: null, disabled: false };

    const row = await prisma.pageContent.findUnique({
      where: { countryId_pageKey: { countryId: country.id, pageKey } },
      include: { translations: true },
    });
    if (!row) return { record: null, disabled: false };
    if (row.status !== PublishStatus.PUBLISHED || !row.isActive) {
      return { record: null, disabled: true };
    }

    const requested = row.translations.find((t) => t.locale === locale) ?? null;
    const fallback =
      locale !== country.defaultLocale
        ? row.translations.find((t) => t.locale === country.defaultLocale) ?? null
        : null;

    const field = <K extends keyof MergedTranslation>(key: K): MergedTranslation[K] =>
      ((requested?.[key] ?? fallback?.[key] ?? null) as MergedTranslation[K]);

    const merged: MergedTranslation = {
      heroTitle: field("heroTitle"),
      heroSubtitle: field("heroSubtitle"),
      heroTitleLead: field("heroTitleLead"),
      heroTitleAccent: field("heroTitleAccent"),
      ctaLabel: field("ctaLabel"),
      intro: field("intro"),
      whoForTitle: field("whoForTitle"),
      whoForIntro: field("whoForIntro"),
      whoForItems: field("whoForItems"),
      whyChooseTitle: field("whyChooseTitle"),
      whyChooseItems: field("whyChooseItems"),
      faq: field("faq"),
      disclaimerParagraphs: field("disclaimerParagraphs"),
      disclaimerShort: field("disclaimerShort"),
      body: field("body"),
      seoTitle: field("seoTitle"),
      seoDescription: field("seoDescription"),
    };

    const base: PageContentBase = {
      showIntro: row.showIntro,
      showWhoFor: row.showWhoFor,
      showWhyChoose: row.showWhyChoose,
      showFaq: row.showFaq,
      showDisclaimer: row.showDisclaimer,
      showBody: row.showBody,
    };

    return {
      record: {
        ...base,
        heroImagePath: row.heroImagePath,
        ogImagePath: row.ogImagePath,
        ctaHref: row.ctaHref,
        ...merged,
        sections: computeSectionVisibility(base, merged),
      },
      disabled: false,
    };
  } catch (error) {
    throw normalizeDbError(error, "Page content data is unavailable");
  }
}
