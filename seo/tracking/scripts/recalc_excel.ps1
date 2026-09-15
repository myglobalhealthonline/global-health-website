<#
.SYNOPSIS
  Force a full recalculation of the tracker workbook via Excel COM and save.
  Needed before check_formula_errors.py, since openpyxl (data_only=True)
  only ever reads a formula's last-cached result, never computes one.

.PARAMETER Path
  Full path to the .xlsx workbook.

.EXAMPLE
  pwsh -File recalc_excel.ps1 -Path C:\Github\global-health-website\seo\tracking\Global_Health_SEO_Tracker.xlsx
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

$ErrorActionPreference = "Stop"
$Path = (Resolve-Path -LiteralPath $Path).Path

$excel = $null
$workbook = $null
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $workbook = $excel.Workbooks.Open($Path)
    $excel.CalculateFullRebuild()
    $workbook.Save()
    Write-Host "Recalculated and saved: $Path"
    exit 0
}
catch {
    Write-Error "recalc_excel.ps1 failed: $_"
    exit 1
}
finally {
    if ($workbook) { $workbook.Close($true) | Out-Null }
    if ($excel) { $excel.Quit() | Out-Null }
    if ($workbook) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) | Out-Null }
    if ($excel) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
