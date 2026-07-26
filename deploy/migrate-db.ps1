# Run database migrations + seed on the Oracle VM (after Postgres is up and .env.local exists).
#
# Usage from project root:
#   # Preferred for additive schema (no truncates):
#   deploy/migrate-db.ps1 -Remote ubuntu@IP -KeyPath $env:USERPROFILE\.ssh\oracle-fitness-coach `
#     -SqlFile deploy/sql/2026-07-26-plan-delivery.sql
#
#   # Full drizzle push + seed (may prompt / truncate on unique constraints):
#   deploy/migrate-db.ps1 -Remote ubuntu@IP -KeyPath $env:USERPROFILE\.ssh\oracle-fitness-coach
param(
    [Parameter(Mandatory = $true)]
    [string]$Remote,

    [Parameter(Mandatory = $true)]
    [string]$KeyPath,

    [switch]$SeedOnly,

    [string]$SqlFile = ""
)
$ErrorActionPreference = "Stop"

$RootDir = Split-Path $PSScriptRoot -Parent
$RemoteRepo = "/opt/fitness-coach/repo"

if ($SqlFile) {
    $SqlPath = if ([System.IO.Path]::IsPathRooted($SqlFile)) { $SqlFile } else { Join-Path $RootDir $SqlFile }
    if (-not (Test-Path $SqlPath)) { throw "SQL file not found: $SqlPath" }
    Write-Host "==> Applying SQL migration $SqlPath"
    scp -i $KeyPath $SqlPath "${Remote}:~/migrate-temp.sql"
    if ($LASTEXITCODE -ne 0) { throw "scp SQL failed" }
    ssh -i $KeyPath $Remote "sudo docker exec -i fitness-coach-postgres psql -U fitness -d fitness_coach < ~/migrate-temp.sql && rm -f ~/migrate-temp.sql"
    if ($LASTEXITCODE -ne 0) { throw "SQL migration failed" }
    Write-Host "==> SQL migration applied."
    exit 0
}

Write-Host "==> Syncing web/lib to VM via home staging (avoids root-owned repo perms)"
ssh -i $KeyPath $Remote "rm -rf ~/fc-sync && mkdir -p ~/fc-sync/web"
scp -i $KeyPath "$RootDir\web\package.json" "$RootDir\web\package-lock.json" "$RootDir\web\drizzle.config.ts" "$RootDir\web\tsconfig.json" "${Remote}:~/fc-sync/web/"
scp -i $KeyPath -r "$RootDir\web\lib" "${Remote}:~/fc-sync/web/"
ssh -i $KeyPath $Remote "sudo rsync -a ~/fc-sync/web/ $RemoteRepo/web/ && sudo chown -R ubuntu:ubuntu $RemoteRepo/web"

$SeedCmd = if ($SeedOnly) { "npm run db:seed" } else { "npx drizzle-kit push --force && npm run db:seed" }

$RemoteMigration = @"
set -e
cd $RemoteRepo/web
npm ci
sudo bash -c 'set -a; source /opt/fitness-coach/web/.env.local; set +a; cd $RemoteRepo/web; $SeedCmd'
"@
$RemoteMigrationUnix = ($RemoteMigration -replace "`r`n", "`n") -replace "`r", ""
$RemoteMigrationUnix | ssh -i $KeyPath $Remote "bash -s"
if ($LASTEXITCODE -ne 0) { throw "remote migrate/seed failed" }

Write-Host "==> Database migrated."
