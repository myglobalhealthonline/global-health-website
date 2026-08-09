# Sick-cert legacy signal consolidation — 2026-08-09

Scoped follow-up to `docs/audits/seo/ranking-growth-batch-2026-08-09.md`,
which surfaced the sick-cert cluster's cannibalization from legacy/ghost
URLs. This batch resolves those ghosts only — no other SEO work.

## Fresh GSC cluster pull (90d, 2026-05-06→2026-08-06)

| URL | Clicks | Impr | CTR | Pos |
| --- | --- | --- | --- | --- |
| `/ireland/en/blog/sick-certificate-ireland-employee-rights` (CURRENT, informational) | 11 | 1,407 | 0.8% | 14.7 |
| `/ireland/en/services/sick-certificate-ireland` (CURRENT, transactional) | 0 | 352 | 0% | 46.9 |
| `/ireland/sick-leave` (GHOST) | 0 | 424 | 0% | 50.6 |
| `/ireland/es/health/sick-cert-online` (GHOST) | 2 | 168 | 1.2% | 28.1 |
| `/ireland/ro/health/sick-cert-online` (GHOST) | 1 | 13 | 7.7% | 16.3 |
| `/ireland/cs/services/sick-certificate-ireland` (current, other locale) | 0 | 2 | 0% | 82 |
| `/ireland/es/services/sick-certificate-ireland` (current, other locale) | 0 | 2 | 0% | 8 |
| `/ireland/de/services/sick-certificate-ireland` (current, other locale) | 0 | 1 | 0% | 2 |

Complete set for `contains: sick` in Ireland — no ghosts beyond the three
named ones were found (8 total URLs).

## Historical intent evidence

**`/ireland/sick-leave`** — resolved 2026-07-30, commit `699a89b2`, on
evidence not slug-guessing: a full 90-day, 1,251-URL GSC re-audit found this
bare legacy path drawing 291 impressions with zero exact-successor rule, so
it was mapped to `services/sick-certificate-ireland` (transactional —
matches every other resolved bare-`/ireland/<slug>` mapping in that same
commit, none of which point at informational content). **Verified live
2026-08-09: already correct, single hop, no action taken this batch** — it
is covered by a new regression test only.

**`/ireland/{es,ro}/health/sick-cert-online`** — code evidence
(`health-service-canonical.ts`, decision dated 2026-08-03): "1,261-word
sick-cert service page already covers this query; the health page
cannibalises it (position 56-77 range)." That decision set a canonical tag
but deliberately kept the page `index,follow` — a canonical-only
consolidation. Fresh data shows canonical-only wasn't sufficient: Google
kept both variants independently indexed and ranking. Classification: **A —
same transactional intent as the current service**, confirmed by the
existing canonical tag itself.

## Redirects implemented

Moved `ireland:sick-cert-online` from `HEALTH_SERVICE_CANONICAL` (canonical
tag only) to `HEALTH_RETIRED_REDIRECTS` (the existing mechanism already used
for the `international-students` retirement) + one `next.config.ts` rule
covering all 6 locale variants in a single pattern:

```
/ireland/:lang/health/sick-cert-online → /ireland/:lang/services/sick-certificate-ireland
permanent: true
```

All 6 locales redirect, not just ES/RO — the underlying map is keyed by
slug, not locale, so EN/PT/CS/DE (negligible traffic, same duplicate-content
pattern) get the same one-hop treatment for consistency rather than being
left in a weaker canonical-only state.

`/ireland/sick-leave` — no change; already fixed.

## One-hop production verification (post-deploy, redirect-following disabled)

| URL | Status | Location |
| --- | --- | --- |
| `/ireland/sick-leave` | 308 | `/ireland/en/services/sick-certificate-ireland` |
| `/ireland/en/sick-leave` | 308 | `/ireland/en/sick-certificate-ireland` |
| `/ireland/es/health/sick-cert-online` | 308 | `/ireland/es/services/sick-certificate-ireland` |
| `/ireland/ro/health/sick-cert-online` | 308 | `/ireland/ro/services/sick-certificate-ireland` |
| `/ireland/{en,pt,cs,de}/health/sick-cert-online` | 308 | matching `/ireland/{lang}/services/sick-certificate-ireland` |

Every Location target independently confirmed 200, terminal (not itself a
redirect source) — zero two-hop chains.

## Current-page regression

All 7 checked (6 service locales + article): `200`, `index, follow`,
self-canonical. Article and service remain separate pages with distinct
canonicals — not merged, not cross-canonicalized. ES service-page hreflang
set: all 6 `{lang}-IE` alternates + `x-default`, no ghost URL present.

## Internal links

Audited before this batch (source grep across frontend/backend + DB query
across `BlogPost.body`, `Service.detailBody`, `ServiceTranslation.detailBody`,
`ServiceLink.targetHref`, `ServiceLinkTranslation.body`): **zero** hits for
any of the three legacy URLs. This batch made no content edits, so the count
stays zero. (`frontend/data/routes.ts` and the unpublished, `DO NOT RUN yet`
`backend/scripts/seed-intent-landers.ts` both reference these slugs as
inventory/draft data, not live rendered links — left untouched, out of
scope.)

## Sitemap / hreflang

Ghost URLs: absent from sitemap and from every hreflang cluster, before and
after. Target service URLs: present in sitemap, correct 6-locale hreflang
set, indexable — confirmed live post-deploy.

## Files changed

- `frontend/next.config.ts` — 1 new redirect rule (6 locales via `:lang`)
- `frontend/lib/seo/health-service-canonical.ts` — moved 1 map entry
- `frontend/lib/seo/health-service-canonical.test.ts` — updated for the move
- `frontend/tests/unit/sick-cert-legacy-redirects.test.ts` — new, 12 focused tests

## Tests

73/73 pass (12 new + 26 updated health-service-canonical + 35 pre-existing
`legacy-doctor-redirects`, re-run against the final committed state — no
rule-order regression). `tsc --noEmit` clean. Full `next build`
(`ALLOW_DEGRADED_BUILD=1`) exit code 0, no errors or warnings.

## Deployment

Pushed to `Dev-hassaan` (commit `8e69793c`), confirmed on remote via fresh
`git fetch`. Auto-deploys from this branch — verified live in production
within minutes of push (redirects firing, targets 200, sitemap updated).

## GSC baseline (2026-08-09, for the 14d/28d follow-up)

| URL | Clicks | Impr | CTR | Pos |
| --- | --- | --- | --- | --- |
| `/ireland/en/blog/sick-certificate-ireland-employee-rights` | 11 | 1,407 | 0.8% | 14.7 |
| `/ireland/en/services/sick-certificate-ireland` | 0 | 352 | 0% | 46.9 |
| `/ireland/sick-leave` (ghost, expect → 0) | 0 | 424 | 0% | 50.6 |
| `/ireland/es/health/sick-cert-online` (ghost, expect → 0) | 2 | 168 | 1.2% | 28.1 |
| `/ireland/ro/health/sick-cert-online` (ghost, expect → 0) | 1 | 13 | 7.7% | 16.3 |

Follow-up dates: **2026-08-23** (14d), **2026-09-06** (28d). Expected:
ghost impressions decay toward zero as Google re-crawls and drops the
redirected URLs; some of that signal should migrate to the service page's
impressions. No ranking/traffic claim made today — redirects went live
minutes before this baseline was captured.

## Unresolved

None. All three named ghosts had high-confidence evidence and were resolved
(one already fixed in a prior batch, two fixed this batch). No ambiguous
case was forced.
