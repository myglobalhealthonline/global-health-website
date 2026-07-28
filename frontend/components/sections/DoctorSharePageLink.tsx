import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { SHARE_COPY } from "@/app/(global)/brazil/dr-renato/copy";

/**
 * Doctors who have a hand-shareable, non-indexed patient page (`noindex`, out
 * of the sitemap). Keyed by doctor slug → page path. One entry today; the map
 * is what keeps the two call sites (his profile, the country GP page) from
 * hardcoding a doctor.
 */
export const DOCTOR_SHARE_PAGES: Record<string, string> = {
  "dr-renato-sarmento": "/brazil/dr-renato",
};

/**
 * Inbound link to a doctor's share page. Indexed pages linking to a noindex
 * page is fine (and is the only discovery path this page gets) — the target
 * stays out of the index, the link just makes it findable by a human.
 */
export function DoctorSharePageLink({
  doctorSlug,
  lang,
  theme = "light",
}: {
  doctorSlug: string;
  /** Page locale; anything other than `pt` gets the English variant. */
  lang: string;
  theme?: "light" | "dark";
}) {
  const path = DOCTOR_SHARE_PAGES[doctorSlug];
  if (!path) return null;
  const locale = lang === "pt" ? "pt" : "en";
  const t = SHARE_COPY[locale];
  const href = locale === "pt" ? path : `${path}?lang=en`;
  const dark = theme === "dark";

  return (
    <section
      className={
        dark
          ? "relative overflow-hidden gh2-section-forest gh-medical-pattern gh-medical-pattern-dark"
          : "relative gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
      }
      style={{ padding: "clamp(40px,5vw,72px) 0" }}
    >
      <SectionSeam theme={dark ? "dark" : "light"} />
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <Link
          href={href}
          className={
            dark
              ? "block rounded-[var(--radius-card)] p-7 transition-colors duration-200"
              : "gh2-card-ivory block rounded-[var(--radius-card)] p-7 transition-colors duration-200"
          }
          style={
            dark
              ? { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }
              : undefined
          }
        >
          <span
            className="flex items-center gap-2 text-base font-bold"
            style={dark ? { color: "rgba(255,255,255,0.92)" } : undefined}
          >
            {t.shareLinkTitle}
            <ArrowUpRight className="size-4" aria-hidden />
          </span>
          <span
            className="mt-2 block max-w-2xl text-sm leading-relaxed"
            style={dark ? { color: "rgba(255,255,255,0.52)" } : undefined}
          >
            {t.shareLinkBody}
          </span>
          <span
            className="mt-4 block text-sm font-bold underline underline-offset-4"
            style={dark ? { color: "var(--color-brand-accent)" } : undefined}
          >
            {t.shareLinkCta}
          </span>
        </Link>
      </div>
    </section>
  );
}
