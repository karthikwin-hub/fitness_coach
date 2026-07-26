# Windows/PowerShell — build Next.js standalone locally and upload to Oracle VM.
# Does NOT require Oracle Cloud Console login (SSH only).
#
# Prerequisites:
#   1. web/.env.production.local filled from deploy/env.production.example (Firebase NEXT_PUBLIC_*)
#   2. VM one-time setup: docs/oracle-vm-hosting-setup.md
#
# Usage:
#   deploy/deploy-app.ps1 `
#     -Remote ubuntu@129.154.47.155 `
#     -KeyPath $env:USERPROFILE\.ssh\oracle-fitness-coach `
#     -EnvFile web\.env.production.local
param(
    [Parameter(Mandatory = $true)]
    [string]$Remote,

    [Parameter(Mandatory = $true)]
    [string]$KeyPath,

    [string]$EnvFile = "web\.env.production.local",

    [switch]$SkipInstall,

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
        if (-not $SkipInstall) {
            Write-Host "==> Installing dependencies"
            npm ci
            if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
        } else {
            Write-Host "==> Using existing node_modules (-SkipInstall)"
        }

        Write-Host "==> Building Next.js (standalone) with $EnvFile"
        $BuildEnvSource = (Resolve-Path (Join-Path $RootDir $EnvFile)).Path
        $BuildEnvTarget = (Join-Path $WebDir ".env.production.local")
        if ($BuildEnvSource -ne $BuildEnvTarget) {
            Copy-Item -Force $BuildEnvSource $BuildEnvTarget
        }
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

    Write-Host "==> Compressing standalone bundle"
    $LocalArchive = Join-Path $env:TEMP "$StagingDir.tar.gz"
    if (Test-Path $LocalArchive) { Remove-Item -Force $LocalArchive }
    tar -czf $LocalArchive -C $LocalStage .
    if ($LASTEXITCODE -ne 0) { throw "bundle compression failed" }

    Write-Host "==> Uploading archive to $Remote"
    scp -i $KeyPath $LocalArchive "${Remote}:${StagingDir}.tar.gz"
    if ($LASTEXITCODE -ne 0) { throw "scp upload failed" }

    Write-Host "==> Installing on VM and restarting service"
    $RemoteInstall = @"
rm -rf ~/$StagingDir &&
mkdir -p ~/$StagingDir &&
tar -xzf ~/$StagingDir.tar.gz -C ~/$StagingDir &&
rm -f ~/$StagingDir.tar.gz &&
sudo rsync -a --delete ~/$StagingDir/ $RemoteApp/ &&
sudo chown -R fitness-coach:fitness-coach $RemoteApp &&
rm -rf ~/$StagingDir &&
sudo systemctl restart fitness-coach &&
sudo systemctl is-active fitness-coach
"@
    ($RemoteInstall -replace "`r", "") | ssh -i $KeyPath $Remote "bash -s"
    if ($LASTEXITCODE -ne 0) { throw "remote install/restart failed" }

    Write-Host "==> Done. Open https://abstrack.duckdns.org (after DuckDNS + Caddy are configured)."
}
finally {
    Pop-Location
}
