import { Prisma, type LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { assertLocaleSupported } from "../shared/locale-support.js";
import { normalizeDbError } from "../shared/db-errors.js";
import type { DoctorFaqsReplaceBody } from "../../validations/doctor-faqs.schema.js";

const DOCTOR_FAQ_TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const;

export class DoctorFaqNotFoundError extends Error {
  constructor(message = "Doctor not found") {
    super(message);
    this.name = "DoctorFaqNotFoundError";
  }
}

const doctorWithLocales = {
  id: true,
  countryId: true,
  country: {
    select: {
      defaultLocale: true,
      countryLocales: {
        select: { locale: true, isDefault: true },
        orderBy: [{ isDefault: "desc" as const }, { locale: "asc" as const }],
      },
    },
  },
} satisfies Prisma.DoctorSelect;

type DoctorRow = Prisma.DoctorGetPayload<{ select: typeof doctorWithLocales }>;

function supportedLocales(doctor: DoctorRow): Array<{ code: LocaleCode; isDefault: boolean }> {
  const seen = new Set<LocaleCode>([doctor.country.defaultLocale]);
  const out: Array<{ code: LocaleCode; isDefault: boolean }> = [
    { code: doctor.country.defaultLocale, isDefault: true },
  ];
  for (const locale of doctor.country.countryLocales) {
    if (seen.has(locale.locale)) continue;
    seen.add(locale.locale);
    out.push({ code: locale.locale, isDefault: locale.isDefault });
  }
  return out;
}

function mapFaqs(
  rows: Array<{
    id: string;
    locale: LocaleCode;
    question: string;
    answer: string;
    category: string | null;
    sortOrder: number;
    isActive: boolean;
  }>,
) {
  return rows.map((faq) => ({
    id: faq.id,
    locale: faq.locale,
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    sortOrder: faq.sortOrder,
    isActive: faq.isActive,
  }));
}

export async function listAdminDoctorFaqs(doctorId: string) {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: doctorWithLocales,
    });
    if (!doctor) return null;
    const faqs = await prisma.doctorFaq.findMany({
      where: { doctorId },
      orderBy: [{ locale: "asc" }, { sortOrder: "asc" }, { question: "asc" }],
    });
    return {
      doctorId,
      defaultLocale: doctor.country.defaultLocale,
      supportedLocales: supportedLocales(doctor),
      faqs: mapFaqs(faqs),
    };
  } catch (error) {
    throw normalizeDbError(error, "Doctor FAQs are unavailable");
  }
}

/** Replace the doctor's entire FAQ set in one transaction. */
export async function replaceDoctorFaqs(doctorId: string, input: DoctorFaqsReplaceBody) {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, countryId: true },
    });
    if (!doctor) throw new DoctorFaqNotFoundError();

    const locales = Array.from(new Set(input.faqs.map((faq) => faq.locale)));
    await Promise.all(locales.map((locale) => assertLocaleSupported(doctor.countryId, locale)));

    const saved = await prisma.$transaction(async (tx) => {
      await tx.doctorFaq.deleteMany({ where: { doctorId } });
      if (input.faqs.length > 0) {
        await tx.doctorFaq.createMany({
          data: input.faqs.map((faq) => ({
            doctorId,
            locale: faq.locale,
            question: faq.question,
            answer: faq.answer,
            category: faq.category ?? null,
            sortOrder: faq.sortOrder,
            isActive: faq.isActive,
          })),
        });
      }
      return tx.doctorFaq.findMany({
        where: { doctorId },
        orderBy: [{ locale: "asc" }, { sortOrder: "asc" }, { question: "asc" }],
      });
    }, DOCTOR_FAQ_TX_OPTIONS);

    return mapFaqs(saved);
  } catch (error) {
    if (error instanceof DoctorFaqNotFoundError) throw error;
    throw normalizeDbError(error, "Doctor FAQs could not be saved");
  }
}
