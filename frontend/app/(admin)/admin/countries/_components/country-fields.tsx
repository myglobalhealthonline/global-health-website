import type { AdminCountryDto, AdminCurrencyDto } from "@/lib/admin/admin-api";
import {
  CURATED_TIME_ZONES,
  getNonCuratedTimeZones,
  timeZoneLabel,
} from "@/lib/timezones";
import { CountrySelect } from "./country-select";
import { FormSection } from "@/components/FormSection";

const LOCALES = ["EN", "PT", "ES", "CS", "RO", "DE"] as const;

type Props = {
  currencies: AdminCurrencyDto[];
  initial?: AdminCountryDto | null;
};

/**
 * Admin Country form. Single picker for country (flag + name + ISO),
 * a locale matrix, and currency. The legacy Wix path fields
 * (`legacyHomePath`, `teamPath`, `generalConsultationPath`,
 * `specialistConsultationPath`) and the per-country domains are still
 * required by the existing server action — we keep them out of the
 * visible UI by emitting hidden inputs with sensible defaults derived
 * from the slug. New countries just need: country + locales + currency.
 *
 * Existing rows keep whatever values they had — when `initial` is set
 * we forward the existing paths/domains untouched so editing doesn't
 * silently rewrite legacy redirect targets.
 */
export function CountryFields({ currencies, initial }: Props) {
  const supported = initial?.countryLocales.map((l) => l.locale) ?? [];

  // Pull legacy path values from `initial` so editing preserves them.
  // For new countries these fall back to slug-derived defaults wired in
  // by the server action.
  const legacyHomePath = initial?.legacyHomePath ?? "";
  const teamPath = initial?.teamPath ?? "";
  const generalConsultationPath = initial?.generalConsultationPath ?? "";
  const specialistConsultationPath = initial?.specialistConsultationPath ?? "";

  return (
    <div className="gh-admin-country-fields flex flex-col gap-5">
      {/* Hidden legacy path fields. Kept as hidden inputs so the server
          action's existing payload shape doesn't change. New rows get
          slug-derived defaults at the action layer; existing rows keep
          their original Wix redirect paths. */}
      <input type="hidden" name="legacyHomePath" defaultValue={legacyHomePath} />
      <input type="hidden" name="teamPath" defaultValue={teamPath} />
      <input
        type="hidden"
        name="generalConsultationPath"
        defaultValue={generalConsultationPath}
      />
      <input
        type="hidden"
        name="specialistConsultationPath"
        defaultValue={specialistConsultationPath}
      />

      <FormSection title="Country">
        <div className="gh-form-section__span-2 flex flex-col gap-2">
          <span className="gh-field-label">Country</span>
          <CountrySelect initialIso={initial?.code} />
          <span className="text-[12px]" style={{ color: "var(--portal-muted)" }}>
            Pick from the world list — flag + name. ISO code and URL slug
            fill in automatically.
          </span>
        </div>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Currency</span>
          <select
            name="currencyId"
            className="gh-select min-w-0"
            required
            defaultValue={initial?.currencyId ?? ""}
          >
            <option value="">Select currency</option>
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm" style={{ color: "var(--portal-text)" }}>
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={initial?.isActive ?? true}
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          Country active (inactive countries stay hidden from public{" "}
          <code>/api/countries</code>)
        </label>
      </FormSection>

      <FormSection title="Locales">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Default locale</span>
          <select
            name="defaultLocale"
            className="gh-select min-w-0"
            required
            defaultValue={initial?.defaultLocale ?? "EN"}
          >
            {LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {locale}
              </option>
            ))}
          </select>
        </label>
        <div className="gh-form-section__span-2">
          <span className="gh-field-label">Supported locales</span>
          <div className="gh-admin-country-locale-grid mt-2 flex flex-wrap gap-4">
            {LOCALES.map((locale) => (
              <label
                key={locale}
                className="flex items-center gap-2 text-sm"
                style={{ color: "var(--portal-muted)" }}
              >
                <input
                  type="checkbox"
                  name="supportedLocales"
                  value={locale}
                  defaultChecked={
                    initial ? supported.includes(locale) : locale === "EN"
                  }
                />
                {locale}
              </label>
            ))}
          </div>
          <p className="mt-2 text-[12px]" style={{ color: "var(--portal-muted)" }}>
            The default locale must be one of the supported locales.
          </p>
        </div>
      </FormSection>

      {/* Per-country BookingSetting — controls whether bookings are
          accepted at all, and which intake fields are required. Backend
          reads these in /api/appointments before creating an Appointment.
          Field names use the `bookingSetting.` prefix so the form action
          parses them into a single nested object. */}
      <FormSection
        title="Booking settings"
        description="Pause online bookings for this country, or require additional intake fields. Patient gets a friendly error if a required field is missing."
      >
        <label className="flex items-center gap-3 text-sm" style={{ color: "var(--portal-text)" }}>
          <input
            type="checkbox"
            name="bookingSetting.bookingEnabled"
            defaultChecked={initial?.bookingSetting?.bookingEnabled ?? true}
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          Online bookings enabled
        </label>

        <label className="flex items-center gap-3 text-sm" style={{ color: "var(--portal-text)" }}>
          <input
            type="checkbox"
            name="bookingSetting.requirePhone"
            defaultChecked={initial?.bookingSetting?.requirePhone ?? true}
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          Require phone number at booking
        </label>

        <label className="flex items-center gap-3 text-sm" style={{ color: "var(--portal-text)" }}>
          <input
            type="checkbox"
            name="bookingSetting.requireDateOfBirth"
            defaultChecked={initial?.bookingSetting?.requireDateOfBirth ?? true}
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          Require date of birth at booking
          <span className="text-[11px]" style={{ color: "var(--portal-muted)" }}>
            (UI field not yet on the public form — flip on once DOB is collected)
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Default timezone</span>
          <select
            name="bookingSetting.timezone"
            className="gh-select min-w-0"
            defaultValue={initial?.bookingSetting?.timezone ?? "UTC"}
          >
            <optgroup label="Common">
              {CURATED_TIME_ZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {timeZoneLabel(tz)}
                </option>
              ))}
            </optgroup>
            <optgroup label="All time zones">
              {getNonCuratedTimeZones().map((tz) => (
                <option key={tz} value={tz}>
                  {timeZoneLabel(tz)}
                </option>
              ))}
            </optgroup>
          </select>
          <span className="text-[11px]" style={{ color: "var(--portal-muted)" }}>
            Clinic timezone for this country. Drives the booking slot times
            shown to doctors and patients, and reminder scheduling math.
          </span>
        </label>
      </FormSection>
    </div>
  );
}
