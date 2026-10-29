# Deploy hanzi-link-game to Cloudflare Pages (Windows PowerShell)
# Usage:
#   .\deploy-pages.ps1                      # build + deploy to production branch main
#   .\deploy-pages.ps1 -ProjectName my-app  # custom project name
#   .\deploy-pages.ps1 -Branch preview      # deploy as a preview branch
#
# Requirements: Node.js 18+, a Cloudflare account.
# Auth: either run `npx wrangler login` once (browser), or set CLOUDFLARE_API_TOKEN.

param(
    [string]$ProjectName = 'hanzi-link-game',
    [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

Write-Host "[1/5] Checking Node.js..." -ForegroundColor Cyan
$nodeVersion = (node --version)
Write-Host "      node $nodeVersion"

Write-Host "[2/5] Installing dependencies..." -ForegroundColor Cyan
if (-not (Test-Path 'node_modules')) {
    npm ci
} else {
    Write-Host "      node_modules already present, skipping"
}

Write-Host "[3/5] Building..." -ForegroundColor Cyan
npm run build
if (-not (Test-Path 'dist\index.html')) {
    throw "Build failed: dist\index.html not found"
}
$files = Get-ChildItem -Recurse -File 'dist'
$sizeMB = [math]::Round(($files | Measure-Object Length -Sum).Sum / 1MB, 1)
Write-Host "      dist: $($files.Count) files, $sizeMB MB"

Write-Host "[4/5] Checking Cloudflare auth..." -ForegroundColor Cyan
$tokenSet = -not [string]::IsNullOrWhiteSpace($env:CLOUDFLARE_API_TOKEN)
$loggedIn = Test-Path (Join-Path $env:USERPROFILE '.wrangler\config\default.toml')
if ($tokenSet) {
    Write-Host "      using CLOUDFLARE_API_TOKEN"
} elseif ($loggedIn) {
    Write-Host "      already logged in"
} else {
    Write-Host "      not logged in, opening browser now..." -ForegroundColor Yellow
    npx wrangler login
}

Write-Host "[5/5] Deploying to Cloudflare Pages..." -ForegroundColor Cyan
npx wrangler pages project create $ProjectName --production-branch $Branch 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "      project already exists, continuing" -ForegroundColor Yellow
}
npx wrangler pages deploy 'dist' --project-name $ProjectName --branch $Branch
if ($LASTEXITCODE -ne 0) {
    throw "Deploy failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "Done. Your site should be live at:" -ForegroundColor Green
Write-Host "  https://$ProjectName.pages.dev" -ForegroundColor Green
Write-Host "If the first visit fails with DNS error, wait 1-2 minutes and retry." -ForegroundColor Gray
