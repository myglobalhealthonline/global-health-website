# API smoke for manual test preflight — run from repo root
$Base = "http://localhost:4000"
$Pass = "GHAdmin2026X7qL9!"
$results = @()

function Test-Auth($email, $role) {
  $sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  try {
    $login = Invoke-RestMethod -Uri "$Base/api/auth/login" -Method POST -ContentType "application/json" `
      -Body (@{ email = $email; password = $Pass } | ConvertTo-Json) -WebSession $sess
    $ok = $login.ok -and $login.data.user.role -eq $role
    return @{ ok = $ok; sess = $sess; user = $login.data.user }
  } catch {
    return @{ ok = $false; err = $_.Exception.Message }
  }
}

function Hit($sess, $method, $path, $body = $null, $expect = @(200,201)) {
  try {
    $params = @{ Uri = "$Base$path"; Method = $method; WebSession = $sess; ErrorAction = "Stop" }
    if ($body) { $params.ContentType = "application/json"; $params.Body = ($body | ConvertTo-Json -Depth 6) }
    $r = Invoke-WebRequest @params -UseBasicParsing
    return $expect -contains $r.StatusCode
  } catch {
    $code = $null
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    return $expect -contains $code
  }
}

# Admin
$admin = Test-Auth "admin@globalhealthonline.com" "ADMIN"
$results += [pscustomobject]@{ TC = "ADM-auth"; Pass = $admin.ok }

if ($admin.ok) {
  $s = $admin.sess
  $results += [pscustomobject]@{ TC = "ADM-countries"; Pass = (Hit $s GET "/api/admin/countries") }
  $results += [pscustomobject]@{ TC = "ADM-doctors"; Pass = (Hit $s GET "/api/admin/doctors?pageSize=20") }
  $results += [pscustomobject]@{ TC = "ADM-services"; Pass = (Hit $s GET "/api/admin/services?pageSize=20") }
  $ieId = (Invoke-RestMethod -Uri "$Base/api/admin/countries" -WebSession $s).data.countries |
    Where-Object { $_.code -eq "ie" } | Select-Object -First 1 -ExpandProperty id
  if ($ieId) {
    $results += [pscustomobject]@{ TC = "ADM-specialties"; Pass = (Hit $s GET "/api/admin/specialties?countryId=$ieId") }
  }
  $results += [pscustomobject]@{ TC = "ADM-appointments"; Pass = (Hit $s GET "/api/admin/appointments?pageSize=20") }
  $results += [pscustomobject]@{ TC = "ADM-users"; Pass = (Hit $s GET "/api/admin/users?pageSize=20") }
  $results += [pscustomobject]@{ TC = "ADM-pages"; Pass = (Hit $s GET "/api/admin/pages?pageSize=20") }
  $results += [pscustomobject]@{ TC = "ADM-assets"; Pass = (Hit $s GET "/api/admin/assets?pageSize=20") }
  $results += [pscustomobject]@{ TC = "ADM-newsletter"; Pass = (Hit $s GET "/api/admin/newsletter?pageSize=20") }
  $results += [pscustomobject]@{ TC = "ADM-audit"; Pass = (Hit $s GET "/api/admin/audit-log?pageSize=20") }
  $results += [pscustomobject]@{ TC = "ADM-health-tests"; Pass = (Hit $s GET "/api/admin/health-tests?pageSize=20") }
  $malta = (Invoke-RestMethod -Uri "$Base/api/admin/countries" -WebSession $s).data.countries | Where-Object { $_.code -eq "mt" -or $_.slug -eq "malta" } | Select-Object -First 1
  if ($malta) {
    $results += [pscustomobject]@{ TC = "ADM-malta-doctors"; Pass = (Hit $s GET "/api/admin/doctors?countryId=$($malta.id)&pageSize=250") }
  }
}

# Doctor
$doc = Test-Auth "doctor@globalhealthonline.com" "DOCTOR"
$results += [pscustomobject]@{ TC = "DOC-auth"; Pass = $doc.ok }
if ($doc.ok) {
  $ds = $doc.sess
  $results += [pscustomobject]@{ TC = "DOC-appointments"; Pass = (Hit $ds GET "/api/doctor/appointments?pageSize=20") }
  $results += [pscustomobject]@{ TC = "DOC-patients"; Pass = (Hit $ds GET "/api/doctor/patients?pageSize=20") }
  $results += [pscustomobject]@{ TC = "DOC-invoices"; Pass = (Hit $ds GET "/api/doctor/invoices?pageSize=20") }
  $results += [pscustomobject]@{ TC = "DOC-admin-denied"; Pass = (Hit $ds GET "/api/admin/countries" @() 403) }
}

# Patient
$pat = Test-Auth "patient@globalhealthonline.com" "PATIENT"
$results += [pscustomobject]@{ TC = "PAT-auth"; Pass = $pat.ok }
if ($pat.ok) {
  $ps = $pat.sess
  $results += [pscustomobject]@{ TC = "PAT-bookings"; Pass = (Hit $ps GET "/api/account/appointments") }
  $results += [pscustomobject]@{ TC = "PAT-me"; Pass = (Hit $ps GET "/api/auth/me") }
  $results += [pscustomobject]@{ TC = "PAT-payments"; Pass = (Hit $ps GET "/api/account/payments") }
  $results += [pscustomobject]@{ TC = "PAT-admin-denied"; Pass = (Hit $ps GET "/api/admin/countries" @() 403) }
}

# Public
try {
  $c = Invoke-RestMethod -Uri "$Base/api/countries" -TimeoutSec 10
  $results += [pscustomobject]@{ TC = "PUB-countries"; Pass = $c.ok }
} catch { $results += [pscustomobject]@{ TC = "PUB-countries"; Pass = $false } }

$results | Format-Table -AutoSize
$failed = $results | Where-Object { -not $_.Pass }
if ($failed) { Write-Host "FAILED:" ($failed.TC -join ", "); exit 1 }
Write-Host "All API smoke checks passed ($($results.Count) checks)"
