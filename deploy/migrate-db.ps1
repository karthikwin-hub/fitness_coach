# Run database migrations + seed on the Oracle VM (after Postgres is up and .env.local exists).
#
# Usage from project root:
#   deploy/migrate-db.ps1 `
#     -Remote ubuntu@129.154.47.155 `
#     -KeyPath $env:USERPROFILE\.ssh\oracle-fitness-coach
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

$RemoteMigration = @"
set -e
cd $RemoteRepo/web
npm ci
sudo bash -c 'set -a; source /opt/fitness-coach/web/.env.local; set +a; cd $RemoteRepo/web; $SeedCmd'
"@
($RemoteMigration -replace "`r", "") | ssh -i $KeyPath $Remote "bash -s"

Write-Host "==> Database migrated."
