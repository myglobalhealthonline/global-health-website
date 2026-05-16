import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/seo/site-url";
import { SITE_NAME } from "@/lib/constants";
import { countries } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";

/**
 * `/llms.txt` — a draft-standard manifest for AI crawlers (ChatGPT,
 * Perplexity, Google AI Overviews) describing the high-signal URLs on the
 * site. Reduces hallucinations and improves citation accuracy.
 *
 * Spec: https://llmstxt.org
 */
export const dynamic = "force-static";

export async function GET() {
  const origin = getSiteUrl();
  const lines: string[] = [
    `# ${SITE_NAME}`,
    "",
    "> Online medical consultations with licensed clinicians across Ireland, Portugal, Spain, Czechia, and Romania. General + specialist video appointments delivered via Google Meet.",
    "",
    "## Countries",
  ];

  for (const c of countries) {
    const slug = COUNTRY_CODE_TO_SLUG[c.code];
    const lang = (c.defaultLocale ?? "EN").toLowerCase();
    lines.push(`- [${c.name}](${origin}/${slug}/${lang}): country landing page with available doctors and consultation types.`);
    lines.push(`- [${c.name} — GP consultation](${origin}/${slug}/${lang}/general-consultation): everyday primary-care consultations with a general practitioner.`);
    lines.push(`- [${c.name} — specialist consultation](${origin}/${slug}/${lang}/specialist-consultation): consultations with specialists in cardiology, dermatology, nutrition, and more.`);
    lines.push(`- [${c.name} — doctors](${origin}/${slug}/${lang}/doctors): clinician roster with qualifications and specialties.`);
    lines.push(`- [${c.name} — book online](${origin}/${slug}/${lang}/book-online): submit a booking request.`);
  }

  lines.push("", "## Site info", `- [Privacy notice](${origin}/privacy)`, `- [Sitemap](${origin}/sitemap.xml)`);

  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
