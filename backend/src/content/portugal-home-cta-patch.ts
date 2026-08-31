import type { PrismaClient } from "@prisma/client";

export const PORTUGAL_HOME_CTA_VERSION = "PT-HOME-CTA-2026-08-31" as const;
export const PORTUGAL_HOME_CTA_OLD = "Book a consultation" as const;
export const PORTUGAL_HOME_CTA_NEW = "Marcar consulta" as const;

export type PortugalHomeCtaDb = Pick<
  PrismaClient,
  "country" | "pageContent" | "pageContentTranslation" | "$transaction"
>;

type PatchOptions = Readonly<{
  apply: boolean;
  confirmation?: string;
  confirmationHost?: string;
  databaseUrl?: string;
  write?: (message: string) => void;
}>;

export async function runPortugalHomeCtaPatch(
  db: PortugalHomeCtaDb,
  options: PatchOptions,
): Promise<"applied" | "already-applied" | "dry-run" | "skipped"> {
  if (options.apply) {
    if (options.confirmation !== PORTUGAL_HOME_CTA_VERSION) {
      throw new Error(`Apply requires --confirm=${PORTUGAL_HOME_CTA_VERSION}`);
    }
    if (!options.databaseUrl) throw new Error("Apply requires DATABASE_URL");

    let databaseHost: string;
    try {
      databaseHost = new URL(options.databaseUrl).hostname;
    } catch {
      throw new Error("DATABASE_URL is not a valid URL");
    }
    if (!databaseHost || options.confirmationHost !== databaseHost) {
      throw new Error("Apply requires --confirm-host matching the DATABASE_URL hostname");
    }
  }

  const country = await db.country.findFirst({
    where: { code: "pt", isActive: true },
    select: { id: true },
  });
  if (!country) throw new Error("Active Portugal country row not found");

  const page = await db.pageContent.findFirst({
    where: {
      countryId: country.id,
      pageKey: "HOME",
      status: "PUBLISHED",
      isActive: true,
    },
    select: { id: true },
  });
  if (!page) throw new Error("Published Portugal HOME PageContent row not found");

  const translation = await db.pageContentTranslation.findFirst({
    where: { pageContentId: page.id, locale: "PT" },
    select: { id: true, updatedAt: true, ctaLabel: true },
  });
  if (!translation) throw new Error("Portugal HOME PT translation row not found");

  if (translation.ctaLabel === PORTUGAL_HOME_CTA_NEW) {
    options.write?.("SKIP: Portugal HOME CTA already matches the reviewed pt-PT value.\n");
    return "already-applied";
  }
  if (translation.ctaLabel !== PORTUGAL_HOME_CTA_OLD) {
    const message = "Current CTA does not match the reviewed English value";
    if (options.apply) throw new Error(message);
    options.write?.(`SKIP: ${message}.\n`);
    return "skipped";
  }

  options.write?.(
    `${options.apply ? "SET" : "WOULD SET"} Portugal HOME PT CTA: ${JSON.stringify(PORTUGAL_HOME_CTA_NEW)}\n`,
  );
  if (!options.apply) {
    options.write?.(
      `DRY-RUN ONLY. Use --apply --confirm=${PORTUGAL_HOME_CTA_VERSION} --confirm-host=<database-host> after review.\n`,
    );
    return "dry-run";
  }

  await db.$transaction(async (transaction) => {
    const result = await transaction.pageContentTranslation.updateMany({
      where: {
        id: translation.id,
        updatedAt: translation.updatedAt,
        ctaLabel: PORTUGAL_HOME_CTA_OLD,
        locale: "PT",
        pageContent: {
          countryId: country.id,
          pageKey: "HOME",
          status: "PUBLISHED",
          isActive: true,
          country: { code: "pt", isActive: true },
        },
      },
      data: { ctaLabel: PORTUGAL_HOME_CTA_NEW },
    });
    if (result.count !== 1) {
      throw new Error("Portugal HOME CTA changed after the dry-run; refusing to overwrite it");
    }

    const saved = await transaction.pageContentTranslation.findUnique({
      where: { id: translation.id },
      select: { ctaLabel: true },
    });
    if (saved?.ctaLabel !== PORTUGAL_HOME_CTA_NEW) {
      throw new Error("Portugal HOME CTA post-write verification failed");
    }
  }, { isolationLevel: "Serializable" });

  options.write?.("Applied and verified Portugal HOME CTA.\n");
  return "applied";
}
