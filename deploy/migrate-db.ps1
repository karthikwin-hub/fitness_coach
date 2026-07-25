# Run database migrations + seed on the Oracle VM (after Postgres is up and .env.local exists).
#
# Usage from project root:
#   deploy/migrate-db.ps1 `
#     -Remote ubuntu@140.245.206.149 `
#     -KeyPath $env:USERPROFILE\.ssh\oracle-trade-ideas.key
param(
    [Parameter(Mandatory = $true)]
    [string]$Remote,

    [Parameter(Mandatory = $true)]
    [string]$KeyPath,

    [switch]$SeedOnly
)
$ErrorActionPreference = "Stop"

$RootDir = Split-Path $PSScriptRoot -Parent
$RemoteRepo = "/opt/fitness-coach/repo"

Write-Host "==> Syncing repo to VM (rsync web + lib for drizzle)"
ssh -i $KeyPath $Remote "mkdir -p $RemoteRepo"
scp -i $KeyPath -r "$RootDir\web\package.json" "$RootDir\web\package-lock.json" "$RootDir\web\drizzle.config.ts" "$RootDir\web\tsconfig.json" "${Remote}:${RemoteRepo}/web/"
scp -i $KeyPath -r "$RootDir\web\lib" "${Remote}:${RemoteRepo}/web/"

$SeedCmd = if ($SeedOnly) { "npm run db:seed" } else { "npm run db:push && npm run db:seed" }

ssh -i $KeyPath $Remote @"
set -e
cd $RemoteRepo/web
npm ci
set -a && source /opt/fitness-coach/web/.env.local && set +a
$SeedCmd
"@

Write-Host "==> Database migrated."
