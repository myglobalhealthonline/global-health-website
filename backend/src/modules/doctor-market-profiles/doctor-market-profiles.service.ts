import { Prisma, type LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { encryptPhi, decryptPhi } from "../../lib/crypto/phi-crypto.js";
import {
  ibanLast4,
  maskIban,
  normalizeIban,
} from "../../utils/iban.js";
import { sanitizeRichHtml } from "../../utils/sanitize-html.js";
import { assertLocaleSupported } from "../shared/locale-support.js";
import { normalizeDbError } from "../shared/db-errors.js";
import type {
  AdminDoctorMarketPatchBody,
  DoctorMarketPatchBody,
} from "../../validations/doctor-market-profiles.schema.js";

const DOCTOR_MARKET_TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const;

const doctorMarketInclude = {
  country: {
    select: {
      id: true,
      code: true,
      name: true,
      slug: true,
      defaultLocale: true,
      countryLocales: {
        select: { locale: true, isDefault: true },
        orderBy: [{ isDefault: "desc" as const }, { locale: "asc" as const }],
      },
    },
  },
  translations: { orderBy: { locale: "asc" as const } },
  bankAccount: true,
} satisfies Prisma.DoctorCountryInclude;

type DoctorMarketRow = Prisma.DoctorCountryGetPayload<{ include: typeof doctorMarketInclude }>;

export class DoctorMarketNotFoundError extends Error {
  constructor(message = "Doctor market not found") {
    super(message);
    this.name = "DoctorMarketNotFoundError";
  }
}

export class DoctorMarketAccessDeniedError extends Error {
  constructor() {
    super("Doctor is not approved for this market");
    this.name = "DoctorMarketAccessDeniedError";
  }
}

function supportedLocales(row: DoctorMarketRow): Array<{ code: LocaleCode; isDefault: boolean }> {
  const seen = new Set<LocaleCode>([row.country.defaultLocale]);
  const out: Array<{ code: LocaleCode; isDefault: boolean }> = [
    { code: row.country.defaultLocale, isDefault: true },
  ];
  for (const locale of row.country.countryLocales) {
    if (seen.has(locale.locale)) continue;
    seen.add(locale.locale);
    out.push({ code: locale.locale, isDefault: locale.isDefault });
  }
  return out;
}

function mapBank(
  row: {
    accountHolder: string | null;
    bic: string | null;
    ibanLast4: string | null;
    ibanEncrypted: string | null;
  } | null,
  reveal = false,
) {
  const ibanSet = Boolean(row?.ibanEncrypted);
  return {
    accountHolder: row?.accountHolder ?? null,
    bic: row?.bic ?? null,
    ibanLast4: row?.ibanLast4 ?? null,
    ibanMasked: maskIban(row?.ibanLast4),
    ibanSet,
    ...(reveal && row?.ibanEncrypted ? { iban: decryptPhi(row.ibanEncrypted) } : {}),
  };
}

function mapMarket(row: DoctorMarketRow, revealBank = false) {
  return {
    id: row.id,
    doctorId: row.doctorId,
    countryId: row.countryId,
    active: row.active,
    sortOrder: row.sortOrder,
    country: {
      id: row.country.id,
      code: row.country.code,
      name: row.country.name,
      slug: row.country.slug,
      defaultLocale: row.country.defaultLocale,
    },
    supportedLocales: supportedLocales(row),
    chamberEntity: row.chamberEntity,
    registrationNumber: row.registrationNumber,
    registrationUrl: row.registrationUrl,
    division: row.division,
    isVerified: row.isVerified,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    translations: row.translations.map((entry) => ({
      id: entry.id,
      locale: entry.locale,
      title: entry.title,
      bio: entry.bio,
      seoTitle: entry.seoTitle,
      seoDescription: entry.seoDescription,
      seoKeywords: entry.seoKeywords,
    })),
    bank: mapBank(row.bankAccount, revealBank),
    createdAt: row.createdAt.toISOString(),
  };
}

async function ensurePrimaryMarketRow(
  tx: Prisma.TransactionClient,
  doctorId: string,
): Promise<void> {
  const doctor = await tx.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true, countryId: true },
  });
  if (!doctor) throw new DoctorMarketNotFoundError("Doctor profile not found");
  await tx.doctorCountry.upsert({
    where: { doctorId_countryId: { doctorId, countryId: doctor.countryId } },
    create: { doctorId, countryId: doctor.countryId, active: true },
    update: { active: true },
  });
}

