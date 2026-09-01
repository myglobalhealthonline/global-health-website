$ErrorActionPreference = "Stop"

$drafts = @(Import-Csv (Join-Path $PSScriptRoot "content-completion-matrix.csv"))
$pages = @(Import-Csv (Join-Path $PSScriptRoot "page-by-page-completion-matrix.csv"))
$clinical = @(Import-Csv (Join-Path $PSScriptRoot "clinical-review-register.csv"))
$doctors = @(Import-Csv (Join-Path $PSScriptRoot "doctor-profile-fact-register.csv"))

function Assert-Equal($actual, $expected, [string]$message) {
  if ($actual -ne $expected) { throw "$message (expected $expected; found $actual)" }
}

Assert-Equal $drafts.Count 28 "Portugal draft matrix row count"
Assert-Equal $pages.Count 75 "Portugal live page matrix row count"
Assert-Equal $clinical.Count 28 "Portugal clinical register row count"
Assert-Equal $doctors.Count 16 "Portugal doctor fact-register row count"

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
Assert-Equal @($pages | Where-Object { $_.'clinical review required' -eq "yes" -and $_.'factual verification completed' -ne "no" }).Count 0 "Clinical page incorrectly marked fact-verified"

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
Assert-Equal @($clinical | Where-Object publish_status -ne "blocked_pending_review").Count 0 "Clinical publication gate is open"
Assert-Equal @($clinical | Where-Object {
  $_.reviewer_name -or $_.reviewer_doctor_id -or $_.clinical_reviewer_professional_body -or $_.clinical_reviewer_specialty_id -or
  $_.reviewed_at -or $_.official_source_references -or $_.approved_sha256 -or
  $_.compliance_reviewer_name -or $_.compliance_reviewer_id -or $_.compliance_reviewed_at -or
  $_.content_owner_name -or $_.content_owner_id -or $_.content_owner_reviewed_at -or $_.fact_register_sha256 -or
  $_.credential_subject_doctor_id -or $_.delegated_by_doctor_id
}).Count 0 "Partial clinical approval must not be recorded"
Assert-Equal @($doctors | Where-Object verification_status -ne "pending_official_verification").Count 0 "Unverified doctor fact marked verified"

[pscustomobject]@{
  drafts = $drafts.Count
  live_pages = $pages.Count
  rewritten_metadata_rows = $rewritten.Count
  clinical_rows_blocked = $clinical.Count
  doctor_profiles_pending_verification = $doctors.Count
  status = "valid"
} | Format-List
