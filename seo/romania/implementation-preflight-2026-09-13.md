# Romania authenticated implementation preflight

13 September 2026. Dated evidence; operational status is in global ledger §55.1.
Research commit `39656572` remains the starting point. No production write occurred.

**Continuation:** the owner has since confirmed Dr Robert Gabriel Brindus's approval
for all exact groups. Six offline tests, backend TypeScript and a 591-operation real
PostgreSQL rollback rehearsal pass. Production deployment was rejected by automatic
approval review for missing explicit deployment authorization. No code or content
was published. See ledger §55.2 and the continuation in `09-implementation-log.md`.
The sections below retain the original preflight findings and preparation status.

## Concrete review packet

[Before/after review](content-briefs/implementation-review-2026-09-13.html) and
[exact row manifest](content-briefs/storage-mutation-manifest-2026-09-13.json):
20 groups, 591 row operations, zero source-drift blockers. The manifest records
full before-rows for updates and deterministic IDs for proposed FAQ inserts.
It is a dry-run plan, not a mutation receipt or proof of a working database updater.

- 16 staffed services: all six translation rows and the matching RO base copy;
  64 native FAQ rows with 384 locale translations. Remove each exact terminal
  embedded FAQ section in the same future transaction as its native set.
- Three doctors: 24 exact FAQ edits and five Palaga title corrections in
  **DoctorMarketTranslation**, which overrides the general DoctorTranslation row.
  Preserve all other FAQs, biographies, credentials and general title rows.
- Separate sick-note correction: remove the English retained body paragraph and
  list offer, then deactivate ServiceLink `cmr8eljv4000004ju8rgmntcr`. Its target is
  the 404 `sick-note-romania`. Keep the link/translation rows for reversal.
  This group depends on the `medic-online-romania` migration's resulting body.

Each group has an approval SHA-256 covering its complete proposed changes.
The original doctor register's `draft_sha256` hashes only `after.seoTitle`, omitting
`faqPatches`. It must not authorize doctor FAQ edits. The new
`implementation_payload_sha256` binds those edits too; approval fields remain blank.

## Refreshed evidence

Railway's linked Global Health project, Production environment, provided the
database connection in process memory. No `.env` or secret value was written or
printed. The export used `REPEATABLE READ READ ONLY` and selected content/operational
rows only; it did not read patients, login accounts, banking fields or identity data.

[Complete content snapshot](raw/storage-preflight-with-links-2026-09-13.json):
32 services, 177 service translations, zero native service FAQ rows, 17 assignments,
three doctors, 18 general doctor translations, 18 market overrides, 108 doctor FAQs,
81 ServiceLinks and 81 link translations. Includes inactive/hidden content rows.
All current doctor country associations are Romania-only. The earlier snapshot
without ServiceLinks is retained as collection evidence, not the manifest input.

[Public refresh](raw/implementation-public-preflight-2026-09-13.json): all 114
prepared service/profile source fingerprints match exactly. Six focused rendered
pages confirm the two specialist services have zero native FAQ schema items, the
two profiles have six, the English general page returns 200, and sick-note returns
404. This is pre-publication evidence, not post-write readback.

[GSC refresh](raw/gsc-implementation-refresh-2026-09-13.json): free OpenSEO read,
final page data, August 13–September 9, all `/romania/` routes/searcher countries,
complete pagination. The window matches the prepared baseline. No new paid
research or broad crawl was needed; OpenSEO balance was 11,049 credits.

## Existing links and explicit holds

Existing templates and captured pages already supply the planned general-hub links
to the 14 GENERAL services, specialist/profile links, assigned-service reciprocity,
parent hubs, and calorie/BMI links to weight management. The ledger records the
medical-letter/referral-service links as live. No missing edge was demonstrated;
adding another set would duplicate the current paths.

`evaluare-durere` still has no approved doctor. Its active incoming ServiceLink
`cmr8elnrf000604jurqc7kbb2` and specialist-hub promotion need an explicit operational
disposition. They were not disabled. Brindus specialty harmonization remains held
on authoritative evidence. Retained same-day, prescription/SIPE and reimbursement
claims elsewhere in body copy are not certified by these narrower draft edits.

Legal noindex, real alternate clusters, article/tool cohorts and booking behavior
remain unchanged. The booking client-shell check is still unperformed; no defect
is asserted and no paid appointment was created.

## Applicable gates and remaining implementation

The canonical ledger §41.1 states: “each payload needs one named Romanian
clinician's approval.” This directly applies to Romania service FAQs; it is not
an inferred article byline rule. The current packet has no such approval.

Ledger §43.4 requires enforcement “at the point of write ... not only in a batch
script”. Current Portugal/Czech validators protect scripted batches only. No
general content mutation-boundary gate currently protects Romania. The planner
has no `--apply` option and must not be treated as closing that prerequisite.

The smallest coherent enforcement scope crosses these existing owners:

| Owner | Content writes to cover |
| --- | --- |
| `backend/src/modules/services/services.service.ts` | Service base copy and translation upserts |
| `backend/src/services/service-faq.service.ts` | Native FAQ create/update/delete and translation sync |
| `backend/src/modules/doctors/doctors.service.ts` | Doctor copy and translation upserts |
| `backend/src/modules/doctor-faqs/doctor-faqs.service.ts` | Locale FAQ set replacement |
| `backend/src/modules/doctor-market-profiles/doctor-market-profiles.service.ts` | Market overrides and default-title mirroring |
| `backend/src/modules/doctor-profile-change-requests/doctor-profile-change-requests.service.ts` | Approved profile-change mutations |

Resolve country/shared-doctor scope inside the transaction and validate approval
against the actual resulting content. Preserve unrelated contact and operational
edits. Direct batch mutations need the same enforcement; a new batch-only validator
cannot satisfy §43.4. This broader enforcement is scoped here, not implemented.

Once that gate and real clinician approvals exist, implement the production
transaction runner using this manifest's row ownership and before-values. Re-read
the affected source/associations inside a serializable transaction, refuse drift,
write the six-locale service group atomically, and verify protected values before
commit. Capture a write/rollback receipt, then verify the public result before
starting the next group. Do not execute this stale snapshot blindly.

## Proof and limits

Run from repository root:

```powershell
node backend/scripts/prepare-romania-seo.mjs
node --test backend/scripts/prepare-romania-seo.test.mjs
node seo/romania/collect-public-inventory.mjs --check
git diff --check
```

Three offline tests pass: exact six-locale grouping/base FAQ language, unrelated-row
preservation and safe repeat rehearsal; source/missing-locale/hidden-FAQ/shared-market
refusal; late-failure input preservation and approval-hash coverage of doctor FAQ edits.
These tests prove planner/rehearsal behavior, **not database transaction atomicity**.
No product code changed, so no frontend/backend TypeScript check was required.

Do not run `build-package.mjs` over the new register/matrix columns: its historical
generation code rewrites those files. The review HTML and manifest regenerate with
`prepare-romania-seo.mjs`; the existing clinical approval fields stay human-owned.
