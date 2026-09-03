# Saved with a UTF-8 BOM on purpose: Windows PowerShell 5.1 parses a BOM-less .ps1
# as ANSI, which corrupts the · separator on the rendered-title check below and makes
# this validator throw on evidence that is actually correct.
$ErrorActionPreference = "Stop"

$drafts = @(Import-Csv -Encoding UTF8 (Join-Path $PSScriptRoot "content-completion-matrix.csv"))
$pages = @(Import-Csv -Encoding UTF8 (Join-Path $PSScriptRoot "page-by-page-completion-matrix.csv"))
$clinical = @(Import-Csv -Encoding UTF8 (Join-Path $PSScriptRoot "clinical-review-register.csv"))
$doctors = @(Import-Csv -Encoding UTF8 (Join-Path $PSScriptRoot "doctor-profile-fact-register.csv"))
$readback = @(Import-Csv -Encoding UTF8 (Join-Path $PSScriptRoot "raw\clinical-seo-production-readback-2026-09-02.csv"))
$remainingDryRun = @(Import-Csv -Encoding UTF8 (Join-Path $PSScriptRoot "raw\remaining-metadata-production-dry-run-2026-09-02.csv"))
$receipt = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot "raw\production-write-receipt-2026-09-02-clinical-seo.json") | ConvertFrom-Json
$remainingReadback = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot "raw\remaining-metadata-production-readback-2026-09-02.json") | ConvertFrom-Json
$remainingReceipt = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot "raw\production-write-receipt-2026-09-02-remaining-metadata.json") | ConvertFrom-Json

function Assert-Equal($actual, $expected, [string]$message) {
  if ($actual -ne $expected) { throw "$message (expected $expected; found $actual)" }
}

Add-Type -AssemblyName Microsoft.VisualBasic
$clinicalParser = [Microsoft.VisualBasic.FileIO.TextFieldParser]::new((Join-Path $PSScriptRoot "clinical-review-register.csv"))
try {
  $clinicalParser.SetDelimiters(",")
  $clinicalParser.HasFieldsEnclosedInQuotes = $true
  $expectedClinicalFields = $clinicalParser.ReadFields().Count
  $clinicalLine = 1
  while (-not $clinicalParser.EndOfData) {
    $clinicalLine++
    Assert-Equal $clinicalParser.ReadFields().Count $expectedClinicalFields "Clinical register field count at line $clinicalLine"
  }
} finally {
  $clinicalParser.Close()
}

Assert-Equal $drafts.Count 28 "Portugal draft matrix row count"
Assert-Equal $pages.Count 75 "Portugal live page matrix row count"
Assert-Equal $clinical.Count 45 "Portugal clinical register row count"
Assert-Equal $doctors.Count 16 "Portugal doctor fact-register row count"
Assert-Equal $readback.Count 27 "Portugal clinical SEO public readback row count"
Assert-Equal $remainingDryRun.Count 17 "Portugal remaining metadata dry-run row count"
Assert-Equal @($remainingReadback.rows).Count 16 "Portugal remaining metadata public readback row count"

foreach ($set in @($drafts, $pages)) {
  Assert-Equal @($set | Group-Object URL | Where-Object Count -gt 1).Count 0 "Duplicate Portugal URL"
  Assert-Equal @($set | Group-Object 'primary keyword' | Where-Object Count -gt 1).Count 0 "Duplicate Portugal primary keyword"
  Assert-Equal @($set | Where-Object { !$_.URL.StartsWith("https://www.myglobalhealth.online/portugal/pt") }).Count 0 "URL outside /portugal/pt"
  Assert-Equal @($set | Where-Object { -not $_.'primary keyword' -or -not $_.'secondary keywords' }).Count 0 "Missing keyword assignment"
  Assert-Equal @($set | Where-Object { $_.'deslop completed' -ne "yes" }).Count 0 "Incomplete deslop review"
}

$pageUrls = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$pages.URL | ForEach-Object { [void]$pageUrls.Add($_) }
Assert-Equal @($drafts | Where-Object { !$pageUrls.Contains($_.URL) }).Count 0 "Approved draft missing from the live page matrix"
Assert-Equal @($pages | Where-Object {
  $_.'HTTP status' -ne "200" -or $_.canonical -ne "yes" -or $_.hreflang_pt_PT -ne "yes" -or
  $_.indexable -ne "yes" -or $_.locale_pt_PT -ne "yes" -or $_.'structured data' -ne "yes" -or
  $_.'CTA accuracy' -ne "yes"
}).Count 0 "Incomplete live technical check"

