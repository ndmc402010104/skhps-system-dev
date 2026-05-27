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

    Write-Host "請輸入其中一個選項：$($Choices.Keys -join ', ')；或直接按 Enter 使用預設值。" -ForegroundColor Yellow
  }
}

function Read-YesNo {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message,

    [bool]$Default = $true
  )

  $suffix = if ($Default) { '[Y]' } else { '[N]' }

  while ($true) {
    $answer = Read-Host "$Message $suffix"

    if ([string]::IsNullOrWhiteSpace($answer)) {
      return $Default
    }

    if ($answer -match '^[Yy]') {
      return $true
    }

    if ($answer -match '^[Nn]') {
      return $false
    }

    Write-Host '請輸入 Y 或 N。' -ForegroundColor Yellow
  }
}

function Request-ManualSaveBeforeContinue {
  Write-Host "無法自動儲存，請先在 VS Code 手動儲存檔案。" -ForegroundColor Yellow

  $continue =
    Read-Host "手動儲存後按 Enter 繼續；輸入 N 取消"

  if ($continue -match '^[Nn]$') {
    Write-Host "已取消" -ForegroundColor Red
    exit 1
  }
}

function Save-AllOpenFiles {
  if ($NoSaveAllPrompt) {
    return
  }

  Write-Host ""

  if (-not (Read-YesNo -Message "要先儲存所有 VS Code 開啟中的檔案嗎？" -Default $true)) {
    return
  }

  if (Test-CommandExists -Name 'code') {
    try {
      code --reuse-window --command workbench.action.files.saveAll

      if ($LASTEXITCODE -ne 0) {
        throw "VS Code 儲存全部指令失敗。"
      }

      Start-Sleep -Milliseconds 800

      Write-Host "已送出 VS Code 儲存全部指令" -ForegroundColor Green
    }
    catch {
      Request-ManualSaveBeforeContinue
    }
  }
  else {
    Write-Host "找不到 code 指令，所以無法自動執行 VS Code 儲存全部。" -ForegroundColor Yellow
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

  throw "無法從 clasp 輸出解析 Apps Script version number：$($Output -join ' ')"
}

function Push-GitHubIfRequested {
  if ($NoGitHubPrompt) {
    return
  }

  Write-Host ""
  Write-Host "==========================" -ForegroundColor Cyan
  Write-Host "GitHub commit" -ForegroundColor Cyan
  Write-Host "=========================="
  Write-Host "有輸入 commit message 時，會執行 git add .，包含目前所有變更。"

  $commitMessage =
    Read-Host "Git commit message（留空 = 不 push GitHub）"

  if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    Write-Host ""
    Write-Host "已略過 GitHub commit" -ForegroundColor Yellow
    return
  }

  if (-not (Test-CommandExists -Name 'git')) {
    throw "找不到 git 指令，無法 commit 到 GitHub。"
  }

  Push-Location $rootPath

  try {
    git add .

    if ($LASTEXITCODE -ne 0) {
      throw "git add 失敗。"
    }

    $stagedFiles = git diff --cached --name-only

    if ($LASTEXITCODE -ne 0) {
      throw "無法讀取已 staged 的 git 變更。"
    }

    if (-not $stagedFiles) {
      Write-Host ""
      Write-Host "沒有 staged 變更，已略過 GitHub commit。" -ForegroundColor Yellow
      return
    }

    git commit -m $commitMessage

    if ($LASTEXITCODE -ne 0) {
      throw "git commit 失敗。"
    }

    git push

    if ($LASTEXITCODE -ne 0) {
      throw "git push 失敗。"
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

if ($Action -eq 'ask') {
  Write-Host ""
  $Action = Read-MenuChoice `
    -Message "這次要做什麼？P=push 測試版，D=deploy 正式版 [P]" `
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

if ($Bump -eq 'ask') {
  Write-Host ""
  $Bump = Read-MenuChoice `
    -Message "要更新哪種版本？P=patch 小修，M=minor 新功能，A=major 大改 [P]" `
    -Choices @{
      'p' = 'patch'
      'patch' = 'patch'
      'm' = 'minor'
      'minor' = 'minor'
      'a' = 'major'
      'major' = 'major'
    } `
    -Default 'patch'
}

$defaultReadme = $Bump -ne 'patch'

if ($Action -eq 'deploy') {
  $defaultReadme = $true
}

$writeReadme = $false

if (-not $NoReadmePrompt) {
  Write-Host ""
  $writeReadme = Read-YesNo -Message "要寫入 README 版本日誌嗎？patch 預設 N，minor/major/deploy 預設 Y" -Default $defaultReadme
}

if ($writeReadme -and -not ($Note -and ($Note -join '').Trim())) {
  Write-Host ""
  $noteText = Read-Host "README 版本日誌要寫什麼？（留空 = 自動摘要）"

  if (-not [string]::IsNullOrWhiteSpace($noteText)) {
    $Note = @($noteText)
  }
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
    throw 'Config.js 找不到 DEPLOYMENT_ID'
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
