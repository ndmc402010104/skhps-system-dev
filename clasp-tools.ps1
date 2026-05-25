$ErrorActionPreference = 'Stop'

function Invoke-Clasp {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $output = & clasp @Arguments 2>&1
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    throw ($output -join "`n")
  }

  if ($output) {
    Write-Host ($output -join "`n")
  }
}

function Get-ConfigConstValue {
  param(
    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string[]]$Lines,

    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  for ($i = 0; $i -lt $Lines.Count; $i++) {
    $line = $Lines[$i]

    if ($line -match "^\s*const\s+$Name\s*=\s*'([^']*)'\s*;\s*$") {
      return $Matches[1]
    }

    if ($line -match "^\s*const\s+$Name\s*=\s*$") {
      for ($j = $i + 1; $j -lt $Lines.Count; $j++) {
        if ($Lines[$j] -match "'([^']*)'") {
          return $Matches[1]
        }

        if ($Lines[$j] -match '^\s*const\s+\w+\s*=') {
          break
        }
      }
    }
  }

  return $null
}

function Set-ConfigConstValue {
  param(
    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string[]]$Lines,

    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string]$Value,

    [string]$InsertAfterName
  )

  $updatedLines = [System.Collections.Generic.List[string]]::new()
  $found = $false

  for ($i = 0; $i -lt $Lines.Count; $i++) {
    $line = $Lines[$i]

    if ($line -match "^\s*const\s+$Name\s*=") {
      $updatedLines.Add("const $Name =")
      $updatedLines.Add("'$Value';")
      $found = $true

      if (
        $i + 1 -lt $Lines.Count -and
        $Lines[$i + 1] -match "^\s*'[^']*'\s*;\s*$"
      ) {
        $i++
      }

      continue
    }

    $updatedLines.Add($line)
  }

  if ($found) {
    return $updatedLines.ToArray()
  }

  if (-not $InsertAfterName) {
    throw "Cannot find $Name in Config.js"
  }

  $insertedLines = [System.Collections.Generic.List[string]]::new()
  $inserted = $false
  $insideInsertTarget = $false

  foreach ($line in $updatedLines) {
    $insertedLines.Add($line)

    if ($line -match "^\s*const\s+$InsertAfterName\s*=") {
      $insideInsertTarget = $true
      continue
    }

    if ($insideInsertTarget -and $line -match ";\s*$") {
      $insertedLines.Add("const $Name =")
      $insertedLines.Add("'$Value';")
      $inserted = $true
      $insideInsertTarget = $false
    }
  }

  if (-not $inserted) {
    throw "Cannot insert $Name after $InsertAfterName in Config.js"
  }

  return $insertedLines.ToArray()
}

function Get-ClaspHeadDeploymentId {

  $output = & clasp list-deployments 2>&1
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    return $null
  }

  foreach ($line in $output) {
    if ($line -match '^\s*-\s+(\S+)\s+@HEAD\b') {
      return $Matches[1]
    }
  }

  return $null
}

function Sync-AppVersion {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RootPath,

    [Parameter(Mandatory = $true)]
    [string]$Version,

    [ValidateSet('dev','prod')]
    [string]$DefaultEnv = 'dev'
  )

  $configPath = Join-Path $RootPath 'Config.js'
  $claspPath = Join-Path $RootPath '.clasp.json'
  $utf8NoBom = [System.Text.UTF8Encoding]::new($false)

  $configLines = Get-Content -Path $configPath -Encoding UTF8
  $scriptId = Get-ConfigConstValue -Lines $configLines -Name 'SCRIPT_ID'
  $deploymentId = Get-ConfigConstValue -Lines $configLines -Name 'DEPLOYMENT_ID'
  $devDeploymentId = Get-ConfigConstValue -Lines $configLines -Name 'APP_DEV_DEPLOYMENT_ID'
  $entryUrl = Get-ConfigConstValue -Lines $configLines -Name 'APP_ENTRY_URL'
  $devUrl = Get-ConfigConstValue -Lines $configLines -Name 'APP_DEV_URL'

  if (-not $scriptId) {
    throw 'Cannot find SCRIPT_ID in Config.js'
  }

  if ($deploymentId) {
    $entryUrl = "https://script.google.com/macros/s/$deploymentId/exec"

    $configLines = Set-ConfigConstValue `
      -Lines $configLines `
      -Name 'APP_ENTRY_URL' `
      -Value $entryUrl
  }

  if (-not $entryUrl) {
    throw 'Cannot find APP_ENTRY_URL in Config.js'
  }

  if (-not $devDeploymentId) {
    $devDeploymentId = Get-ClaspHeadDeploymentId
  }

  if ($devDeploymentId) {
    $devUrl = "https://script.google.com/macros/s/$devDeploymentId/dev"

    $configLines = Set-ConfigConstValue `
      -Lines $configLines `
      -Name 'APP_DEV_DEPLOYMENT_ID' `
      -Value $devDeploymentId `
      -InsertAfterName 'DEPLOYMENT_ID'
  }

  if (-not $devUrl) {
    throw 'Cannot find APP_DEV_URL in Config.js'
  }

  $configLines = Set-ConfigConstValue `
    -Lines $configLines `
    -Name 'APP_VERSION' `
    -Value $Version

  $configLines = Set-ConfigConstValue `
    -Lines $configLines `
    -Name 'APP_DEFAULT_ENV' `
    -Value $DefaultEnv `
    -InsertAfterName 'APP_DEV_DEPLOYMENT_ID'

  $configLines = Set-ConfigConstValue `
    -Lines $configLines `
    -Name 'APP_DEV_URL' `
    -Value $devUrl `
    -InsertAfterName 'APP_ENTRY_URL'

  [System.IO.File]::WriteAllLines($configPath, $configLines, $utf8NoBom)

  $claspConfig = @{
    scriptId = $scriptId
    rootDir = '.'
  } | ConvertTo-Json -Depth 5

  [System.IO.File]::WriteAllText($claspPath, $claspConfig, $utf8NoBom)

  return [pscustomobject]@{
    Version = $Version
    Description = "v.$Version"
    ScriptId = $scriptId
    DeploymentId = $deploymentId
    DevDeploymentId = $devDeploymentId
    DevUrl = $devUrl
    DefaultEnv = $DefaultEnv
  }
}
