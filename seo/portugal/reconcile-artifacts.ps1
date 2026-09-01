$ErrorActionPreference = "Stop"

$drafts = @(Import-Csv (Join-Path $PSScriptRoot "content-completion-matrix.csv"))
$pages = @(Import-Csv (Join-Path $PSScriptRoot "page-by-page-completion-matrix.csv"))
$clinical = @(Import-Csv (Join-Path $PSScriptRoot "clinical-review-register.csv"))
$doctors = @(Import-Csv (Join-Path $PSScriptRoot "doctor-profile-fact-register.csv"))
$readback = @(Import-Csv (Join-Path $PSScriptRoot "raw\clinical-seo-production-readback-2026-09-02.csv"))
$remainingDryRun = @(Import-Csv (Join-Path $PSScriptRoot "raw\remaining-metadata-production-dry-run-2026-09-02.csv"))
$receipt = Get-Content -Raw (Join-Path $PSScriptRoot "raw\production-write-receipt-2026-09-02-clinical-seo.json") | ConvertFrom-Json

function Assert-Equal($actual, $expected, [string]$message) {
  if ($actual -ne $expected) { throw "$message (expected $expected; found $actual)" }
}

Assert-Equal $drafts.Count 28 "Portugal draft matrix row count"
Assert-Equal $pages.Count 75 "Portugal live page matrix row count"
Assert-Equal $clinical.Count 45 "Portugal clinical register row count"
Assert-Equal $doctors.Count 16 "Portugal doctor fact-register row count"
Assert-Equal $readback.Count 27 "Portugal clinical SEO public readback row count"
Assert-Equal $remainingDryRun.Count 17 "Portugal remaining metadata dry-run row count"

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
$guarantees = "mesmo dia|no mesmo dia|garantid[oa]|disponibilidade imediata"
Assert-Equal @($rewritten | Where-Object { $_.'optimized title' -match $guarantees -or $_.'optimized meta description' -match $guarantees }).Count 0 "Unsupported availability guarantee in revised copy"
$approvedClinical = @($clinical | Where-Object publish_status -eq "approved")
$blockedClinical = @($clinical | Where-Object publish_status -eq "blocked_pending_review")
$approvedClinicalUrls = @($approvedClinical.page_or_file | ForEach-Object { ($_ -split " -> ", 2)[-1].Trim() })
$allClinicalUrls = @($clinical.page_or_file | ForEach-Object { ($_ -split " -> ", 2)[-1].Trim() })
Assert-Equal @($pages | Where-Object { $allClinicalUrls -contains $_.URL }).Count $clinical.Count "Clinical page is missing from the live matrix"
Assert-Equal @($pages | Where-Object { $approvedClinicalUrls -contains $_.URL -and $_.'factual verification completed' -ne "yes" }).Count 0 "Approved clinical page is missing factual verification"
$retainedUrls = @($drafts | Where-Object { $_.'implementation status' -eq "clinically reviewed; unchanged" } | ForEach-Object URL)
$expectedReadbackUrls = @($approvedClinicalUrls | Where-Object { $retainedUrls -notcontains $_ })
Assert-Equal @($readback | Group-Object URL | Where-Object Count -gt 1).Count 0 "Duplicate production readback URL"
Assert-Equal @($readback | Where-Object { $expectedReadbackUrls -notcontains $_.URL }).Count 0 "Unexpected URL in production readback"
Assert-Equal @($expectedReadbackUrls | Where-Object { $readback.URL -notcontains $_ }).Count 0 "Approved URL missing from production readback"
$readbackChecks = @("title_matches_runtime_suffix_policy", "description_exact", "self_canonical", "hreflang_pt_PT", "indexable", "html_lang_pt", "json_ld_present", "no_unreviewed_insurance_suffix", "deployment_match")
foreach ($column in $readbackChecks) {
  Assert-Equal @($readback | Where-Object { $_.$column -ne "True" }).Count 0 "Failed production readback check: $column"
}
Assert-Equal @($readback | Where-Object http_status -ne "200").Count 0 "Non-200 production readback"
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
Assert-Equal @($pages | Where-Object { $_.'implementation status' -eq "live verified $rolloutDate" }).Count $readback.Count "Live matrix rollout status count"

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
Assert-Equal $approvedClinical.Count 28 "Approved clinical row count"
Assert-Equal $blockedClinical.Count 17 "Blocked clinical row count"
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
  $blockedClinicalUrls -notcontains $_.url -or
  $_.source_sha256 -notmatch '^[a-f0-9]{64}$' -or $_.approval_sha256 -notmatch '^[a-f0-9]{64}$' -or
  $_.confirmation -ne "PT-SEO-$($_.approval_sha256.Substring(0, 12).ToUpperInvariant())" -or
  $_.result -ne "matched one production record; no write"
}).Count 0 "Invalid remaining production dry-run evidence"
Assert-Equal @($blockedClinical | Where-Object {
  $url = ($_.page_or_file -split " -> ", 2)[-1].Trim()
  $evidence = @($remainingDryRun | Where-Object url -eq $url)[0]
  !$evidence -or $_.notes -notmatch [regex]::Escape("Candidate SHA-256: $($evidence.approval_sha256).")
}).Count 0 "Blocked clinical row does not match its production dry-run copy hash"
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
Assert-Equal @($doctors | Where-Object verification_status -eq "verified").Count 14 "Metadata-only doctor fact verification count"
Assert-Equal @($doctors | Where-Object verification_status -eq "pending_official_verification").Count 2 "Pending doctor fact verification count"

[pscustomobject]@{
  drafts = $drafts.Count
  live_pages = $pages.Count
  rewritten_metadata_rows = $rewritten.Count
  clinical_rows_approved = $approvedClinical.Count
  clinical_rows_blocked = $blockedClinical.Count
  remaining_production_dry_runs = $remainingDryRun.Count
  doctor_profiles_metadata_verified = 14
  doctor_profiles_pending_verification = 2
  status = "valid"
} | Format-List
