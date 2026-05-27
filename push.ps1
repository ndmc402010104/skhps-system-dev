param(
  [ValidateSet('ask','push','deploy')]
  [string]$Action = 'ask',

  [ValidateSet('ask','major','minor','patch','none')]
  [string]$Bump = 'ask',

  [string[]]$Note = @(),

  [switch]$NoSaveAllPrompt,

  [switch]$NoReadmePrompt,

  [switch]$NoGitHubPrompt
)

chcp 65001 | Out-Null

[Console]::InputEncoding =
  [System.Text.UTF8Encoding]::new()

[Console]::OutputEncoding =
  [System.Text.UTF8Encoding]::new()

$OutputEncoding =
  [System.Text.UTF8Encoding]::new()

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'clasp-tools.ps1')

$rootPath = $PSScriptRoot

function Test-CommandExists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Read-MenuChoice {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message,

    [Parameter(Mandatory = $true)]
    [hashtable]$Choices,

    [Parameter(Mandatory = $true)]
    [string]$Default
  )

  while ($true) {
    $answer = Read-Host $Message

    if ([string]::IsNullOrWhiteSpace($answer)) {
      return $Default
    }

    $key = $answer.Trim().ToLower()

    if ($Choices.ContainsKey($key)) {
      return $Choices[$key]
    }

    Write-Host "Please choose one of: $($Choices.Keys -join ', '), or press Enter for default." -ForegroundColor Yellow
  }
}

function Read-YesNo {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message,

    [bool]$Default = $true
  )

  $suffix = if ($Default) { 'Y/n' } else { 'y/N' }

  while ($true) {
    $answer = Read-Host "$Message ($suffix)"

    if ([string]::IsNullOrWhiteSpace($answer)) {
      return $Default
    }

    if ($answer -match '^[Yy]') {
      return $true
    }

    if ($answer -match '^[Nn]') {
      return $false
    }

    Write-Host 'Please answer Y or N.' -ForegroundColor Yellow
  }
}

function Request-ManualSaveBeforeContinue {
  Write-Host "Could not save automatically. Please save files in VS Code manually." -ForegroundColor Yellow

  $continue =
    Read-Host "Press Enter to continue after saving manually; type N to cancel"

  if ($continue -match '^[Nn]$') {
    Write-Host "Push cancelled" -ForegroundColor Red
    exit 1
  }
}

function Save-AllOpenFiles {
  if ($NoSaveAllPrompt) {
    return
  }

  Write-Host ""

  if (-not (Read-YesNo -Message "Save all open VS Code files first?" -Default $true)) {
    return
  }

  if (Test-CommandExists -Name 'code') {
    try {
      code --reuse-window --command workbench.action.files.saveAll

      if ($LASTEXITCODE -ne 0) {
        throw "VS Code Save All command failed."
      }

      Start-Sleep -Milliseconds 800

      Write-Host "VS Code Save All command sent" -ForegroundColor Green
    }
    catch {
      Request-ManualSaveBeforeContinue
    }
  }
  else {
    Write-Host "The code command was not found, so VS Code Save All cannot run automatically." -ForegroundColor Yellow
    Request-ManualSaveBeforeContinue
  }
}

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

function Push-GitHubIfRequested {
  if ($NoGitHubPrompt) {
    return
  }

  Write-Host ""
  Write-Host "==========================" -ForegroundColor Cyan
  Write-Host "GitHub commit" -ForegroundColor Cyan
  Write-Host "=========================="
  Write-Host "This will run git add . and include all current changes."

  $commitMessage =
    Read-Host "Enter Git commit message (blank to skip GitHub)"

  if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    Write-Host ""
    Write-Host "GitHub commit skipped" -ForegroundColor Yellow
    return
  }

  if (-not (Test-CommandExists -Name 'git')) {
    throw "The git command was not found. Cannot commit to GitHub."
  }

  Push-Location $rootPath

  try {
    git add .

    if ($LASTEXITCODE -ne 0) {
      throw "git add failed."
    }

    $stagedFiles = git diff --cached --name-only

    if ($LASTEXITCODE -ne 0) {
      throw "Could not read staged git changes."
    }

    if (-not $stagedFiles) {
      Write-Host ""
      Write-Host "No staged changes. GitHub commit skipped." -ForegroundColor Yellow
      return
    }

    git commit -m $commitMessage

    if ($LASTEXITCODE -ne 0) {
      throw "git commit failed."
    }

    git push

    if ($LASTEXITCODE -ne 0) {
      throw "git push failed."
    }

    Write-Host ""
    Write-Host "GitHub updated" -ForegroundColor Green
  }
  finally {
    Pop-Location
  }
}