$rewritten = @($pages | Where-Object {
  $_.'optimized title' -ne $_.'original title' -or $_.'optimized meta description' -ne $_.'original meta description'
})
# Availability promises that are never acceptable in rewritten metadata. 'proprio dia'
# and 'imediat*' are deliberately NOT listed: they appear in legitimate clinical-urgency
# copy (a blood-pressure reading that needs same-day care), so they need a human read,
# not an automatic failure.
$guarantees = "mesmo dia|no mesmo dia|garantid[oa]|disponibilidade imediata|hoje mesmo|ainda hoje|sem espera|sem tempo de espera"
Assert-Equal @($rewritten | Where-Object { $_.'optimized title' -match $guarantees -or $_.'optimized meta description' -match $guarantees }).Count 0 "Unsupported availability guarantee in revised copy"
$approvedClinical = @($clinical | Where-Object publish_status -eq "approved")
$blockedClinical = @($clinical | Where-Object publish_status -eq "blocked_pending_review")
$phaseTwoApproved = @($approvedClinical | Where-Object reviewed_at -eq "2026-09-02T01:58:00+02:00")
# Third approval round: the 2026-09-03 snippet trims, approved by Dr Tiago
# Miguel Figueira and published the same day. These rows were previously in the
# phase-two bucket; re-approving the trimmed copy moved their reviewed_at, so
# they need their own bucket and their own readback file rather than falling
# through to phase one, whose readback predates them.
$snippetTrimApproved = @($approvedClinical | Where-Object reviewed_at -eq "2026-09-03T17:59:00+01:00")
$phaseOneApproved = @($approvedClinical | Where-Object { $_.reviewed_at -ne "2026-09-02T01:58:00+02:00" -and $_.reviewed_at -ne "2026-09-03T17:59:00+01:00" })
$snippetTrimApprovedUrls = @($snippetTrimApproved.page_or_file | ForEach-Object { ($_ -split " -> ", 2)[-1].Trim() })
$approvedClinicalUrls = @($approvedClinical.page_or_file | ForEach-Object { ($_ -split " -> ", 2)[-1].Trim() })
$phaseOneApprovedUrls = @($phaseOneApproved.page_or_file | ForEach-Object { ($_ -split " -> ", 2)[-1].Trim() })
$phaseTwoApprovedUrls = @($phaseTwoApproved.page_or_file | ForEach-Object { ($_ -split " -> ", 2)[-1].Trim() })
$allClinicalUrls = @($clinical.page_or_file | ForEach-Object { ($_ -split " -> ", 2)[-1].Trim() })
Assert-Equal @($pages | Where-Object { $allClinicalUrls -contains $_.URL }).Count $clinical.Count "Clinical page is missing from the live matrix"
Assert-Equal @($pages | Where-Object { $approvedClinicalUrls -contains $_.URL -and $_.'factual verification completed' -ne "yes" }).Count 0 "Approved clinical page is missing factual verification"
$retainedUrls = @($drafts | Where-Object { $_.'implementation status' -eq "clinically reviewed; unchanged" } | ForEach-Object URL)
$expectedReadbackUrls = @($phaseOneApprovedUrls | Where-Object { $retainedUrls -notcontains $_ })
Assert-Equal @($readback | Group-Object URL | Where-Object Count -gt 1).Count 0 "Duplicate production readback URL"
Assert-Equal @($readback | Where-Object { $expectedReadbackUrls -notcontains $_.URL }).Count 0 "Unexpected URL in production readback"
Assert-Equal @($expectedReadbackUrls | Where-Object { $readback.URL -notcontains $_ }).Count 0 "Approved URL missing from production readback"
$readbackChecks = @("title_matches_runtime_suffix_policy", "description_exact", "self_canonical", "hreflang_pt_PT", "indexable", "html_lang_pt", "json_ld_present", "no_unreviewed_insurance_suffix", "deployment_match")
foreach ($column in $readbackChecks) {
  Assert-Equal @($readback | Where-Object { $_.$column -ne "True" }).Count 0 "Failed production readback check: $column"
}
Assert-Equal @($readback | Where-Object http_status -ne "200").Count 0 "Non-200 production readback"
# 2026-09-03 snippet trims: eleven doctor meta descriptions, cache-bypassed
# public readback after the guarded write.
$trimReadback = @(Import-Csv -Encoding UTF8 (Join-Path $PSScriptRoot "raw\snippet-trim-production-readback-2026-09-03.csv"))
Assert-Equal $snippetTrimApproved.Count 11 "Snippet-trim approved row count"
Assert-Equal @($trimReadback | Group-Object url | Where-Object Count -gt 1).Count 0 "Duplicate snippet-trim readback URL"
Assert-Equal @($trimReadback | Where-Object { $snippetTrimApprovedUrls -notcontains $_.url }).Count 0 "Unexpected URL in snippet-trim readback"
Assert-Equal @($snippetTrimApprovedUrls | Where-Object { $trimReadback.url -notcontains $_ }).Count 0 "Approved snippet-trim URL missing from production readback"
Assert-Equal @($trimReadback | Where-Object http_status -ne "200").Count 0 "Non-200 snippet-trim readback"
foreach ($column in @("matches_approved_copy", "self_canonical")) {
  Assert-Equal @($trimReadback | Where-Object { $_.$column -ne "True" }).Count 0 "Failed snippet-trim readback check: $column"
}
Assert-Equal @($trimReadback | Where-Object { [int]$_.description_length -gt 160 }).Count 0 "Snippet-trim description still over the display budget"
Assert-Equal @($readback | Where-Object deployment_commit -ne $receipt.public_verification.deployment_commit).Count 0 "Production deployment commit mismatch"
Assert-Equal ([int]$receipt.public_verification.expected_pages) $readback.Count "Receipt public page count"
$rolloutDate = [string]$receipt.public_verification.operational_rollout_date
if ($rolloutDate -notmatch '^\d{4}-\d{2}-\d{2}$') { throw "Invalid production rollout date" }
foreach ($row in $readback) {
  $draft = @($drafts | Where-Object URL -eq $row.URL)[0]
  Assert-Equal $row.expected_title $draft.'optimized title' "Production title drift for $($row.URL)"
  Assert-Equal $row.expected_description $draft.'optimized meta description' "Production description drift for $($row.URL)"
  Assert-Equal $row.rendered_description $row.expected_description "Rendered production description drift for $($row.URL)"
  $allowedRenderedTitles = @($row.expected_title, "$($row.expected_title) · Global Health", "$($row.expected_title) · Portugal")
  if ($allowedRenderedTitles -notcontains $row.rendered_title) { throw "Rendered production title drift for $($row.URL)" }
  Assert-Equal $row.canonical $row.URL "Rendered production canonical drift for $($row.URL)"
}
Assert-Equal @($drafts | Where-Object { $_.'implementation status' -eq "live verified $rolloutDate" }).Count $readback.Count "Draft rollout status count"
$remainingRows = @($remainingReadback.rows)
Assert-Equal ([int]$remainingReadback.databaseRecordsExact) $remainingRows.Count "Remaining database readback count"
Assert-Equal ([int]$remainingReadback.publicPagesExact) $remainingRows.Count "Remaining public readback count"
Assert-Equal ([int]$remainingReceipt.verification.database_records_exact) $remainingRows.Count "Remaining receipt database count"
Assert-Equal ([int]$remainingReceipt.verification.public_pages_exact) $remainingRows.Count "Remaining receipt public count"
$receiptSelectors = @($remainingReceipt.database_records | Sort-Object)
$readbackSelectors = @($remainingRows.selector | Sort-Object)
Assert-Equal @(Compare-Object $receiptSelectors $readbackSelectors).Count 0 "Remaining receipt selector membership"
Assert-Equal $remainingReceipt.verification.verified_at_utc $remainingReadback.verifiedAtUtc "Remaining receipt verification timestamp"
Assert-Equal $remainingReceipt.clinical_review.reviewed_at "2026-09-02T01:58:00+02:00" "Remaining receipt clinical approval timestamp"
Assert-Equal @($remainingReceipt.held_without_write).Count 1 "Remaining receipt held-record count"
Assert-Equal $remainingReceipt.held_without_write[0].selector "doctor:beatriz-carvalho" "Remaining receipt held selector"
Assert-Equal $remainingReadback.heldProfile "/portugal/pt/doctors/beatriz-carvalho" "Remaining readback held profile"
Assert-Equal @($remainingRows | Group-Object url | Where-Object Count -gt 1).Count 0 "Duplicate remaining production readback URL"
# The 2026-09-02 phase-two readback is historical evidence of that day's
# publish. Eleven of those assets were re-approved and re-published on
# 2026-09-03, so they now sit in the snippet-trim bucket; they were still
# legitimately part of the phase-two rollout and must not read as strays here.
$phaseTwoReadbackUrls = @($phaseTwoApprovedUrls + $snippetTrimApprovedUrls)
Assert-Equal @($remainingRows | Where-Object { $phaseTwoReadbackUrls -notcontains $_.url }).Count 0 "Unexpected remaining production readback URL"
Assert-Equal @($phaseTwoReadbackUrls | Where-Object { $remainingRows.url -notcontains $_ }).Count 0 "Approved phase-two URL missing from production readback"
Assert-Equal @($remainingRows | Where-Object {
  $_.httpStatus -ne 200 -or !$_.titleMatches -or !$_.descriptionExact -or !$_.selfCanonical -or
  !$_.hreflangPt -or !$_.indexable -or !$_.htmlLangPt -or !$_.jsonLdPresent
}).Count 0 "Failed remaining production public readback"
foreach ($row in $remainingRows) {
  # Rows superseded by the 2026-09-03 snippet trims are validated against that
  # day's readback instead. This file records what was live on 2026-09-02 and
  # stays as the dated evidence of that rollout; comparing its pre-trim copy to
  # today's matrix would report drift for a change that was approved and
  # verified.
  if ($snippetTrimApprovedUrls -contains $row.url) { continue }
  $page = @($pages | Where-Object URL -eq $row.url)[0]
  Assert-Equal $row.expectedTitle $page.'optimized title' "Remaining production title drift for $($row.url)"
  Assert-Equal $row.expectedDescription $page.'optimized meta description' "Remaining production description drift for $($row.url)"
  Assert-Equal $row.renderedDescription $row.expectedDescription "Remaining rendered description drift for $($row.url)"
  Assert-Equal $row.canonical $row.url "Remaining rendered canonical drift for $($row.url)"
}
Assert-Equal @($pages | Where-Object { $_.'implementation status' -eq "live verified $rolloutDate" }).Count $readback.Count "Initial live matrix rollout status count"
$phaseTwoReason = "Approved by Dr Tiago Miguel Figueira at 2026-09-02T01:58:00+02:00 and verified in production; visible clinical and profile content remains unchanged."
$phaseTwoPages = @($pages | Where-Object { $_.'implementation status' -eq "live verified 2026-09-02 phase two" })
Assert-Equal $phaseTwoPages.Count $remainingRows.Count "Phase-two live matrix rollout status count"
Assert-Equal @($phaseTwoPages | Where-Object {
  $_.'live reviewed at' -ne "2026-09-02" -or $_.'reason for anything left unchanged' -ne $phaseTwoReason
}).Count 0 "Phase-two live matrix review evidence"

