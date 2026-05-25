$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'clasp-tools.ps1')

$version = Get-Date -Format 'yyyyMMddHHmm'
$appConfig = Sync-AppVersion -RootPath $PSScriptRoot -Version $version -DefaultEnv 'dev'

Write-Host "APP_VERSION updated to version $($appConfig.Version)"
Write-Host "Synced .clasp.json scriptId to $($appConfig.ScriptId)"
Write-Host "Pushing source files to Apps Script"

Invoke-Clasp -Arguments @('push')

Write-Host "Push completed with version $($appConfig.Description)"
