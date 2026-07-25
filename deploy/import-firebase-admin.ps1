# Import Firebase Admin credentials from downloaded service account JSON into env files.
# Does NOT print or commit the private key.
#
# Usage:
#   deploy/import-firebase-admin.ps1 -KeyJsonPath "C:\path\to\abstrack-prod-firebase-adminsdk-xxxxx.json"
param(
    [Parameter(Mandatory = $true)]
    [string]$KeyJsonPath
)
$ErrorActionPreference = "Stop"

if (-not (Test-Path $KeyJsonPath)) {
    throw "File not found: $KeyJsonPath"
}

$json = Get-Content -Raw -Path $KeyJsonPath | ConvertFrom-Json
$projectId = $json.project_id
$clientEmail = $json.client_email
$privateKey = $json.private_key

if (-not $projectId -or -not $clientEmail -or -not $privateKey) {
    throw "JSON missing project_id, client_email, or private_key"
}

$escapedKey = $privateKey -replace "`r?`n", '\n'
$keyLine = "FIREBASE_PRIVATE_KEY=`"$escapedKey`""

$root = Split-Path $PSScriptRoot -Parent
$targets = @(
    (Join-Path $root "web\.env.local"),
    (Join-Path $root "web\.env.production.local")
)

function Set-EnvVar {
    param([string]$Path, [string]$Name, [string]$Value)
    $content = if (Test-Path $Path) { Get-Content -Raw $Path } else { "" }
    $pattern = "(?m)^$([regex]::Escape($Name))=.*$"
    $line = "$Name=$Value"
    if ($content -match $pattern) {
        $content = [regex]::Replace($content, $pattern, $line)
    } else {
        if ($content -and -not $content.EndsWith("`n")) { $content += "`n" }
        $content += "$line`n"
    }
    Set-Content -Path $Path -Value $content -NoNewline
}

foreach ($envPath in $targets) {
    if (-not (Test-Path $envPath)) {
        Write-Warning "Skipping missing file: $envPath"
        continue
    }
    Set-EnvVar -Path $envPath -Name "FIREBASE_PROJECT_ID" -Value $projectId
    Set-EnvVar -Path $envPath -Name "FIREBASE_CLIENT_EMAIL" -Value $clientEmail
    Set-EnvVar -Path $envPath -Name "FIREBASE_PRIVATE_KEY" -Value "`"$escapedKey`""
    Write-Host "Updated $envPath"
}

Write-Host ""
Write-Host "Done. Restart dev server: cd web && npm run dev"
Write-Host "Keep the JSON file outside the repo (e.g. ~/.ssh/ or Downloads). Do not commit it."
