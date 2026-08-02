# Documentation index

Organised by **domain**, not by document type. A redesign program keeps its
spec and its audits together rather than splitting across `design/` and
`audits/`.

Two docs live outside this tree on purpose: `README.md` (repo overview) and
`CLAUDE.md` (agent instructions), both at the repo root. Service-specific docs
stay colocated with their service in [`frontend/docs/`](../frontend/docs) and
[`backend/docs/`](../backend/docs).

Filenames are kebab-case. A date in a filename means the document is a
point-in-time snapshot, not a living document.

---

## design/ — design systems and redesign programs

| path | what it is |
|---|---|
| [design-system-gh2-clinical-editorial.md](design/design-system-gh2-clinical-editorial.md) | **Authoritative public-site design system** (GH2 "Clinical Editorial", `gh2-*` tokens) |
| [standalone-html-design-kit.md](design/standalone-html-design-kit.md) | Paste-in kit for self-contained HTML: email previews, PDF sources, mockups |
| [admin-portal-design-brief.md](design/admin-portal-design-brief.md) | Design brief for the admin portal, pairs with `admin-portal-reference.html` |
| [admin-portal-reference.html](design/admin-portal-reference.html) | Offline click-through prototype of the admin portal |
| [portal-redesign/](design/portal-redesign) | Obsidian Ivory portal program — spec, audits, strategy, verification |
| [portal-redesign/portal-design-system-v2-obsidian-ivory.md](design/portal-redesign/portal-design-system-v2-obsidian-ivory.md) | **Authoritative portal design system** (`lux-*` tokens, `portal.css`) |
| [portal-redesign/lux-visual-pass.md](design/portal-redesign/lux-visual-pass.md) | Visual-only skin layer applied on top of the above |
| [portal-redesign/portal-shared-ui-dependency-map.md](design/portal-redesign/portal-shared-ui-dependency-map.md) | Blast-radius map — read before touching shared portal UI |
| [responsive/](design/responsive) | Responsive overhaul program |
| [responsive/handoff.md](design/responsive/handoff.md) | Migration history and entry point for the responsive work |
| [responsive/shared/responsive-design-system-plan.md](design/responsive/shared/responsive-design-system-plan.md) | The rules: z-token scale, type floors, height-axis tiers, theme fidelity |
| [responsive/portal/](design/responsive/portal) · [responsive/website/](design/responsive/website) | Per-surface inventories and audits |
| [public-website/](design/public-website) | Public-site UX/architecture plans and redundancy audits |

## audits/ — point-in-time findings

| path | what it is |
|---|---|
| [repo-review-findings-2026-06-10.md](audits/repo-review-findings-2026-06-10.md) | Repo-wide findings register (C/H/M ids), referenced from the root README |
| [code-review-2026-07-05.md](audits/code-review-2026-07-05.md) | Full code review, verifies which prior findings actually closed |
| [service-hub-parity-audit.md](audits/service-hub-parity-audit.md) | Service hub parity across countries |
| [wix-migration-product-audit.md](audits/wix-migration-product-audit.md) | Product-level gaps left by the Wix migration |
| [multilingual-and-ads-compliance-audit.md](audits/multilingual-and-ads-compliance-audit.md) | Ads-policy and multilingual compliance |
| [security/](audits/security) | Security round 2, the July go-live audit and its review, PRIV-002 retention table, and the 2026-08-02 scanner build-out (SCA/container/SAST/authz-rules/authz-matrix/DAST) — see `security-tooling-audit-2026-08-02.md` for the consolidated summary |
| [performance/](audits/performance) | Performance round 2 (P-001…P-022) |
| [portal/doctor/](audits/portal/doctor) · [portal/patient/](audits/portal/patient) | Per-page portal audits: route inventory, IA, a11y, responsive, prioritised plans |
| [seo/site-audit-2026-07/](audits/seo/site-audit-2026-07) | Generated site audit — full report, action plan, per-category findings |

## plans/ — forward-looking work

