# PDF Design & Technical Audit

Scope: all locally generated PDFs. Samples regenerated 2026-07-09 with mock data → `pdf-audit/current-samples/` (PDFs) + `previews/` (first-page PNGs, rendered from the identical HTML).

Severity: **Critical** = legally/functionally wrong or brand-damaging · **High** = clearly unprofessional · **Medium** = polish · **Low** = nice-to-have.

---

## Cross-cutting findings (affect every document)

| # | Sev | Issue | Location | Why it matters | Fix |
|---|-----|-------|----------|----------------|-----|
| X1 | **Critical** | **No logo on any generated PDF.** Invoice renders a text-only wordmark; HTML clinical fallback renders a 9pt "GLOBAL HEALTH" text kicker. Real logo assets exist (`frontend/public/logos/global-health-dark.png`). | `invoice-pdf.ts:274`, `document-templates/_default/*` | Fiscal + medical documents with no brand mark read as auto-generated and untrustworthy; employers/pharmacies inspect certificates. | Embed logo PNG as base64 data URL in shared header partial (done in proposed template). |
| X2 | **High** | **Brand green is wrong on invoices**: `#1B4D3E` (digits transposed) vs brand `#1D4B36`. HTML doc templates use lowercase `#1d4b36` (correct). Two documents from the same company print two different greens. | `invoice-pdf.ts` (10 occurrences) | Brand inconsistency visible side-by-side in the same email thread. | Single shared token set. |
| X3 | **High** | **No shared design system** — invoice styling is inline strings in TS; clinical HTML styling is a separate `styles.html`; DOCX templates carry their own third look. Fonts, sizes, greens, footers all diverge. | `invoice-pdf.ts`, `partials/styles.html`, `docx-templates/*` | Every future document forks the drift further. | Shared base layout + tokens (see PDF_TEMPLATE_PROPOSAL.md). |
| X4 | **High** | **Font non-determinism.** Clinical templates specify `Calibri` — not present on the Linux production container, so prod PDFs silently fall back to a different face than local/dev. `styles.html` also `@import`s Google Fonts (Alex Brush) over the network at render time: slow, and blank signature if network blocked. | `partials/styles.html:2,6` | Prod output ≠ reviewed output; signature can vanish. | Bundle woff2/ttf in `backend/assets/fonts` and embed via `@font-face` base64 (AlexBrush ttf already shipped for DOCX path — reuse it). |
| X5 | Medium | **Ambiguous date formats mixed in one doc**: header "09 July 2026" but "Paid 09/07/2026" (dd/mm reads as Sept 7 to US readers). | `invoice-pdf.ts:259`, gen contexts | Fiscal documents should be unambiguous. | Always long-form dates. |
| X6 | Medium | No "generated" metadata (PDF title/author metadata is just the HTML `<title>`; no page numbers on any doc). | all | Multi-page docs (long prescriptions, reports) lose orientation. | Playwright `displayHeaderFooter` footer template or fixed footer (proposed). |

---

## 1. Invoice / Receipt / Invoice-Receipt / Credit Note (`invoice-pdf.ts`)

Sample: `current-samples/invoice-sample.pdf` etc.

| # | Sev | Issue | Why it matters | Fix |
|---|-----|-------|----------------|-----|
| I1 | **Critical** | **Credit note reads "Invoice reference: CN-… · Paid 09/07/2026"** — a refund document asserting it was *paid*, using the paidAt of the original order. | Legally confusing on a fiscal document; customer disputes. | Credit note should show "Refund issued <date>" and reference the *original* invoice number. |
| I2 | **High** | **No totals breakdown** — single "Total" line; no Subtotal, no VAT line, no 0%/exempt figure. The VAT exemption exists only as footer prose. | EU customers/companies expense these; accountants expect a VAT column or explicit 0% line. | Subtotal + VAT (0%) + exemption note + Total block (proposed). |
| I3 | High | Bottom half of the A4 page is empty; footer floats mid-page rather than anchored to the bottom edge. Body is `max-width:700px; margin:0 auto` inside Chromium's default margins — margins are whatever `page.pdf` produces (0) plus body padding 32px ≈ 8.5mm — too tight for print. | Looks like an unstyled web page printed. | Proper A4 page box (14–16mm margins), footer pinned to bottom. |
| I4 | High | Typography: Arial everywhere, no tabular figures, money columns wobble; badge (`PAID`/`UNPAID`/`REFUNDED`) is a bare colored rectangle, ALL CAPS harsh. | Cheap look; misaligned digits in the one place people read numbers. | `font-variant-numeric: tabular-nums`, refined status pill. |
| I5 | Medium | Header right column duplicates the number in 24px green while company block on left repeats "Global Health" 3 times on the page (header, From, footer). | Redundancy wastes hierarchy. | One wordmark (the logo), From block carries legal identity. |
| I6 | Medium | `lang="en"` hardcoded even for cz/pt/es/ro documents; `Intl.NumberFormat("en-GB")` formats currency in English conventions for all locales (e.g. Czech users see `€85.00` not `85,00 €`). | Localisation half-done; fiscal formats matter per country. | Pass locale into `Intl` calls + `lang` attr. |
| I7 | Medium | "Shipping" row label untranslated (hardcoded English) while everything else is translated. | Breaks non-EN invoices. | Add to label map. |
| I8 | Low | Email/phone/tax rows have no labels except tax; scanning is harder. | Minor. | Label/value layout. |

