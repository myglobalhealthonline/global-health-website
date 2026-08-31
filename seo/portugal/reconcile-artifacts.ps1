$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$masterPath = Join-Path $root "03-keyword-master.csv"
$gapPath = Join-Path $root "04-content-gap.csv"
$mapPath = Join-Path $root "05-url-keyword-map.csv"
$clinicalPath = Join-Path $root "clinical-review-register.csv"
$inventoryPath = Join-Path $root "target-page-inventory.csv"
$exclusionsPath = Join-Path $root "raw/keyword-exclusions-final.csv"
$callLogPath = Join-Path $root "raw/openseo-call-log.jsonl"
$sourceLogPath = Join-Path $root "raw/keyword-source-log.csv"

$master = @(Import-Csv -LiteralPath $masterPath)
$priorExclusions = if (Test-Path -LiteralPath $exclusionsPath) { @(Import-Csv -LiteralPath $exclusionsPath) } else { @() }
$prescriptionSignals = 'prescri|receitas? m[eé]dic|pedir receitas?|renovar receita|renova[cç][aã]o (?:de )?receita|receitas? online|receita sns|sns receita|receita sem papel|receita desmaterializada|portal de prescri|portal da sa[uú]de pedir medicamentos|portal de requisi[cç][aã]o de vinhetas e receita|poupe na receita infarmed|receita sa[uú]de|medicamentos? sujeitos? a receita'
$unsupportedPrescriptionIntent = 'veterin|modelo|exemplo|tradu[cç]|tradutor|download|gr[aá]tis|sem receita|c[aá]lculo de medicamento|queda de cabelo|perda de peso|interiores|[oó]culos'

$excluded = @($master | Where-Object {
    ($_.cluster_id -eq 'prescription-renewal' -and
        (($_.keyword_source -notmatch 'competitor_ranked' -and $_.normalised_keyword -notmatch $prescriptionSignals) -or
            $_.normalised_keyword -match $unsupportedPrescriptionIntent)) -or
    $_.normalised_keyword -match '^emprego m[eé]dico'
})

$excludedKeys = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$excluded | ForEach-Object { [void]$excludedKeys.Add("$($_.cluster_id)`t$($_.normalised_keyword)") }
$master = @($master | Where-Object { -not $excludedKeys.Contains("$($_.cluster_id)`t$($_.normalised_keyword)") })

$newExclusions = @($excluded | ForEach-Object {
    [pscustomobject]@{
        keyword = $_.keyword
        cluster_id = $_.cluster_id
        exclusion_reason = if ($_.cluster_id -eq 'prescription-renewal') { 'non-medical, unsupported, or non-Portugal receita intent' } else { 'non-patient employment intent' }
        source = $_.keyword_source
        collected_at = $_.collected_at
    }
})
@($priorExclusions + $newExclusions | Sort-Object cluster_id, keyword -Unique) | Export-Csv -LiteralPath $exclusionsPath -NoTypeInformation -Encoding utf8NoBOM
$master | Export-Csv -LiteralPath $masterPath -NoTypeInformation -Encoding utf8NoBOM

$oldGaps = @(Import-Csv -LiteralPath $gapPath)
$gapByKeyword = @{}
$oldGaps | ForEach-Object { $gapByKeyword[$_.keyword] = $_ }
$gaps = @($master | Where-Object { $_.keyword_gap -eq 'yes' -and [int]$_.business_fit -ge 4 } | ForEach-Object {
    $old = $gapByKeyword[$_.keyword]
    [pscustomobject]@{
        cluster_id = $_.cluster_id
        keyword = $_.keyword
        search_volume = $_.search_volume
        keyword_difficulty = $_.keyword_difficulty
        intent = $_.intent
        best_competitor = $_.best_competitor
        best_competitor_position = $_.best_competitor_position
        best_competitor_url = if ($old) { $old.best_competitor_url } elseif ($_.best_competitor -eq 'dronline.pt') { $_.dronline_url } elseif ($_.best_competitor -eq 'knok.pt') { $_.knok_url } else { '' }
        target_position = $_.target_position
        target_url = $_.target_url
        opportunity_score = $_.opportunity_score
        priority = $_.priority
        recommended_action = $_.recommended_action
        proposed_target_url = $_.proposed_target_url
        clinical_risk = $_.clinical_risk
        notes = $_.notes
    }
})
$gaps | Export-Csv -LiteralPath $gapPath -NoTypeInformation -Encoding utf8NoBOM

