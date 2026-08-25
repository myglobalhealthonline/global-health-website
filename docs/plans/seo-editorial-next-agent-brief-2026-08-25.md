# SEO and editorial execution brief for the next agent

**Prepared:** 25 August 2026

**Site:** `https://www.myglobalhealth.online`

**Canonical SEO status:** `docs/plans/seo-control-state.md`

**Current editorial rules:** `docs/plans/editorial-plan-2026-08-19.md` §7

This is the detailed execution brief for the next agent. It translates the current
SEO ledger, OpenSEO evidence, production CMS audit and revised editorial plan into a
safe order of work. If this document conflicts with the canonical SEO control state,
the control state wins on current facts. If the evidence is older than the day the
agent starts, refresh the smallest relevant data set before acting.

## 1. Outcome to pursue

Run a selective, short-form editorial growth experiment without reopening the
completed technical SEO program.

The next agent should:

1. finish review of the two Week 1 production drafts;
2. reduce Week 2 from 36 local research copies to the approved 19-locale production
   matrix;
3. rewrite the six primary-language Week 2 articles to the compact standard;
4. use focused OpenSEO research to validate intent, supporting keywords, SERP shape
   and authority opportunities;
5. preserve medical, legal, localisation and clinician-review gates;
6. create production CMS drafts only after explicit approval;
7. keep standalone HTML copies in the existing draft layout;
8. measure indexation, query ownership, commercial paths and post-25-August funnel
   events at the registered 30/60/90-day gates; and
9. update the canonical ledger after any implementation or deployment.

The goal is not to publish the most articles. The goal is to discover which concise,
country-specific, service-adjacent articles earn qualified organic demand and support
bookings.

## 2. Current state: do not reinterpret it

### Production CMS

- Week 1 has 24 records: 22 live locale records across four topics and two
  blood-pressure drafts, one for Spain and one for Romania.
- The four live Week 1 topics are:
  - Portugal: autodeclaração de doença;
  - Ireland: Illness Benefit eligibility/application;
  - Czechia: eNeschopenka process; and
  - Ireland: sick certificate online and employee rights.
- Week 2 has **zero production CMS records**.
- A local HTML file, TypeScript content module or successful dry run is not a CMS
  draft and must never be reported as one.

### Local Week 2 material

- Thirty-six standalone locale copies exist locally: six topics multiplied by six
  languages.
- Those files are a research archive, not the approved production plan.
- Only 19 variants are approved for continued preparation.
- The 17 unplanned variants must not be seeded. Preserve them locally unless later
  Search Console or migration-corridor evidence justifies a new decision.

### SEO and measurement

- The six-market technical SEO program is complete and monitoring dated exceptions.
  There is no technical Wave 4.
- The disclosed 28-day Search Console blog rows ending 22 August produced 64 clicks
  and 8,120 impressions, versus 5 clicks and 1,092 impressions in the comparison
  window. This supports a measured content experiment, not blanket output.
- The conversion funnel events `begin_booking`, `begin_checkout` and `purchase` were
  verified in production on 25 August. Data before that deployment cannot prove blog
  lead or revenue performance.
- The 25 August OpenSEO crawl covered 100 URLs but included no blog, tool or doctor
  pages. Its metadata counts are a limited service-page sample, not a sitewide content
  verdict.
- The backlink snapshot showed 62 referring domains. Authority is still a larger
  constraint than article length or keyword density.

## 3. Mandatory reading order

Before changing content, read:

1. `AGENTS.md`;
2. `CLAUDE.md`;
3. `docs/plans/seo-handover-codex.md`;
4. `docs/plans/seo-control-state.md` §0, §5, §6, §7, §21.10, §22 and §27;
5. `docs/audits/seo/README.md`;
6. `docs/audits/seo/seo-roadmap-review-2026-08-25.html`;
7. `docs/plans/editorial-plan-2026-08-19.md` §7;
8. `docs/plans/content-drafts/week-2/README.md`; and
9. the existing live blog template and at least one recent local HTML copy.

Do not use an older audit as current status. Historical numbers remain useful only
when labelled with their date and compared with fresh evidence.

## 4. Tool and skill workflow

### Blog-writing workflow

