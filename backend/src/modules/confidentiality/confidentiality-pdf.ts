import {
  PDF_TOKENS as T,
  PDF_SANS,
  PDF_SERIF,
  pdfLogoDataUrl,
  pdfEcgRule,
} from "../../lib/pdf/brand.js";
import { htmlToPdfBuffer } from "../generated-documents/html-document-renderer.js";
import {
  agreementContentFor,
  CONFIDENTIALITY_AGREEMENT_VERSION,
  type AgreementLocale,
} from "./confidentiality-agreement-content.js";

/**
 * Printable, hand-signable copy of the doctor confidentiality agreement,
 * rendered in the Global Health PDF design language (Variant K tokens from
 * `lib/pdf/brand.ts` — same spine / masthead / ECG rule as the invoice).
 *
 * The clause text AND the surrounding chrome labels come from
 * `confidentiality-agreement-content.ts` (one locale-keyed record) — this
 * module only lays them out, so the printed and on-screen wording can never
 * drift, and every language it lists renders correctly (no English-only
 * regex parsing of prose).
 */

export type ConfidentialityPdfDoctor = {
  fullName: string;
  title: string | null;
  countryName: string | null;
  email: string | null;
};

export type ConfidentialityPdfInput = {
  doctor: ConfidentialityPdfDoctor;
  /** Language to render the agreement in — the doctor's operating locale. */
  locale: AgreementLocale;
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

function fill(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

function fmtDate(date: Date, htmlLang: string): string {
  return new Intl.DateTimeFormat(htmlLang, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function buildConfidentialityAgreementHtml(input: ConfidentialityPdfInput): string {
  const logo = pdfLogoDataUrl();
  const content = agreementContentFor(input.locale);
  const l = content.labels;
  const version = CONFIDENTIALITY_AGREEMENT_VERSION;

  // S-028 (2026-08-02 Semgrep audit, javascript.express.security.injection.
  // raw-html-format): every interpolation below goes through esc(); this
  // renders to a server-side PDF via htmlToPdfBuffer and is never served as
  // navigable HTML. Triaged as a false positive — see the Phase 3 SAST report.
  const clauses = content.clauses
    .map(
      (clause, index) => `
      <li class="clause">
        <span class="cnum">${esc(String(index + 1).padStart(2, "0"))}</span>
        <div class="cbody">
          <h2 class="chead">${esc(clause.heading)}</h2>
          <p class="ctext">${esc(clause.body)}</p>
        </div>
      </li>`,
    )
    .join("");

  const acceptedNote =
    input.acceptedAt && input.acceptedVersion
      ? `<div class="evidence">
           <span class="caps">${esc(l.acceptanceOnFileCaps)}</span>
           <p>${esc(
             fill(l.acceptanceOnFileBody, {
               date: fmtDate(input.acceptedAt, l.htmlLang),
               version: input.acceptedVersion,
             }),
           )}</p>
         </div>`
      : `<div class="evidence pending">
           <span class="caps">${esc(l.acceptancePendingCaps)}</span>
           <p>${esc(l.acceptancePendingBody)}</p>
         </div>`;

  return `<!DOCTYPE html>
<html lang="${esc(l.htmlLang)}">
<head>
<meta charset="UTF-8">
<title>${esc(fill(l.docTitle, { name: input.doctor.fullName }))}</title>
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
    <span class="caps">${esc(l.topline)}</span>
  </div>

  <div class="masthead">
    <div class="mast-title">${esc(l.mastTitleLine1)}<br />${esc(l.mastTitleLine2)}</div>
    <div class="mast-sub">
      <span class="mast-no">${esc(l.versionCaps)} ${esc(version)}</span>
      <span class="mast-issued">${esc(l.issuedPrefix)} ${esc(fmtDate(input.issuedAt, l.htmlLang))}</span>
      <span class="mast-status">${esc(l.statusForSignature)}</span>
    </div>
    <div class="ecg">${pdfEcgRule()}</div>
  </div>

  <div class="parties">
    <div class="party">
      <span class="caps">${esc(l.partyClinician)}</span>
      <div class="n">${esc(input.doctor.fullName)}</div>
      ${input.doctor.title ? `<div class="l">${esc(input.doctor.title)}</div>` : ""}
      ${input.doctor.countryName ? `<div class="l">${esc(input.doctor.countryName)}</div>` : ""}
      ${input.doctor.email ? `<div class="l">${esc(input.doctor.email)}</div>` : ""}
    </div>
    <div class="party">
      <span class="caps">${esc(l.partyPlatform)}</span>
      <div class="n">Global Health</div>
      <div class="l">Global Health Network</div>
      <div class="l">globalhealth@myglobalhealth.online</div>
      <div class="l">myglobalhealth.online</div>
    </div>
  </div>

  <p class="intro">${esc(content.intro)}</p>

  <ol class="clauses">${clauses}</ol>

  ${acceptedNote}

  <div class="sign">
    <div class="sign-title">${esc(l.signTitle)}</div>
    <p class="declare">${esc(fill(l.declaration, { version }))}</p>

    <div class="sign-grid">
      <div class="sig">
        <div class="rule"></div>
        <div class="lbl">${esc(l.sigSignature)}</div>
      </div>
      <div class="sig">
        <div class="rule"><span class="pre">${esc(input.doctor.fullName)}</span></div>
        <div class="lbl">${esc(l.sigPrintedName)}</div>
      </div>
      <div class="sig">
        <div class="rule"></div>
        <div class="lbl">${esc(l.sigDateSigned)}</div>
      </div>
    </div>

    <p class="sign-note">${esc(l.signNote)}</p>
  </div>

</div>

<div class="foot">
  <div class="foot-rule"></div>
  <div class="fb"><span class="b">Global Health</span><span class="t">${esc(fill(l.footerNote, { version }))}</span></div>
</div>

</body>
</html>`;
}

export async function renderConfidentialityAgreementPdf(
  input: ConfidentialityPdfInput,
): Promise<Buffer> {
  return htmlToPdfBuffer(buildConfidentialityAgreementHtml(input));
}