Save-AllOpenFiles

if ($env:APP_VERSION_BUMP) {
  $Bump = $env:APP_VERSION_BUMP
}

if ($Bump -eq 'ask') {
  Write-Host ""
  $Bump = Read-MenuChoice `
    -Message "Version bump? P=patch, M=minor, A=major, N=none [P]" `
    -Choices @{
      'p' = 'patch'
      'patch' = 'patch'
      'm' = 'minor'
      'minor' = 'minor'
      'a' = 'major'
      'major' = 'major'
      'n' = 'none'
      'none' = 'none'
    } `
    -Default 'patch'
}

if ($Action -eq 'ask') {
  Write-Host ""
  $Action = Read-MenuChoice `
    -Message "What do you want to do? P=push test, D=deploy production [P]" `
    -Choices @{
      'p' = 'push'
      'push' = 'push'
      'test' = 'push'
      'd' = 'deploy'
      'deploy' = 'deploy'
      'prod' = 'deploy'
    } `
    -Default 'push'
}

if (-not ($Note -and ($Note -join '').Trim())) {
  Write-Host ""
  $noteText = Read-Host "Note for README/deploy log (blank = auto/none)"

  if (-not [string]::IsNullOrWhiteSpace($noteText)) {
    $Note = @($noteText)
  }
}

$defaultReadme = $Bump -ne 'patch'

if ($Action -eq 'deploy') {
  $defaultReadme = $true
}

$writeReadme = $false

if (-not $NoReadmePrompt) {
  Write-Host ""
  $writeReadme = Read-YesNo -Message "Write README version log?" -Default $defaultReadme
}

$sourceVersion = Get-CurrentAppVersion -RootPath $rootPath
$version = New-AppVersion -RootPath $rootPath -Bump $Bump
$defaultEnv = if ($Action -eq 'deploy') { 'prod' } else { 'dev' }

$appConfig =
  Sync-AppVersion `
    -RootPath $rootPath `
    -Version $version `
    -DefaultEnv $defaultEnv

if ($writeReadme) {
  $releaseType = if ($Action -eq 'deploy') { 'prod' } else { 'dev' }

  $readmeUpdated =
    Update-ReadmeVersionLog `
      -RootPath $rootPath `
      -Version $version `
      -ReleaseType $releaseType `
      -SourceVersion $sourceVersion `
      -Notes $Note
}
else {
  $readmeUpdated = $false
}

Write-Host "APP_VERSION updated from $sourceVersion to $($appConfig.Version)"

if ($writeReadme -and $readmeUpdated) {
  Write-Host "README version log updated with $($appConfig.Description)"
}
elseif ($writeReadme) {
  Write-Host "README already contains $($appConfig.Description)"
}
else {
  Write-Host "README version log skipped."
}

Write-Host "Synced .clasp.json scriptId to $($appConfig.ScriptId)"
Write-Host "Pushing source files to Apps Script"

Invoke-Clasp -Arguments @('push') -WorkingDirectory $rootPath

if ($Action -eq 'deploy') {
  if (-not $appConfig.DeploymentId) {
    throw 'Cannot find DEPLOYMENT_ID in Config.js'
  }

  $description = $appConfig.Description

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
}
else {
  Write-Host "Push completed with version $($appConfig.Description)"
}

Push-GitHubIfRequested
