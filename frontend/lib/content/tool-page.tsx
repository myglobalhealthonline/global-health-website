import Link from "next/link";
import { ArrowUpRight, Check, ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQSection } from "@/components/sections/FAQSection";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { ToolWidget } from "@/components/tools/ToolWidget";
import { TONE } from "@/lib/tools/tone";
import {
  getToolMeta,
  getToolsCopy,
  type ToolCopy,
  type ToolSectionCopy,
  type ToolsSuggestionsCopy,
  type ToolTableCopy,
  type ToneKey,
  type ToolsBundle,
} from "@/lib/tools/registry";
import type { LocaleCode } from "@/lib/i18n/types";
import type { BmiBandKey } from "@/lib/tools/calc";
import { suggestionForBand, type ServiceSuggestion } from "@/lib/tools/service-suggestions";
import { applyMarketBands, applyMarketToolCopy, getMarketFaq } from "@/lib/tools/market-copy";
import { fillPlaceholders } from "@/lib/tools/placeholders";
import { breadcrumbJsonLd, faqJsonLd, healthToolJsonLd } from "@/lib/seo/structured-data";

/**
 * Server renderer for a free health-tool page, in every market and locale.
 *
 * Everything a crawler needs (H1, explanatory copy, the category tables, the
 * FAQ) is emitted here, on the server. The only client boundary is
 * `<ToolWidget />`, which holds the inputs and nothing else.
 */

export type ToolCtx = {
  country: string;
  /** Internal country code (`ie`, `br`…) — keys the market-specific FAQ. */
  code: string;
  lang: LocaleCode;
  /** Market name in the page's own language ("Brasil", "Česko"). */
  countryLabel: string;
  /** BCP-47 tag for number/date formatting in the widgets, e.g. "pt-BR". */
  formatLocale: string;
};

const base = (ctx: ToolCtx) => `/${ctx.country}/${ctx.lang}`;

export function toolPath(ctx: ToolCtx, slug: string): string {
  return `${base(ctx)}/tools/${slug}`;
}

/* ------------------------------------------------------------ shared bits */

