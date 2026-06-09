import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The terms that apply when you use ${SITE_NAME} to book an online consultation.`,
};

export default async function TermsPage() {
  const locale = await getPageLocale();
  const { terms } = loadLocaleBundle(locale).legal;

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
            {terms.eyebrow}
          </p>
          <h1
            className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
            style={{
              fontSize: "clamp(2.2rem,5vw,4rem)",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            {terms.title}
          </h1>
          <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            {terms.lastUpdated}
          </p>
        </div>
      </section>

      {/* Prose body — light for readability */}
      <main
        className="mx-auto max-w-3xl px-5 md:px-10"
        style={{ padding: "clamp(48px,6vw,80px) 20px" }}
      >
        <div className="space-y-8 text-base leading-relaxed text-[var(--color-text-body)]">
          <section>
            <p>{terms.intro}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s1_h}
            </h2>
            <p className="mt-2">{terms.s1_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s2_h}
            </h2>
            <p className="mt-2">{terms.s2_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s3_h}
            </h2>
            <p className="mt-2">{terms.s3_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s4_h}
            </h2>
            <p className="mt-2">{terms.s4_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s5_h}
            </h2>
            <p className="mt-2">{terms.s5_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s6_h}
            </h2>
            <p className="mt-2">
              {terms.s6_p_pre}
              <Link
                href="/privacy"
                className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
              >
                {terms.s6_link}
              </Link>
              {terms.s6_p_post}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s7_h}
            </h2>
            <p className="mt-2">{terms.s7_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s8_h}
            </h2>
            <p className="mt-2">{terms.s8_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s9_h}
            </h2>
            <p className="mt-2">{terms.s9_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s10_h}
            </h2>
            <p className="mt-2">
              {terms.s10_pre}{" "}
              <a
                href="mailto:info@myglobalhealth.online"
                className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
              >
                info@myglobalhealth.online
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
