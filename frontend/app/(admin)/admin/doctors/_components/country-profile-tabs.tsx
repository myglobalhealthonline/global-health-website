"use client";

import { useMemo, useState } from "react";
import { RichTextHtmlField } from "@/app/(admin)/admin/_components/rich-text-html-field";
import type { AdminDoctorMarketDto } from "@/lib/admin/admin-api";
import { PortalTabs } from "@/components/PortalTabs";

/**
 * Per-country doctor profile editor. The profile is managed by country
 * (outer tabs, shown only when the doctor practices in 2+ countries) and by
 * language (inner tabs) — title, bio and SEO save per country+locale, with
 * registration and payout per country. Saves through the `saveMarket` server
 * action passed from the parent (one country at a time).
 */

type SaveAction = (formData: FormData) => void | Promise<void>;

const LOCALE_LABELS: Record<string, string> = {
  EN: "English",
  PT: "Portuguese",
  ES: "Spanish",
  CS: "Czech",
  RO: "Romanian",
  DE: "German",
};

function localeLabel(code: string): string {
  return LOCALE_LABELS[code.toUpperCase()] ?? code.toUpperCase();
}

function translationFor(market: AdminDoctorMarketDto, locale: string) {
  const normalized = locale.toUpperCase();
  return (
    market.translations.find((entry) => entry.locale.toUpperCase() === normalized) ?? null
  );
}

function localeTabsFor(market: AdminDoctorMarketDto) {
  const defaultLocale = market.country.defaultLocale.toUpperCase();
  const seen = new Set<string>();
  const tabs = (market.supportedLocales.length
    ? market.supportedLocales
    : [{ code: defaultLocale, isDefault: true }]
  )
    .map((locale) => ({
      code: locale.code.toUpperCase(),
      isDefault: locale.isDefault || locale.code.toUpperCase() === defaultLocale,
    }))
    .filter((locale) => {
      if (seen.has(locale.code)) return false;
      seen.add(locale.code);
      return true;
    });
  if (!seen.has(defaultLocale)) tabs.unshift({ code: defaultLocale, isDefault: true });
  return tabs.length > 0 ? tabs : [{ code: defaultLocale, isDefault: true }];
}