function Breadcrumbs({ items }: { items: Array<{ name: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-7">
      <ol className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-white/55">
        {items.map((item, index) => (
          <li key={item.name} className="flex items-center gap-1.5">
            {index > 0 ? <ChevronRight className="size-3 shrink-0" strokeWidth={2} aria-hidden /> : null}
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-[var(--color-brand-accent)]">
                {item.name}
              </Link>
            ) : (
              <span aria-current="page" className="text-white/80">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ToolHero({
  eyebrow,
  titleLead,
  titleAccent,
  titleTrail,
  lede,
  trustPoints,
  breadcrumbs,
  aside,
}: {
  eyebrow: string;
  titleLead: string;
  titleAccent: string;
  titleTrail?: string;
  lede: string;
  trustPoints?: string[];
  breadcrumbs: Array<{ name: string; href?: string }>;
  aside?: React.ReactNode;
}) {
  return (
    <section className="gh-medical-pattern gh-medical-pattern-dark relative isolate overflow-hidden text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 760px 420px at 88% -15%, rgba(176,241,34,0.10), transparent 58%)",
        }}
      />
      <div
        className="relative z-[1] mx-auto max-w-[var(--container-width)] px-5 md:px-10"
        style={{ paddingTop: "clamp(36px,5vw,72px)", paddingBottom: "clamp(48px,6vw,88px)" }}
      >
        <Breadcrumbs items={breadcrumbs} />

        <div
          className={
            aside
              ? "grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:gap-16"
              : ""
          }
        >
          <div className={aside ? "lg:pt-4" : ""}>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
              {eyebrow}
            </p>
            <h1
              className="mt-5 font-extrabold tracking-[-0.035em]"
              style={{
                lineHeight: 1.02,
                maxWidth: "15ch",
                fontSize: "clamp(2.25rem, 4.4vw + 0.5rem, 3.75rem)",
                color: "rgba(255,255,255,0.95)",
              }}
            >
              {titleLead} <span style={{ color: "var(--color-brand-accent)" }}>{titleAccent}</span>
              {titleTrail ? ` ${titleTrail}` : ""}
            </h1>
            <p
              className="mt-6 leading-relaxed"
              style={{ maxWidth: "48ch", fontSize: "var(--text-body-lg)", color: "rgba(255,255,255,0.62)" }}
            >
              {lede}
            </p>

            {trustPoints && trustPoints.length > 0 ? (
              <ul className="mt-8 grid gap-2.5">
                {trustPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-[13.5px] text-white/70">
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full"
                      style={{ background: "rgba(176,241,34,0.16)" }}
                    >
                      <Check className="size-2.5 text-[var(--color-brand-accent)]" strokeWidth={3} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {aside ? <div className="lg:sticky lg:top-24">{aside}</div> : null}
        </div>
      </div>
    </section>
  );
}

function ToolTableBlock({
  table,
  rowTones,
  dark,
}: {
  table: ToolTableCopy;
  rowTones?: ToneKey[];
  dark: boolean;
}) {
  return (
    <figure className="mt-8">
      <div
        className="overflow-x-auto rounded-2xl border"
        style={{
          borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(29,75,54,0.12)",
          background: dark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
        }}
      >
        <table className="w-full min-w-[520px] border-collapse text-left">
          <caption className="sr-only">{table.caption}</caption>
          <thead>
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.16em]"
                  style={{
                    color: dark ? "rgba(255,255,255,0.55)" : "var(--color-text-muted)",
                    borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(29,75,54,0.10)"}`,
                  }}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((cells, rowIndex) => {
              const palette = TONE[rowTones?.[rowIndex] ?? "muted"];
              return (
                <tr key={cells.join("|")}>
                  {cells.map((cell, index) => (
                    <td
                      key={`${cell}-${index}`}
                      className={`px-4 py-3.5 text-[14px] leading-snug ${index === 0 ? "font-bold" : ""}`}
                      style={{
                        color: dark ? "rgba(255,255,255,0.82)" : "var(--color-text-body)",
                        borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(29,75,54,0.07)"}`,
                      }}
                    >
                      {index === 0 ? (
                        <span className="flex items-center gap-2.5">
                          <span
                            aria-hidden
                            className="inline-block size-2 shrink-0 rounded-full"
                            style={{ background: palette.dot }}
                          />
                          {cell}
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {table.footnote ? (
        <figcaption
          className="mt-3 text-[12.5px] leading-relaxed"
          style={{ color: dark ? "rgba(255,255,255,0.5)" : "var(--color-text-muted)" }}
        >
          {table.footnote}
        </figcaption>
      ) : null}
    </figure>
  );
}

function ToolSectionBlock({
  section,
  id,
  theme,
  rowTones,
  index,
}: {
  section: ToolSectionCopy;
  id: string;
  theme: "ivory" | "forest";
  rowTones?: ToneKey[];
  index: number;
}) {
  const dark = theme === "forest";
  return (
    <section
      id={id}
      className={
        dark
          ? "gh2-section-forest gh-medical-pattern gh-medical-pattern-dark relative overflow-hidden"
          : "gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel relative overflow-hidden"
      }
      style={{ padding: "clamp(56px,7vw,96px) 0" }}
    >
      <SectionSeam theme={dark ? "dark" : "light"} />
      <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div className="max-w-[70ch]">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: dark ? "var(--color-brand-accent)" : "var(--color-text-muted)" }}
          >
            {String(index + 1).padStart(2, "0")}
          </p>
          <h2
            className="mt-4 font-extrabold tracking-[-0.03em]"
            style={{
              fontSize: "clamp(1.5rem, 2.4vw + 0.5rem, 2.25rem)",
              lineHeight: 1.1,
              color: dark ? "#FFFFFF" : "var(--color-brand-primary)",
            }}
          >
            {section.heading}
          </h2>

          {section.body.map((paragraph) => (
            <p
              key={paragraph.slice(0, 40)}
              className="mt-5 leading-relaxed"
              style={{
                fontSize: "var(--text-body-lg)",
                color: dark ? "rgba(255,255,255,0.68)" : "var(--color-text-body, #2D3B36)",
              }}
            >
              {paragraph}
            </p>
          ))}

          {section.bullets.length > 0 ? (
            <ul className="mt-6 grid gap-3">
              {section.bullets.map((bullet) => (
                <li
                  key={bullet.slice(0, 40)}
                  className="flex items-start gap-3 leading-relaxed"
                  style={{
                    fontSize: "15.5px",
                    color: dark ? "rgba(255,255,255,0.72)" : "var(--color-text-body, #2D3B36)",
                  }}
                >
                  <span
                    aria-hidden
                    className="mt-[9px] inline-block size-1.5 shrink-0 rounded-full"
                    style={{ background: dark ? "var(--color-brand-accent)" : "var(--color-brand-primary)" }}
                  />
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {section.table ? (
          <div className="max-w-[860px]">
            <ToolTableBlock table={section.table} rowTones={rowTones} dark={dark} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CtaBand({ copy, href }: { copy: ToolCopy["cta"]; href: string }) {
  return (
    <section
      className="gh2-section-forest gh-medical-pattern gh-medical-pattern-dark relative overflow-hidden"
      style={{ padding: "clamp(56px,7vw,88px) 0" }}
    >
      <SectionSeam theme="dark" />
      <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h2
              className="max-w-[22ch] font-extrabold leading-[1.05] tracking-[-0.03em] text-white"
              style={{ fontSize: "clamp(1.6rem, 2.6vw + 0.5rem, 2.5rem)" }}
            >
              {copy.heading}
            </h2>
            <p className="mt-4 max-w-[52ch] leading-relaxed text-white/60">{copy.body}</p>
          </div>
          <Link href={href} className="gh2-btn-lime gh-focus-on-dark lg:justify-self-end">
            {copy.label}
            <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * One nudge per BMI band, resolved on the server: which of this market's
 * services to point at, and the line that goes with it. Precomputed so the
 * client widget only has to look up its current band.
 *
 * `underweight` never gets a weight or nutrition upsell — see
 * `service-suggestions.ts`.
 */
function buildBandNudges(
  suggestions: ServiceSuggestion[],
  copy: ToolsSuggestionsCopy,
): Record<BmiBandKey, { text: string; label: string; href: string } | null> {
  const line: Record<BmiBandKey, string> = {
    underweight: copy.nudgeUnderweight,
    healthy: copy.nudgeHealthy,
    overweight: copy.nudgeOverweight,
    "obese-1": copy.nudgeObese,
    "obese-2": copy.nudgeObese,
    "obese-3": copy.nudgeObese,
  };
  const bands: BmiBandKey[] = [
    "underweight",
    "healthy",
    "overweight",
    "obese-1",
    "obese-2",
    "obese-3",
  ];
  const out = {} as Record<BmiBandKey, { text: string; label: string; href: string } | null>;
  for (const band of bands) {
    const match = suggestionForBand(band, suggestions);
    out[band] = match
      ? {
          text: line[band],
          label: match.slot === "gp" ? copy.gpTitle : match.title,
          href: match.href,
        }
      : null;
  }
  return out;
}

function SuggestionsSection({
  suggestions,
  copy,
}: {
  suggestions: ServiceSuggestion[];
  copy: ToolsSuggestionsCopy;
}) {
  if (suggestions.length === 0) return null;
  return (
    <section
      className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel relative overflow-hidden"
      style={{ padding: "clamp(56px,7vw,96px) 0" }}
    >
      <SectionSeam theme="light" />
      <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <h2
          className="font-extrabold tracking-[-0.03em]"
          style={{ fontSize: "clamp(1.5rem, 2.4vw + 0.5rem, 2.25rem)", color: "var(--color-brand-primary)" }}
        >
          {copy.heading}
        </h2>
        <p
          className="mt-4 max-w-[62ch] leading-relaxed"
          style={{ fontSize: "var(--text-body-lg)", color: "var(--color-text-body, #2D3B36)" }}
        >
          {copy.intro}
        </p>

        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((suggestion) => (
            <Link
              key={suggestion.href}
              href={suggestion.href}
              className="gh2-card-ivory gh2-card-hover group flex flex-col justify-between gap-6 p-6"
            >
              <div>
                <h3
                  className="text-[17px] font-extrabold leading-snug tracking-[-0.02em]"
                  style={{ color: "var(--color-brand-primary)" }}
                >
                  {suggestion.slot === "gp" ? copy.gpTitle : suggestion.title}
                </h3>
                <p
                  className="mt-2.5 text-[14px] leading-relaxed"
                  style={{ color: "var(--color-text-body)" }}
                >
                  {suggestion.slot === "gp" ? copy.gpSummary : (suggestion.summary ?? copy.gpSummary)}
                </p>
              </div>
              <span
                className="inline-flex items-center gap-1.5 text-[13px] font-bold"
                style={{ color: "var(--color-brand-primary)" }}
              >
                {copy.viewLabel}
                <ArrowUpRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2}
                  aria-hidden
                />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- detail page */

export function ToolPage({
  slug,
  ctx,
  suggestions,
}: {
  slug: string;
  ctx: ToolCtx;
  /** This market's live weight / nutrition / GP services, resolved server-side. */
  suggestions: ServiceSuggestion[];
}) {
  const meta = getToolMeta(slug);
  const bundle: ToolsBundle = getToolsCopy(ctx.lang);
  const languageCopy = bundle.tools[slug];
  if (!meta || !languageCopy) return null;
  // Brazil overrides the shared `pt` copy with Brazilian Portuguese; every
  // other market falls through unchanged. See `market-copy.ts`.
  const copy = applyMarketToolCopy(ctx.code, ctx.lang, languageCopy);
  const bands = applyMarketBands(ctx.code, ctx.lang, bundle.bands);

  const url = toolPath(ctx, slug);
  // `{country}` stands alone in the H1 trail — never after a preposition, since
  // cs/pt decline there and `countryLabel` is nominative only.
  const h1Trail = fillPlaceholders(copy.h1Trail, { country: ctx.countryLabel });
  // Shared language FAQ + this market's own entries (HSE, SNS, SUS…). Both the
  // rendered accordion and the FAQPage schema use the combined list, so they
  // can never disagree.
  const faq = [...copy.faq, ...getMarketFaq(ctx.code, ctx.lang)];

  return (
    <>
      <JsonLd
        data={[
          healthToolJsonLd({
            name: [copy.h1Lead, copy.h1Accent, h1Trail].filter(Boolean).join(" "),
            description: copy.metaDescription,
            url,
          }),
          faqJsonLd(faq),
          breadcrumbJsonLd([
            { name: ctx.countryLabel, url: base(ctx) },
            { name: copy.cardTitle, url },
          ]),
        ]}
      />

      <ToolHero
        eyebrow={copy.eyebrow}
        titleLead={copy.h1Lead}
        titleAccent={copy.h1Accent}
        titleTrail={h1Trail || undefined}
        lede={copy.lede}
        trustPoints={copy.trustPoints}
        breadcrumbs={[
          { name: ctx.countryLabel, href: base(ctx) },
          { name: copy.cardTitle },
        ]}
        aside={
          <ToolWidget
            kind={meta.widget}
            copy={{
              ui: bundle.ui,
              bands,
              widget: copy.widget,
              formatLocale: ctx.formatLocale,
            }}
            nudges={buildBandNudges(suggestions, bundle.suggestions)}
          />
        }
      />

      {copy.sections.map((section, index) => {
        const sectionMeta = meta.sections[index];
        if (!sectionMeta) return null;
        return (
          <ToolSectionBlock
            key={sectionMeta.id}
            id={sectionMeta.id}
            theme={sectionMeta.theme}
            rowTones={sectionMeta.rowTones}
            section={section}
            index={index}
          />
        );
      })}

      <SuggestionsSection suggestions={suggestions} copy={bundle.suggestions} />

      {/* Related-tools strip goes here once a second tool ships — see
          `registry.ts`. With one tool it would link only to itself. */}

      <FAQSection
        theme="light"
        eyebrow={bundle.ui.questionsEyebrow}
        title={`${copy.cardTitle} — ${bundle.ui.faqSuffix}`}
        items={faq}
      />

      <CtaBand copy={copy.cta} href={`${base(ctx)}${meta.ctaPath}`} />
    </>
  );
}
