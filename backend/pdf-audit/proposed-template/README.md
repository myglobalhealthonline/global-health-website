# Proposed invoice template — review samples

Four directions, pick one (all mock data, INVOICE_RECEIPT, IE; all verified single-page A4):

- **Option A — Private-clinic stationery** (`proposed-invoice-sample.pdf` / `proposed-invoice-preview.png`, builder `invoice-template.ts`): serif masthead, hairlines, ledger double-rule total, rotated PAID stamp.
- **Option B — Swiss minimal** (`variant-b-minimal.*`): oversized light sans title, strict grid, maximal whitespace, boxed status.
- **Option C — Framed folio** (`variant-c-folio.*`): double border frame on ivory, centered serif masthead, certificate feel.
- **Option D — Forest spine** (`variant-d-spine.*`): 7mm forest band down the left edge with vertical brand, modern sans, pill status.

Bold/statement directions:

- **Option E — Editorial poster** (`variant-e-poster.*`): 46pt italic serif masthead, ECG pulse rule with lime peak (heartbeat from the logo), ghost numeral watermark, italic serif total.
- **Option F — Obsidian dark luxe** (`variant-f-darkluxe.*`): full forest-night sheet, ivory serif type, lime accents + ECG line. Heavy ink for print; strongest as email/portal PDF.
- **Option G — Brutalist grid** (`variant-g-brutalist.*`): exposed 1.4pt grid boxes, 34pt uppercase title, lime PAID cell + lime total block, poster energy.

Print-first directions (designed grayscale-first — ink + paper + hairlines only, status never color-only):

- **Option H — Ink ledger** (`variant-h-inkledger.*`): heritage accounting doc — serif caps masthead, double rules, overlined meta cells, classic double-underline total. Monochrome by design.
- **Option I — Rail ledger** (`variant-i-railledger.*`): 62mm left rail (logo, doc info, boxed status, dates, From, doctor) split by one strong vertical rule; content right. Structure survives B/W untouched.
- **Option J — Mono poster** (`variant-j-monoposter.*`): 40pt serif masthead, solid near-black PAID flag + total bar (solid dark prints crisply in B/W — only mid-tones fail), zero color dependence.

**B/W print simulation for every variant**: `bw-previews/bw-<name>.png` (grayscale render = laser-printer output). Printability verdicts: A/B/C/H/I/J = safe (near-identical in B/W). D = safe (spine goes near-black). E = safe minus lime pulse detail. G = acceptable (lime blocks turn light grey, lose punch). **F = poor** (full-dark page, heavy ink — email/portal only).

Builders: B/C/D in `variants.ts`, E/F/G in `variants2.ts`, H/I/J in `variants3.ts`. Regenerate:
`cd backend && npx tsx pdf-audit/proposed-template/gen-proposed-invoice.ts && npx tsx pdf-audit/proposed-template/gen-variants.ts`

## How this extends to all other documents

The template is already split the way the final system will be:
1. **Shell** (tokens, header with logo + doc meta + status pill, forest/lime rule, fixed legal footer) — identical for every document type; becomes `src/lib/pdf/base-layout.ts`.
2. **Content section** — the only per-document part. Invoice/receipt/credit-note = items table + totals block (built here). Certificates/prescriptions swap in: patient/consultation columns → doctor panel (already in this sample) → prescription/certificate body → signature + stamp block → QR verification strip.
3. Because it consumes the production `InvoicePdfData` type unchanged, adoption for fiscal docs is a drop-in replacement of `buildInvoiceHtml` — no data, sending, or fiscal logic changes.

Full rollout plan: `../NEXT_STEPS.md`. Design rules: `../PDF_TEMPLATE_PROPOSAL.md`.

**Not applied anywhere in production.** Production change so far: `buildInvoiceHtml` gained an `export` keyword (tooling only).
