# Brazil handoff

Nothing from this batch is live. Research, source reconciliation,57 exact page drafts and a19-group/96-operation manifest are complete locally. The packet is content-briefs/review-packet.html; full rollback source is raw/storage-preflight-2026-09-13.json. Canonical operational state: ledger§57.

Proof: 15 Node tests; backend tsc --noEmit; real PostgreSQL rehearsal including 96 operations, savepoint failure and full rollback. raw/postgres-rehearsal-2026-09-13.json binds manifest SHA-256 c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640. Prices, durations, assignments, credentials, slugs and publication state were preserved.

Run from root:
- node seo/brazil/build-package.mjs
- node backend/scripts/prepare-brazil-seo.mjs
- node --test backend/scripts/brazil-seo.test.mjs backend/scripts/spain-seo.test.mjs backend/scripts/romania-clinical-review.test.mjs backend/scripts/prepare-romania-seo.test.mjs

Collection refresh: node seo/spain/collect-evidence.mjs --brazil uses saved responses; archive dated evidence or use a new dated directory before a genuinely new collection. Do not mistake its cache for a fresh pre-write check. The production runner independently rereads authenticated source and refuses drift.

Required owner inputs: genuine approval of exact manifest/groups by a named Brazil clinician, reviewer identity/date/evidence and review-age policy; confirmation of actual ICP-Brasil signing/Atesta workflow. CFM confirms Renato's registrations and PA family-medicine RQE, but featured-doctor status is not consent.

The user says this prompt is not clinical approval. Repository ledger§43.4 requires enforcement “at the point of write.” §43.5 records reviewer/review-age policy dependencies; it names Spain specifically and is a pattern, not an invented Brazil policy. Article-specific rules are editorial-plan-2026-08-19.md§6: “A named authorDoctorId and a named reviewerDoctorId, both real, both consenting, both registered in a relevant jurisdiction.” Those article rules do not silently certify service bodies.

For approved publication, create authentic clinical-approval.json binding manifestSha256, reviewerDoctorId, reviewerName, reviewedAt, evidence, maxAgeDays and groups(key,approvedSha256). Add matching resulting hashes to APPROVED_BRAZIL_STATES and chosen maxAgeDays to BRAZIL_REVIEW_POLICY. Deploy tested backend enforcement with explicit production authorization, then record enforcement-deployment.json. No approvals or deployment receipts have been fabricated.

First group read-only dry-run through established DATABASE_URL:
node backend/scripts/apply-spain-seo.mjs --brazil --group=service:solicitacao-exames-online

After exact authorization append --apply --confirm=EXACT_GROUP_SHA256. Shared runner checks source snapshot, lock/transaction, approval and protected readback, saves rollback rows and requires each prior group's publicVerified receipt before continuing. Read-only defaults do not write.

Post-publication:
node seo/spain/verify-public.mjs --brazil --group=service:solicitacao-exames-online
This verifies each affected locale's metadata/H1, visible native FAQ/schema and unchanged canonical/alternates. Then verify browser behavior and protected API fields, update receipt and canonical ledger before the next group. Keep exact production URL cohorts and real 30/60/90 dates.

Rollback: every operation is an update with full before values. Reverse applied groups in reverse order. Prepare inverse column updates only, verify current rows equal the approved resulting state, obtain required rollback authorization/state approval, execute atomically and publicly reverify. Never restore the entire catalogue over concurrent edits. The rehearsal proves transaction rollback; no post-commit rollback has been performed.

Remaining work is explicit:48 retained pages,36 held legal/article pages and12 pages requiring further verification. Homepage, pricing, dedicated clinician landing page and retained service/body legal claims remain separate work. Review exact supplemental candidates before wider edits; do not claim a first metadata/FAQ batch resolves those bodies. New articles remain held on capacity/consent. Raw snapshots are completed evidence, not unfinished tasks.

Integrate local source before a later release; no new source commit/deployment ID exists. No merge or push performed. Keep September18/24/30 global checks unchanged.

Owner update: the user reports reviews by Dr tiago and Dr. Renato Sarmento and authorizes approval. See clinical-approval.json for the exact manifest/group binding. Review date and owner-selected maximum review age are still missing; executable approval remains gated. This supersedes the earlier no-approval statement for the prepared manifest only.

Repository hygiene: raw/ and generated storage-mutation-manifest.json / rollback-plan.json are ignored local artifacts. A third-party HTML capture triggered Mapbox secret detection. Unpushed history was rebuilt without these files; local evidence is preserved. Preparation, rehearsal and evidence integration tests require this local package; a fresh clone skips the evidence integration tests. Approval hashes still bind the unchanged local manifest.
