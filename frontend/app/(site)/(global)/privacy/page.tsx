import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { GH2CompactHero } from "@/components/sections/GH2PagePrimitives";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { CookieSettingsButton } from "@/components/compliance/CookieSettingsButton";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: `How ${SITE_NAME} collects, stores, and protects your data.`,
};

export default async function PrivacyPage() {
  const locale = await getPageLocale();
  const { privacy } = loadLocaleBundle(locale).legal;
  const { cookie } = getCommonLocale(locale);

  return (
    <>
      <GH2CompactHero
        eyebrow={privacy.eyebrow}
        title={privacy.title}
        accent=""
        watermark="Privacy"
        meta={<p className="gh2-index">{privacy.lastUpdated}</p>}
      />

      {/* Prose body — full-bleed ivory wrapper; body{} is dark forest
          globally, so every section must supply its own background or
          text reads dark-on-dark. Inner div keeps the readable measure. */}
      <section className="relative gh2-section-ivory">
        <SectionSeam theme="light" />
        <div
          className="mx-auto max-w-3xl px-5 md:px-10"
          style={{ padding: "clamp(48px,6vw,80px) 20px" }}
        >
        <div className="space-y-8 text-base leading-relaxed text-[var(--color-text-body)]">
          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {privacy.s1_h}
            </h2>
            <p className="mt-2">{privacy.s1_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {privacy.s2_h}
            </h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>{privacy.s2_i1}</li>
              <li>{privacy.s2_i2}</li>
              <li>{privacy.s2_i3}</li>
              <li>{privacy.s2_i4}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {privacy.s3_h}
            </h2>
            <p className="mt-2">{privacy.s3_p}</p>
            <p className="mt-2">
              {privacy.s3_manage}{" "}
              <CookieSettingsButton
                label={cookie.settingsLink}
                className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
              />
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {privacy.s4_h}
            </h2>
            <p className="mt-2">{privacy.s4_intro}</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                {privacy.s4_i1_pre}
                <Link
                  href="/account/security"
                  className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
                >
                  {privacy.s4_i1_link}
                </Link>
                {privacy.s4_i1_post}
              </li>
              <li>{privacy.s4_i2}</li>
              <li>
                {privacy.s4_i3_pre}
                <a
                  href="mailto:privacy@myglobalhealth.online"
                  className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
                >
                  privacy@myglobalhealth.online
                </a>
                {privacy.s4_i3_post}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {privacy.s5_h}
            </h2>
            <p className="mt-2">{privacy.s5_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {privacy.s6_h}
            </h2>
            <p className="mt-2">{privacy.s6_p}</p>
          </section>
        </div>
        </div>
      </section>
    </>
  );
}