$priorityOrder = @{ P0 = 0; P1 = 1; P2 = 2; P3 = 3 }
$map = @(Import-Csv -LiteralPath $mapPath)
$map = @($map | ForEach-Object {
    $row = $_
    $clusterRows = @($master | Where-Object cluster_id -eq $row.cluster_id)
    $primary = @($row.primary_keywords -split '\s*\|\s*' | ForEach-Object { $_.ToLowerInvariant() })
    $secondary = @($clusterRows | Sort-Object `
        @{ Expression = { $priorityOrder[$_.priority] } },
        @{ Expression = { [int]$_.opportunity_score }; Descending = $true },
        @{ Expression = { if ($_.search_volume -eq '') { -1 } else { [int]$_.search_volume } }; Descending = $true } |
        Where-Object { $_.normalised_keyword.ToLowerInvariant() -notin $primary } |
        Select-Object -First 10 -ExpandProperty keyword)
    [pscustomobject]@{
        cluster_id = $row.cluster_id
        target_url = $row.target_url
        url_status = $row.url_status
        primary_keywords = $row.primary_keywords
        secondary_keywords = $secondary -join ' | '
        keyword_count = $clusterRows.Count
        p0_keyword_count = @($clusterRows | Where-Object priority -eq 'P0').Count
        p1_keyword_count = @($clusterRows | Where-Object priority -eq 'P1').Count
        measured_search_volume_sum = [int](($clusterRows | Where-Object search_volume -ne '' | Measure-Object -Property search_volume -Sum).Sum)
        gsc_impressions = [int](($clusterRows | Measure-Object -Property target_impressions -Sum).Sum)
        recommended_action = $row.recommended_action
        clinical_review_required = 'yes'
        notes = $row.notes
    }
})
$map | Export-Csv -LiteralPath $mapPath -NoTypeInformation -Encoding utf8NoBOM

$briefs = @(Get-ChildItem -LiteralPath (Join-Path $root 'content-briefs') -Filter '*.md' -File | Sort-Object Name)
for ($index = 0; $index -lt $map.Count; $index++) {
    $row = $map[$index]
    $brief = $briefs[$index]
    $content = Get-Content -LiteralPath $brief.FullName -Raw
    $secondaryLine = if ($row.secondary_keywords) { "- secondary_keywords: $($row.secondary_keywords)" } else { '- secondary_keywords:' }
    $content = [regex]::Replace($content, '(?m)^- secondary_keywords:.*$', $secondaryLine)
    $content = [regex]::Replace($content, 'cluster measured-volume sum: \d+', "cluster measured-volume sum: $($row.measured_search_volume_sum)")
    $content = [regex]::Replace($content, '; \d+ cleaned keywords in this cluster\.', "; $($row.keyword_count) cleaned keywords in this cluster.")
    $content = $content.TrimEnd("`r", "`n") + "`n"
    Set-Content -LiteralPath $brief.FullName -Value $content -Encoding utf8NoBOM -NoNewline
}

function Get-ClinicalGate([string]$cluster) {
    switch ($cluster) {
        { $_ -in @('sick-leave', 'driving-medical-certificate', 'medical-certificates', 'prescription-renewal') } {
            return @('high', 'Eligibility, Portuguese process or legal requirements, document/prescription outcome, timelines, and explicit no-guarantee wording.', 'Official Portuguese source verification required.', 'Portugal-registered clinician + compliance/legal reviewer')
        }
        { $_ -in @('psychiatry', 'psychology', 'mental-health', 'oncology', 'cardiology', 'pediatrics', 'weight-management', 'womens-health', 'mens-health', 'pain-management') } {
            return @('high', 'Symptoms, suitability, diagnosis/treatment boundaries, red flags, emergency limitations, and clinician scope.', 'Clinical sources and current service/CMS values require verification.', 'Relevant Portugal-registered clinician + compliance reviewer')
        }
        'target-brand' {
            return @('medium', 'Service availability, clinician/regulatory credentials, prices, access claims, and booking CTA.', 'Current production CMS/service records require verification.', 'Compliance reviewer + Portugal content owner')
        }
        default {
            return @('medium', 'Service scope, suitability, limitations, clinician credentials, price/availability, and urgent-care guidance.', 'Clinical sources and current service/CMS values require verification.', 'Relevant Portugal-registered clinician + content owner')
        }
    }
}

$clinical = for ($index = 0; $index -lt $map.Count; $index++) {
    $row = $map[$index]
    $gate = Get-ClinicalGate $row.cluster_id
    [pscustomobject]@{
        page_or_file = "seo/portugal/content-briefs/$($briefs[$index].Name) -> $($row.target_url)"
        topic = $row.cluster_id
        risk_level = $gate[0]
        claims_requiring_review = $gate[1]
        source_status = $gate[2]
        reviewer_required = $gate[3]
        publish_status = 'blocked_pending_review'
        notes = 'Draft brief only; no CMS publication or production data write in this task.'
    }
}
$clinical | Export-Csv -LiteralPath $clinicalPath -NoTypeInformation -Encoding utf8NoBOM

$inspection = @{
    'https://www.myglobalhealth.online/portugal/pt' = 'Inspected: submitted/indexed; declared and Google-selected canonical match; crawl 2026-08-29.'
    'https://www.myglobalhealth.online/portugal/pt/services/certificado-medico-carta-de-conducao' = 'Inspected: submitted/indexed; declared and Google-selected canonical match; crawl 2026-08-29.'
    'https://www.myglobalhealth.online/portugal/pt/services/consulta-medica' = 'Inspected: submitted/indexed; declared and Google-selected canonical match; crawl 2026-07-31.'
    'https://www.myglobalhealth.online/portugal/pt/doctors/dr-telmo-coelho' = 'Inspected: submitted/indexed; declared and Google-selected canonical match; crawl 2026-08-24.'
    'https://www.myglobalhealth.online/portugal/pt/doctors/dr-vitor-hugo-de-matos-pais' = 'Inspected: submitted/indexed; declared and Google-selected canonical match; crawl 2026-08-30.'
    'https://www.myglobalhealth.online/pt/portugal-doctors/dr-pedro-santos' = 'Inspected: stored Google state remains pre-fix noindex from crawl 2026-08-06; await recrawl.'
}
$inventory = @(Import-Csv -LiteralPath $inventoryPath | ForEach-Object {
    $note = $inspection[$_.url]
    $_.indexation_note = if ($note) { $note } else { 'Not inspected — GSC exposure only; no indexation or canonical conclusion.' }
    $_.source = if ($note) { 'GSC URL Inspection + GSC query-page + target ranked keywords' } else { 'GSC query-page + target ranked keywords' }
    $_
})
$inventory | Export-Csv -LiteralPath $inventoryPath -NoTypeInformation -Encoding utf8NoBOM

$sourceLog = @(Import-Csv -LiteralPath $sourceLogPath)
$sourceLog | ForEach-Object {
    if ($_.source_id -eq 'master') {
        $_.raw_rows = [string]$master.Count
        $_.notes = "8,106 raw rows → 5,483 normalized unique terms → $($master.Count) relevant terms after the final receita/administrative relevance gate. Missing metrics remain blank."
    }
}
$sourceLog | Export-Csv -LiteralPath $sourceLogPath -NoTypeInformation -Encoding utf8NoBOM

$log = [System.Collections.Generic.List[object]]::new()
function Add-CallLog($tool, $purpose, $parameters, $rows, $artifact, $pagination, $note = '') {
    $log.Add([ordered]@{
        timestamp = '2026-08-31'
        timestamp_precision = 'date only; call time was not exposed by the MCP response'
        project_id = '7804f362-5891-417e-9c3a-d9e8d4d7dc6b'
        tool = $tool
        purpose = $purpose
        sanitised_parameters = $parameters
        output_artifact = $artifact
        result_count = $rows
        success = $true
        pagination_status = $pagination
        error = $null
        note = $note
    })
}

Add-CallLog 'whoami' 'Verify OpenSEO connection and account.' @{} 1 '01-baseline-audit.md' 'not applicable'
Add-CallLog 'list_projects' 'Resolve the existing GlobalHealthNew project.' @{} 1 'README.md' 'complete'
$seedCalls = @(
    @('medico online; consulta médica online; teleconsulta; atestado médico online; medicina geral e familiar', 376),
    @('baixa médica; receita médica online; renovação de receita; atestado carta de condução; consulta do viajante', 802),
    @('cardiologista online; pediatra online; psicólogo online; psiquiatra online; oncologista online', 568),
    @('consulta saúde mental; gestão de peso médico; dermatologia online; queda de cabelo médico; cessação tabágica', 1527),
    @('segunda opinião médica; referenciação médica; análises ao sangue; saúde da mulher online; saúde do homem online', 1611)
)
foreach ($call in $seedCalls) { Add-CallLog 'research_keywords' 'Expand Portugal service-led seed terms.' @{ seeds = $call[0]; locationCode = 2620; languageCode = 'pt' } $call[1] 'raw/keywords/seed-keywords.csv' 'complete for requested limit' }

$ranked = [ordered]@{ 'myglobalhealth.online' = 19; 'dronline.pt' = 689; 'knok.pt' = 33; 'consultas-online.pt' = 25; 'cuf.pt' = 100; 'hospitaldaluz.pt' = 100; 'lusiadas.pt' = 100; 'medis.pt' = 100; 'medicinaonline.multicare.pt' = 23; 'mediconanet.pt' = 100; 'teleconsultaportugal.com' = 100 }
foreach ($domain in $ranked.Keys) {
    $pagination = if ($ranked[$domain] -eq 100 -and $domain -in @('cuf.pt', 'hospitaldaluz.pt', 'lusiadas.pt', 'medis.pt', 'mediconanet.pt', 'teleconsultaportugal.com')) { 'bounded at 100 rows by design; not exhausted' } else { 'exhausted' }
    Add-CallLog 'get_ranked_keywords' 'Collect the Portugal organic portfolio for one target.' @{ target = $domain; locationCode = 2620; languageCode = 'pt' } $ranked[$domain] 'raw/keywords/competitor-ranked-keywords.csv' $pagination
    Add-CallLog 'get_domain_overview' 'Compare directional Portugal domain scale.' @{ target = $domain; locationCode = 2620; languageCode = 'pt' } 1 'competitor-domain-summary.csv' 'complete'
}
Add-CallLog 'find_serp_competitors' 'Discover algorithmic Portugal SERP competitors.' @{ keywords = 20; limit = 100; locationCode = 2620; languageCode = 'pt' } 100 '02-competitor-landscape.md' 'complete for requested limit'
Add-CallLog 'get_serp_results' 'Validate ten priority Portugal SERPs at depth 20.' @{ queries = 10; depth = 20; locationCode = 2620; languageCode = 'pt' } 200 'serp-validation.csv' 'complete'
foreach ($domain in @('myglobalhealth.online', 'dronline.pt', 'knok.pt', 'consultas-online.pt')) { Add-CallLog 'get_backlinks_overview' 'Compare referring-domain scale without creating a paid recurring job.' @{ target = $domain; scope = 'subdomains'; hideSpam = $true } 1 '02-competitor-landscape.md; 08-backlink-opportunities.csv' 'complete' }

Add-CallLog 'get_search_console_performance' 'Extract current query-visible Portugal performance.' @{ window = '2026-05-31/2026-08-28'; dimensions = 'query' } 811 'raw/keywords/gsc-current-queries.csv' 'exhausted'
Add-CallLog 'get_search_console_performance' 'Extract current query/page Portugal performance.' @{ window = '2026-05-31/2026-08-28'; dimensions = 'query,page' } 1022 'raw/keywords/gsc-current-query-pages.csv' 'exhausted'
Add-CallLog 'get_search_console_performance' 'Establish current and prior device/country baselines.' @{ current = '2026-05-31/2026-08-28'; prior = '2026-03-02/2026-05-30'; dimensions = 'device,country' } 7 '01-baseline-audit.md' 'complete'
Add-CallLog 'get_google_analytics_organic_overview' 'Check organic sessions/conversions for the inspected window.' @{ window = '2026-08-25/2026-08-30' } 0 '01-baseline-audit.md; 10-measurement-plan.md' 'complete; response contained no usable rows'
Add-CallLog 'get_google_analytics_organic_landing_pages' 'Check organic landing-page outcomes.' @{ window = '2026-08-25/2026-08-30' } 0 '10-measurement-plan.md' 'complete; response contained no usable rows'
Add-CallLog 'get_google_analytics_key_events' 'Inspect configured key events.' @{ window = '2026-08-25/2026-08-30' } 2 '01-baseline-audit.md; 10-measurement-plan.md' 'complete' 'Observed purchase and begin_booking; begin_checkout was not configured as a key event.'
Add-CallLog 'get_google_analytics_audience_breakdown' 'Check market/device audience evidence.' @{ window = '2026-08-25/2026-08-30' } 0 '10-measurement-plan.md' 'complete; response contained no usable rows'
Add-CallLog 'get_google_analytics_measurement_health' 'Validate GA4 stream and measurement health.' @{} 1 '01-baseline-audit.md' 'complete'
Add-CallLog 'inspect_urls' 'Refresh seven priority Portugal indexation/canonical states.' @{ urls = 7 } 7 'target-page-inventory.csv; 07-technical-audit.md' 'complete'
Add-CallLog 'run_site_audit' 'Run a bounded crawl from the Portugal homepage.' @{ startUrl = 'https://www.myglobalhealth.online/portugal/pt'; maxPages = 200; runLighthouse = $false } 1 '07-technical-audit.md' 'complete' 'The crawler escaped the Portugal route through internal links; global findings were not treated as Portugal defects.'
Add-CallLog 'get_audit_status' 'Confirm the bounded audit completed.' @{ auditId = '20687c5a-988a-450e-9447-94eeb1d342e8' } 1 '07-technical-audit.md' 'complete'
Add-CallLog 'get_audit_pages' 'Collect the bounded audit page inventory.' @{ auditId = '20687c5a-988a-450e-9447-94eeb1d342e8'; limit = 200 } 200 '07-technical-audit.md' 'complete for audit budget'
Add-CallLog 'get_audit_issues' 'Collect audit issue totals and severities.' @{ auditId = '20687c5a-988a-450e-9447-94eeb1d342e8' } 295 '07-technical-audit.md' 'complete'

$log | ForEach-Object { $_ | ConvertTo-Json -Compress -Depth 6 } | Set-Content -LiteralPath $callLogPath -Encoding utf8NoBOM

$forbidden = 'bifanas|receita federal|e-cac|\bcpf\b|\bcnpj\b|\birpf\b|emprego m[eé]dico'
if (@($master | Where-Object normalised_keyword -match $forbidden).Count -ne 0) { throw 'Final keyword relevance gate failed.' }
if (@($clinical).Count -ne $map.Count -or @($clinical | Where-Object publish_status -ne 'blocked_pending_review').Count -ne 0) { throw 'Clinical publication gate is incomplete.' }
if (@($inventory | Where-Object { $_.indexation_note -like 'Inspected:*' }).Count -ne 6) { throw 'URL Inspection scope was overstated or lost.' }
if (@($log | Where-Object { -not $_.timestamp -or -not $_.purpose -or -not $_.output_artifact -or -not $_.Contains('sanitised_parameters') -or -not $_.Contains('result_count') -or $null -eq $_.success -or -not $_.pagination_status -or -not $_.Contains('error') }).Count -ne 0) { throw 'OpenSEO call-log contract is incomplete.' }

[pscustomobject]@{
    excluded_this_run = $excluded.Count
    exclusions_preserved = @($priorExclusions + $newExclusions | Sort-Object cluster_id, keyword -Unique).Count
    master = $master.Count
    gaps = $gaps.Count
    url_map = $map.Count
    clinical_register = @($clinical).Count
    inspected_inventory_rows = @($inventory | Where-Object { $_.indexation_note -like 'Inspected:*' }).Count
    call_log_rows = $log.Count
} | Format-List