## 2. Clinical HTML fallback templates (`document-templates/_default/*.html` + `styles.html`)

Samples: `absence-certificate-sample.pdf`, `medicine-prescription-sample.pdf`, `custom-certificate-sample.pdf`, `exams-prescription-sample.pdf`, `other-document-sample.pdf`.

| # | Sev | Issue | Why it matters | Fix |
|---|-----|-------|----------------|-----|
| C1 | **High** | **17pt body text** (`styles.html:7`) — enormous; section titles are the *same* 17pt as body, so there is no hierarchy at all. H1 title is also 17pt. | Reads like a large-print draft, not a medical document; wastes half the page. | 10–11pt body, clear heading scale. |
| C2 | **High** | **Signature is just the doctor's name set in a cursive font (Alex Brush)** with no signature line, no stamp area, no date-of-signing, and the same name printed twice in a row above it. | A pharmacy/employer expects a signature block: line, printed name, registration, date, stamp space. | Proper signature/stamp block. |
| C3 | High | Layout gaps are hardcoded spacer divs (`.patient-body-gap` 2.8em, `.footer-gap` 5.6em) instead of a real footer — nothing anchors to the page bottom, and the "footer" class content is never even rendered by the templates. | Fragile page composition; long content pushes spacers awkwardly across page breaks. | Footer pinned via fixed positioning; drop spacers. |
| C4 | High | No document ID / issue date / QR by default: `qrDataUrl` block is conditional and the HTML fallback receives it only in some flows; `documentId`, `currentDate` context fields exist but **no template prints them**. | Verifiability and traceability are the point of a certificate. | Always print document ID + issue date; keep QR. |
| C5 | Medium | Body text grey `#4a4a4a` for a legal/medical document; labels dark green + bold everywhere makes the page zebra-striped with green. | Low print contrast; noisy. | Near-black ink for content, green reserved for structure. |
| C6 | Medium | `Certificate ID`/verify line says "globalhealth.com" — not our domain (`myglobalhealth.online`). | Wrong URL on a verification instruction. | Fix domain. |
| C7 | Medium | Only `_default` (English) HTML templates exist; per-country dirs supported but empty — CZ/RO/ES patients getting the HTML fallback receive English documents. | i18n gap on the fallback path. | Country label maps in shared partial. |
| C8 | Low | `other.html`'s free-text `{{body}}` has no page-break styling (orphan control) for long reports. | Multi-page reports break mid-line-group. | `orphans/widows`, `break-inside: avoid` on blocks. |

## 3. Clinical DOCX → PDF path (`docx-templates/*.docx` via LibreOffice)

Not fully re-rendered here (needs `soffice`; `gen-sample-pdfs.ts` doesn't exercise it — itself a gap, see below). From template inspection (`test-output/s002check/*`):

| # | Sev | Issue | Fix |
|---|-----|-------|-----|
| D1 | High | Third visual system: DOCX templates carry their own embedded logos (one is a 623KB PNG inflating every generated PDF) and Word-ish typography that matches neither the invoice nor the HTML fallback. | Long-term: converge on the HTML system for all clinical docs (proposal §10); short-term: recompress embedded logo media. |
| D2 | Medium | Same physical document can look completely different depending on whether LibreOffice succeeded (DOCX path) or fell back (HTML path). Patients can receive both styles across two appointments. | Same as D1 — one renderer. |
| D3 | Medium | `gen-sample-pdfs.ts` never renders the DOCX path or non-IE countries, so template regressions ship silently. | Extend the sample script once design is unified. |

## 4. Report PDF export (`report-formatters.ts` → `renderReportPdf`)

| # | Sev | Issue | Fix |
|---|-----|-------|-----|
| R1 | Medium | Plain generated table dump: no logo/header/footer, default styling, en-GB only. Internal-facing so lower priority. | Apply base layout header/footer when design system lands. |
| R2 | Low | "Excel" export is SpreadsheetML-as-`.xls` (Excel shows a format warning on open). | Consider real XLSX later; out of design scope. |

## 5. Delivery-context findings

| # | Sev | Issue | Fix |
|---|-----|-------|-----|
| E1 | Low | Filenames are decent (`invoice-INV-IE-00001.pdf`, `Jane-Doe-exam-prescription-01.pdf`). Clinical label part is English-only (`exam-prescription`) for all countries. | Localise label slug (optional). |
| E2 | Medium | WhatsApp sends links only — the landing experience, not the PDF, is the brand moment there; invoice email attaches the PDF where design matters most. | No change; prioritise attachment design (done). |

## 6. Rendering-quality notes

- A4 output confirmed for all samples; no clipped elements at current content sizes.
- Page margins: invoice relies on body padding (I3); clinical templates use `@page 16mm 14mm` (correct approach — keep).
- Fonts not embedded — full determinism requires bundled `@font-face` (X4).
- `printBackground: true` set — background colors survive; keep panels light for B/W printing.

## 7. External/uploaded documents — not auditable here

Stripe subscription invoices + receipts (dashboard branding only), InvoiceExpress PT invoices (their template settings), doctor payout invoices and all patient uploads (not ours to style). See DOCUMENT_INVENTORY.md §B–C.