$approvalColumns = @(
  "reviewer_name", "reviewer_doctor_id", "clinical_reviewer_professional_body", "clinical_reviewer_specialty_id",
  "reviewed_at", "official_source_references", "approved_sha256",
  "compliance_reviewer_name", "compliance_reviewer_id", "compliance_reviewed_at",
  "content_owner_name", "content_owner_id", "content_owner_reviewed_at", "fact_register_sha256",
  "credential_subject_doctor_id", "delegated_by_doctor_id"
)
foreach ($column in $approvalColumns) {
  if ($clinical[0].PSObject.Properties.Name -notcontains $column) { throw "Clinical register is missing $column" }
}
Assert-Equal $approvedClinical.Count 44 "Approved clinical row count"
Assert-Equal $blockedClinical.Count 1 "Blocked clinical row count"
# The 2026-09-02 phase-two rollout approved 16 rows. Eleven were re-approved on
# 2026-09-03 for the trimmed descriptions and now carry that later timestamp, so
# the two buckets together must still account for all 16.
Assert-Equal ($phaseTwoApproved.Count + $snippetTrimApproved.Count) 16 "Approved phase-two clinical row count"
Assert-Equal @($approvedClinical | Where-Object {
  -not $_.reviewer_name -or -not $_.reviewer_doctor_id -or -not $_.clinical_reviewer_professional_body -or
  -not $_.reviewed_at -or -not $_.official_source_references -or $_.approved_sha256 -notmatch '^[a-f0-9]{64}$'
}).Count 0 "Approved clinical row is incomplete"
Assert-Equal @($blockedClinical | Where-Object {
  $_.reviewer_name -or $_.reviewer_doctor_id -or $_.clinical_reviewer_professional_body -or $_.reviewed_at -or
  $_.approved_sha256 -or $_.notes -notmatch 'Candidate SHA-256: [a-f0-9]{64}\.'
}).Count 0 "Blocked clinical row contains approval data or lacks its candidate hash"
$blockedClinicalUrls = @($blockedClinical.page_or_file | ForEach-Object { ($_ -split " -> ", 2)[-1].Trim() })
Assert-Equal @($remainingDryRun | Group-Object url | Where-Object Count -gt 1).Count 0 "Duplicate remaining dry-run URL"
Assert-Equal @($remainingDryRun | Where-Object {
  $allClinicalUrls -notcontains $_.url -or
  $_.source_sha256 -notmatch '^[a-f0-9]{64}$' -or $_.approval_sha256 -notmatch '^[a-f0-9]{64}$' -or
  $_.confirmation -ne "PT-SEO-$($_.approval_sha256.Substring(0, 12).ToUpperInvariant())" -or
  $_.result -ne "matched one production record; no write"
}).Count 0 "Invalid remaining production dry-run evidence"
Assert-Equal @($blockedClinical | Where-Object {
  $url = ($_.page_or_file -split " -> ", 2)[-1].Trim()
  $evidence = @($remainingDryRun | Where-Object url -eq $url)[0]
  !$evidence -or $_.notes -notmatch [regex]::Escape("Candidate SHA-256: $($evidence.approval_sha256).")
}).Count 0 "Blocked clinical row does not match its production dry-run copy hash"
Assert-Equal @($phaseTwoApproved | Where-Object {
  $url = ($_.page_or_file -split " -> ", 2)[-1].Trim()
  $evidence = @($remainingDryRun | Where-Object url -eq $url)[0]
  !$evidence -or $_.approved_sha256 -ne $evidence.approval_sha256
}).Count 0 "Approved phase-two clinical row does not match its dry-run copy hash"
Assert-Equal @($clinical | Where-Object {
  $_.clinical_reviewer_specialty_id -or
  $_.compliance_reviewer_name -or $_.compliance_reviewer_id -or $_.compliance_reviewed_at -or
  $_.content_owner_name -or $_.content_owner_id -or $_.content_owner_reviewed_at -or
  $_.delegated_by_doctor_id
}).Count 0 "Unused legacy approval fields must remain blank"
Assert-Equal @($approvedClinical | Where-Object {
  $isDoctor = $_.page_or_file -match '/doctors/'
  ($isDoctor -and ($_.fact_register_sha256 -notmatch '^[a-f0-9]{64}$' -or -not $_.credential_subject_doctor_id)) -or
  (!$isDoctor -and ($_.fact_register_sha256 -or $_.credential_subject_doctor_id))
}).Count 0 "Doctor approval is not bound to an exact fact record and subject ID"
Assert-Equal @($doctors | Where-Object verification_status -eq "verified").Count 15 "Metadata-only doctor fact verification count"
Assert-Equal @($doctors | Where-Object verification_status -eq "pending_official_verification").Count 1 "Pending doctor fact verification count"

[pscustomobject]@{
  drafts = $drafts.Count
  live_pages = $pages.Count
  rewritten_metadata_rows = $rewritten.Count
  clinical_rows_approved = $approvedClinical.Count
  clinical_rows_blocked = $blockedClinical.Count
  remaining_production_dry_runs = $remainingDryRun.Count
  remaining_production_readbacks = $remainingRows.Count
  doctor_profiles_metadata_verified = 15
  doctor_profiles_pending_verification = 1
  status = "valid"
} | Format-List
