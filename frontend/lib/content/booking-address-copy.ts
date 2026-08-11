import type { CommonLocale } from "@/lib/i18n/types";

/**
 * Country-aware labels for the booking form's address block.
 *
 * The address block is identical in every market except Brazil, which
 * addresses differently from Portugal and uses different vocabulary for the
 * same fields even in the same language:
 *
 *   - pt-PT says "Morada" / "Código postal"; pt-BR says "Endereço" / "CEP".
 *   - a Brazilian address is incomplete without the UF (Estado), which no
 *     other market on the platform collects.
 *
 * `pt` is one locale bundle shared by Portugal and Brazil, so the split can't
 * live in `locales/pt/common.json` — it has to key off the country slug in the
 * URL. Same shape as the `br:pt` overrides in `country-home-copy.ts`.
 *
 * Ireland has its own override too (postal code → "Eircode" — the actual name
 * of the system, not a translation). Every country without an entry in
 * `COUNTRY_OVERRIDES` falls straight through to the locale bundle unchanged.
 */

export type BookingAddressCopy = {
  patientAddress: string;
  patientAddressNote: string;
  streetAddress: string;
  aptUnit: string;
  city: string;
  postalCode: string;
  /** Null in markets that don't collect a state/province — hides the field. */
  state: string | null;
  statePlaceholder: string;
};

type Overrides = Partial<BookingAddressCopy>;

/**
 * Brazil, per language. Only the keys that actually differ are listed; the
 * rest fall through to the locale bundle. `state` is what turns the Estado
 * field on, so every language needs it.
 */
const BRAZIL: Record<string, Overrides> = {
  pt: {
    patientAddress: "Endereço do paciente",
    patientAddressNote: "Necessário para documentos médicos e envios físicos.",
    streetAddress: "Endereço",
    aptUnit: "Complemento (opcional)",
    city: "Cidade",
    postalCode: "CEP",
    state: "Estado",
    statePlaceholder: "Selecione…",
  },
  en: {
    postalCode: "CEP (postal code)",
    state: "State",
    statePlaceholder: "Select…",
  },
  es: {
    postalCode: "CEP (código postal)",
    state: "Estado",
    statePlaceholder: "Seleccione…",
  },
  de: {
    postalCode: "CEP (Postleitzahl)",
    state: "Bundesstaat",
    statePlaceholder: "Auswählen…",
  },
  cs: {
    postalCode: "CEP (PSČ)",
    state: "Stát",
    statePlaceholder: "Vyberte…",
  },
  ro: {
    postalCode: "CEP (cod poștal)",
    state: "Stat",
    statePlaceholder: "Selectați…",
  },
};

/** Every locale bundle maps to the same override — for terms that don't translate. */
const SUPPORTED_LANGS = ["en", "pt", "es", "de", "cs", "ro"];
function sameForAllLangs(overrides: Overrides): Record<string, Overrides> {
  return Object.fromEntries(SUPPORTED_LANGS.map((lang) => [lang, overrides]));
}

/**
 * Ireland — "Eircode" is the actual name of the postal code system there
 * (not a translated term), so it's the same string in every language.
 */
const IRELAND = sameForAllLangs({ postalCode: "Eircode" });

/** Per-country override tables, keyed by lowercase `Country.code`. */
const COUNTRY_OVERRIDES: Record<string, Record<string, Overrides>> = {
  br: BRAZIL,
  ie: IRELAND,
};

/**
 * The 27 federative units, the two-letter UF being what Brazilian addresses,
 * prescriptions and NF-e records actually carry. Value === label, so the
 * stored string is the UF itself.
 */
export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

/**
 * Resolve the address labels for a country + language, given the language's
 * own booking-form bundle as the base.
 */
export function bookingAddressCopy(
  country: string | null | undefined,
  lang: string | null | undefined,
  base: Pick<
    CommonLocale["bookingForm"],
    "patientAddress" | "patientAddressNote" | "streetAddress" | "aptUnit" | "city" | "postalCode"
  >,
): BookingAddressCopy {
  const fallthrough: BookingAddressCopy = {
    patientAddress: base.patientAddress,
    patientAddressNote: base.patientAddressNote,
    streetAddress: base.streetAddress,
    aptUnit: base.aptUnit,
    city: base.city,
    postalCode: base.postalCode,
    state: null,
    statePlaceholder: "",
  };
  const table = COUNTRY_OVERRIDES[(country ?? "").trim().toLowerCase()];
  if (!table) return fallthrough;
  const overrides = table[(lang ?? "").trim().toLowerCase()] ?? table.en ?? {};
  return { ...fallthrough, ...overrides };
}

/** Whether a country's booking form collects a state/province at all. */
export function collectsAddressState(country: string | null | undefined): boolean {
  return (country ?? "").trim().toLowerCase() === "br";
}
