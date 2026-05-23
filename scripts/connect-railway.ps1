# Connect this repo to the existing Railway project (Global Health Website).
# Run from repo root:  pnpm railway:connect
# Or:  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/connect-railway.ps1

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Invoke-Railway {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Args
    )

    $prevErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & railway @Args 2>&1 | ForEach-Object { $_ }
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $prevErrorAction
    return $exitCode
}

function Test-RailwayCli {
    if (Get-Command railway -ErrorAction SilentlyContinue) {
        return $true
    }

    Write-Host "Installing @railway/cli globally..."
    npm install -g @railway/cli
    return (Get-Command railway -ErrorAction SilentlyContinue) -ne $null
}

function Test-RailwayAuth {
    $code = Invoke-Railway whoami
    return $code -eq 0
}

if (-not (Test-RailwayCli)) {
    Write-Error "Could not install or find the Railway CLI. Install Node.js, then run: npm install -g @railway/cli"
    exit 1
}

Write-Host ""
Write-Host "Global Health Website -> Railway connect"
Write-Host "Repo: $RepoRoot"
Write-Host ""

if (-not (Test-RailwayAuth)) {
    Write-Host "Step 1/3: Sign in to Railway"
    Write-Host "A browser window should open. Complete login there, then return here."
    Write-Host ""
    $loginCode = Invoke-Railway login
    if ($loginCode -ne 0 -or -not (Test-RailwayAuth)) {
        Write-Host ""
        Write-Host "Login did not complete."
        Write-Host "Try manually:"
        Write-Host "  railway login"
        Write-Host ""
        Write-Host "If browser login fails, create a token at https://railway.com/account/tokens"
        Write-Host "then run:"
        Write-Host '  setx RAILWAY_TOKEN "your-token-here"'
        Write-Host "Close this terminal, open a new one, and run pnpm railway:connect again."
        exit 1
    }
    Write-Host "Signed in."
}

Write-Host ""
Write-Host "Step 2/3: Link this folder to your Railway project"
Write-Host "In the prompts, pick workspace/team, then project Global-Health-Website, environment production."
Write-Host ""
$linkCode = Invoke-Railway link
if ($linkCode -ne 0) {
    Write-Host ""
    Write-Host "Linking failed. Try manually:"
    Write-Host "  cd `"$RepoRoot`""
    Write-Host "  railway link"
    exit 1
}

Write-Host ""
Write-Host "Step 3/3: Verify link"
Invoke-Railway status
if ($LASTEXITCODE -ne 0) {
    Write-Host "Could not read Railway status. Link may still have worked — try: railway status"
}

Write-Host ""
Write-Host "--- Service root directories (Railway dashboard -> Service -> Settings) ---"
Write-Host "  Postgres : Railway plugin"
Write-Host "  Backend  : Root Directory = backend"
Write-Host "  Frontend : Root Directory = frontend  (uses frontend/Dockerfile)"
Write-Host ""
Write-Host "--- GitHub auto-deploy (one-time, in Railway dashboard) ---"
Write-Host "  Project -> Settings -> Connect Repo -> myglobalhealthonline/global-health-website"
Write-Host ""
Write-Host "--- Optional: pull env vars ---"
Write-Host "  railway service          # pick Backend or Frontend"
Write-Host "  railway variable list --kv > backend/.env.railway"
Write-Host ""
Write-Host "Live URLs:"
Write-Host "  Backend : https://backend-global-health-website.up.railway.app"
Write-Host "  Frontend: https://frontend-global-health-website.up.railway.app"
Write-Host ""
Write-Host "Done. Useful commands: railway status | railway logs | railway open"
