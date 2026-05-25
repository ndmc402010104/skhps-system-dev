$ErrorActionPreference = 'Stop'

$configPath = Join-Path $PSScriptRoot 'Config.js'
$version = Get-Date -Format 'yyyyMMddHHmm'

. (Join-Path $PSScriptRoot 'clasp-tools.ps1')

$appConfig = Sync-AppVersion -RootPath $PSScriptRoot -Version $version -DefaultEnv 'prod'

if (-not $appConfig.DeploymentId) {
  throw 'Cannot find DEPLOYMENT_ID in Config.js; refusing to create a new deployment.'
}

Write-Host "APP_VERSION updated to version $($appConfig.Version)"
Write-Host "Synced .clasp.json scriptId to $($appConfig.ScriptId)"
Write-Host "Pushing source files to Apps Script"

Invoke-Clasp -Arguments @('push')

Write-Host "Updating existing deployment $($appConfig.DeploymentId) with description $($appConfig.Description)"
Invoke-Clasp -Arguments @('update-deployment', $appConfig.DeploymentId, '--description', $appConfig.Description)

Write-Host 'Current deployments:'
Invoke-Clasp -Arguments @('list-deployments')

Write-Host "Deployment completed with description $($appConfig.Description)"

Write-Host 'Restoring HEAD default environment to dev'
$devConfig = Sync-AppVersion -RootPath $PSScriptRoot -Version $version -DefaultEnv 'dev'
Invoke-Clasp -Arguments @('push')
Write-Host "HEAD restored to $($devConfig.DefaultEnv) with version $($devConfig.Description)"
