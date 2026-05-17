# Final remaining manual tests — API + multipart (session 6)
# Run from repo root: powershell -File docs/manual-tests/run-final-remaining-tests.ps1

$ErrorActionPreference = "Continue"
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

function Curl-Login($cookieJar, $email, $password) {
  $loginJson = Join-Path (Split-Path $cookieJar) "login.json"
  (@{ email = $email; password = $password } | ConvertTo-Json) | Set-Content $loginJson -NoNewline
  curl.exe -s -c $cookieJar -X POST "$Base/api/auth/login" -H "Content-Type: application/json" -d "@$loginJson" | Out-Null
}

function Curl-Upload($cookieJar, $url, $filePath, $mime = $null) {
  $abs = (Resolve-Path $filePath).Path
  $type = Split-Path $filePath -Leaf
  $field = if ($mime) { "file=@$abs;type=$mime" } else { "file=@$abs" }
  $out = curl.exe -s -w "`n%{http_code}" -b $cookieJar -F $field $url 2>&1
  $lines = $out -split "`n"
  $code = [int]($lines[-1])
  $body = ($lines[0..($lines.Length - 2)] -join "`n")
  return @{ code = $code; body = $body }
}

$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$tmp = Join-Path $env:TEMP "gh-tests-$ts"
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
$cookieJar = Join-Path $tmp "cookies.txt"

# Minimal 1x1 PNG
$pngPath = Join-Path $tmp "pixel.png"
[IO.File]::WriteAllBytes($pngPath, [byte[]](
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
  0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
  0x42, 0x60, 0x82
))

# Tiny PDF
$pdfPath = Join-Path $tmp "test-report.pdf"
"%PDF-1.4`n1 0 obj<<>>endobj`ntrailer<<>>`n%%EOF" | Set-Content -Path $pdfPath -NoNewline

# --- PAT-010 ---
$email010 = "pat010-$ts@test.local"
try {
  $reg = Invoke-RestMethod -Uri "$Base/api/auth/register" -Method POST -ContentType "application/json" `
    -Body (@{ email = $email010; password = "Throwaway10!"; fullName = "Delete Me"; phone = "+353800000010" } | ConvertTo-Json) -SessionVariable s010
  if ($reg.ok) {
    Invoke-RestMethod -Uri "$Base/api/auth/me" -Method DELETE -WebSession $s010 | Out-Null
    $loginFail = $false
    try {
      Invoke-RestMethod -Uri "$Base/api/auth/login" -Method POST -ContentType "application/json" `
        -Body (@{ email = $email010; password = "Throwaway10!" } | ConvertTo-Json) -ErrorAction Stop | Out-Null
    } catch { $loginFail = $true }
    $results += [pscustomobject]@{ TC = "PAT-010"; Pass = $loginFail; Note = "register+delete+login blocked" }
  } else {
    $results += [pscustomobject]@{ TC = "PAT-010"; Pass = $false; Note = "register not ok" }
  }
} catch {
  $results += [pscustomobject]@{ TC = "PAT-010"; Pass = $false; Note = $_.Exception.Message }
}

# Ensure PAID for chat upload
$sqlPay = "UPDATE `"Appointment`" SET `"paymentStatus`" = 'PAID' WHERE id = '$AptId';"
$sqlPath = Join-Path $tmp "pay.sql"
Set-Content $sqlPath $sqlPay
Push-Location (Join-Path $PSScriptRoot "..\..\backend")
& npx prisma db execute --file $sqlPath *>$null
Pop-Location

# --- PAT-014 file upload ---
$pat = Login "patient@globalhealthonline.com"
if ($pat) {
  Curl-Login $cookieJar "patient@globalhealthonline.com" $Pass
  $up = Curl-Upload $cookieJar "$Base/api/account/appointments/$AptId/chat/upload" $pdfPath "application/pdf"
  $pdfOk = $up.code -eq 200 -and $up.body -match '"ok"\s*:\s*true'
  $bad = Curl-Upload $cookieJar "$Base/api/account/appointments/$AptId/chat/upload" $pngPath "image/png"
  $badType = $bad.code -eq 415
  $results += [pscustomobject]@{
    TC   = "PAT-014-upload"
    Pass = ($pdfOk -and $badType)
    Note = "pdf=$($up.code) png=$($bad.code)"
  }
} else {
  $results += [pscustomobject]@{ TC = "PAT-014-upload"; Pass = $false; Note = "patient login failed" }
}

