param(
  [ValidateSet('major','minor','patch','none')]
  [string]$Bump = 'none',

  [string[]]$Note = @()
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'clasp-tools.ps1')

$rootPath = $PSScriptRoot

$sourceVersion = Get-CurrentAppVersion -RootPath $rootPath
$version = New-AppVersion -RootPath $rootPath -Bump $Bump
$appConfig = Sync-AppVersion -RootPath $rootPath -Version $version -DefaultEnv 'prod'

if (-not $appConfig.DeploymentId) {
  throw 'Cannot find DEPLOYMENT_ID in Config.js; refusing to create a new deployment.'
}

$readmeUpdated = Update-ReadmeVersionLog -RootPath $rootPath -Version $version -ReleaseType 'prod' -SourceVersion $sourceVersion -Notes $Note

Write-Host "APP_VERSION updated to version $($appConfig.Version)"
if ($readmeUpdated) {
  Write-Host "README version log updated with prod $($appConfig.Description)"
}
else {
  Write-Host "README already contains prod $($appConfig.Description)"
}
Write-Host "Synced .clasp.json scriptId to $($appConfig.ScriptId)"
Write-Host "Pushing source files to Apps Script"

Invoke-Clasp -Arguments @('push') -WorkingDirectory $rootPath

Write-Host "Updating existing deployment $($appConfig.DeploymentId) with description $($appConfig.Description)"
Invoke-Clasp -Arguments @('update-deployment', $appConfig.DeploymentId, '--description', $appConfig.Description) -WorkingDirectory $rootPath

Write-Host 'Current deployments:'
Invoke-Clasp -Arguments @('list-deployments') -WorkingDirectory $rootPath

Write-Host "Deployment completed with description $($appConfig.Description)"

Write-Host 'Restoring HEAD default environment to dev'
$devConfig = Sync-AppVersion -RootPath $rootPath -Version $version -DefaultEnv 'dev'
Invoke-Clasp -Arguments @('push') -WorkingDirectory $rootPath
Write-Host "HEAD restored to $($devConfig.DefaultEnv) with version $($devConfig.Description)"
