"use client";

import { useMemo, useState } from "react";
import type { AdminDoctorFaqsDto } from "@/lib/admin/admin-api";
import { PortalTabs } from "@/components/PortalTabs";

/**
 * Doctor-level FAQ editor with language tabs (one set per doctor, shown on
 * every country's public profile). Mirrors the bio "by language" pattern.
 * Saves through the `saveFaqs` server action passed from the parent.
 */

export const FAQ_SLOTS = 8;

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

export function FaqLanguageTabs({
  data,
  saveFaqs,
}: {
  data: AdminDoctorFaqsDto;
  saveFaqs: SaveAction;
}) {
  const localeTabs = useMemo(() => {
    const defaultLocale = data.defaultLocale.toUpperCase();
    const seen = new Set<string>();
    const tabs = (data.supportedLocales.length
      ? data.supportedLocales
      : [{ code: defaultLocale, isDefault: true }]
    )
      .map((l) => ({
        code: l.code.toUpperCase(),
        isDefault: l.isDefault || l.code.toUpperCase() === defaultLocale,
      }))
      .filter((l) => {
        if (seen.has(l.code)) return false;
        seen.add(l.code);
        return true;
      });
    if (!seen.has(defaultLocale)) tabs.unshift({ code: defaultLocale, isDefault: true });
    return tabs.length > 0 ? tabs : [{ code: defaultLocale, isDefault: true }];
  }, [data.defaultLocale, data.supportedLocales]);

  const [activeLocale, setActiveLocale] = useState(
    localeTabs.find((l) => l.isDefault)?.code ?? localeTabs[0].code,
  );
  const localeCsv = localeTabs.map((l) => l.code).join(",");

  function faqsFor(locale: string) {
    const normalized = locale.toUpperCase();
    return data.faqs
      .filter((f) => f.locale.toUpperCase() === normalized)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.question.localeCompare(b.question))
      .slice(0, FAQ_SLOTS);
  }

  return (
    <form action={saveFaqs} className="gh-admin-doctor-faq-form grid gap-4">
      <input type="hidden" name="locales" value={localeCsv} />

      <PortalTabs
        ariaLabel="FAQ languages"
        value={activeLocale}
        onChange={setActiveLocale}
        items={localeTabs.map((locale) => ({
          value: locale.code,
          label: `${localeLabel(locale.code)}${locale.isDefault ? " · default" : ""}`,
        }))}
      />

      {localeTabs.map((locale) => {
        const code = locale.code;
        const rows = faqsFor(code);
        return (
          <div key={code} role="tabpanel" hidden={code !== activeLocale} className="gh-admin-doctor-tab-panel grid gap-2">
            <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
              Leave a row blank to drop it. Up to {FAQ_SLOTS} per language.
            </p>
            {Array.from({ length: FAQ_SLOTS }, (_, index) => {
              const faq = rows[index] ?? null;
              return (
                <div
                  key={`${code}-${index}`}
                  className="gh-admin-doctor-faq-row grid gap-2 rounded border border-[var(--color-border)] bg-[var(--color-background-soft)] p-2 sm:grid-cols-[1fr_1fr_120px_70px_auto]"
                >
                  <input
                    name={`faq_${code}_${index}_question`}
                    defaultValue={faq?.question ?? ""}
                    className="gh-input"
                    maxLength={500}
                    placeholder="Question"
                  />
                  <input
                    name={`faq_${code}_${index}_answer`}
                    defaultValue={faq?.answer ?? ""}
                    className="gh-input"
                    maxLength={4000}
                    placeholder="Answer"
                  />
                  <input
                    name={`faq_${code}_${index}_category`}
                    defaultValue={faq?.category ?? ""}
                    className="gh-input"
                    maxLength={120}
                    placeholder="Category"
                  />
                  <input
                    name={`faq_${code}_${index}_sortOrder`}
                    type="number"
                    min={0}
                    max={1000}
                    defaultValue={faq?.sortOrder ?? index}
                    className="gh-input"
                    aria-label="FAQ sort order"
                  />
                  <label className="inline-flex items-center gap-1 text-[12px]">
                    <input
                      name={`faq_${code}_${index}_isActive`}
                      type="checkbox"
                      defaultChecked={faq?.isActive ?? true}
                    />
                    Active
                  </label>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="gh-admin-doctor-form-actions flex justify-end">
        <button type="submit" className="gh-btn gh-btn-primary">
          Save FAQs
        </button>
      </div>
    </form>
  );
}
