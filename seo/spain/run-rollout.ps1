# Spain rollout, owner-run. One group at a time: read-only dry-run, guarded apply,
# public verification (with retries for page cache), then mark the receipt verified.
# Stops at the first failure. Run from the repository root.
$ErrorActionPreference = 'Stop'
$root = 'seo/spain'
# Node's JSON.parse rejects a BOM, and Windows PowerShell's Out-File utf8 writes one.
function Write-Json($path, $text) { [IO.File]::WriteAllText((Join-Path (Get-Location) $path), $text, (New-Object Text.UTF8Encoding $false)) }
$manifest = Get-Content "$root/content-briefs/storage-mutation-manifest.json" -Raw | ConvertFrom-Json

# Deployed enforcement: Railway Production Backend auto-deployed main at 6c5d94e0 (SUCCESS, /ready 200).
$receipt = "$root/enforcement-deployment.json"
if (-not (Test-Path $receipt)) {
Write-Json $receipt @'
{
  "deploymentId": "8a3d3ebb-0d66-4451-aac1-3d87318661c0",
  "service": "Backend (Railway Production)",
  "status": "SUCCESS",
  "commit": "6c5d94e0beb889d22b816c0cc0ed11e4cec7f9b4",
  "branch": "main",
  "createdAt": "2026-09-14T01:06:31.987Z",
  "readiness": "https://api.myglobalhealth.online/ready returned ok:true, database connected",
  "note": "Includes the Spain mutation-boundary gate. Approved states were recorded locally after this deployment; the runner uses local gate code."
}
'@
}

foreach ($group in $manifest.groups) {
  $key = $group.key; $stem = $key.Replace(':','-'); $applied = "$root/raw/rollout/$stem-applied.json"
  if (Test-Path $applied) {
    if ((Get-Content $applied -Raw | ConvertFrom-Json).publicVerified) { Write-Host "skip $key (verified)"; continue }
  }
  Write-Host "`n== $key"
  node --env-file=backend/.env backend/scripts/apply-spain-seo.mjs "--group=$key"
  if ($LASTEXITCODE -ne 0) { throw "Dry-run failed: $key" }
  node --env-file=backend/.env backend/scripts/apply-spain-seo.mjs "--group=$key" --apply "--confirm=$($group.approvalSha256)"
  if ($LASTEXITCODE -ne 0) { throw "Apply failed: $key" }
  $ok = $false
  foreach ($i in 1..4) {
    node seo/spain/verify-public.mjs "--group=$key"
    if ($LASTEXITCODE -eq 0) { $ok = $true; break }
    Write-Host "verify retry $i in 30s"; Start-Sleep -Seconds 30
  }
  if (-not $ok) { throw "Public verification failed: $key (database committed; stop and review)" }
  $r = Get-Content $applied -Raw | ConvertFrom-Json
  $r.publicVerified = $true
  $r | Add-Member -NotePropertyName publicVerifiedAt -NotePropertyValue ((Get-Date).ToUniversalTime().ToString('o')) -Force
  $r | Add-Member -NotePropertyName browserVerification -NotePropertyValue 'pending batch browser check' -Force
  Write-Json $applied ($r | ConvertTo-Json -Depth 10)
  Add-Content docs/plans/seo-control-state.md "- Spain group ${key}: public HTML/FAQ/schema verified $((Get-Date).ToUniversalTime().ToString('o')). Receipt: $root/raw/rollout/$stem-public.json."
}
Write-Host "`nAll $($manifest.groups.Count) groups applied and publicly verified."
