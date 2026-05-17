import type { AdminCountryDto, AdminCurrencyDto } from "@/lib/admin/admin-api";
import { CountrySelect } from "./country-select";

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="gh-field-label">Country</span>
        <CountrySelect initialIso={initial?.code} />
        <span className="text-[12px] text-[var(--color-text-muted)]">
          Pick from the world list — flag + name. ISO code and URL slug
          fill in automatically.
        </span>
      </div>

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

      <fieldset className="flex flex-col gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--color-text-primary)]">
          Locales
        </legend>
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
        <div>
          <span className="gh-field-label">Supported locales</span>
          <div className="mt-2 flex flex-wrap gap-4">
            {LOCALES.map((locale) => (
              <label
                key={locale}
                className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"
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
          <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">
            The default locale must be one of the supported locales.
          </p>
        </div>
      </fieldset>

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

      {/* Per-country BookingSetting — controls whether bookings are
          accepted at all, and which intake fields are required. Backend
          reads these in /api/appointments before creating an Appointment.
          Field names use the `bookingSetting.` prefix so the form action
          parses them into a single nested object. */}
      <fieldset className="flex flex-col gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--color-text-primary)]">
          Booking settings
        </legend>
        <p className="text-xs text-[var(--color-text-muted)]">
          Pause online bookings for this country, or require additional
          intake fields. Patient gets a friendly error if a required
          field is missing.
        </p>

        <label className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
          <input
            type="checkbox"
            name="bookingSetting.bookingEnabled"
            defaultChecked={initial?.bookingSetting?.bookingEnabled ?? true}
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          Online bookings enabled
        </label>

        <label className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
          <input
            type="checkbox"
            name="bookingSetting.requirePhone"
            defaultChecked={initial?.bookingSetting?.requirePhone ?? true}
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          Require phone number at booking
        </label>

        <label className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
          <input
            type="checkbox"
            name="bookingSetting.requireDateOfBirth"
            defaultChecked={initial?.bookingSetting?.requireDateOfBirth ?? true}
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          Require date of birth at booking
          <span className="text-[11px] text-[var(--color-text-muted)]">
            (UI field not yet on the public form — flip on once DOB is collected)
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Default timezone</span>
          <input
            type="text"
            name="bookingSetting.timezone"
            className="gh-input"
            placeholder="e.g. Europe/Dublin or UTC"
            defaultValue={initial?.bookingSetting?.timezone ?? "UTC"}
            maxLength={64}
          />
          <span className="text-[11px] text-[var(--color-text-muted)]">
            IANA timezone string. Used for reminder scheduling math.
          </span>
        </label>
      </fieldset>

      <label className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
          className="h-4 w-4 rounded border-[var(--color-border)]"
        />
        Country active (inactive countries stay hidden from public{" "}
        <code>/api/countries</code>)
      </label>
    </div>
  );
}
