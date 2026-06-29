import { Prisma, type LocaleCode, type ServiceLinkType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { assertLocaleSupported } from "../shared/locale-support.js";
import { resolveTranslation } from "../shared/resolve-translation.js";
import type { ServiceLinksReplaceBody } from "../../validations/service-links.schema.js";

const DOCTOR_LINK_TX = { maxWait: 10_000, timeout: 20_000 } as const;

/** Render-priority order — UPGRADE first, COMPLEMENTARY last. */
const TYPE_ORDER: Record<ServiceLinkType, number> = {
  UPGRADE: 0,
  ENTRY: 1,
  REFERRAL: 2,
  COMPLEMENTARY: 3,
};

export class ServiceNotFoundError extends Error {
  constructor(message = "Service not found") {
    super(message);
    this.name = "ServiceNotFoundError";
  }
}

const adminLinkInclude = {
  translations: { orderBy: { locale: "asc" as const } },
  target: { select: { id: true, slug: true, name: true } },
} satisfies Prisma.ServiceLinkInclude;

type AdminLinkRow = Prisma.ServiceLinkGetPayload<{ include: typeof adminLinkInclude }>;

function mapAdminLink(row: AdminLinkRow) {
  return {
    id: row.id,
    type: row.type,
    targetServiceId: row.targetServiceId,
    targetHref: row.targetHref,
    targetSlug: row.target?.slug ?? null,
    targetName: row.target?.name ?? null,
    priority: row.priority,
    isActive: row.isActive,
    anchorSlot: row.anchorSlot,
    translations: row.translations.map((t) => ({
      id: t.id,
      locale: t.locale,
      heading: t.heading,
      body: t.body,
      ctaLabel: t.ctaLabel,
    })),
  };
}

export async function listAdminServiceLinks(serviceId: string) {
  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true },
    });
    if (!service) return null;
    const links = await prisma.serviceLink.findMany({
      where: { sourceServiceId: serviceId },
      include: adminLinkInclude,
      orderBy: [{ priority: "asc" }, { type: "asc" }],
    });
    return { serviceId, links: links.map(mapAdminLink) };
  } catch (error) {
    throw normalizeDbError(error, "Service links are unavailable");
  }
}

/** Replace the whole link set for a service in one transaction. */
export async function replaceServiceLinks(serviceId: string, input: ServiceLinksReplaceBody) {
  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, countryId: true },
    });
    if (!service) throw new ServiceNotFoundError();

    // Locales must be enabled for the service's country.
    const locales = Array.from(
      new Set(input.links.flatMap((l) => l.translations.map((t) => t.locale))),
    );
    await Promise.all(locales.map((locale) => assertLocaleSupported(service.countryId, locale)));

    // Any target service must belong to the same country (keeps links in-market).
    const targetIds = input.links
      .map((l) => l.targetServiceId)
      .filter((v): v is string => Boolean(v));
    if (targetIds.length > 0) {
      const valid = await prisma.service.count({
        where: { id: { in: targetIds }, countryId: service.countryId },
      });
      if (valid !== new Set(targetIds).size) {
        throw new ServiceNotFoundError("Target service must be in the same country");
      }
    }

    const saved = await prisma.$transaction(async (tx) => {
      await tx.serviceLink.deleteMany({ where: { sourceServiceId: serviceId } });
      for (const link of input.links) {
        await tx.serviceLink.create({
          data: {
            sourceServiceId: serviceId,
            targetServiceId: link.targetServiceId ?? null,
            targetHref: link.targetServiceId ? null : link.targetHref ?? null,
            type: link.type,
            priority: link.priority,
            isActive: link.isActive,
            anchorSlot: link.anchorSlot ?? null,
            translations: {
              create: link.translations.map((t) => ({
                locale: t.locale,
                heading: t.heading,
                body: t.body ?? null,
                ctaLabel: t.ctaLabel,
              })),
            },
          },
        });
      }
      return tx.serviceLink.findMany({
        where: { sourceServiceId: serviceId },
        include: adminLinkInclude,
        orderBy: [{ priority: "asc" }, { type: "asc" }],
      });
    }, DOCTOR_LINK_TX);

    return saved.map(mapAdminLink);
  } catch (error) {
    if (error instanceof ServiceNotFoundError) throw error;
    throw normalizeDbError(error, "Service links could not be saved");
  }
}

export type PublicServiceLink = {
  id: string;
  type: ServiceLinkType;
  anchorSlot: string | null;
  heading: string;
  body: string | null;
  ctaLabel: string;
  /** Same-country target service slug → frontend builds the URL. */
  targetSlug: string | null;
  /** Explicit href fallback (e.g. SEO landing page). */
  targetHref: string | null;
};

const publicLinkInclude = {
  translations: true,
  target: { select: { slug: true } },
} satisfies Prisma.ServiceLinkInclude;

/**
 * Public: active links for a service, locale-merged (requested → default →
 * first) and ordered by type priority then `priority`. Max 4 enforced here so
 * every consumer (page + sitemap) honors Rule 4.
 */
export async function resolveServiceLinksForPage(
  sourceServiceId: string,
  requested: LocaleCode,
  defaultLocale: LocaleCode,
): Promise<PublicServiceLink[]> {
  const rows = await prisma.serviceLink.findMany({
    where: { sourceServiceId, isActive: true },
    include: publicLinkInclude,
  });
  const mapped = rows
    .map((row) => {
      const { tr } = resolveTranslation(row.translations, requested, defaultLocale);
      if (!tr) return null;
      return {
        id: row.id,
        type: row.type,
        anchorSlot: row.anchorSlot,
        heading: tr.heading,
        body: tr.body,
        ctaLabel: tr.ctaLabel,
        targetSlug: row.target?.slug ?? null,
        targetHref: row.targetHref,
        _priority: row.priority,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a._priority - b._priority);

  return mapped.slice(0, 4).map(({ _priority, ...rest }) => rest);
}