Use the available Claude Blog or repository blog-writing skill for research,
outlining, drafting and post-writing review. Skill names can differ between agent
environments. If a literal `Claude Blog` skill is unavailable, use the installed blog
workflow components such as blog brief, outline, write, fact-check, SEO check and
humanisation, and state the substitution clearly.

The writing skill does not override the compact standard, clinical-review gates or
production-approval boundary in this brief.

### OpenSEO workflow

Use OpenSEO for evidence, not keyword stuffing.

1. Inspect the callable OpenSEO MCP tools in the current environment. If `whoami` is
   available, use it to confirm the connection and credit balance. If it is not, make
   one small read-only call and confirm the response belongs to this domain.
2. If `list_projects` is available, resolve the existing Global Health project and do
   not create a duplicate. If project helpers are absent, use the already-connected
   project context exposed by the available tools and verify `myglobalhealth.online`
   in the returned evidence. Stop if the project/domain cannot be established safely.
3. Pull current Search Console evidence for the exact topic, owner page and possible
   competing pages.
4. Run one focused keyword/metric query for the primary term and the few supporting
   terms that answer the same intent.
5. Inspect the current SERP for intent, page type, freshness, authority and recurring
   user questions.
6. Check exact-page or domain backlinks only when they inform a realistic linkable
   asset or prospect.
7. Record the query, market, language, date, volume, difficulty and source. Do not mix
   Search Console impressions with estimated monthly search volume.
8. Keep focused research below roughly 2,000 OpenSEO credits unless the owner approves
   a larger batch.

Do not rerun the full site crawl for these articles. The current 100-page crawl is
already known to omit the relevant page families. Use focused keyword, GSC, live-page
and SERP checks.

### Primary-source research

OpenSEO shows demand; it does not establish medical or legal truth. Verify benefit
rates, employment processes, licence rules, emergency thresholds and clinical claims
against current primary sources. Prefer government departments, national regulators,
professional bodies and current clinical guidelines. Record access dates and avoid
long quotations.

## 5. Phase A: close Week 1 review work

### Spain blood-pressure draft

Review the production draft for:

- one clear normal-blood-pressure intent;
- natural Spanish terminology and no literal English section leakage;
- avoidance of promises that age or sex creates a separate diagnostic threshold when
  current guidelines do not support that simplification;
- a clear distinction between a reference table and clinical diagnosis;
- emergency language that does not encourage self-treatment;
- a link to the live chronic-conditions consultation because stable hypertension can
  be assessed and managed at GP level;
- a cardiology link only where specialist escalation is relevant; and
- a real clinician author/reviewer and review date before publication.

### Romania blood-pressure draft

Review the production draft for:

- one clear normal-values-by-age intent;
- a direct explanation that stable hypertension can be managed in a GP-level chronic
  conditions consultation;
- a market-local link to that service;
- safe urgent-care boundaries and no dosing advice;
- Romanian clinical and language review; and
- a real clinician author/reviewer and review date before publication.

### Week 1 completion rule

Do not publish either draft simply because its copy is complete. Report findings,
apply local or CMS draft corrections only within the user's authority, and use the
normal administrator workflow for publication. After any approved production change,
read the record back and verify its status, slug, links, bylines and timestamps.

## 6. Phase B: prepare the Week 2 cohort

### Exact approved matrix: 19 variants

| # | Primary market topic | Primary language | Approved locales | Count |
| --- | --- | --- | --- | ---: |
| 7 | Portugal: baixa médica amount and calculation | `pt` | `pt`, `en`, `de` | 3 |
| 8 | Ireland: Illness Benefit amount and payment timing | `en` | `en`, `ro`, `es`, `pt`, `de` | 5 |
| 9 | Czechia: 2026 sickness-pay calculation | `cs` | `cs`, `en`, `de` | 3 |
| 10 | Spain: high-blood-pressure symptoms and urgent care | `es` | `es`, `en`, `de` | 3 |
| 11 | Romania: what safely lowers a high reading and what does not | `ro` | `ro`, `en` | 2 |
| 12 | Portugal: driving medical certificate Groups 1 and 2 | `pt` | `pt`, `en`, `de` | 3 |
|  | **Total** |  |  | **19** |

