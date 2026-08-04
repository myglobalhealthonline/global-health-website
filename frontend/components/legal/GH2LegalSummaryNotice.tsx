import Link from "next/link";
import { countries } from "@/data/countries";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import type { LocaleCode } from "@/lib/i18n/types";

type Props = {
  locale: LocaleCode;
  badge: string;
  text: string;
  linkIntro: string;
};

/**
 * Shared by /terms and /privacy: signposts that the root page is a
 * plain-language summary and links to the governing (versioned, CMS-managed)
 * legal document for each country. Real server-rendered <a> tags — this repo
 * has orphaned locale URLs before with a links-nowhere language switcher.
 */
export function GH2LegalSummaryNotice({ locale, badge, text, linkIntro }: Props) {
  const { countryNames } = getCommonLocale(locale);

  return (
    <section
      className="rounded-2xl p-5"
      style={{ background: "var(--color-background-soft)", border: "1px solid rgba(29,75,54,0.12)" }}
    >
      <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--color-brand-primary)]">
        {badge}
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-body)]">{text}</p>
      <p className="mt-4 text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {linkIntro}
      </p>
      <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {countries.map((country) => {
          const lang = country.supportedLocales.includes(locale) ? locale : country.defaultLocale;
          return (
            <li key={country.code}>
              <Link
                href={`/${country.slug}/${lang}/legal`}
                className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
              >
                {countryNames?.[country.code] ?? country.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
