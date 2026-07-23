import { Prisma, type LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { assertLocaleSupported } from "../shared/locale-support.js";
import { resolveTranslation } from "../shared/resolve-translation.js";
import { sanitizeRichHtml } from "../../utils/sanitize-html.js";
import type { SeoLandingUpsertBody } from "../../validations/seo-landing.schema.js";

const TX = { maxWait: 10_000, timeout: 20_000 } as const;

export class SeoLandingNotFoundError extends Error {
  constructor(message = "Landing page not found") {
    super(message);
    this.name = "SeoLandingNotFoundError";
  }
}

const adminInclude = {
  translations: { orderBy: { locale: "asc" as const } },
} satisfies Prisma.SeoLandingPageInclude;

type AdminRow = Prisma.SeoLandingPageGetPayload<{ include: typeof adminInclude }>;

function mapAdmin(row: AdminRow) {
  return {
    id: row.id,
    countryId: row.countryId,
    slug: row.slug,
    isPublished: row.isPublished,
    sortOrder: row.sortOrder,
    template: (row.template as SeoLandingUpsertBody["template"]) ?? null,
    translations: row.translations.map((t) => ({
      id: t.id,
      locale: t.locale,
      title: t.title,
      seoTitle: t.seoTitle,
      seoDescription: t.seoDescription,
      bodyHtml: t.bodyHtml,
      faq: (t.faq as Array<{ question: string; answer: string }> | null) ?? null,
    })),
  };
}

export async function listAdminLandingPages(countryId: string) {
  try {
    const country = await prisma.country.findUnique({
      where: { id: countryId },
      select: { id: true },
    });
    if (!country) return null;
    const pages = await prisma.seoLandingPage.findMany({
      where: { countryId },
      include: adminInclude,
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    });
    return { countryId, pages: pages.map(mapAdmin) };
  } catch (error) {
    throw normalizeDbError(error, "Landing pages are unavailable");
  }
}

/** Upsert a landing page (by countryId + slug) and replace its translations. */
export async function upsertLandingPage(countryId: string, input: SeoLandingUpsertBody) {
  try {
    const country = await prisma.country.findUnique({
      where: { id: countryId },
      select: { id: true },
    });
    if (!country) throw new SeoLandingNotFoundError("Country not found");

    await Promise.all(
      input.translations.map((t) => assertLocaleSupported(countryId, t.locale)),
    );

    const saved = await prisma.$transaction(async (tx) => {
      const templateValue = (input.template ?? Prisma.DbNull) as
        | Prisma.InputJsonValue
        | typeof Prisma.DbNull;
      const page = await tx.seoLandingPage.upsert({
        where: { countryId_slug: { countryId, slug: input.slug } },
        create: {
          countryId,
          slug: input.slug,
          isPublished: input.isPublished,
          sortOrder: input.sortOrder,
          template: templateValue,
        },
        update: { isPublished: input.isPublished, sortOrder: input.sortOrder, template: templateValue },
        select: { id: true },
      });
      await tx.seoLandingPageTranslation.deleteMany({ where: { landingPageId: page.id } });
      await tx.seoLandingPageTranslation.createMany({
        data: input.translations.map((t) => ({
          landingPageId: page.id,
          locale: t.locale,
          title: t.title,
          seoTitle: t.seoTitle ?? null,
          seoDescription: t.seoDescription ?? null,
          bodyHtml: t.bodyHtml == null ? null : sanitizeRichHtml(t.bodyHtml),
          faq: (t.faq && t.faq.length > 0
            ? t.faq.map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
            : Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
        })),
      });
      return tx.seoLandingPage.findUniqueOrThrow({
        where: { id: page.id },
        include: adminInclude,
      });
    }, TX);

    return mapAdmin(saved);
  } catch (error) {
    if (error instanceof SeoLandingNotFoundError) throw error;
    throw normalizeDbError(error, "Landing page could not be saved");
  }
}

export type ResolveLandingPageCountryDependencies = {
  findPageCountry(pageId: string): Promise<{ countryId: string } | null>;
};

export type DeleteLandingPageDependencies = {
  deletePage(where: { id: string; countryId: string }): Promise<{ count: number }>;
};

const defaultResolveDependencies: ResolveLandingPageCountryDependencies = {
  findPageCountry: (pageId) =>
    prisma.seoLandingPage.findUnique({
      where: { id: pageId },
      select: { countryId: true },
    }),
};

const defaultDeleteDependencies: DeleteLandingPageDependencies = {
  deletePage: (where) =>
    prisma.seoLandingPage.deleteMany({
      where,
    }),
};

export function createResolveLandingPageCountry(
  dependencies: ResolveLandingPageCountryDependencies = defaultResolveDependencies,
) {
  return async function resolveScopedLandingPageCountry(
    pageId: string,
  ): Promise<{ countryId: string } | null> {
    try {
      return await dependencies.findPageCountry(pageId);
    } catch (error) {
      throw normalizeDbError(error, "Landing page is unavailable");
    }
  };
}

export function createDeleteLandingPage(
  dependencies: DeleteLandingPageDependencies = defaultDeleteDependencies,
) {
  return async function deleteScopedLandingPage(
    countryId: string,
    pageId: string,
  ): Promise<boolean> {
    try {
      const deleted = await dependencies.deletePage({ id: pageId, countryId });
      return deleted.count === 1;
    } catch (error) {
      throw normalizeDbError(error, "Landing page could not be deleted");
    }
  };
}

export const resolveLandingPageCountry = createResolveLandingPageCountry();
export const deleteLandingPage = createDeleteLandingPage();

/** Public: published landing slugs for a country (sitemap + nav exclusion). */
export async function listPublishedLandingSlugs(countryCode: string) {
  try {
    const pages = await prisma.seoLandingPage.findMany({
      where: { isPublished: true, country: { code: countryCode, isActive: true } },
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
      select: { slug: true, updatedAt: true },
    });
    return pages.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt.toISOString() }));
  } catch (error) {
    throw normalizeDbError(error, "Landing pages are unavailable");
  }
}

/** Public: one published landing page resolved to a locale. */
export async function getPublicLandingPage(
  countryCode: string,
  slug: string,
  locale?: LocaleCode,
) {
  try {
    const page = await prisma.seoLandingPage.findFirst({
      where: { slug, isPublished: true, country: { code: countryCode, isActive: true } },
      include: {
        country: { select: { code: true, defaultLocale: true } },
        translations: true,
      },
    });
    if (!page) return null;
    const requested = locale ?? page.country.defaultLocale;
    const { tr } = resolveTranslation(page.translations, requested, page.country.defaultLocale);
    if (!tr) return null;
    return {
      slug: page.slug,
      title: tr.title,
      seoTitle: tr.seoTitle,
      seoDescription: tr.seoDescription,
      bodyHtml: tr.bodyHtml,
      template: (page.template as SeoLandingUpsertBody["template"]) ?? null,
      faq: (tr.faq as Array<{ question: string; answer: string }> | null) ?? null,
    };
  } catch (error) {
    throw normalizeDbError(error, "Landing page is unavailable");
  }
}