function CountryForm({
  market,
  saveMarket,
}: {
  market: AdminDoctorMarketDto;
  saveMarket: SaveAction;
}) {
  const localeTabs = useMemo(() => localeTabsFor(market), [market]);
  const [activeLocale, setActiveLocale] = useState(
    localeTabs.find((l) => l.isDefault)?.code ?? localeTabs[0].code,
  );
  const localeCsv = localeTabs.map((l) => l.code).join(",");

  return (
    <form
      action={saveMarket}
      className="gh-admin-doctor-country-form rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4"
    >
      <input type="hidden" name="countryId" value={market.countryId} />
      <input type="hidden" name="countryCode" value={market.country.code} />
      <input type="hidden" name="locales" value={localeCsv} />

      <div className="gh-admin-doctor-country-form-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[15px] font-bold text-[var(--color-text-primary)]">
            {market.country.name} ({market.country.code.toUpperCase()})
          </p>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            Default locale: {market.country.defaultLocale}
          </p>
        </div>
        <div className="gh-admin-doctor-toggle-row flex flex-wrap items-center gap-3 text-[13px]">
          <label className="inline-flex items-center gap-2">
            <input name="active" type="checkbox" defaultChecked={market.active} />
            Active
          </label>
          <label className="inline-flex items-center gap-2">
            <input name="isVerified" type="checkbox" defaultChecked={market.isVerified} />
            Registration verified
          </label>
        </div>
      </div>

      <div className="gh-admin-doctor-country-fields mt-4 grid gap-3 sm:grid-cols-[90px_1fr_1fr_90px]">
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Sort</span>
          <input
            name="sortOrder"
            type="number"
            min={0}
            max={1000}
            defaultValue={market.sortOrder}
            className="gh-input"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Registration body</span>
          <input
            name="chamberEntity"
            maxLength={64}
            defaultValue={market.chamberEntity ?? ""}
            className="gh-input"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Registration number</span>
          <input
            name="registrationNumber"
            maxLength={64}
            defaultValue={market.registrationNumber ?? ""}
            className="gh-input"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Division</span>
          <input
            name="division"
            maxLength={120}
            defaultValue={market.division ?? ""}
            className="gh-input"
          />
        </label>
      </div>

      {/* Language tabs */}
      <div className="mt-5">
        <PortalTabs
          ariaLabel="Doctor profile languages"
          value={activeLocale}
          onChange={setActiveLocale}
          items={localeTabs.map((locale) => ({
            value: locale.code,
            label: `${localeLabel(locale.code)}${locale.isDefault ? " · default" : ""}`,
          }))}
        />
      </div>

      {localeTabs.map((locale) => {
        const code = locale.code;
        const translation = translationFor(market, code);
        return (
          <div
            key={code}
            role="tabpanel"
            hidden={code !== activeLocale}
            className="gh-admin-doctor-tab-panel mt-4 grid gap-3"
          >
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">
                Professional title{locale.isDefault ? " *" : ""}
              </span>
              <input
                name={`title_${code}`}
                maxLength={160}
                defaultValue={translation?.title ?? ""}
                required={locale.isDefault}
                className="gh-input"
                placeholder="Medical Doctor"
              />
            </label>
            <RichTextHtmlField
              name={`bio_${code}`}
              label="Bio"
              initialValue={translation?.bio ?? ""}
            />
            <div className="gh-admin-doctor-field-grid grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">SEO title</span>
                <input
                  name={`seoTitle_${code}`}
                  maxLength={160}
                  defaultValue={translation?.seoTitle ?? ""}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">SEO keywords</span>
                <input
                  name={`seoKeywords_${code}`}
                  maxLength={500}
                  defaultValue={(translation?.seoKeywords ?? []).join(", ")}
                  className="gh-input"
                  placeholder="cardiology, telehealth"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Meta description</span>
              <textarea
                name={`seoDescription_${code}`}
                rows={2}
                maxLength={320}
                defaultValue={translation?.seoDescription ?? ""}
                className="gh-input resize-y"
              />
            </label>
          </div>
        );
      })}

      <div className="gh-admin-doctor-payout-note mt-4 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-3">
        <h4 className="m-0 text-[13px] font-bold text-[var(--color-text-primary)]">
          Payout details
        </h4>
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
          Bank / IBAN is entered by the doctor in their portal — admins cannot
          set it. {market.bank.ibanSet ? `On file: ${market.bank.ibanMasked ?? "•••• ••••"}.` : "None on file yet."}
        </p>
      </div>

      <div className="gh-admin-doctor-form-actions mt-4 flex justify-end">
        <button type="submit" className="gh-btn gh-btn-primary">
          Save {market.country.name}
        </button>
      </div>
    </form>
  );
}

export function CountryProfileTabs({
  markets,
  saveMarket,
}: {
  markets: AdminDoctorMarketDto[];
  saveMarket: SaveAction;
}) {
  const [activeCountryId, setActiveCountryId] = useState(markets[0]?.countryId ?? "");
  const multiCountry = markets.length > 1;
  const activeMarket =
    markets.find((m) => m.countryId === activeCountryId) ?? markets[0] ?? null;

  if (!activeMarket) return null;

  return (
    <div className="gh-admin-doctor-country-tabs grid gap-4">
      {multiCountry ? (
        <PortalTabs
          ariaLabel="Countries"
          value={activeMarket.countryId}
          onChange={setActiveCountryId}
          items={markets.map((market) => ({
            value: market.countryId,
            label: (
              <>
                {market.country.name}{" "}
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] opacity-70">
                  {market.country.code}
                </span>
              </>
            ),
          }))}
        />
      ) : null}

      {/* Remount the form per active country so defaults refresh on switch. */}
      <CountryForm key={activeMarket.countryId} market={activeMarket} saveMarket={saveMarket} />
    </div>
  );
}
