# Synlab PT price list → exam catalogue

Bulk-loads the Synlab Portugal private price table (~4.2k lab exams) into the
global `ExamType` catalogue and prices it as `TestCenterExam` offerings on the
Synlab test center.

## Files

| File | What it is |
| --- | --- |
| `synlab-exams-2025-12.csv` | Parsed price list, December 2025 sheet. Committed so the import is reproducible. |
| `parse-synlab-pdf.py` | Regenerates the CSV from a new supplier PDF. |
| `import-synlab-exams.ts` | Idempotent upsert of the CSV into the DB. |

## Reference scheme

Our catalogue reference is `GH<group>-<seq>`: the group number is the exam's
scientific group, the 4-digit tail is that group's running counter, assigned in
sheet order by the parser.

| Prefix | Grupo Científico | Rows |
| --- | --- | --- |
| GH1 | Alergologia | 651 |
| GH2 | Anatomia Patológica | 69 |
| GH3 | Bioquimica | 498 |
| GH4 | Endocrinologia | 217 |
| GH5 | Hematologia | 120 |
| GH6 | Imunologia | 439 |
| GH7 | Imunoserologia (Infecciologia) | 330 |
| GH8 | MCDT - Cardiologia | 2 |
| GH9 | Medicina Personalizada | 43 |
| GH10 | Microbiologia | 260 |
| GH11 | Outros Produtos Biológicos | 81 |
| GH12 | Patologia Molecular | 213 |
| GH13 | Rastreio Pré-Natal | 15 |
| GH14 | Relatório de Teste Genético | 1086 |
| GH15 | Urina e Doseamentos Urinários | 219 |
| | **Total** | **4243** |

Synlab's own code (the sheet's `Código` column) is stored per offering as
`TestCenterExam.supplierCode`, so our `GH…` reference and theirs cross-reference
on the join row. `Tempo de Resposta` lands in `TestCenterExam.turnaroundDays`.

## Pricing

The sheet's `PVP SYNLAB` is what the **patient** pays. We buy at a 20%
discount, so `costCents = round(PVP × 0.8)` and the markup on top of cost
reproduces the PVP:

- `--markup=fixed` (default) — `markupValue = PVP − cost` per row. Patient price
  matches the printed sheet to the cent.
- `--markup=percent` — `PERCENT`, 2500 basis points (25%). Self-maintaining
  (edit the cost, the price follows) but rounding puts **211 of the 4243 rows**
  one cent off the printed PVP (never more than 1 cent).

Both markup modes remain editable per offering in the admin UI afterwards.

## Regenerating the CSV from a new sheet

Needs `pdftotext` (poppler) and Python 3:

```bash
pdftotext -raw -enc UTF-8 "Tabela Particular SYNLAB_<month>.pdf" synlab_raw.txt
python parse-synlab-pdf.py synlab_raw.txt synlab-exams-<yyyy-mm>.csv
```

The parser prints per-category counts, any unparsed lines, and duplicate
supplier codes. Unparsed lines should only ever be the page headers and the
closing note — investigate anything else before importing.

`-raw` matters: `-layout` interleaves the response-time and price columns
across rows and silently mangles the sheet.

> The GH sequence numbers are positional. Re-parsing a sheet with rows inserted
> or removed shifts every later reference in that group. When refreshing prices
> for an existing import, diff the new CSV against the committed one and keep
> the old references for rows that still exist.

## Importing

Apply the `20260722000000_exam_catalogue_codes` migration first, then:

```bash
# inspect — writes nothing, reports existing rows and slug conflicts
pnpm tsx scripts/synlab/import-synlab-exams.ts --center-slug=synlab-portugal --country=pt --dry

# apply
pnpm tsx scripts/synlab/import-synlab-exams.ts --center-slug=synlab-portugal --country=pt --commit
```

Flags: `--center=<id>` (instead of slug + country), `--csv=<path>`,
`--currency=EUR`, `--markup=fixed|percent`.

Idempotent — upserts on `ExamType.code` and `(testCenterId, examTypeId)`, so a
re-run refreshes names and prices instead of duplicating rows.
