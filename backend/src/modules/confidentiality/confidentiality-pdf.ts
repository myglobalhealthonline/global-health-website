import {
  PDF_TOKENS as T,
  PDF_SANS,
  PDF_SERIF,
  pdfLogoDataUrl,
  pdfEcgRule,
} from "../../lib/pdf/brand.js";
import { htmlToPdfBuffer } from "../generated-documents/html-document-renderer.js";
import { CURRENT_AGREEMENT_TEXT, CURRENT_AGREEMENT_VERSION } from "./confidentiality.service.js";

/**
 * Printable, hand-signable copy of the doctor confidentiality agreement,
 * rendered in the Global Health PDF design language (Variant K tokens from
 * `lib/pdf/brand.ts` — same spine / masthead / ECG rule as the invoice).
 *
 * The clause text is the single source of truth in `confidentiality.service.ts`
 * (CURRENT_AGREEMENT_TEXT) — this module only lays it out, so the printed and
 * on-screen wording can never drift.
 */

export type ConfidentialityPdfDoctor = {
  fullName: string;
  title: string | null;
  countryName: string | null;
  email: string | null;
};

export type ConfidentialityPdfInput = {
  doctor: ConfidentialityPdfDoctor;
  /** Portal acceptance already on file, if any — printed as an evidence note. */
  acceptedAt: Date | null;
  acceptedVersion: string | null;
  /** Render date shown in the masthead. */
  issuedAt: Date;
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

type Block =
  | { kind: "intro"; text: string }
  | { kind: "clause"; number: string; heading: string; body: string };

/**
 * Split CURRENT_AGREEMENT_TEXT into its layout blocks.
 *
 * The first paragraph is the document's own title line (the PDF prints its
 * own masthead instead), and the trailing "By accepting…" line is replaced by
 * the signature declaration — both are dropped here.
 */
export function parseAgreementBlocks(text: string): Block[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks: Block[] = [];
  for (const [index, paragraph] of paragraphs.entries()) {
    if (index === 0 && /confidentiality/i.test(paragraph) && /\(v\d/i.test(paragraph)) {
      continue; // title line — the masthead covers it
    }
    if (/^by accepting/i.test(paragraph)) {
      continue; // replaced by the signature declaration
    }
    const clause = /^(\d+)\.\s+([^.]+)\.\s*([\s\S]*)$/.exec(paragraph);
    if (clause) {
      blocks.push({
        kind: "clause",
        number: clause[1],
        heading: clause[2].trim(),
        body: clause[3].trim(),
      });
      continue;
    }
    blocks.push({ kind: "intro", text: paragraph });
  }
  return blocks;
}

export function buildConfidentialityAgreementHtml(input: ConfidentialityPdfInput): string {
  const logo = pdfLogoDataUrl();
  const blocks = parseAgreementBlocks(CURRENT_AGREEMENT_TEXT);
  const intro = blocks
    .filter((b): b is Extract<Block, { kind: "intro" }> => b.kind === "intro")
    .map((b) => `<p class="intro">${esc(b.text)}</p>`)
    .join("");
  const clauses = blocks
    .filter((b): b is Extract<Block, { kind: "clause" }> => b.kind === "clause")
    .map(
      (c) => `
      <li class="clause">
        <span class="cnum">${esc(c.number.padStart(2, "0"))}</span>
        <div class="cbody">
          <h2 class="chead">${esc(c.heading)}</h2>
          <p class="ctext">${esc(c.body)}</p>
        </div>
      </li>`,
    )
    .join("");

  const acceptedNote =
    input.acceptedAt && input.acceptedVersion
      ? `<div class="evidence">
           <span class="caps">Portal acceptance on file</span>
           <p>Accepted electronically in the Global Health doctor portal on
             ${esc(fmtDate(input.acceptedAt))} (version ${esc(input.acceptedVersion)}).
             This signed copy supplements — it does not replace — that record.</p>
         </div>`
      : `<div class="evidence pending">
           <span class="caps">Portal acceptance</span>
           <p>Not yet recorded. Accept the agreement in the Global Health doctor
             portal as well as returning this signed copy.</p>
         </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Confidentiality Agreement — ${esc(input.doctor.fullName)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${PDF_SANS}; font-size: 9.5pt; line-height: 1.55; color: ${T.ink};
    background: ${T.paper}; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 210mm; }

  /* Fixed chrome — Chromium repeats fixed elements on every printed page. */
  .spine { position: fixed; left: 0; top: 0; bottom: 0; width: 7mm; background: ${T.night}; }
  .spine-caption { position: fixed; left: 0; top: 0; width: 7mm; height: 297mm;
    display: flex; align-items: flex-end; justify-content: center; padding-bottom: 12mm; }
  .spine-caption span { writing-mode: vertical-rl; transform: rotate(180deg);
    font-size: 6pt; font-weight: 600; letter-spacing: 0.42em; text-transform: uppercase;
    color: rgba(242, 245, 236, 0.75); }
  .foot { position: fixed; left: 24mm; right: 16mm; bottom: 9mm; }
  .foot-rule { border-top: 0.4pt solid ${T.hairline}; margin-bottom: 2.4mm; }
  .fb { display: flex; justify-content: space-between; font-size: 6.8pt; }
  .fb .b { font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.forest}; }
  .fb .t { color: ${T.faint}; font-family: ${PDF_SERIF}; font-style: italic; font-size: 8pt; }

  .page { padding: 13mm 16mm 22mm 24mm; }
  .caps { font-size: 6.6pt; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.faint}; }

  .topline { display: flex; justify-content: space-between; align-items: center;
    border-bottom: 0.5pt solid ${T.hairlineDark}; padding-bottom: 3.6mm; }
  .topline .caps { color: ${T.forest}; }
  .logo { height: 17mm; width: auto; }
  .logo-text { font-size: 13pt; font-weight: 700; color: ${T.forest}; letter-spacing: 0.04em; }

  .masthead { margin-top: 9mm; }
  .mast-title { font-family: ${PDF_SERIF}; font-style: italic; font-size: 34pt; line-height: 1.04;
    color: ${T.night}; letter-spacing: -0.015em; }
  .mast-sub { margin-top: 3.6mm; display: flex; align-items: baseline; gap: 6mm; flex-wrap: wrap; }
  .mast-no { font-size: 9pt; font-weight: 700; letter-spacing: 0.2em; color: ${T.forest}; }
  .mast-issued { font-size: 8.6pt; color: ${T.muted}; }
  .mast-status { font-size: 7pt; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase;
    color: ${T.night}; border-bottom: 1.6pt solid ${T.lime}; padding-bottom: 0.8mm; }
  .ecg { margin-top: 6mm; }

  .parties { display: flex; gap: 11mm; margin-top: 8mm; }
  .party { flex: 1; min-width: 0; }
  .party .caps { display: block; margin-bottom: 2mm; }
  .party .n { font-family: ${PDF_SERIF}; font-size: 12pt; color: ${T.night}; }
  .party .l { font-size: 8.6pt; color: ${T.muted}; margin-top: 0.9mm; }

  .intro { margin-top: 8mm; font-size: 9.5pt; color: ${T.muted}; }

  .clauses { list-style: none; margin-top: 7mm; }
  .clause { display: flex; gap: 6mm; padding: 4.4mm 0; border-bottom: 0.4pt solid ${T.hairline};
    break-inside: avoid; }
  .cnum { flex: 0 0 10mm; font-size: 8pt; font-weight: 700; letter-spacing: 0.14em;
    color: ${T.faint}; font-variant-numeric: tabular-nums; padding-top: 1.2mm; }
  .cbody { flex: 1; min-width: 0; }
  .chead { font-family: ${PDF_SERIF}; font-size: 11.5pt; font-weight: 400; color: ${T.night};
    border-left: 1.6pt solid ${T.lime}; padding-left: 3mm; margin-left: -3mm; }
  .ctext { margin-top: 1.6mm; font-size: 9.2pt; color: ${T.muted}; }

  .evidence { margin-top: 7mm; background: ${T.ivory}; border-left: 1.6pt solid ${T.forest};
    padding: 4mm 5mm; break-inside: avoid; }
  .evidence .caps { color: ${T.forest}; }
  .evidence p { margin-top: 1.6mm; font-size: 8.4pt; color: ${T.muted}; }
  .evidence.pending { border-left-color: ${T.hairlineDark}; }

  .sign { margin-top: 9mm; break-inside: avoid; }
  .sign-title { font-size: 6.6pt; font-weight: 600; letter-spacing: 0.28em;
    text-transform: uppercase; color: ${T.forest}; border-bottom: 1pt solid ${T.night};
    padding-bottom: 2.4mm; }
  .declare { margin-top: 4.4mm; font-family: ${PDF_SERIF}; font-size: 10.5pt; color: ${T.night}; }
  .sign-grid { display: flex; gap: 10mm; margin-top: 11mm; }
  .sig { flex: 1; min-width: 0; }
  .sig .rule { border-bottom: 0.6pt solid ${T.hairlineDark}; height: 12mm; }
  .sig .lbl { margin-top: 2mm; font-size: 6.6pt; font-weight: 600; letter-spacing: 0.28em;
    text-transform: uppercase; color: ${T.faint}; }
  .sig .pre { font-size: 8.6pt; color: ${T.muted}; padding-bottom: 1.2mm; }
  .sign-note { margin-top: 7mm; font-size: 7.4pt; color: ${T.faint}; line-height: 1.7; }
</style>
</head>
<body>
<div class="spine"></div>
<div class="spine-caption"><span>Global Health</span></div>

<div class="page">

  <div class="topline">
    ${logo ? `<img class="logo" src="${logo}" alt="Global Health" />` : `<span class="logo-text">Global Health</span>`}
    <span class="caps">Compliance Document — Clinician Confidentiality</span>
  </div>

  <div class="masthead">
    <div class="mast-title">Confidentiality &amp;<br />Data Protection Agreement</div>
    <div class="mast-sub">
      <span class="mast-no">VERSION ${esc(CURRENT_AGREEMENT_VERSION)}</span>
      <span class="mast-issued">Issued ${esc(fmtDate(input.issuedAt))}</span>
      <span class="mast-status">For signature</span>
    </div>
    <div class="ecg">${pdfEcgRule()}</div>
  </div>

  <div class="parties">
    <div class="party">
      <span class="caps">Clinician</span>
      <div class="n">${esc(input.doctor.fullName)}</div>
      ${input.doctor.title ? `<div class="l">${esc(input.doctor.title)}</div>` : ""}
      ${input.doctor.countryName ? `<div class="l">${esc(input.doctor.countryName)}</div>` : ""}
      ${input.doctor.email ? `<div class="l">${esc(input.doctor.email)}</div>` : ""}
    </div>
    <div class="party">
      <span class="caps">Platform</span>
      <div class="n">Global Health</div>
      <div class="l">Global Health Network</div>
      <div class="l">globalhealth@myglobalhealth.online</div>
      <div class="l">myglobalhealth.online</div>
    </div>
  </div>

  ${intro}

  <ol class="clauses">${clauses}</ol>

  ${acceptedNote}

  <div class="sign">
    <div class="sign-title">Declaration &amp; signature</div>
    <p class="declare">I confirm that I have read, understood, and agree to be bound by this
      Confidentiality &amp; Data Protection Agreement (version ${esc(CURRENT_AGREEMENT_VERSION)}).</p>

    <div class="sign-grid">
      <div class="sig">
        <div class="rule"></div>
        <div class="lbl">Signature</div>
      </div>
      <div class="sig">
        <div class="rule"><span class="pre">${esc(input.doctor.fullName)}</span></div>
        <div class="lbl">Printed name</div>
      </div>
      <div class="sig">
        <div class="rule"></div>
        <div class="lbl">Date signed</div>
      </div>
    </div>

    <p class="sign-note">Print this document, sign it, then scan or photograph the signed copy and
      upload it in the Global Health doctor portal under Compliance → Confidentiality agreement.
      The uploaded copy is retained alongside your electronic acceptance and is visible to you and
      to Global Health administrators only.</p>
  </div>

</div>

<div class="foot">
  <div class="foot-rule"></div>
  <div class="fb"><span class="b">Global Health</span><span class="t">Confidentiality Agreement v${esc(CURRENT_AGREEMENT_VERSION)} — myglobalhealth.online</span></div>
</div>

</body>
</html>`;
}

export async function renderConfidentialityAgreementPdf(
  input: ConfidentialityPdfInput,
): Promise<Buffer> {
  return htmlToPdfBuffer(buildConfidentialityAgreementHtml(input));
}
