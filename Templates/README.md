# Clinical document templates (DOCX)

Official Word templates used by the doctor dashboard PDF generator.

- **Source of truth:** edit files in this folder.
- **Deploy:** `backend` copies them to `backend/assets/docx-templates` on `pnpm install` via `scripts/sync-docx-templates.mjs`.

## Countries

| Prefix | Markets |
|--------|---------|
| `(IR)` | Ireland (`ie`) |
| `(PT)` | Portugal (`pt`) |
| `(ES)` | Spain (`sp`) |
| `(CZ)` | Czechia (`cz`) |
| `(RO)` | Romania (`rm`) |

## Files per country

- `(*) Exams Template _ Global Health.docx`
- `(*) Prescription Template _ Global Health.docx`
- `(*) Absence Certificate Template _ Global Health.docx`

Each template includes **branding and layout** baked into Word:

- **Logo** — PNG assets under `word/media/` (referenced from `word/header1.xml`)
- **Border / frame** — part of the header and page design in the `.docx`

The backend only replaces placeholder **text** in `word/document.xml`. It does not modify headers, media, or styles, so logos and borders are preserved in the PDF.

Placeholder literals in the body (e.g. `xxxxxx xxxxx`, `XXXXXXXXXXX`) must stay as-is unless you also update `backend/src/modules/generated-documents/docx-template-profiles.ts`.