| path | what it is |
|---|---|
| [launch-blockers.md](plans/launch-blockers.md) · [next-phases-roadmap.md](plans/next-phases-roadmap.md) | Open blockers and roadmap |
| [audit2-execution-plan.md](plans/audit2-execution-plan.md) | Sequencing for the round-2 security + performance workstreams |
| [seo-indexation-plan-2026-07-28.md](plans/seo-indexation-plan-2026-07-28.md) · [ireland-internal-linking-seo.md](plans/ireland-internal-linking-seo.md) | SEO plans |
| [doctor-dashboard-parity-plan.md](plans/doctor-dashboard-parity-plan.md) · [doctor-booking-availability-system.md](plans/doctor-booking-availability-system.md) | Doctor-side feature plans |
| [subscription-plan-implementation.md](plans/subscription-plan-implementation.md) + `subscription-*.md`, [corporate-plan-implementation.md](plans/corporate-plan-implementation.md), [sprints/](plans/sprints) | Subscriptions and corporate plans |
| [patient-portal-expansion-plan.md](plans/patient-portal-expansion-plan.md) · [myglobalhealth-feature-sprint-plan.md](plans/myglobalhealth-feature-sprint-plan.md) | Patient-side and cross-cutting feature plans |
| [myglobalhealth-phase-2-medical-access-security-plan.md](plans/myglobalhealth-phase-2-medical-access-security-plan.md) | Medical-access security phase 2 |
| [admin-superadmin-country-legal-blog-plan.md](plans/admin-superadmin-country-legal-blog-plan.md) · [page-content-cms-implementation-prompt.md](plans/page-content-cms-implementation-prompt.md) | Admin and CMS plans |
| [shopping-cart.md](plans/shopping-cart.md) · [service-hub-parity-implementation.md](plans/service-hub-parity-implementation.md) · [per-section-background-color-spec.md](plans/per-section-background-color-spec.md) | Assorted implementation specs |
| [plans-subscriptions-audit-2026-07-05.md](plans/plans-subscriptions-audit-2026-07-05.md) | Subscriptions audit that drove the fixes |
| [security/](plans/security) | Go-live execution, PHI access recovery, post-launch hardening |
| [content-briefs/](plans/content-briefs) | Ireland GP and specialist content brief triage |
| [portal-implementation/](plans/portal-implementation) | Portal fix program: task, findings, execution, verification |

## i18n/ — localization

| path | what it is |
|---|---|
| [translation-handoff.md](i18n/translation-handoff.md) | How translation drafts get reviewed and applied |
| [remaining-audit-tasks.md](i18n/remaining-audit-tasks.md) | Open doctor-service and FAQ localization work |
| [locale-investigation-2026-07-16.md](i18n/locale-investigation-2026-07-16.md) | Root causes of mixed-language pages |
| [draft-review.md](i18n/draft-review.md) | Machine-translation draft review notes |
| [translation-audit/](i18n/translation-audit) | Audit output and the identical-string allowlist |

## guides/ — how-tos and references

| path | what it is |
|---|---|
| [dependency-overrides.md](guides/dependency-overrides.md) | Why `pnpm.overrides` must be mirrored into every service; CI gate |
| [credential-rotation.md](guides/credential-rotation.md) | Production credential rotation procedure |
| [subscriptions-runbook.md](guides/subscriptions-runbook.md) | Operating the subscription system |
| [security-scanning-runbook.md](guides/security-scanning-runbook.md) | Running OSV-Scanner/Trivy/Semgrep/the authz matrix/ZAP locally, suppressing false positives, seeding all 6 roles |
| [partner-booking-api.md](guides/partner-booking-api.md) | Partner booking API (+ Postman collection alongside) |
| [synlab-integration-questions.md](guides/synlab-integration-questions.md) | WebLIMS/Synlab protocol and open questions |
| [country-medical-disclaimers.md](guides/country-medical-disclaimers.md) | Per-country medical disclaimer requirements |
| [media-asset-upload.md](guides/media-asset-upload.md) | Uploading media assets correctly |

## testing/ — manual tests and QA

| path | what it is |
|---|---|
| [manual-tests/](testing/manual-tests) | Per-role manual test scripts, execution order, results, issues log |
| [staging-smoke-run-sheet.md](testing/staging-smoke-run-sheet.md) | Staging smoke run sheet |
| [second-pass-qa-report.md](testing/second-pass-qa-report.md) | Second-pass QA report |
| [manual-test-booking-availability.md](testing/manual-test-booking-availability.md) · [manual-test-health-test-and-prescription-forms.md](testing/manual-test-health-test-and-prescription-forms.md) | Feature-specific manual tests |
| [pdf-testing-fixes.md](testing/pdf-testing-fixes.md) | PDF generation QA notes |

## brand/ — brand assets

[brand/stripe/](brand/stripe) — Stripe-branding logo and icon set, with the
generator script and its README.

## archive/ — superseded, still cited

Kept because other documents reference them. Do not use as current guidance.

| path | superseded by |
|---|---|
| [2026-audit-round-1/](archive/2026-audit-round-1) | `audits/security/security-audit-2-*`, `audits/performance/performance-audit-2-*` |
| [2026-design-system-v1/](archive/2026-design-system-v1) | `design/design-system-gh2-clinical-editorial.md` |
| [2026-public-website-redesign/](archive/2026-public-website-redesign) | Program complete; current work in `design/public-website/` |
| [2026-wix-rebuild/](archive/2026-wix-rebuild) | The original rebuild prompt; the site shipped long ago |
| [2026-manual-test-sessions/](archive/2026-manual-test-sessions) | One-off dated session log |

---

## Not tracked in git

Regenerable output is gitignored — re-run the tool instead of committing it:
Lighthouse JSON under `audits/seo/*/lighthouse/`, screenshot sets
(`audits/seo/*/screenshots/`, `audits/portal/doctor/screenshots/`,
`plans/portal-implementation/screenshots/`, `audits/service-hub-screenshots/`,
`../frontend/docs/qa-screenshots/`).

`design-fetch/` and `design-fetch-2/` are large external design-handoff bundles
(~51 MB) kept on disk but out of git.
