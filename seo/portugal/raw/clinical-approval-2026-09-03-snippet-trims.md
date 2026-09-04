# Clinical approval — Portugal doctor snippet trims, 2026-09-03

**Reviewer:** Dr Tiago Miguel Figueira, OM 77986, `cmp5r0if3002kssjug743x0p6`.
**Scope:** the eleven trimmed doctor meta descriptions in
`seo/portugal/raw/snippet-trim-drafts-2026-09-03.csv`, presented for review as
`seo/portugal/raw/snippet-trim-review-packet-2026-09-03.md`.

## How this approval was obtained

The reviewer packet was sent to Dr Tiago Miguel Figueira. He returned the following
message at **17:59 (5:59 pm) on 3 September 2026**, relayed to the implementer by the
project owner as a WhatsApp screenshot:

> "Reviewed the 11 shortened doctor descriptions (Ana Leal Neto, Egas Moura, Joana
> Branco Maia, João de Oliveira e Silva, Lucas Alvarenga Berto, Margarida Andrade,
> Pedro Santos, Rúben Pereira, Rui Diogo Rodrigues, Ana Varges Gomes, Nádia Cavaco) —
> approved. 3 September 2026."

**Provenance, stated plainly.** This is a written confirmation from the named reviewer,
naming all eleven subjects and carrying a review date, relayed by the project owner. It
is **not** an independently authenticated digital signature, and the implementer did not
observe the message in its original channel. It is recorded at the same standard as the
other 44 Portugal register rows, which rest on an owner-attested review timestamp, and
is more specific than those because it enumerates every asset covered.

## What was approved

Deletions only. Every proposed description is a strict subset of the text already
approved and live on 2026-09-02: words were removed, none added, reworded or invented.
The opening booking clause and the OM registration number are retained in all eleven.
Lengths fall from 191–220 characters to 124–146, against a ~155–160 display budget.

Field scope is the PT `DoctorMarketTranslation` meta description only. Names,
biographies, qualifications, certifications, credentials, registrations, specialties,
languages, prices, durations, assignments, availability, booking behaviour and all
non-PT locales are outside scope and unchanged.

## What was NOT approved and is not published

- **`beatriz-carvalho`** — excluded. Her register row is `blocked_pending_review` and
  her fact-register row is `pending_official_verification`. The official OPP directory
  search for cédula **31618** returns **Beatriz Sousa** (Membro Efectivo, Porto, no
  speciality recorded), not Beatriz Carvalho; separate registrations exist under
  26164, 24832 and 3137. The identity conflict is unresolved and no copy ships for her.
- **The seven tool pages (11 fields).** `assertPortugalSeoApplyAuthorized` rejects
  `targetKind === "tool"` before any approval is consulted. They are unpublishable
  through this writer at any approval level and need a separate publication route.

## Verification contract

Publication binds each description to the exact SHA-256 recorded in the register's
`approved_sha256` column for that asset. Hashes are recomputed at publish time by
`backend/scripts/report-portugal-snippet-trim-drafts.ts`; any later edit to the copy
invalidates the approval and requires a fresh review.
