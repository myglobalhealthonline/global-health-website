# Phase 0 admin smoke — API verification (requires admin cookie via login)
$Base = "http://localhost:4000"
$Pass = "GHAdmin2026X7qL9!"
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$login = Invoke-RestMethod -Uri "$Base/api/auth/login" -Method POST -ContentType "application/json" `
  -Body (@{ email = "admin@globalhealthonline.com"; password = $Pass } | ConvertTo-Json) -WebSession $s
if (-not $login.ok) { Write-Error "Admin login failed"; exit 1 }

$checks = @(
  @{ TC = "ADM-031"; Path = "/api/admin/users?pageSize=5" },
  @{ TC = "ADM-033"; Path = "/api/admin/assets?pageSize=5" },
  @{ TC = "ADM-039"; Path = "/api/admin/newsletter?pageSize=5" },
  @{ TC = "ADM-041"; Path = "/api/admin/settings/reviews" },
  @{ TC = "ADM-040"; Path = "/api/admin/audit-log?pageSize=5" }
)

foreach ($c in $checks) {
  try {
    $r = Invoke-RestMethod -Uri "$Base$($c.Path)" -WebSession $s
    Write-Host "$($c.TC) PASS ok=$($r.ok)"
  } catch {
    Write-Host "$($c.TC) FAIL $($_.Exception.Message)"
  }
}
