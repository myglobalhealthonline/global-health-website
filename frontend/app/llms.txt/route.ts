import { NextResponse } from "next/server";
import { countries } from "@/data/countries";
import { SITE_NAME } from "@/lib/constants";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";
import { listBlogPosts, type BlogListItem } from "@/lib/content/get-public-blog";

/**
 * `/llms.txt` is a draft-standard manifest for AI crawlers such as ChatGPT,
 * Perplexity, and Google AI Overviews. Keep it focused on canonical,
 * indexable public URLs.
 */
// Rendered at request time, same reasoning as app/sitemap.ts: the article
// list comes from the backend API, which is unreachable during the static
// build — a build-time render would silently ship zero articles (the
// try/catch fallback in listBlogPosts fires) and this route would regress
// to exactly the gap it's meant to fix. llms.txt traffic is low-volume
// AI-crawler-only, so per-request rendering is fine.
export const dynamic = "force-dynamic";

/** Mirrors blog-index-page.tsx's `blogPostHref` (no visitor cookie context
 *  here, so it always falls back to the lowest country code — same as the
 *  bare `/blog` index on a first visit). Every post has exactly one
 *  canonical URL; keep this in sync with that function and with
 *  resolveBlogPostRoute() on the backend. */
function blogPostHref(origin: string, post: BlogListItem): string {
  if (post.countries.length === 0) return `${origin}/blog/${post.slug}`;
  const target = [...post.countries].sort((a, b) => a.code.localeCompare(b.code))[0];
  return `${origin}/${target.slug}/${post.locale.toLowerCase()}/blog/${post.slug}`;
}

export async function GET() {
  const origin = getSiteUrl();
  const posts = await listBlogPosts();
  const lines: string[] = [
    `# ${SITE_NAME}`,
    "",
    "> Online medical consultations with licensed clinicians across Ireland, Portugal, Spain, Czechia, Romania, and Brazil.",
    "",
    "## Countries",
  ];

  for (const c of countries) {
    const slug = COUNTRY_CODE_TO_SLUG[c.code];
    const lang = (c.defaultLocale ?? "EN").toLowerCase();
    lines.push(`- [${c.name}](${origin}/${slug}/${lang}): country landing page with available doctors and consultation types.`);
    lines.push(`- [${c.name} - book online](${origin}/${slug}/${lang}/book): guided booking for service, clinician, time, and patient details.`);
    lines.push(`- [${c.name} - Book a GP appointment](${origin}/${slug}/${lang}/gp-consultation-online): general practitioners registered in ${c.name}.`);
    lines.push(`- [${c.name} - See a specialist](${origin}/${slug}/${lang}/see-a-specialist): specialists registered in ${c.name}.`);
    lines.push(`- [${c.name} - doctors](${origin}/${slug}/${lang}/doctors): clinician roster with qualifications and specialties.`);
    lines.push(`- [${c.name} - lab tests](${origin}/${slug}/${lang}/lab-tests): at-home and in-clinic laboratory tests.`);
  }

  lines.push(
    "",
    "## Site info",
    `- [About Global Health](${origin}/about): who we are, clinical governance, and how the service works.`,
    `- [FAQ](${origin}/faq): common questions about consultations, prescriptions, and payments.`,
    `- [Health blog](${origin}/blog): index of all clinician-reviewed health guides.`,
  );

  if (posts.length > 0) {
    lines.push("", "## Articles");
    for (const post of posts) {
      const byline = post.author ? ` By ${post.author}.` : "";
      lines.push(`- [${post.title}](${blogPostHref(origin, post)}): ${post.excerpt}${byline}`);
    }
  }

  lines.push(
    "",
    "## Optional",
    `- [Privacy notice](${origin}/privacy)`,
    `- [Terms of service](${origin}/terms)`,
    `- [Sitemap](${origin}/sitemap.xml)`,
  );

  return new NextResponse(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
