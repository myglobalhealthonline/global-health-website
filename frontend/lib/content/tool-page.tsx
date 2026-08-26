import Link from "next/link";
import { ArrowUpRight, Check, ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQSection } from "@/components/sections/FAQSection";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { ToolWidget } from "@/components/tools/ToolWidget";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { TONE_DARK } from "@/lib/tools/tone";
import {
  TOOLS,
  getToolMeta,
  getToolsCopy,
  type ToolCopy,
  type ToolMeta,
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
import { getCommonLocale } from "@/lib/i18n/get-common-locale";

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
              // items-START, not center: the panel is much taller than the
              // copy, and centring pushed the H1 far below the breadcrumb.
              ? "grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:gap-16"
              : ""
          }
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
              {eyebrow}
            </p>
            <h1
              className="mt-5 font-extrabold tracking-[-0.035em]"
              style={{
                lineHeight: 1.02,
                maxWidth: "15ch",
                fontSize: "clamp(2.25rem, 4.6vw + 0.6rem, 4.5rem)",
                color: "rgba(255,255,255,0.95)",
              }}
            >
              {titleLead} <span style={{ color: "var(--color-brand-accent)" }}>{titleAccent}</span>
              {titleTrail ? ` ${titleTrail}` : ""}
            </h1>
            <p
              className="mt-6 leading-relaxed"
              style={{
                maxWidth: "46ch",
                fontSize: "clamp(1.0625rem, 0.55vw + 0.9rem, 1.3125rem)",
                color: "rgba(255,255,255,0.66)",
              }}
            >
              {lede}
            </p>

            {trustPoints && trustPoints.length > 0 ? (
              <ul className="mt-10 grid max-w-[46ch] gap-3">
                {trustPoints.map((point) => (
                  <li
                    key={point}
                    className="gh-glass-emerald flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-[14.5px] leading-snug text-white/80"
                  >
                    <span
                      aria-hidden
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "rgba(176,241,34,0.14)" }}
                    >
                      <Check className="size-3.5 text-[var(--color-brand-accent)]" strokeWidth={3} />
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
  // The chart renders as forest glass on EVERY band, light or dark — it is an
  // instrument like the calculator chassis, not page furniture, and a dark
  // panel is where the red/amber/green scale reads best. Only the footnote,
  // which sits outside the panel, follows the section theme.
  const border = "rgba(255,255,255,0.12)";
  const rowBorder = "rgba(255,255,255,0.07)";
  const headText = "rgba(255,255,255,0.55)";
  const bodyText = "rgba(255,255,255,0.82)";
  const surface = "gh2-glass-forest gh2-dark-content";

  return (
    <figure className="mt-8">
      {/* Phones get stacked rows, not a 520px-wide table in a scroller. A
       *  horizontal scrollbar on a reference chart hides the very columns
       *  people came to read. One source of copy, two layouts. */}
      <div className="grid gap-3 sm:hidden">
        {table.rows.map((cells, rowIndex) => {
          const palette = TONE_DARK[rowTones?.[rowIndex] ?? "muted"];
          return (
            <div key={cells.join("|")} className={`${surface} rounded-2xl p-4`}>
              <p className="flex items-center gap-2.5 text-[15px] font-bold" style={{ color: bodyText }}>
                <span
                  aria-hidden
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{ background: palette.dot }}
                />
                {cells[0]}
              </p>
              <dl className="mt-3 grid gap-2">
                {table.columns.slice(1).map((column, index) => (
                  <div key={column} className="grid gap-0.5">
                    <dt
                      className="text-[10.5px] font-bold uppercase tracking-[0.16em]"
                      style={{ color: headText }}
                    >
                      {column}
                    </dt>
                    <dd className="text-[14px] leading-snug" style={{ color: bodyText }}>
                      {cells[index + 1]}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>

      <div className={`${surface} hidden overflow-x-auto rounded-2xl sm:block`}>
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{table.caption}</caption>
          <thead>
            <tr>
              {table.columns.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.16em]"
                  style={{
                    color: headText,
                    borderBottom: `1px solid ${border}`,
                    // First column's cells are indented by the tone dot (8px +
                    // 10px gap); without the same indent the header sat left of
                    // its own column.
                    paddingLeft: index === 0 ? "calc(1rem + 18px)" : undefined,
                  }}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((cells, rowIndex) => {
              const palette = TONE_DARK[rowTones?.[rowIndex] ?? "muted"];
              return (
                <tr key={cells.join("|")}>
                  {cells.map((cell, index) => (
                    <td
                      key={`${cell}-${index}`}
                      className={`px-4 py-3.5 text-[14px] leading-snug ${index === 0 ? "whitespace-nowrap font-bold" : ""}`}
                      style={{ color: bodyText, borderBottom: `1px solid ${rowBorder}` }}
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

/**
 * One tool, as a link card in the related strip at the foot of a tool page.
 */
function ToolLinkCard({
  href,
  title,
  blurb,
  label,
  dark,
}: {
  href: string;
  title: string;
  blurb: string;
  label: string;
  dark: boolean;
}) {
  return (
    <Link
      href={href}
      className={`${
        dark ? "gh2-glass-forest gh2-dark-content" : "gh2-card-ivory"
      } flex flex-col gap-3 rounded-2xl p-6 transition-transform hover:-translate-y-0.5`}
    >
      <h3
        className="font-extrabold tracking-[-0.02em]"
        style={{
          fontSize: "1.125rem",
          color: dark ? "#FFFFFF" : "var(--color-brand-primary)",
        }}
      >
        {title}
      </h3>
      <p
        className="text-[14px] leading-relaxed"
        style={{ color: dark ? "rgba(255,255,255,0.68)" : "var(--color-text-body, #2D3B36)" }}
      >
        {blurb}
      </p>
      <span
        className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[13px] font-bold"
        style={{ color: dark ? "var(--color-brand-accent)" : "var(--color-brand-primary)" }}
      >
        {label}
        <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
      </span>
    </Link>
  );
}

/**
 * The other calculators, at the foot of a tool page. An empty `related` list in
 * the registry means "every other tool", so shipping a new one cross-links it
 * from the existing pages without editing their entries.
 */
function RelatedToolsSection({
  ctx,
  slug,
  meta,
  bundle,
  theme,
}: {
  ctx: ToolCtx;
  slug: string;
  meta: ToolMeta;
  bundle: ToolsBundle;
  theme: "ivory" | "forest";
}) {
  const slugs =
    meta.related.length > 0
      ? meta.related
      : TOOLS.map((tool) => tool.slug).filter((other) => other !== slug);
  const items = slugs
    .map((other) => ({ slug: other, copy: bundle.tools[other] }))
    .filter((item): item is { slug: string; copy: ToolCopy } => Boolean(item.copy))
    // Brazil reads its own Portuguese here too, not Portugal's.
    .map((item) => ({
      slug: item.slug,
      copy: applyMarketToolCopy(ctx.code, ctx.lang, item.slug, item.copy),
    }));
  if (items.length === 0) return null;

  const dark = theme === "forest";
  return (
    <section
      className={
        dark
          ? "gh2-section-forest gh-medical-pattern gh-medical-pattern-dark relative overflow-hidden"
          : "gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel relative overflow-hidden"
      }
      style={{ padding: "clamp(48px,6vw,80px) 0" }}
    >
      <SectionSeam theme={dark ? "dark" : "light"} />
      <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <h2
          className="font-extrabold tracking-[-0.03em]"
          style={{
            fontSize: "clamp(1.4rem, 2vw + 0.5rem, 1.875rem)",
            color: dark ? "#FFFFFF" : "var(--color-brand-primary)",
          }}
        >
          {bundle.hub.relatedHeading}
        </h2>
        <div className="mt-8 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ToolLinkCard
              key={item.slug}
              href={toolPath(ctx, item.slug)}
              title={item.copy.cardTitle}
              blurb={item.copy.cardBlurb}
              label={bundle.hub.openLabel}
              dark={dark}
            />
          ))}
        </div>
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
          href: match.detailHref,
        }
      : null;
  }
  return out;
}

function SuggestionsSection({
  suggestions,
  copy,
  bookLabel,
}: {
  suggestions: ServiceSuggestion[];
  copy: ToolsSuggestionsCopy;
  /** Locale's "Book appointment" — same string the service pages pass. */
  bookLabel: string;
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

        <div className="mt-9 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((suggestion) => (
            <ServiceCard
              key={suggestion.detailHref}
              detailHref={suggestion.detailHref}
              bookHref={suggestion.bookHref}
              bookLabel={bookLabel}
              title={suggestion.slot === "gp" ? copy.gpTitle : suggestion.title}
              description={
                suggestion.slot === "gp"
                  ? copy.gpSummary
                  : (suggestion.summary ?? copy.gpSummary)
              }
              imageSrc={suggestion.imageSrc ?? undefined}
              duration={suggestion.duration}
              startingPrice={suggestion.startingPrice}
              ctaLabel={copy.viewLabel}
              dark
            />
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
  const copy = applyMarketToolCopy(ctx.code, ctx.lang, slug, languageCopy);
  const bands = applyMarketBands(ctx.code, ctx.lang, bundle.bands);
  // The shared suggestions intro names BMI, so any other tool supplies its own.
  const suggestionsCopy = copy.suggestionsIntro
    ? { ...bundle.suggestions, intro: copy.suggestionsIntro }
    : bundle.suggestions;

  const url = toolPath(ctx, slug);
  // `{country}` stands alone in the H1 trail — never after a preposition, since
  // cs/pt decline there and `countryLabel` is nominative only.
  const h1Trail = fillPlaceholders(copy.h1Trail, { country: ctx.countryLabel });
  // Shared language FAQ + this market's own entries (HSE, SNS, SUS…). Both the
  // rendered accordion and the FAQPage schema use the combined list, so they
  // can never disagree.
  const faq = [...copy.faq, ...getMarketFaq(ctx.code, ctx.lang, slug)];

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
            nudges={buildBandNudges(suggestions, suggestionsCopy)}
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

      <SuggestionsSection
        suggestions={suggestions}
        copy={suggestionsCopy}
        bookLabel={getCommonLocale(ctx.lang).doctors.bookAppointment}
      />

      {/* Keeps the ivory/forest alternation going whether or not this tool
          rendered a suggestions band (that one is always ivory). */}
      <RelatedToolsSection
        ctx={ctx}
        slug={slug}
        meta={meta}
        bundle={bundle}
        theme={
          (suggestions.length > 0
            ? "ivory"
            : meta.sections[meta.sections.length - 1]?.theme) === "ivory"
            ? "forest"
            : "ivory"
        }
      />

      <FAQSection
        theme="dark"
        eyebrow={bundle.ui.questionsEyebrow}
        title={`${copy.cardTitle}: ${bundle.ui.faqSuffix}`}
        items={faq}
      />

      <CtaBand copy={copy.cta} href={`${base(ctx)}${meta.ctaPath}`} />
    </>
  );
}