# --- ADM-034 / ADM-035 ---
$admin = Login "admin@globalhealthonline.com"
if ($admin) {
  Curl-Login $cookieJar "admin@globalhealthonline.com" $Pass
  $mediaUp = Curl-Upload $cookieJar "$Base/api/admin/media/upload" $pngPath "image/png"
  $mediaOk = $mediaUp.code -eq 200 -and $mediaUp.body -match "publicUrl"
  $pdfAdmin = Curl-Upload $cookieJar "$Base/api/admin/media/upload" $pdfPath "application/pdf"
  $pdf415 = $pdfAdmin.code -eq 415
  $key = "test-asset-$ts"
  $path = if ($mediaUp.body -match '"publicUrl"\s*:\s*"([^"]+)"') { $Matches[1] } else { "/api/media/test.png" }
  $createBody = @{
    countryId = $null
    doctorId  = $null
    kind      = "IMAGE"
    key       = $key
    path      = $path
    altText   = "Test asset $ts"
    usageNote = "automated test"
    isActive  = $true
  } | ConvertTo-Json
  try {
    $created = Invoke-RestMethod -Uri "$Base/api/admin/assets" -Method POST -ContentType "application/json" `
      -Body $createBody -WebSession $admin.sess
    $assetOk = $created.ok -and $created.data.asset.key -eq $key
  } catch { $assetOk = $false }
  $results += [pscustomobject]@{ TC = "ADM-035"; Pass = ($mediaOk -and $pdf415); Note = "upload=$($mediaUp.code) pdf=$($pdfAdmin.code)" }
  $results += [pscustomobject]@{ TC = "ADM-034"; Pass = $assetOk; Note = "key=$key" }
} else {
  $results += [pscustomobject]@{ TC = "ADM-035"; Pass = $false; Note = "admin login" }
  $results += [pscustomobject]@{ TC = "ADM-034"; Pass = $false }
}

# --- ADM-060 webhook simulation ---
Push-Location (Join-Path $PSScriptRoot "..\..\backend")
# Set UNPAID briefly for webhook test
$unpaidSql = "UPDATE `"Appointment`" SET `"paymentStatus`" = 'UNPAID', `"stripeSessionId`" = NULL WHERE id = '$AptId';"
Set-Content (Join-Path $tmp "unpaid.sql") $unpaidSql
& npx prisma db execute --file (Join-Path $tmp "unpaid.sql") *>$null
$whOut = (node scripts/simulate-stripe-webhook.mjs $AptId 2>&1 | Out-String).Trim()
$whOk = $whOut -match '^200\|'
$paidOk = $false
if ($admin) {
  try {
    $appt = Invoke-RestMethod -Uri "$Base/api/admin/appointments/$AptId" -WebSession $admin.sess
    $paidOk = $appt.data.appointment.paymentStatus -eq "PAID"
  } catch {
    $paidOk = $false
  }
}
# restore PAID for other tests
$restoreSql = "UPDATE `"Appointment`" SET `"paymentStatus`" = 'PAID' WHERE id = '$AptId';"
Set-Content (Join-Path $tmp "restore.sql") $restoreSql
& npx prisma db execute --file (Join-Path $tmp "restore.sql") *>$null
Pop-Location
$results += [pscustomobject]@{ TC = "ADM-060"; Pass = ($whOk -and $paidOk); Note = "wh=$whOut status=$($appt.data.appointment.paymentStatus)" }

Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue

$results | Format-Table -AutoSize
$fail = $results | Where-Object { -not $_.Pass }
if ($fail) {
  Write-Host "`nFAILED: $($fail.TC -join ', ')" -ForegroundColor Red
  exit 1
}
Write-Host "`nAll final API tests passed." -ForegroundColor Green
