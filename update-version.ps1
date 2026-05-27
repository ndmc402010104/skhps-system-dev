param(
  [ValidateSet('major','minor','patch','none')]
  [string]$Bump = 'none',

  [string[]]$Note = @()
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'clasp-tools.ps1')

$rootPath = $PSScriptRoot

function Invoke-ClaspCapture {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  Push-Location -LiteralPath $rootPath

  try {
    $output = & clasp @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  }
  finally {
    Pop-Location
  }

  if ($exitCode -ne 0) {
    throw ($output -join "`n")
  }

  if ($output) {
    Write-Host ($output -join "`n")
  }

  return @($output)
}

function Get-ClaspVersionNumberFromOutput {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Output
  )

  foreach ($line in $Output) {
    if ($line -match '(?i)\bversion\s+(\d+)\b') {
      return $Matches[1]
    }
  }

  foreach ($line in $Output) {
    if ($line -match '\b(\d+)\b') {
      return $Matches[1]
    }
  }

  throw "Cannot parse Apps Script version number from clasp output: $($Output -join ' ')"
}

$current =
  Get-CurrentAppVersion `
    -RootPath $rootPath

$version =
  New-AppVersion `
    -RootPath $rootPath `
    -Bump $Bump

$appConfig =
  Sync-AppVersion `
    -RootPath $rootPath `
    -Version $version `
    -DefaultEnv 'prod'

if (-not $appConfig.DeploymentId) {
  throw 'Cannot find DEPLOYMENT_ID in Config.js'
}

$description =
  $appConfig.Description

Write-Host "APP_VERSION updated from $current to $($appConfig.Version)"
Write-Host "Synced .clasp.json scriptId to $($appConfig.ScriptId)"

if ($Note -and ($Note -join '').Trim()) {
  Write-Host "Deploy note: $($Note -join ' ')"
}

Write-Host 'Pushing source files to Apps Script'

Invoke-Clasp `
  -Arguments @('push') `
  -WorkingDirectory $rootPath

Write-Host "Creating Apps Script version $description"

$versionOutput =
  Invoke-ClaspCapture `
    -Arguments @('version', $description)

$versionNumber =
  Get-ClaspVersionNumberFromOutput `
    -Output $versionOutput

Write-Host "Updating deployment $($appConfig.DeploymentId) to version $versionNumber"

Invoke-Clasp `
  -Arguments @(
    'deploy',
    '-i',
    $appConfig.DeploymentId,
    '-V',
    [string]$versionNumber,
    '-d',
    $description
  ) `
  -WorkingDirectory $rootPath

Write-Host "Deploy completed with $description at Apps Script version $versionNumber"
