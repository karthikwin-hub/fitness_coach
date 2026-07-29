# Reset production members: keep Avinash/Hetal/Shruti, remove others, seed Gautam/Sarah.
#
# Usage from project root:
#   deploy/reset-prod-members.ps1 `
#     -Remote ubuntu@129.154.47.155 `
#     -KeyPath $env:USERPROFILE\.ssh\oracle-fitness-coach
#
# Optional: -DryRun to preview without changes (no backup taken).
param(
    [Parameter(Mandatory = $true)]
    [string]$Remote,

    [Parameter(Mandatory = $true)]
    [string]$KeyPath,

    [switch]$DryRun,

    [switch]$SkipBackup
)
$ErrorActionPreference = "Stop"

$RootDir = Split-Path $PSScriptRoot -Parent
$RemoteRepo = "/opt/fitness-coach/repo"

if (-not $DryRun -and -not $SkipBackup) {
    Write-Host "==> Backing up production database on VM"
    $BackupCmd = "sudo docker exec fitness-coach-postgres pg_dump -U fitness fitness_coach > ~/backup-pre-member-reset-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
    ssh -i $KeyPath $Remote $BackupCmd
    if ($LASTEXITCODE -ne 0) { throw "database backup failed" }
    Write-Host "==> Backup saved on VM home directory."
}

Write-Host "==> Syncing reset script and web/lib to VM"
ssh -i $KeyPath $Remote "sudo rm -rf ~/fc-sync && mkdir -p ~/fc-sync/web/scripts"
scp -i $KeyPath "$RootDir\web\package.json" "$RootDir\web\package-lock.json" "$RootDir\web\tsconfig.json" "${Remote}:~/fc-sync/web/"
scp -i $KeyPath "$RootDir\web\scripts\reset-production-members.ts" "${Remote}:~/fc-sync/web/scripts/"
scp -i $KeyPath -r "$RootDir\web\lib" "${Remote}:~/fc-sync/web/"
ssh -i $KeyPath $Remote "sudo rsync -a ~/fc-sync/web/ $RemoteRepo/web/ && sudo chown -R ubuntu:ubuntu $RemoteRepo/web"

$ResetFlags = if ($DryRun) { "--dry-run" } else { "--confirm" }

Write-Host "==> Running member reset on VM ($ResetFlags)"
$RemoteReset = @"
set -e
cd $RemoteRepo/web
if [ ! -d node_modules ]; then npm ci; fi
sudo bash -c 'set -a; source /opt/fitness-coach/web/.env.local; set +a; cd $RemoteRepo/web; RESET_PRODUCTION_MEMBERS=1 npx tsx scripts/reset-production-members.ts $ResetFlags'
"@
$RemoteResetUnix = ($RemoteReset -replace "`r`n", "`n") -replace "`r", ""
$RemoteResetUnix | ssh -i $KeyPath $Remote "bash -s"
if ($LASTEXITCODE -ne 0) { throw "member reset failed" }

Write-Host "==> Member reset finished."