Prepare the six primary-language articles first, but keep no more than three topics in
active drafting or review at the same time. Complete or pause one before activating a
fourth. The other 13 variants remain local until native-language review is available.
Do not treat English copy as automatic approval for a translated locale.

### Cohort order

Prepare and review the administrative cohort first:

1. Portugal sickness-benefit amount and calculation;
2. Ireland Illness Benefit amount and payment timing; and
3. Czech sickness-pay calculation.

Then prepare the legal/clinical cohort:

4. Portugal driving medical certificate Groups 1 and 2;
5. Spain high-blood-pressure symptoms and urgent care; and
6. Romania immediate blood-pressure safety and myth correction.

This order reduces reviewer risk and lets the team learn from administrative content
before releasing safety-sensitive articles.

## 7. Per-article production procedure

Follow this sequence separately for each topic. Do not bulk-rewrite all six before
checking the first article against the live UI and review requirements.

### Step 1: establish ownership and cannibalisation boundary

- Identify the primary query and its jurisdiction.
- Pull current GSC rows for the proposed slug, owner service page and any existing
  article that may already answer the intent.
- State which page owns the new intent and which nearby intent belongs elsewhere.
- Prefer updating an existing owner page when the new article would compete with it.

### Step 2: refresh focused keyword evidence

- Confirm the primary query's current volume and difficulty for the correct market and
  language.
- Keep only secondary queries that answer the same user need.
- Convert recurring SERP questions into headings or FAQs only when they add a distinct
  answer.
- Exclude unrelated high-volume terms, unsafe remedy queries and terms owned by a
  different service or article.

### Step 3: refresh factual sources

- Verify every annual rate, qualifying rule, legal distinction and medical threshold
  on the day of drafting.
- Prefer primary sources listed in the Week 2 research record.
- Mark any source ambiguity for human review instead of smoothing it into a confident
  claim.

### Step 4: write the compact primary-language article

Use these working ranges:

- administrative/process content: usually 600–900 words;
- clinical and safety-sensitive content: usually 700–1,200 words.

These are not ranking targets. A shorter article is acceptable when it safely and
fully answers the intent.

Every article should have:

- a natural title and H1 centred on one primary query;
- a direct answer in the first 80–120 words;
- short sections matching the actual decision journey;
- one exact service CTA family;
- three to five useful contextual internal links;
- two to four FAQs only when each answers a separate evidenced question;
- a calm, human voice with varied sentence structure and no repetitive AI summary;
- a clear jurisdiction and current-year label where rules or rates change;
- qualified language around eligibility, diagnosis, certificates and outcomes; and
- named primary sources.

Do not insert every OpenSEO keyword. Do not repeat the primary phrase mechanically.
Do not add history, generic definitions or filler conclusions solely to increase word
count.

### Step 5: connect the correct service

- Portugal sickness benefit: link `baixa-medica`; distinguish medical certification
  from state benefit entitlement.
- Ireland payment article: link the sick-certificate service, GP consultation and the
  existing claim/eligibility guide; do not duplicate that guide.
- Czech calculation: link `neschopenka-online`; keep process instructions in the
  existing eNeschopenka article.
- Spain urgent-care article: link the live chronic-conditions consultation for stable
  GP management and cardiology for appropriate escalation. Emergency symptoms must
  point to 112, not the booking funnel.
- Romania safety article: link `boli-cronice-online` and the blood-pressure tool.
  Never suggest extra, leftover or unprescribed medication.
- Portugal driving certificate: link
  `services/certificado-medico-carta-de-conducao`; never guarantee approval.

Fetch every final internal URL from production. An intended route in a plan is not
proof that the route exists or is enabled in that market.

### Step 6: humanise and review

- Use the humanisation/deslop pass after factual drafting, not before.
- Remove formulaic transitions, repeated conclusions, fake quotations and inflated
  claims.
- Keep necessary medical cautions even if they make the prose less promotional.
- Have a native-language reviewer check each locale independently.
- Require clinician review for clinical/safety articles and any medical claim.
- Require current legal/administrative review for benefit rates and driving rules.

### Step 7: SEO and quality check

Verify:

