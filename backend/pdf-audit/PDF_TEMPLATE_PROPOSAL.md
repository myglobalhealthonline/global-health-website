# PDF Design System Proposal — Global Health

One design system for every generated document: fiscal (invoice/receipt/credit note), clinical (certificates/prescriptions), and report exports. Implemented once as a shared base layout + tokens; each document supplies only its content section.

Reference implementation: `pdf-audit/proposed-template/` (invoice sample, approved-pending).

---

## 1. Page setup

- **A4 portrait**, `@page { size: A4; margin: 0 }` — the layout owns its margins so the footer can pin to the page edge.
- **Content margins:** 16mm left/right, 14mm top, **52mm bottom reserve** on the last page for the fixed footer (fiscal) / signature+footer (clinical).
- **Safe zone:** nothing except the footer inside the bottom 12mm.
- **Page breaks:** `break-inside: avoid` on the doctor panel, signature block, totals block, and each table row group; `orphans: 3; widows: 3` on prose. Footer repeats on every page (`position: fixed` in paged media).
- Multi-page: page numbers via Playwright `displayHeaderFooter` footer template ("Page x of y", 8pt, muted) — enable when a document can exceed one page.

## 2. Branding

- **Logo:** `global-health-dark.png` (dark-ink mark on paper), embedded as **base64 data URL** — no network fetch, works offline in Chromium. Height **15mm**, top-left, generous air around it. Never scale above intrinsic size (source is 404×272; see §Asset gap).
- **Brand colors (tokens, from Manual da Marca / DESIGN.md):**
  - `forest #1D4B36` — headings, rules, key numbers (fixes transposed `#1B4D3E` in production invoice)
  - `forestNight #0F2E25` — names/strong values
  - `ink #2D3B36` — body text (not grey #4a4a4a)
  - `muted #6D6D6D`, `faint #98A29B` — secondary text, labels
  - `ivory #F6F8F1`, `panel #EDF2E2` — surface tints
  - `hairline #E3E8E1` — rules
  - `lime #B0F122` — **not used on paper documents.** Print accent is forest ink + hairlines; status conveyed by the stamp (forest Paid / amber Payment due / soft-red Refunded). Restraint is the premium signal.
- **B/W print rule:** all meaning must survive grayscale — status conveyed by label text + dot, not color alone; tints are ≥95% luminance so they disappear cleanly in B/W.

## 3. Typography

- **Family:** `"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif` for the sample. **Production requirement:** bundle a real font (recommend **Inter** or **Public Sans**, ttf/woff2 in `backend/assets/fonts/`, embedded via base64 `@font-face`) so Linux prod === local. Kill the runtime Google-Fonts `@import`; AlexBrush ttf is already in assets — embed it the same way for signatures.
- **Scale:**
  - Document number: 17pt / 700
  - Section kickers (FROM, BILLED TO, ATTENDING DOCTOR): 7.5pt / 700 / letter-spacing 0.18em / uppercase / faint
  - Names & headline values: 10.5–11pt / 700 / forestNight
  - Body: 10–10.5pt / 400 / ink / line-height 1.45
  - Table body 10pt; table headers 7.5pt small-caps style
  - Legal footer: 7.5pt / muted / line-height 1.55
- **Numbers:** `font-variant-numeric: tabular-nums` on every money/qty column.
- **Label/value pattern:** label muted, value ink/semibold — never bold-label-colon-everything.

## 4. Header template (all documents) — private-clinic stationery

Paper-first masthead on near-white stock (`#FDFDFA`): dark logo top-left (15mm); right-aligned **serif document title** (Georgia 20pt — "Invoice / Receipt", "Medical Prescription", …) with an italic serif sub-line `Nº <number> · Issued <long date>` (number in forest italic). Beneath: a **classic double rule** — 0.75pt night line over a 0.25pt hairline — the stationery signature, identical on every document.

Typography pairing: serif (Georgia; bundle Source Serif/Lora for prod) for titles, names, item descriptions, and the grand total; sans (Segoe UI; bundle Inter for prod) for labels and metadata. All section labels are 6.8pt small caps at 0.28em tracking. Fine hairlines (0.25–0.75pt) carry the structure; no filled color blocks anywhere.

Status is a **discreet stamp**: rotated (-5°) rounded-rectangle outline, letterspaced uppercase label + date, forest for Paid, amber for Payment due, soft red for Refunded — placed in the settlement row opposite the totals.

## 5. Party / patient information section

Two flexible columns (`display:flex; gap:10mm` — no fixed widths, so long Czech/Portuguese labels wrap instead of breaking):
- **Fiscal:** From (company + CRO/reg + address + email) | Billed to (name, email, phone, Tax ID, consultation date).
- **Clinical:** Patient (name, Global Health Number / patient ID, DOB, address) | Consultation (date, type, document ID).
- Insurance details slot in as extra `party-line` rows where relevant.

## 6. Invoice/receipt content section

- Items table: index column (01, 02… faint), Description (semibold forestNight), Qty, Unit price, Amount — numeric columns right-aligned, tabular figures. Header row: ivory background, hairline top/bottom, forest small-caps labels. Row separators: hairlines only, no zebra, no heavy grid.
- Discount rows: negative amount, muted label, rendered inside the table body.
- **Totals block** (right-aligned, 80mm): Subtotal → Shipping (if any) → Discount (if any) → **VAT (0%) + one-line exemption note** → **ledger double rule** → TOTAL small caps + **19pt serif amount**. Settlement line in italic serif beneath ("Settled in full, 9 July 2026"). Credit note: "Total refunded" + "Refund issued". Status stamp sits left of the totals.
- Payment line beneath totals: "Paid in full · <date>" or "Refund issued · <date>" (fixes the credit-note "Paid" bug). Payment method when available.
- Unpaid invoice: "Payment due" pill + amount-due emphasis.

## 7. Medical document content section

- Patient/consultation columns per §5, then an ivory **doctor panel** (2px forest left border): kicker + doctor name + chamber/registration number.
- Body: certificate statement / prescription list / exams list at 10.5pt ink. Prescriptions as a structured list (medication semibold, dosage/duration as muted sub-line).
- **Signature block** (break-inside avoid): signature line (hairline, 60mm) with AlexBrush signature above it, printed name + registration below, date of signing, and a reserved 25×25mm stamp area on the right.
- **Verification strip:** QR (24mm) + "Document ID <id> · Verify at myglobalhealth.online/verify" (fixes wrong globalhealth.com domain).
- Confidentiality note in footer (§8).

## 8. Footer (fixed, every page)

- Hairline rule.
- Legal small print (VAT exemption / trading-name text for fiscal; country legal text + "This document contains confidential medical information intended for the named patient only." for clinical).
- Brand line: `GLOBAL HEALTH` (small caps forest) left · "Medicine Anytime Anywhere · myglobalhealth.online" right.
- Optional "Generated <date>" + page numbers for multi-page docs.

## 9. Multi-language rules

- All labels from a per-locale label map (extend existing `INVOICE_LABELS`); no hardcoded English in markup (fixes untranslated "Shipping").
- No fixed label column widths anywhere — flex/label-above-value layouts absorb long CZ/PT/ES/RO strings.
- `lang` attribute + `Intl.NumberFormat(locale)` / `toLocaleDateString(locale, long form)` per country — currency and date conventions follow the document's locale, dates always long-form (no dd/mm ambiguity).
- Letter-spacing on uppercase kickers capped at 0.18em so diacritics-heavy words remain readable.

## 10. Implementation rules

1. **One base layout module** `backend/src/lib/pdf/base-layout.ts`: `renderPdfShell({ locale, docKicker, docNumber, status, footerLegal, bodyHtml })` → full HTML with tokens, header, rule, footer baked in.
2. **One token file** `backend/src/lib/pdf/tokens.ts` — colors, font stack, scale. No hex literals in templates.
3. **Assets embedded once**: logo base64 + fonts base64 resolved in the shell, cached at module level.
4. Document modules provide **content sections only** (parties, items table, prescription body). Invoice, receipt, credit note = one builder with type switches (already true).
5. **Converge clinical docs onto the HTML renderer** and retire the DOCX/LibreOffice path once per-country legal text is ported into label maps — one engine, one look, no LibreOffice dependency, no 623KB embedded logos. (Keep DOCX as fallback until then.)
6. Extend `scripts/gen-sample-pdfs.ts` to render every doc type × every locale — visual regression corpus.
7. No duplicated CSS: the only per-document CSS allowed is content-section styling.

## Asset gap (Phase 4 finding)

No SVG of the primary logo exists — only PNGs (404×272 dark, 399×260 light). The PNG works at 21mm, but for crisp print request from brand source: **SVG (preferred)** or ≥1200px-wide transparent PNG, dark-ink version; light version optional for any future dark-header document. The 623KB PNG inside the DOCX templates should be recompressed regardless.
