# Spain/Brazil rollout, owner-run. One group at a time: read-only dry-run, guarded apply,
# public verification (with retries for page cache), then mark the receipt verified.
# Stops at the first failure. Run from the repository root. Phase N>1 = follow-up batches.
param([int]$Phase = 1, [switch]$Brazil)
$ErrorActionPreference = 'Stop'
$root = if ($Brazil) { 'seo/brazil' } else { 'seo/spain' }
# Node's JSON.parse rejects a BOM, and Windows PowerShell's Out-File utf8 writes one.
function Write-Json($path, $text) { [IO.File]::WriteAllText((Join-Path (Get-Location) $path), $text, (New-Object Text.UTF8Encoding $false)) }
$suffix = if ($Phase -gt 1) { "-phase$Phase" } else { '' }
$manifestFile = "$root/content-briefs/storage-mutation-manifest$suffix.json"
$rollout = if ($Phase -gt 1) { "$root/raw/rollout/phase$Phase" } else { "$root/raw/rollout" }
# Force an array: a one-element result of `if` unrolls to a string, which splats as nothing.
$extraArgs = @()
if ($Phase -gt 1) { $extraArgs += "--phase=$Phase" }
if ($Brazil) { $extraArgs += '--brazil' }
$manifest = Get-Content $manifestFile -Raw | ConvertFrom-Json

# Deployed enforcement receipt (operator attestation of the Railway deployment carrying the approved states).
$receipt = "$root/enforcement-deployment$suffix.json"
if (-not (Test-Path $receipt)) { throw "Missing ${receipt}: record the Railway deployment that carries the approved states first." }

foreach ($group in $manifest.groups) {
  $key = $group.key; $stem = $key.Replace(':','-'); $applied = "$rollout/$stem-applied.json"
  if (Test-Path $applied) {
    if ((Get-Content $applied -Raw | ConvertFrom-Json).publicVerified) { Write-Host "skip $key (verified)"; continue }
  }
  Write-Host "`n== $key"
  node --env-file=backend/.env backend/scripts/apply-spain-seo.mjs "--group=$key" @extraArgs
  if ($LASTEXITCODE -ne 0) { throw "Dry-run failed: $key" }
  node --env-file=backend/.env backend/scripts/apply-spain-seo.mjs "--group=$key" --apply "--confirm=$($group.approvalSha256)" @extraArgs
  if ($LASTEXITCODE -ne 0) { throw "Apply failed: $key" }
  $ok = $false
  # Direct DB writes skip frontend tag revalidation; pages refresh on cache expiry (observed 2-5 min).
  foreach ($i in 1..16) {
    node seo/spain/verify-public.mjs "--group=$key" @extraArgs
    if ($LASTEXITCODE -eq 0) { $ok = $true; break }
    Write-Host "verify retry $i in 30s"; Start-Sleep -Seconds 30
  }
  if (-not $ok) { throw "Public verification failed: $key (database committed; stop and review)" }
  $r = Get-Content $applied -Raw | ConvertFrom-Json
  $r.publicVerified = $true
  $r | Add-Member -NotePropertyName publicVerifiedAt -NotePropertyValue ((Get-Date).ToUniversalTime().ToString('o')) -Force
  $r | Add-Member -NotePropertyName browserVerification -NotePropertyValue 'pending batch browser check' -Force
  Write-Json $applied ($r | ConvertTo-Json -Depth 10)
  Add-Content docs/plans/seo-control-state.md "- $root phase $Phase group ${key}: public verification passed $((Get-Date).ToUniversalTime().ToString('o')). Receipt: $rollout/$stem-public.json."
}
Write-Host "`nAll $($manifest.groups.Count) phase $Phase groups applied and publicly verified ($root)."
