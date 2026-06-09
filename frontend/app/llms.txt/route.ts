import { NextResponse } from "next/server";
import { countries } from "@/data/countries";
import { SITE_NAME } from "@/lib/constants";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";

/**
 * `/llms.txt` is a draft-standard manifest for AI crawlers such as ChatGPT,
 * Perplexity, and Google AI Overviews. Keep it focused on canonical,
 * indexable public URLs.
 */
export const dynamic = "force-static";

export async function GET() {
  const origin = getSiteUrl();
  const lines: string[] = [
    `# ${SITE_NAME}`,
    "",
    "> Online medical consultations with licensed clinicians across Ireland, Portugal, Spain, Czechia, and Romania.",
    "",
    "## Countries",
  ];

  for (const c of countries) {
    const slug = COUNTRY_CODE_TO_SLUG[c.code];
    const lang = (c.defaultLocale ?? "EN").toLowerCase();
    lines.push(`- [${c.name}](${origin}/${slug}/${lang}): country landing page with available doctors and consultation types.`);
    lines.push(`- [${c.name} - book online](${origin}/${slug}/${lang}/book): guided booking for service, clinician, time, and patient details.`);
    lines.push(`- [${c.name} - Book a GP appointment](${origin}/${slug}/${lang}/gp-appointment): general practitioners registered in ${c.name}.`);
    lines.push(`- [${c.name} - See a specialist](${origin}/${slug}/${lang}/see-a-specialist): specialists registered in ${c.name}.`);
    lines.push(`- [${c.name} - doctors](${origin}/${slug}/${lang}/doctors): clinician roster with qualifications and specialties.`);
  }

  lines.push(
    "",
    "## Site info",
    `- [Privacy notice](${origin}/privacy)`,
    `- [Sitemap](${origin}/sitemap.xml)`,
  );

  return new NextResponse(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
