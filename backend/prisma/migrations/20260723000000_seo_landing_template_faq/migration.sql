-- SeoLandingPage.template + SeoLandingPageTranslation.faq
--
-- template: page-level config { doctorLanguage?, doctorSlugs?, ctaService?,
--   related? } driving the doctor grid / CTA / related-links blocks on the
-- rendered landing page.
-- faq: per-locale array of { question, answer } (plain text) rendered as a
--   visible FAQ section + FAQPage JSON-LD.

ALTER TABLE "SeoLandingPage" ADD COLUMN "template" JSONB;
ALTER TABLE "SeoLandingPageTranslation" ADD COLUMN "faq" JSONB;
