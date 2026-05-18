# Last ~2% manual tests — API coverage for gaps
# Run from repo root: powershell -File docs/manual-tests/run-last-2-percent.ps1

$Base = "http://localhost:4000"
$Pass = "GHAdmin2026X7qL9!"
$AptId = "9482a98c-1ad7-4c77-9c48-746806e322f4"
$results = @()

function New-Sess { New-Object Microsoft.PowerShell.Commands.WebRequestSession }

function Login($email, $password = $Pass) {
  $s = New-Sess
  try {
    $r = Invoke-RestMethod -Uri "$Base/api/auth/login" -Method POST -ContentType "application/json" `
      -Body (@{ email = $email; password = $password } | ConvertTo-Json) -WebSession $s
    if (-not $r.ok) { return $null }
    return @{ sess = $s; user = $r.data.user }
  } catch { return $null }
}

$pat = Login "patient@globalhealthonline.com"
$adm = Login "admin@globalhealthonline.com"

# PAT-008 export
if ($pat) {
  try {
    $exp = Invoke-WebRequest -Uri "$Base/api/auth/me/export" -WebSession $pat.sess -UseBasicParsing
    $json = $exp.Content | ConvertFrom-Json
    $hasProfile = $null -ne $json.user.email
    $hasBookings = $null -ne $json.appointments
    $results += [pscustomobject]@{ TC = "PAT-008"; Pass = ($exp.StatusCode -eq 200 -and $hasProfile -and $hasBookings) }
  } catch {
    $results += [pscustomobject]@{ TC = "PAT-008"; Pass = $false; Note = $_.Exception.Message }
  }
}

# PAT-013 clinic messages
if ($pat -and $adm) {
  $pMsg = Invoke-RestMethod -Uri "$Base/api/account/appointments/$AptId/messages" -Method POST `
    -ContentType "application/json" -Body '{"body":"PAT-013 clinic message"}' -WebSession $pat.sess
  $getP = Invoke-RestMethod -Uri "$Base/api/account/appointments/$AptId/messages" -WebSession $pat.sess
  $admMsg = Invoke-RestMethod -Uri "$Base/api/admin/appointments/$AptId/messages" -Method POST `
    -ContentType "application/json" -Body '{"body":"ADM reply to clinic"}' -WebSession $adm.sess
  $getP2 = Invoke-RestMethod -Uri "$Base/api/account/appointments/$AptId/messages" -WebSession $pat.sess
  $adminReply = ($getP2.data.items | Where-Object { $_.body -match "ADM reply" }).Count -gt 0
  $results += [pscustomobject]@{
    TC   = "PAT-013"
    Pass = ($pMsg.ok -and $admMsg.ok -and $adminReply)
    Note = "patient+admin messages on appointment"
  }
}

# PAT-021 cross-patient isolation
Push-Location (Join-Path $PSScriptRoot "..\..\backend")
$emailB = "patb-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())@test.local"
$seedB = pnpm exec tsx scripts/create-throwaway-patient.ts $emailB 2>&1 | Where-Object { $_ -match '@' } | Select-Object -Last 1
Pop-Location
$patB = Login $seedB "Throwaway10!"
if ($pat -and $patB) {
  $blocked = $false
  try {
    Invoke-WebRequest -Uri "$Base/api/account/appointments/$AptId" -WebSession $patB.sess -UseBasicParsing -ErrorAction Stop | Out-Null
  } catch {
    $code = [int]$_.Exception.Response.StatusCode
    $blocked = $code -in @(403, 404)
  }
  $results += [pscustomobject]@{ TC = "PAT-021"; Pass = $blocked; Note = "foreign apt access blocked" }
}

# PAT-007 full cycle on throwaway
$email007 = "pat007b-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())@test.local"
Push-Location (Join-Path $PSScriptRoot "..\..\backend")
pnpm exec tsx scripts/create-throwaway-patient.ts $email007 2>&1 | Out-Null
Pop-Location
$s7 = New-Sess
Invoke-RestMethod -Uri "$Base/api/auth/login" -Method POST -ContentType "application/json" `
  -Body (@{ email = $email007; password = "Throwaway10!" } | ConvertTo-Json) -WebSession $s7 | Out-Null
$chg = Invoke-RestMethod -Uri "$Base/api/auth/change-password" -Method POST -ContentType "application/json" `
  -Body (@{ currentPassword = "Throwaway10!"; newPassword = "NewPass123!" } | ConvertTo-Json) -WebSession $s7
$s7b = New-Sess
$loginNew = Invoke-RestMethod -Uri "$Base/api/auth/login" -Method POST -ContentType "application/json" `
  -Body (@{ email = $email007; password = "NewPass123!" } | ConvertTo-Json) -WebSession $s7b
$oldFail = $false
try {
  Invoke-RestMethod -Uri "$Base/api/auth/login" -Method POST -ContentType "application/json" `
    -Body (@{ email = $email007; password = "Throwaway10!" } | ConvertTo-Json) -ErrorAction Stop | Out-Null
} catch { $oldFail = $true }
$results += [pscustomobject]@{ TC = "PAT-007-full"; Pass = ($chg.ok -and $loginNew.ok -and $oldFail) }

$results | Format-Table -AutoSize
$fail = $results | Where-Object { -not $_.Pass }
if ($fail) { Write-Host "FAILED: $($fail.TC -join ', ')" -ForegroundColor Red; exit 1 }
Write-Host "Last 2% API tests passed." -ForegroundColor Green
