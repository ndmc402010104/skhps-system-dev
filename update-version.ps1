param(
  [ValidateSet(
    'major',
    'minor',
    'patch',
    'none'
  )]

  [string]
  $Bump='none'
)

$ErrorActionPreference=
'Stop'

. (
  Join-Path
  $PSScriptRoot
  'clasp-tools.ps1'
)

$rootPath=
$PSScriptRoot

$current=
Get-CurrentAppVersion `
-RootPath `
$rootPath

$version=
New-AppVersion `
-RootPath `
$rootPath `
-Bump `
$Bump

$appConfig=
Sync-AppVersion `
-RootPath `
$rootPath `
-Version `
$version

Write-Host
"APP_VERSION updated to version $($appConfig.Version)"