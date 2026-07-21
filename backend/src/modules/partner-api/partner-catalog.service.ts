import { ServiceVisibility } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

/**
 * Catalogue reads for the partner booking API.
 *
 * Everything here is country-scoped by design: a `Service` row IS per-country
 * (`@@unique([countryId, slug])`), prices live on that row, and each country
 * carries its own IANA timezone on `BookingSetting`. So the partner's first
 * call answers "what can I sell in this market, at what price, with which
 * doctors" in one payload, and every id it returns is the exact primary key
 * the later availability + booking calls expect.
 *
 * Doctor eligibility mirrors the public booking flow exactly
 * (`service-availability.service.ts`): active doctor, listed in the country
 * (primary `countryId` or an active `DoctorCountry` link), and holding an
 * active+approved `ServiceDoctor` row. Anything looser would advertise
 * doctors that `createManualBooking` then rejects at 422.
 */

export type PartnerCountry = {
  id: string;
  code: string;
  name: string;
  /** IANA zone all slot times in this market are expressed against. */
  timezone: string;
  currencyCode: string;
  defaultLocale: string;
};

export type PartnerCatalogDoctor = {
  id: string;
  slug: string;
  fullName: string;
  title: string;
  languages: string[];
};

export type PartnerCatalogService = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  summary: string | null;
  /** Consultation length. Null means the service has no default and the
   *  booking call must pass `durationMinutes` explicitly. */
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  /** When true, the charged price varies by time of day — read the
   *  per-slot `priceCents` from the availability call, never `basePriceCents`. */
  peakPricingEnabled: boolean;
  /** False when the service can't currently be booked through this API
   *  (no price, or no eligible doctor). Surfaced rather than filtered so an
   *  integrator can see WHY something they expect is missing. */
  isBookable: boolean;
  doctors: PartnerCatalogDoctor[];
};

export type PartnerCountryCatalog = {
  country: PartnerCountry;
  services: PartnerCatalogService[];
};

export class PartnerCountryNotFoundError extends Error {
  constructor() {
    super("Country not found or inactive.");
    this.name = "PartnerCountryNotFoundError";
  }
}

/** Every active market, with the ids + timezone the other calls need. */
export async function listPartnerCountries(
  allowedCountryCodes: string[],
): Promise<PartnerCountry[]> {
  try {
    const rows = await prisma.country.findMany({
      where: {
        isActive: true,
        ...(allowedCountryCodes.length > 0
          ? { code: { in: allowedCountryCodes } }
          : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        defaultLocale: true,
        currency: { select: { code: true } },
        bookingSetting: { select: { timezone: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      timezone: row.bookingSetting?.timezone ?? "UTC",
      currencyCode: row.currency?.code ?? "EUR",
      defaultLocale: row.defaultLocale,
    }));
  } catch (error) {
    throw normalizeDbError(error, "Countries data is unavailable");
  }
}

/**
 * Services bookable in one country, each with its price and the doctors who
 * provide it. This is call #1 of the three-step partner flow — the ids it
 * returns (`country.id`, `service.id`, `doctor.id`) are what calls #2 and #3
 * consume.
 */
export async function getPartnerCountryCatalog(
  countryCode: string,
): Promise<PartnerCountryCatalog> {
  const code = countryCode.trim().toLowerCase();
  try {
    const country = await prisma.country.findFirst({
      where: { code, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        defaultLocale: true,
        currency: { select: { code: true } },
        bookingSetting: { select: { timezone: true } },
      },
    });
    if (!country) throw new PartnerCountryNotFoundError();

    const services = await prisma.service.findMany({
      where: {
        countryId: country.id,
        isActive: true,
        // Corporate/admin-only services are not sellable through a partner
        // integration — same exclusion the public listings apply.
        visibility: ServiceVisibility.PUBLIC,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        kind: true,
        summary: true,
        durationMinutes: true,
        basePriceCents: true,
        currencyCode: true,
        peakPricing: { select: { enabled: true } },
        assignedDoctors: {
          where: {
            isActive: true,
            status: "active",
            doctor: {
              active: true,
              OR: [
                { countryId: country.id },
                {
                  additionalCountries: {
                    some: { active: true, countryId: country.id },
                  },
                },
              ],
            },
          },
          orderBy: { sortOrder: "asc" },
          select: {
            doctor: {
              select: {
                id: true,
                slug: true,
                fullName: true,
                title: true,
                languages: true,
              },
            },
          },
        },
      },
    });

    const fallbackCurrency = country.currency?.code ?? "EUR";
    return {
      country: {
        id: country.id,
        code: country.code,
        name: country.name,
        timezone: country.bookingSetting?.timezone ?? "UTC",
        currencyCode: fallbackCurrency,
        defaultLocale: country.defaultLocale,
      },
      services: services.map((service) => {
        const doctors = service.assignedDoctors.map((link) => link.doctor);
        return {
          id: service.id,
          slug: service.slug,
          name: service.name,
          kind: service.kind,
          summary: service.summary,
          durationMinutes: service.durationMinutes,
          basePriceCents: service.basePriceCents,
          currencyCode: service.currencyCode ?? fallbackCurrency,
          peakPricingEnabled: service.peakPricing?.enabled ?? false,
          isBookable:
            (service.basePriceCents ?? 0) > 0 && doctors.length > 0,
          doctors,
        };
      }),
    };
  } catch (error) {
    if (error instanceof PartnerCountryNotFoundError) throw error;
    throw normalizeDbError(error, "Service catalogue is unavailable");
  }
}
