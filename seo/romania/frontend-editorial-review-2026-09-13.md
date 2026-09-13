# Romania tool editorial cleanup, 13 September 2026

Prepared under the super admin's authorization to rewrite and publish retained Romania copy, with owner-reported verbal clinician approval. This file records editorial coverage, not a new clinical certification.

The existing country override in `frontend/lib/tools/market-copy.ts` now uses static `romania-editorial-tool-copy.json` for all six Romania locales (ro, en, cs, de, es, pt). The cleanup covers 549 dash-containing shared tool text fields across the eight tools, including descriptions, sections, FAQ answers, widget instructions and result summaries. Paired asides use parentheses; explanatory lists use colons; sentence boundaries use full stops. The six McIsaac trust lines also drop the unnecessary claim about not inventing the score. Existing Romania-specific tool FAQ answers receive the same cleanup, including complete sentences in the Romanian ADHD answer.

Only Romania receives these overrides. Shared locale JSON files are unchanged. Arrays are copied whole where required by the existing `deepMergeLocale` behavior; their order, length and unchanged entries are preserved. No runtime punctuation replacement was introduced.

Proof: `node node_modules/vitest/vitest.mjs run lib/tools/romania-editorial-tool-copy.test.ts lib/tools/registry.test.ts lib/tools/calc.test.ts` from `frontend/` passed all 51 tests. The editorial test checks all tool text and result bands in all six locales for remaining em dashes, unchanged numbers, URLs, placeholders, keys and array lengths, and verifies Ireland retains the original shared copy. Calculation and registry tests also passed. The parent task executed the checks after this worker's command hook developed a PowerShell parse error.

This bounded change does not independently reassess medical claims, thresholds, scoring or legal advice. It does not alter calculators, routes, service recommendations or links. Shared page shell prose is handled separately by the parent task. Deployment and public readback remain the parent task's responsibility; these tests do not claim publication.
