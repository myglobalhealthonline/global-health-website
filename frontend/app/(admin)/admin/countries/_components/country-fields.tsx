import type { AdminCountryDto, AdminCurrencyDto } from "@/lib/admin/admin-api";

const LOCALES = ["EN", "PT", "ES", "CS", "RO", "DE"] as const;

type Props = {
  currencies: AdminCurrencyDto[];
  initial?: AdminCountryDto | null;
};

export function CountryFields({ currencies, initial }: Props) {
  const supported = initial?.countryLocales.map((l) => l.locale) ?? [];
  const primaryDomain = initial?.domains.find((d) => d.isPrimary)?.domain ?? "";
  const extraDomains = initial?.domains.filter((d) => !d.isPrimary).map((d) => d.domain) ?? [];
  const secondaryDomain = extraDomains[0] ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Code</span>
          <input name="code" className="gh-input min-w-0" required defaultValue={initial?.code} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Name</span>
          <input name="name" className="gh-input min-w-0" required defaultValue={initial?.name} />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="gh-field-label">Slug</span>
          <input name="slug" className="gh-input min-w-0" required defaultValue={initial?.slug} />
        </label>
      </div>

      <fieldset className="flex flex-col gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--color-text-primary)]">Public routes</legend>
        <p className="text-xs text-[var(--color-text-muted)]">Each path must start with `/`.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="gh-field-label">Legacy home path</span>
            <input
              name="legacyHomePath"
              className="gh-input min-w-0"
              required
              defaultValue={initial?.legacyHomePath}
            />
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="gh-field-label">Team path</span>
            <input name="teamPath" className="gh-input min-w-0" required defaultValue={initial?.teamPath} />
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="gh-field-label">General consultation path</span>
            <input
              name="generalConsultationPath"
              className="gh-input min-w-0"
              required
              defaultValue={initial?.generalConsultationPath}
            />
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="gh-field-label">Specialist consultation path</span>
            <input
              name="specialistConsultationPath"
              className="gh-input min-w-0"
              required
              defaultValue={initial?.specialistConsultationPath}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--color-text-primary)]">Locales</legend>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Default locale</span>
          <select name="defaultLocale" className="gh-select min-w-0" required defaultValue={initial?.defaultLocale ?? "EN"}>
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
              <label key={locale} className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  name="supportedLocales"
                  value={locale}
                  defaultChecked={initial ? supported.includes(locale) : locale === "EN"}
                />
                {locale}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="gh-field-label">Currency</span>
          <select name="currencyId" className="gh-select min-w-0" required defaultValue={initial?.currencyId}>
            <option value="">Select currency</option>
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="flex flex-col gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--color-text-primary)]">Domains (optional)</legend>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Primary domain</span>
          <input name="domainPrimary" className="gh-input min-w-0" defaultValue={primaryDomain} placeholder="e.g. ie.example.com" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Secondary domain</span>
          <input name="domainSecondary" className="gh-input min-w-0" defaultValue={secondaryDomain} placeholder="Optional" />
        </label>
      </fieldset>

      <label className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
        <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} className="h-4 w-4 rounded border-[var(--color-border)]" />
        Country active (inactive countries stay hidden from public `/api/countries`)
      </label>
    </div>
  );
}