- one H1;
- distinct title and meta description within sensible display lengths;
- primary query used naturally in the title, H1, opening and one helpful heading;
- no unrelated keyword sections;
- self-canonical and correct locale/hreflang behaviour when rendered by the existing
  blog framework;
- named author, reviewer and real `lastReviewedAt`;
- all visible links have meaningful anchor text;
- no broken internal or source links;
- no duplicated intent with a live article, tool or service page;
- CTA matches the article and market;
- no guaranteed certificate, benefit, diagnosis, treatment or outcome; and
- safe emergency escalation that does not route urgent cases into telemedicine.

### Step 8: preserve the existing UI

- Match the current blog layout, styling, content blocks, table treatment, CTA blocks,
  review/source sections and responsive behaviour.
- Reuse existing components and CSS. Do not redesign the blog or introduce a parallel
  template.
- Keep one standalone HTML copy for each approved local draft in the existing Week 2
  draft directory and update its manifest/readme.
- Inspect representative desktop and mobile output when markup or components change.

### Step 9: CMS dry run and approval boundary

`backend/.env` points at production.

Before any write:

1. inspect the seeder and confirm it defaults to dry-run;
2. run collision checks for country, service, slug, title, author and reviewer;
3. print the exact records that would be created or changed;
4. confirm every target is one of the approved 19 variants;
5. show the user the dry-run result; and
6. obtain explicit approval for the production mutation.

Receiving this brief is not production approval. Do not infer approval from an older
request to write HTML copies or from a prior Week 1 production action.

When approval is given, create **drafts**, not published posts. Preserve existing rows
on collision. After the write, read the records back and report IDs, slugs, locales,
status and whether any target was skipped.

## 8. Phase C: authority work in parallel

Content alone will not close the authority gap.

For each priority administrative cluster:

1. validate five to ten relevant partner, employer, expatriate, medical-directory or
   professional-resource prospects;
2. discard link farms, irrelevant article directories and paid placements that exist
   only to manipulate rankings;
3. identify the exact page and linkable asset the prospect would reasonably cite;
4. draft a short personalised outreach message locally; and
5. record the prospect, rationale, proposed anchor and status.

Do not send outreach, modify profiles, purchase links or contact third parties without
explicit approval. “Prospect found” is not “backlink acquired.” Report acquired links
only after verifying the live referring page and target URL.

## 9. Measurement plan

Record a baseline when a post becomes indexable. Use complete Search Console dates
and only post-25-August GA4 funnel data.

### At 30 days

Check:

- indexation and canonical selection;
- queries and country/device ownership;
- impressions and early ranking direction;
- whether the intended page owns the query;
- whether another page is cannibalising the intent; and
- crawl or rendering exceptions.

Do not call a page a failure because it has no conversion on a small sample.

### At 60 days

Check:

- clicks and CTR relative to actual position;
- qualified internal movement to the intended service;
- CTA use where measured;
- query expansion or drift; and
- whether the article needs a snippet, structure or internal-link improvement.

### At 90 days

Combine:

- qualified organic landings;
- `begin_booking`;
- `begin_checkout`;
- `purchase`;
- assisted commercial paths; and
- relevant referring domains acquired.

Decide whether to scale the topic/locale pattern, refresh the page, consolidate it
with an owner page, or stop producing similar content.

Publication count, total keywords inserted and raw word count are not KPIs.

## 10. Registered calendar

| Date | Required check | Action rule |
| --- | --- | --- |
| 25 Aug–8 Sep | Finish Week 1 review, compact six primary Week 2 articles, validate funnel events, prepare authority actions | Maximum three active clusters; no 36-record import |
| ~1 Sep | Czech travel-medicine redirect lag and Portugal doctor recrawl | Work only a verified exception |
| ~4 Sep | Brazil Sarmento recrawl | Keep Brazil editorial expansion deferred without capacity and non-brand demand |
| ~6 Sep | Romania doctor recrawl and second-opinion signal | Prefer owner-page improvement over a competing article |
| **~8 Sep** | Ireland labs, Czech GP ramp, Spain dermatology, SEO-DOC-004 and first editorial cohort | Do not modify the lab cluster before this gate |
| **~30 Sep** | Country FAQs, legacy consolidation and first meaningful editorial 30-day review | Expand only clear query owners with useful commercial paths |
| ~13 Nov | Brazil/Romania commercial SERP walls and 60-to-90-day cohort evidence | Scale, refresh, consolidate or stop from evidence |

