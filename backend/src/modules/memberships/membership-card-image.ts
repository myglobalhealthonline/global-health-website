import fs from "node:fs";
import path from "node:path";
import { htmlElementToPngBuffer } from "../generated-documents/html-document-renderer.js";
import type { CardCopy, MembershipCardContent } from "./membership-card-content.js";

/**
 * The membership card as a PNG — the SAME face the member sees on the site.
 *
 * An image, not a PDF: members save this to a wallet app, a photo roll or a
 * chat thread, and none of those take an A4 page with a card floating in the
 * middle of it.
 *
 * **The chrome is not re-authored here.** This file builds the markup of
 * `MembershipCard.tsx` and styles it with `assets/member-card.css`, which is
 * copied verbatim out of `frontend/app/portal.css` by
 * `scripts/build-member-card-css.mjs`. The two services deploy standalone, so a
 * generated copy is how one authored design reaches both; the copy is checked
 * in and CI runs the script with `--check`. Edit the card in portal.css.
 *
 * The old renderer was a hand-written cousin of the web card, which is exactly
 * how the downloadable card ended up looking like a different product.
 *
 * NOT stored as a `GeneratedDocument` row (§24.3) — it is reproducible from the
 * enrollment at any time, and a stored copy would go stale the moment a level's
 * colour or name changed.
 */

/** Wide enough that the 3x crop lands ~1680px, small enough to stay one card. */
const CARD_WIDTH_PX = 560;

/** The site's own stack (globals.css `--font-manrope`) plus the portal token
 *  the card block references. Everything else it needs is in the copied CSS. */
const PAGE_TOKENS = `
  /* The subset of Tailwind's preflight the card depends on. Without it the UA
     stylesheet's heading/paragraph margins push the content past the card's
     fixed aspect ratio and the footer is cropped. */
  *, *::before, *::after { box-sizing: border-box; }
  h1, h2, h3, p, figure { margin: 0; }
  h1, h2, h3 { font-size: inherit; font-weight: inherit; }
  img, svg { display: block; }
  :root { --portal-signal: #b0f122; }
  body {
    margin: 0;
    width: ${CARD_WIDTH_PX}px;
    background: transparent;
    font-family: "Aptos", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
`;

let cachedCss: string | null = null;

function cardCss(): string {
  if (cachedCss === null) {
    cachedCss = fs.readFileSync(path.join(process.cwd(), "assets", "member-card.css"), "utf8");
  }
  return cachedCss;
}

let cachedMark: string | null = null;

/** The globe mark alone — the same file the web card loads from /logos. */
function markDataUrl(): string {
  if (cachedMark === null) {
    const file = path.join(process.cwd(), "assets", "brand", "global-health-mark.png");
    try {
      cachedMark = `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
    } catch {
      cachedMark = "";
    }
  }
  return cachedMark;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Same rule as `MembershipCard.tsx`: anything not live renders drained. */
const LIVE = new Set(["ACTIVE", "TRIALING"]);

export function renderMembershipCardHtml(
  content: MembershipCardContent,
  copy: CardCopy,
  statusText: string,
): string {
  const live = LIVE.has(content.status.toUpperCase());
  const palette = content.palette;

  // `data-tinted` + the four variables, exactly as the component sets them —
  // the copied CSS repaints its own chrome from these (§24.2).
  const tint = palette
    ? ` data-tinted style="--gh-card-bg:${palette.background};--gh-card-fg:${palette.foreground};` +
      `--gh-card-muted:${palette.muted};--gh-card-chrome:${palette.chrome}"`
    : "";

  const footnote =
    content.memberType === "DEPENDENT" && content.primaryMembershipId
      ? `<p class="gh-member-card__footnote">${escapeHtml(
          copy.familyOf.replace("{membershipId}", content.primaryMembershipId),
        )}</p>`
      : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(content.membershipId)}</title>
<style>${PAGE_TOKENS}${cardCss()}</style></head>
<body>
<article class="gh-member-card${live ? "" : " gh-member-card--dim"}"${tint}>
  <span aria-hidden="true" class="gh-member-card__ring"></span>
  <div class="gh-member-card__inner">
    <header class="gh-member-card__top">
      <div>
        <div class="gh-member-card__lock">
          <img src="${markDataUrl()}" alt="" class="gh-member-card__mark" width="180" height="182">
          <p class="gh-member-card__brand">GLOBAL HEALTH</p>
        </div>
        <p class="gh-member-card__motto">${escapeHtml(copy.motto)}</p>
      </div>
      <span class="gh-member-card__pill gh-member-card__pill--${live ? "live" : "muted"}">
        <span aria-hidden="true" class="gh-member-card__dot"></span>
        <span class="gh-member-card__pill-text">${escapeHtml(statusText)}</span>
      </span>
    </header>

    <h2 class="gh-member-card__plan">${escapeHtml(content.planName)}</h2>

    <div aria-hidden="true" class="gh-member-card__pulse">
      <svg viewBox="0 0 96 40" fill="none" preserveAspectRatio="xMaxYMid meet">
        <path
          d="M0 20H18q3-6 6 0h6l4 8 5-21 5 30 4-17h5q5-10 10 0h33"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
      </svg>
    </div>

    <div class="gh-member-card__holder">
      <div class="gh-member-card__label">${escapeHtml(copy.labelCardholder)}</div>
      <strong class="gh-member-card__name">${escapeHtml(content.holderName)}</strong>
    </div>

    <div class="gh-member-card__slots">
      <div>
        <div class="gh-member-card__label">${escapeHtml(copy.labelMemberId)}</div>
        <strong class="gh-member-card__value">${escapeHtml(content.membershipId)}</strong>
      </div>
      <span aria-hidden="true" class="gh-member-card__sep"></span>
      <div>
        <div class="gh-member-card__label">${escapeHtml(copy.labelValidThrough)}</div>
        <strong class="gh-member-card__value">${escapeHtml(content.validThrough)}</strong>
      </div>
    </div>

    ${footnote}

    <footer class="gh-member-card__foot">
      <span class="gh-member-card__country">${escapeHtml(content.countryCodes.join(" · "))}</span>
      <span class="gh-member-card__marks">
        <span aria-hidden="true" class="gh-member-card__care"></span>
      </span>
    </footer>
  </div>
</article>
</body></html>`;
}

export async function renderMembershipCardPng(
  content: MembershipCardContent,
  copy: CardCopy,
  statusText: string,
): Promise<Buffer> {
  return htmlElementToPngBuffer(
    renderMembershipCardHtml(content, copy, statusText),
    ".gh-member-card",
  );
}

/** `membership-card-GH-MEMB-ABC12345.png` — safe on every filesystem. */
export function membershipCardFilename(membershipId: string): string {
  return `membership-card-${membershipId.replace(/[^A-Za-z0-9._-]/g, "-")}.png`;
}
