import { htmlToPdfBuffer } from "../generated-documents/html-document-renderer.js";
import { pdfLogoDataUrl } from "../../lib/pdf/brand.js";
import type { CardCopy, MembershipCardContent } from "./membership-card-content.js";

/**
 * The membership card as a PDF (§24.3).
 *
 * Goes through the existing document pipeline — `htmlToPdfBuffer`, the same
 * Chromium the `GeneratedDocument` templates render through. That helper is A4
 * at zero margin and takes no options, so the card is **centred on an A4 page**
 * rather than the helper being widened for one caller: it is a page a member
 * prints, and a shared renderer is the wrong thing to parameterise for a single
 * consumer.
 *
 * NOT stored as a `GeneratedDocument` row (§24.3) — it is reproducible from the
 * enrollment at any time, and a stored copy would go stale the moment a level's
 * colour or name changed.
 *
 * Chrome here is deliberately a close cousin of `.gh-member-card` rather than a
 * copy of it: §24.3 accepts chrome differing between renderers. What must NOT
 * differ is what the card says, and that all arrives pre-formatted in
 * `MembershipCardContent`.
 */

/** The default face, when no `cardBackgroundHex` is set (§24.2). */
const DEFAULT_FACE = {
  background:
    "radial-gradient(circle at 84% 5%, rgba(168,255,24,0.14), transparent 34%)," +
    "radial-gradient(circle at 12% 100%, rgba(44,124,83,0.30), transparent 38%)," +
    "linear-gradient(135deg, #021b14 0%, #052c21 54%, #02150f 100%)",
  foreground: "#F7FAEF",
  chrome: "#A8FF18",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderMembershipCardHtml(
  content: MembershipCardContent,
  copy: CardCopy,
  statusText: string,
): string {
  const palette = content.palette;
  const face = palette
    ? { background: palette.background, foreground: palette.foreground, chrome: palette.chrome }
    : DEFAULT_FACE;
  const muted = palette ? palette.muted : "rgba(247,250,239,0.8)";

  const countries = content.countryCodes.join(" · ");
  const familyLine =
    content.memberType === "DEPENDENT" && content.primaryMembershipId
      ? `<p class="family">${escapeHtml(
          copy.familyOf.replace("{membershipId}", content.primaryMembershipId),
        )}</p>`
      : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(content.membershipId)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    /* Centred on the page, because the helper only makes A4 (§24.3). */
    display: flex; align-items: center; justify-content: center;
    width: 210mm; height: 297mm;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    background: #ffffff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .card {
    position: relative; overflow: hidden;
    width: 150mm; height: 94.6mm; /* ISO/IEC 7810 ID-1 ratio, 1.586:1 */
    padding: 9mm 10mm;
    display: flex; flex-direction: column; justify-content: space-between; gap: 5mm;
    border-radius: 5mm;
    border: 0.4mm solid ${face.chrome};
    background: ${face.background};
    color: ${face.foreground};
  }
  .top { display: flex; align-items: flex-start; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 3mm; }
  .brand img { width: 9mm; height: 9mm; object-fit: contain; }
  .brand-name { font-size: 11pt; font-weight: 700; letter-spacing: 0.14em; margin: 0; }
  .motto { margin: 1.5mm 0 0; font-size: 7.5pt; letter-spacing: 0.08em; color: ${muted}; }
  .pill {
    display: inline-flex; align-items: center; gap: 2mm;
    padding: 1.6mm 4mm; border-radius: 999px;
    border: 0.25mm solid ${face.chrome};
    font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  }
  .dot { width: 2mm; height: 2mm; border-radius: 50%; background: ${face.chrome}; }
  .plan { margin: 0; font-size: 19pt; font-weight: 700; letter-spacing: -0.01em; }
  .level { margin: 1mm 0 0; font-size: 9.5pt; color: ${muted}; }
  .rule { height: 0.35mm; background: ${face.chrome}; opacity: 0.5; margin: 4mm 0; }
  .label {
    font-size: 7pt; font-weight: 650; letter-spacing: 0.06em;
    text-transform: uppercase; color: ${muted}; margin: 0 0 1mm;
  }
  .value { margin: 0; font-size: 11.5pt; font-weight: 700; letter-spacing: 0.02em; }
  .slots { display: flex; gap: 12mm; }
  .foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 6mm; }
  .countries { font-size: 10pt; font-weight: 700; letter-spacing: 0.1em; }
  .family { margin: 1.5mm 0 0; font-size: 7.5pt; color: ${muted}; }
  .id { font-family: "Courier New", monospace; }
</style></head>
<body>
  <div class="card">
    <div class="top">
      <div>
        <div class="brand">
          <img src="${pdfLogoDataUrl()}" alt="">
          <p class="brand-name">GLOBAL HEALTH</p>
        </div>
        <p class="motto">${escapeHtml(copy.motto)}</p>
      </div>
      <span class="pill"><span class="dot"></span>${escapeHtml(statusText)}</span>
    </div>

    <div>
      <p class="plan">${escapeHtml(content.planName)}</p>
      <p class="level">${escapeHtml(content.levelName)}</p>
      <div class="rule"></div>
      <p class="label">${escapeHtml(copy.labelCardholder)}</p>
      <p class="value">${escapeHtml(content.holderName)}</p>
    </div>

    <div>
      <div class="slots">
        <div>
          <p class="label">${escapeHtml(copy.labelMemberId)}</p>
          <p class="value id">${escapeHtml(content.membershipId)}</p>
        </div>
        <div>
          <p class="label">${escapeHtml(copy.labelValidThrough)}</p>
          <p class="value">${escapeHtml(content.validThrough)}</p>
        </div>
      </div>
      ${familyLine}
      <div class="rule"></div>
      <div class="foot">
        <div>
          <p class="label">${escapeHtml(copy.labelCoveredIn)}</p>
          <p class="countries">${escapeHtml(countries)}</p>
        </div>
      </div>
    </div>
  </div>
</body></html>`;
}

export async function renderMembershipCardPdf(
  content: MembershipCardContent,
  copy: CardCopy,
  statusText: string,
): Promise<Buffer> {
  return htmlToPdfBuffer(renderMembershipCardHtml(content, copy, statusText));
}

/** `membership-card-GH-MEMB-ABC12345.pdf` — safe on every filesystem. */
export function membershipCardFilename(membershipId: string): string {
  return `membership-card-${membershipId.replace(/[^A-Za-z0-9._-]/g, "-")}.pdf`;
}
