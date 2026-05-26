param(
  [ValidateSet('major','minor','patch')]
  [string]$Bump = 'patch',

  [string[]]$Note = @()
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'clasp-tools.ps1')

$rootPath = $PSScriptRoot

if ($env:APP_VERSION_BUMP) {
  $Bump = $env:APP_VERSION_BUMP
}

$version = New-AppVersion -RootPath $rootPath -Bump $Bump
$appConfig = Sync-AppVersion -RootPath $rootPath -Version $version -DefaultEnv 'dev'
$readmeUpdated = Update-ReadmeVersionLog -RootPath $rootPath -Version $version -ReleaseType 'dev' -Notes $Note

Write-Host "APP_VERSION updated to version $($appConfig.Version)"
if ($readmeUpdated) {
  Write-Host "README version log updated with $($appConfig.Description)"
}
else {
  Write-Host "README already contains $($appConfig.Description)"
}
Write-Host "Synced .clasp.json scriptId to $($appConfig.ScriptId)"
Write-Host "Pushing source files to Apps Script"

Invoke-Clasp -Arguments @('push') -WorkingDirectory $rootPath

Write-Host "Push completed with version $($appConfig.Description)"
