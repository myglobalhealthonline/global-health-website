import { expect, test } from "@playwright/test";

/**
 * Ranking-growth batch (2026-08-10). The blog post CTA (`BlogPost.ctaService`
 * → its service detail page) and the Physician schema URL for the article's
 * author/reviewer doctor were both hardcoded to `/en/` regardless of the
 * ARTICLE's own locale — a PT/ES/CS/RO/BR-pt reader's CTA sent them to an
 * English-locale service page. Fixed to use the article's resolved locale
 * (`lib/content/blog-post-page.tsx`).
 *
 * Fixture: the same "self-declaration of illness" (Portugal `baixa-medica`
 * service) article, published in all 5 required locales, plus a Brazil
 * article for the BR-Portuguese case — real live content, not synthetic
 * fixtures, chosen because every locale variant points at the identical
 * ctaService so only the locale segment should differ between rows.
 */
const CASES = [
  {
    locale: "en",
    country: "portugal",
    slug: "self-certification-sick-leave-portugal",
    ctaService: "baixa-medica",
  },
  {
    locale: "pt",
    country: "portugal",
    slug: "autodeclaracao-de-doenca-ou-baixa-medica",
    ctaService: "baixa-medica",
  },
  {
    locale: "es",
    country: "portugal",
    slug: "autodeclaracion-enfermedad-portugal",
    ctaService: "baixa-medica",
  },
  {
    locale: "cs",
    country: "portugal",
    slug: "autodeklarace-nemoci-portugalsko",
    ctaService: "baixa-medica",
  },
  {
    locale: "ro",
    country: "portugal",
    slug: "autodeclaratie-de-boala-portugalia",
    ctaService: "baixa-medica",
  },
  {
    locale: "pt",
    country: "brazil",
    slug: "atestado-medico-online-validade",
    ctaService: "atestado-medico-online",
  },
];

test.describe("Blog CTA locale correctness", () => {
  for (const { locale, country, slug, ctaService } of CASES) {
    test(`${country}/${locale}/blog/${slug} CTA stays in ${locale}`, async ({ request }) => {
      const res = await request.get(`/${country}/${locale}/blog/${slug}`);
      expect(res.status()).toBeLessThan(400);
      const html = await res.text();

      const expectedHref = `/${country}/${locale}/services/${ctaService}`;
      expect(html).toContain(`href="${expectedHref}"`);

      // The specific regression: a hardcoded `/en/` segment must not appear
      // in this service's URL when the article itself is not English.
      if (locale !== "en") {
        const wrongHref = `/${country}/en/services/${ctaService}`;
        expect(html).not.toContain(`href="${wrongHref}"`);
      }
    });
  }
});