function bankDataFromInput(
  bank: DoctorMarketPatchBody["bank"],
): Record<string, string | null> {
  if (!bank) return {};
  const data: Record<string, string | null> = {};
  if (bank.accountHolder !== undefined) {
    data.accountHolder = bank.accountHolder?.trim() || null;
  }
  if (bank.bic !== undefined) {
    data.bic = bank.bic?.trim() ? bank.bic.trim().toUpperCase() : null;
  }
  if (bank.iban !== undefined) {
    const normalized = bank.iban ? normalizeIban(bank.iban) : null;
    data.ibanEncrypted = normalized ? encryptPhi(normalized) : null;
    data.ibanLast4 = normalized ? ibanLast4(normalized) : null;
  }
  return data;
}

async function assertLocales(countryId: string, locales: LocaleCode[]): Promise<void> {
  await Promise.all(locales.map((locale) => assertLocaleSupported(countryId, locale)));
}

export async function listAdminDoctorMarkets(doctorId: string) {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, countryId: true },
    });
    if (!doctor) return null;
    await prisma.$transaction((tx) => ensurePrimaryMarketRow(tx, doctorId), DOCTOR_MARKET_TX_OPTIONS);
    const markets = await prisma.doctorCountry.findMany({
      where: { doctorId },
      include: doctorMarketInclude,
      orderBy: [{ country: { name: "asc" } }, { sortOrder: "asc" }],
    });
    return {
      doctorId,
      primaryCountryId: doctor.countryId,
      markets: markets.map((market) => mapMarket(market)),
    };
  } catch (error) {
    if (error instanceof DoctorMarketNotFoundError) throw error;
    throw normalizeDbError(error, "Doctor market profiles are unavailable");
  }
}

