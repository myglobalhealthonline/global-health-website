import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: `How ${SITE_NAME} collects, stores, and protects your data.`,
};

export default async function PrivacyPage() {
  const locale = await getPageLocale();
  const { privacy } = loadLocaleBundle(locale).legal;

  return (
    <>
      {/* Dark header */}
      <section
        style={{
          background: "var(--color-background-dark)",
          padding: "clamp(56px,7vw,96px) 0 clamp(40px,5vw,64px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="mx-auto max-w-3xl px-5 md:px-10">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--color-brand-accent)" }}
          >
            {privacy.eyebrow}
          </p>
          <h1
            className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
            style={{
              fontSize: "clamp(2.2rem,5vw,4rem)",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            {privacy.title}
          </h1>
          <p
            className="mt-3 text-sm"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            {privacy.lastUpdated}
          </p>
        </div>
      </section>

      {/* Prose body — light for readability */}
      <section
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
      </section>
    </>
  );
}
