# SEO workspace

This is the entry point for SEO work across Global Health's six markets. The
workspace separates detailed country evidence without creating six competing
status ledgers.

## Session recovery — 9 September 2026

The repository retains the SEO audit history, country research, raw exports,
publication receipts and measurement plans. Lost chat sessions are not needed to
resume from this evidence. This recovery checked repository files and Git history;
it did not take a new live SEO measurement or recover deleted conversations.

| What to recover | Where to start |
| --- | --- |
| Current work, results and next measurement dates | [Canonical ledger](../docs/plans/seo-control-state.md): §§5–7, 27, 41–50; Spain/Romania/Brazil next, existing changed pages on recrawl watch |
| Google login and latest aggregate measurement check | [9 September review](../docs/audits/seo/google-access-review-2026-09-09.md); browser access verified, API reconnection remains separate |
| Latest full six-market audit | [4 September report](../docs/audits/seo/six-market-seo-audit-2026-09-04.md) and [HTML](../docs/audits/seo/six-market-seo-audit-2026-09-04.html); apply later ledger updates |
| Global audit history from July onward | [Audit index](../docs/audits/seo/README.md) |
| Original audit, GSC/GA4 baselines and offsite research | [Original audit](../myglobalhealth.online-audit/FULL-AUDIT-REPORT.md) and its sibling files |
| Country keywords, competitors, briefs and write receipts | The six country READMEs below; Spain/Romania/Brazil also use embedded ledger evidence |
| Editorial plan and saved article drafts | [Editorial plan](../docs/plans/editorial-plan-2026-08-19.md), [briefs](../docs/plans/content-briefs/) and [drafts](../docs/plans/content-drafts/) |
| Performance audit and deployment evidence | [9 September audit](../docs/audits/performance/2026-09-09/README.md) and [remediation](../docs/audits/performance/2026-09-09/REMEDIATION.md) |
| Searchable list of recovered evidence files | [File inventory](file-inventory.csv); paths are relative to the repository root |
| Operating rules and tool setup | [Handover](../docs/plans/seo-handover-codex.md); old machine paths and connectivity claims require verification |

The inventory covers the country workspaces, global and original SEO audits,
performance evidence, SEO/editorial plans, briefs and drafts. It is a navigation
snapshot, not a second status ledger or a complete application-source inventory.
To rebuild it from the repository root in PowerShell:

```powershell
git ls-files --cached --others --exclude-standard -- seo docs/audits/seo myglobalhealth.online-audit docs/audits/performance docs/plans |
  Where-Object { $_ -ne 'seo/file-inventory.csv' -and ($_ -match '^(seo/|docs/audits/seo/|myglobalhealth.online-audit/|docs/audits/performance/)' -or $_ -match '^docs/plans/(.*seo.*|editorial-.*|content-briefs/.*|content-drafts/.*)$') } |
  Sort-Object -Unique |
  ForEach-Object { [pscustomobject]@{ path = $_ } } |
  Export-Csv -LiteralPath seo/file-inventory.csv -NoTypeInformation -Encoding utf8
```

For future sessions, start here and read ledger §48 for the recovery checkpoint.
Save each new audit/export with its date, then record its measured window, source,
result, implementation/deployment evidence and next check in the canonical ledger.
Commit evidence and ledger updates together using explicit paths; remote backup
requires a push. Uncommitted local recovery changes are not yet a remote backup.

## Source-of-truth contract

- [`docs/plans/seo-control-state.md`](../docs/plans/seo-control-state.md) is the
  **global operational ledger**. It alone owns current priorities, status,
  deadlines, completed work and next actions.
- `seo/<country>/` owns the detailed, dated evidence for that market: audits,
  keyword data, competitor research, content opportunities, technical analysis,
  briefs and raw exports.
- [`docs/audits/seo/`](../docs/audits/seo/) holds global reports and historical
  audit evidence.
- A country file can support a decision, but it cannot silently reopen, close or
  reschedule a ledger item. Promote the concise decision and evidence link to the
  global ledger.

## Markets

| Market | Primary route | Country workspace | Market evidence in global ledger |
| --- | --- | --- | --- |
| Ireland | `/ireland/en` | [Ireland](ireland/README.md) | Global ledger §§10, 18, 28–34 |
| Czechia | `/czechia/cs` | [Czechia](czechia/README.md) | Global ledger §§10–17, 27.16–27.21 and 36 |
| Portugal | `/portugal/pt` | [Portugal](portugal/README.md) | Global ledger §§19, 27.22, 35 and 37 |
| Spain | `/spain/es` | [Spain](spain/README.md) | Global ledger §19 |
| Romania | `/romania/ro` | [Romania](romania/README.md) | Global ledger §§20–21 |
| Brazil | `/brazil/pt` | [Brazil](brazil/README.md) | Global ledger §20 |

Searcher country, page market and page language are different dimensions. Store
research under the market it targets, even when the page or query uses another
language.

## Read order

1. Read [`docs/plans/seo-handover-codex.md`](../docs/plans/seo-handover-codex.md)
   once for process and tooling constraints.
2. Read global ledger §0 and only the global status/watchlist/roadmap sections
   needed for the task.
3. Read the relevant country `README.md`, then its dated evidence files.
4. Refresh the smallest relevant GSC/OpenSEO data set and verify live production
   before acting.

## Legacy transition

Global ledger §§10–21 and 28–35 contain detailed country evidence written before
this workspace contract. They remain embedded so existing section links and the
historical decision trail do not break. The Czechia, Spain, Romania and Brazil
READMEs index that legacy evidence; the absence of copied local files does not mean
those markets were never researched.

From 2026-08-31 forward, new detailed market evidence starts in `seo/<country>/` and
only its concise decision, status and evidence link are promoted to the global
ledger. Migrate older embedded evidence only when a market is actively refreshed;
do not create a second copy merely to fill the folder.

## Country package contract

Use the Ireland and Portugal packages as the established naming pattern. Create an
artifact only when real evidence exists; an empty folder or placeholder file gives
an agent false confidence that the work was performed.

| Evidence | Preferred artifact |
| --- | --- |
| Baseline and market audit | `01-baseline-audit.md` |
| Competitor and SERP research | `02-competitor-landscape.md` plus dated CSVs |
| Keyword research | `03-keyword-master.csv` |
| Content opportunities | `04-content-gap.csv` and `content-briefs/` |
| URL ownership | `05-url-keyword-map.csv` |
| Proposed information architecture | `06-proposed-site-architecture.md` |
| Technical findings | `07-technical-audit.md` |
| Authority opportunities | `08-backlink-opportunities.csv` |
| Supporting exports | `raw/` |

Implementation state, measurement dates and future actions stay in the global
ledger. Existing country implementation logs and roadmaps are dated evidence, not
parallel control files.

## Update flow

1. Save detailed findings and exports in the relevant country workspace.
2. Add one concise dated status/action entry with an evidence link to the global
   ledger.
3. Keep cross-market/template findings global rather than copying them into all six
   countries.
4. After an approved implementation or deployment, update the global ledger before
   starting another batch.