export async function updateAdminDoctorMarket(
  doctorId: string,
  countryId: string,
  input: AdminDoctorMarketPatchBody,
) {
  try {
    await assertLocales(countryId, input.translations?.map((entry) => entry.locale) ?? []);
    const updated = await prisma.$transaction(async (tx) => {
      const [doctor, country] = await Promise.all([
        tx.doctor.findUnique({ where: { id: doctorId }, select: { id: true, countryId: true } }),
        tx.country.findUnique({ where: { id: countryId }, select: { id: true, defaultLocale: true } }),
      ]);
      if (!doctor || !country) {
        throw new DoctorMarketNotFoundError("Doctor or country not found");
      }
      const row = await tx.doctorCountry.upsert({
        where: { doctorId_countryId: { doctorId, countryId } },
        create: {
          doctorId,
          countryId,
          active: input.active ?? true,
          sortOrder: input.sortOrder ?? 0,
          chamberEntity: input.chamberEntity ?? null,
          registrationNumber: input.registrationNumber ?? null,
          registrationUrl: input.registrationUrl ?? null,
          division: input.division ?? null,
          isVerified: input.isVerified ?? false,
          verifiedAt: input.isVerified ? new Date() : null,
        },
        update: {
          ...(input.active !== undefined && { active: input.active }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
          ...(input.chamberEntity !== undefined && { chamberEntity: input.chamberEntity }),
          ...(input.registrationNumber !== undefined && {
            registrationNumber: input.registrationNumber,
          }),
          ...(input.registrationUrl !== undefined && { registrationUrl: input.registrationUrl }),
          ...(input.division !== undefined && { division: input.division }),
          ...(input.isVerified !== undefined && {
            isVerified: input.isVerified,
            verifiedAt: input.isVerified ? new Date() : null,
          }),
        },
        select: { id: true },
      });

      if (input.translations) {
        for (const entry of input.translations) {
          await tx.doctorMarketTranslation.upsert({
            where: {
              doctorCountryId_locale: {
                doctorCountryId: row.id,
                locale: entry.locale,
              },
            },
            create: {
              doctorCountryId: row.id,
              locale: entry.locale,
              title: entry.title ?? null,
              bio: entry.bio == null ? null : sanitizeRichHtml(entry.bio),
              seoTitle: entry.seoTitle ?? null,
              seoDescription: entry.seoDescription ?? null,
              seoKeywords: entry.seoKeywords,
            },
            update: {
              title: entry.title ?? null,
              bio: entry.bio == null ? null : sanitizeRichHtml(entry.bio),
              seoTitle: entry.seoTitle ?? null,
              seoDescription: entry.seoDescription ?? null,
              seoKeywords: entry.seoKeywords,
            },
          });
        }
        // Mirror the primary country's default-locale title into the base
        // Doctor row: admin list/detail views read Doctor.title directly
        // and don't resolve per-country translations, so that column has
        // to stay in sync with whatever the admin edits here.
        if (doctor.countryId === countryId) {
          const primaryEntry = input.translations.find(
            (entry) => entry.locale === country.defaultLocale,
          );
          if (primaryEntry?.title) {
            await tx.doctor.update({
              where: { id: doctorId },
              data: { title: primaryEntry.title },
            });
          }
        }
      }

      // Payout / IBAN is doctor-owned (set via the doctor portal). Admins do
      // not write bank details here.

      return tx.doctorCountry.findUniqueOrThrow({
        where: { id: row.id },
        include: doctorMarketInclude,
      });
    }, DOCTOR_MARKET_TX_OPTIONS);
    return mapMarket(updated);
  } catch (error) {
    if (error instanceof DoctorMarketNotFoundError) throw error;
    throw normalizeDbError(error, "Doctor market profile could not be saved");
  }
}

export async function getAdminDoctorMarketBank(
  doctorId: string,
  countryId: string,
  reveal: boolean,
) {
  try {
    const market = await prisma.doctorCountry.findUnique({
      where: { doctorId_countryId: { doctorId, countryId } },
      select: {
        id: true,
        bankAccount: {
          select: { accountHolder: true, ibanEncrypted: true, ibanLast4: true, bic: true },
        },
      },
    });
    if (!market) return null;
    return mapBank(market.bankAccount, reveal);
  } catch (error) {
    throw normalizeDbError(error, "Doctor market bank details are unavailable");
  }
}

export async function listDoctorSelfMarkets(doctorId: string) {
  try {
    await prisma.$transaction((tx) => ensurePrimaryMarketRow(tx, doctorId), DOCTOR_MARKET_TX_OPTIONS);
    const markets = await prisma.doctorCountry.findMany({
      where: { doctorId, active: true },
      include: doctorMarketInclude,
      orderBy: [{ country: { name: "asc" } }, { sortOrder: "asc" }],
    });
    return markets.map((market) => mapMarket(market));
  } catch (error) {
    if (error instanceof DoctorMarketNotFoundError) throw error;
    throw normalizeDbError(error, "Doctor market profiles are unavailable");
  }
}

export async function updateDoctorSelfMarket(
  doctorId: string,
  countryId: string,
  input: DoctorMarketPatchBody,
) {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, countryId: true, active: true },
    });
    if (!doctor || !doctor.active) throw new DoctorMarketNotFoundError("Doctor profile not found");
    if (doctor.countryId === countryId) {
      await prisma.$transaction((tx) => ensurePrimaryMarketRow(tx, doctorId), DOCTOR_MARKET_TX_OPTIONS);
    }

    await assertLocales(countryId, input.translations?.map((entry) => entry.locale) ?? []);

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.doctorCountry.findUnique({
        where: { doctorId_countryId: { doctorId, countryId } },
        select: { id: true, active: true },
      });
      if (!existing) throw new DoctorMarketAccessDeniedError();
      if (!existing.active) throw new DoctorMarketAccessDeniedError();

      const registrationChanged =
        input.chamberEntity !== undefined ||
        input.registrationNumber !== undefined ||
        input.division !== undefined;

      await tx.doctorCountry.update({
        where: { id: existing.id },
        data: {
          ...(input.chamberEntity !== undefined && { chamberEntity: input.chamberEntity }),
          ...(input.registrationNumber !== undefined && {
            registrationNumber: input.registrationNumber,
          }),
          ...(input.division !== undefined && { division: input.division }),
          ...(registrationChanged && { isVerified: false, verifiedAt: null }),
        },
      });

      if (input.translations) {
        for (const entry of input.translations) {
          await tx.doctorMarketTranslation.upsert({
            where: {
              doctorCountryId_locale: {
                doctorCountryId: existing.id,
                locale: entry.locale,
              },
            },
            create: {
              doctorCountryId: existing.id,
              locale: entry.locale,
              bio: entry.bio == null ? null : sanitizeRichHtml(entry.bio),
            },
            update: {
              bio: entry.bio == null ? null : sanitizeRichHtml(entry.bio),
            },
          });
        }
      }

      const bankData = bankDataFromInput(input.bank);
      if (Object.keys(bankData).length > 0) {
        await tx.doctorMarketBankAccount.upsert({
          where: { doctorCountryId: existing.id },
          create: { doctorCountryId: existing.id, ...bankData },
          update: bankData,
        });
      }

      return tx.doctorCountry.findUniqueOrThrow({
        where: { id: existing.id },
        include: doctorMarketInclude,
      });
    }, DOCTOR_MARKET_TX_OPTIONS);
    return mapMarket(updated);
  } catch (error) {
    if (
      error instanceof DoctorMarketNotFoundError ||
      error instanceof DoctorMarketAccessDeniedError
    ) {
      throw error;
    }
    throw normalizeDbError(error, "Doctor market profile could not be saved");
  }
}