## 11. Work that remains closed or deferred

Do not reopen these without new verified evidence:

- broad technical SEO remediation or a new Wave 4;
- blanket title and meta-description rewrites from the limited 100-page crawl;
- mass `noindex` of low-impression locale variants;
- tool CTA rebuilding without page-level performance evidence;
- Ireland lab-cluster content, schema or linking changes before the 8 September gate;
- prescription content while the Google Ads trade-off remains binding;
- generic blood-pressure or ADHD articles that compete with an existing tool, article
  or service owner page;
- Brazil content expansion before clinical capacity and non-brand demand improve;
- Spain dermatology and online-versus-in-person articles when an existing page can be
  updated; and
- rewriting historical audit numbers to make them look current.

## 12. Hard stops requiring user or owner input

Stop and request direction before:

- creating, updating or publishing production CMS records;
- changing a live article's publication status;
- sending backlink outreach or changing a third-party profile;
- assigning a clinician as author or reviewer without consent;
- inventing a review date or treating AI review as clinician review;
- changing benefit/legal figures when primary sources conflict;
- changing emergency or medication guidance without clinical review;
- creating an unapproved locale variant;
- spending more than the agreed OpenSEO research budget;
- pushing, merging or deploying; or
- modifying unrelated dirty-worktree files.

## 13. Repository and commit discipline

This is a shared clone. Unrelated changes can appear without warning.

- Run `git status` before editing and immediately before staging.
- Preserve unrelated modified and untracked files.
- Stage explicit paths only. Never use `git add .` or `git add -A`.
- Use `git log` and live production checks as the source of truth for what shipped.
- Type-check per package, never from the repository root.
- If content scripts change, run their focused tests and dry-run path.
- If frontend blog rendering changes, run the relevant unit tests and the frontend
  type-check.
- Review the staged diff, run `git diff --cached --check`, perform a secret scan and
  obtain a correctness/security review before committing.
- Use a conventional commit such as `docs(content): prepare selective week 2 cohort`
  or `feat(content): create approved week 2 drafts`.
- Do not push or merge unless explicitly asked.

## 14. Required handoff deliverables

At the end of the next agent's work, provide:

1. a factual production-state table: live, draft, local-only and skipped counts;
2. the exact topics and locales changed;
3. the focused OpenSEO queries, dates and evidence used;
4. source and clinical/native-review status for each article;
5. CMS dry-run output and, if separately approved, created/updated record IDs;
6. paths to the standalone HTML copies;
7. internal/service link verification results;
8. tests, type-checks, HTML checks and security review results;
9. the canonical ledger update describing what production serves now, what Google
   currently reports and what remains historical;
10. if a commit was explicitly requested and created, its hash and exact committed
    paths; and
11. a clear list of actions still waiting on human approval.

## 15. Copy-paste instruction for the next agent

Use the following as the task prompt together with this file:

> Continue the Global Health SEO/editorial program from
> `docs/plans/seo-editorial-next-agent-brief-2026-08-25.md`. Read every mandatory
> source listed in §3 before acting. Treat `docs/plans/seo-control-state.md` as the
> canonical status ledger and historical audits as dated evidence only. Use the
> available Claude Blog/blog-writing workflow and OpenSEO MCP together for focused
> keyword, SERP, Search Console and backlink research. Do not rerun a broad crawl.
> Finish the two Week 1 draft reviews, then reduce Week 2 from 36 local research
> copies to the exact 19 approved variants and rewrite the six primary-language
> articles first. Keep the content concise, human, service-adjacent and medically
> safe. Match the existing blog UI and maintain standalone HTML copies. Do not create
> or change production CMS records, publish content, send outreach, push or deploy
> without explicit approval. Dry-run production scripts first, verify every live
> route, preserve unrelated worktree changes, update the canonical ledger after any
> approved implementation, stage explicit paths only, run the required reviews and
> tests, and return the evidence, record state, committed paths and commit hash.
