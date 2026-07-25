# Windows/PowerShell — build Next.js standalone locally and upload to Oracle VM.
# Does NOT require Oracle Cloud Console login (SSH only).
#
# Prerequisites:
#   1. web/.env.production.local filled from deploy/env.production.example (Firebase NEXT_PUBLIC_*)
#   2. VM one-time setup: docs/oracle-vm-hosting-setup.md
#
# Usage:
#   deploy/deploy-app.ps1 `
#     -Remote ubuntu@140.245.206.149 `
#     -KeyPath $env:USERPROFILE\.ssh\oracle-trade-ideas.key `
#     -EnvFile web\.env.production.local
param(
    [Parameter(Mandatory = $true)]
    [string]$Remote,

    [Parameter(Mandatory = $true)]
    [string]$KeyPath,

    [string]$EnvFile = "web\.env.production.local",

    [switch]$SkipBuild,

    [switch]$RestartOnly
)
$ErrorActionPreference = "Stop"

$RootDir = Split-Path $PSScriptRoot -Parent
$WebDir = Join-Path $RootDir "web"
$StagingDir = "fitness-coach-app-upload"
$RemoteApp = "/opt/fitness-coach/app"

if ($RestartOnly) {
    Write-Host "==> Restarting fitness-coach service on VM"
    ssh -i $KeyPath $Remote "sudo systemctl restart fitness-coach && sudo systemctl status fitness-coach --no-pager"
    exit 0
}

if (-not (Test-Path $EnvFile)) {
    throw "Missing $EnvFile - copy deploy/env.production.example to web/.env.production.local and fill Firebase keys."
}

Push-Location $WebDir
try {
    if (-not $SkipBuild) {
        Write-Host "==> Installing dependencies"
        npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }

        Write-Host "==> Building Next.js (standalone) with $EnvFile"
        Copy-Item -Force (Join-Path $RootDir $EnvFile) ".env.production.local"
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }

        $Standalone = Join-Path $WebDir ".next\standalone"
        if (-not (Test-Path (Join-Path $Standalone "server.js"))) {
            throw "Standalone build missing - ensure next.config.ts has output: 'standalone'"
        }

        Write-Host "==> Staging standalone bundle"
        $LocalStage = Join-Path $env:TEMP "fitness-coach-standalone"
        if (Test-Path $LocalStage) { Remove-Item -Recurse -Force $LocalStage }
        New-Item -ItemType Directory -Path $LocalStage | Out-Null
        Copy-Item -Recurse (Join-Path $Standalone "*") $LocalStage
        New-Item -ItemType Directory -Force -Path (Join-Path $LocalStage ".next") | Out-Null
        Copy-Item -Recurse (Join-Path $WebDir ".next\static") (Join-Path $LocalStage ".next\static")
        if (Test-Path (Join-Path $WebDir "public")) {
            Copy-Item -Recurse (Join-Path $WebDir "public") (Join-Path $LocalStage "public")
        }
    } else {
        $LocalStage = Join-Path $env:TEMP "fitness-coach-standalone"
        if (-not (Test-Path $LocalStage)) { throw "No staged build - run without -SkipBuild first" }
    }

    Write-Host "==> Uploading to ${Remote}:~/$StagingDir"
    ssh -i $KeyPath $Remote "rm -rf ~/$StagingDir && mkdir -p ~/$StagingDir"
    scp -i $KeyPath -r (Join-Path $LocalStage "*") "${Remote}:${StagingDir}/"
    scp -i $KeyPath -r (Join-Path $LocalStage ".next") "${Remote}:${StagingDir}/"
    if ($LASTEXITCODE -ne 0) { throw "scp upload failed" }

    Write-Host "==> Installing on VM and restarting service"
    ssh -i $KeyPath $Remote @"
sudo rsync -a --delete ~/$StagingDir/ $RemoteApp/ &&
sudo chown -R fitness-coach:fitness-coach $RemoteApp &&
rm -rf ~/$StagingDir &&
sudo systemctl restart fitness-coach &&
sudo systemctl is-active fitness-coach
"@
    if ($LASTEXITCODE -ne 0) { throw "remote install/restart failed" }

    Write-Host "==> Done. Open https://abstrack.duckdns.org (after DuckDNS + Caddy are configured)."
}
finally {
    Pop-Location
}
