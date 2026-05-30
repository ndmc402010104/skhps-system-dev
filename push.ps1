param(
  [ValidateSet('ask','push','push-github','deploy')]
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


function Format-ReadmeVersionText {
  param(
    [string]$Version
  )

  if ([string]::IsNullOrWhiteSpace($Version)) {
    return ''
  }

  $value = $Version.Trim()

  if ($value -match '^v') {
    return $value
  }

  return "v$value"
}

function Update-ReadmeCurrentVersions {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ReadmePath,

    [string]$ProdVersion,

    [string]$TestVersion,

    [string]$GitHubVersion
  )

  if (-not (Test-Path -LiteralPath $ReadmePath)) {
    Write-Host "找不到 README.md，略過當前版本號更新。" -ForegroundColor Yellow
    return $false
  }

  $content =
    Get-Content -Path $ReadmePath -Raw -Encoding UTF8

  $updated = $content

  if (-not [string]::IsNullOrWhiteSpace($ProdVersion)) {
    $prodText = Format-ReadmeVersionText -Version $ProdVersion
    $updated = [regex]::Replace(
      $updated,
      '(?m)^正式版\s*[:：]\s*.*$',
      "正式版: $prodText"
    )
  }

  if (-not [string]::IsNullOrWhiteSpace($TestVersion)) {
    $testText = Format-ReadmeVersionText -Version $TestVersion
    $updated = [regex]::Replace(
      $updated,
      '(?m)^測試版\s*[:：]\s*.*$',
      "測試版: $testText"
    )
  }

  if (-not [string]::IsNullOrWhiteSpace($GitHubVersion)) {
    $githubText = Format-ReadmeVersionText -Version $GitHubVersion
    $updated = [regex]::Replace(
      $updated,
      '(?m)^Github\s*[:：]\s*.*$',
      "Github: $githubText"
    )
  }

  if ($updated -cne $content) {
    Set-Content -Path $ReadmePath -Value $updated -Encoding UTF8
    Write-Host "README 當前版本號已更新。" -ForegroundColor Green
    return $true
  }

  Write-Host "README 當前版本號未變更。" -ForegroundColor DarkGray
  return $false
}


function Push-GitHubIfRequested {
  param(
    [pscustomobject]$Config,
    [string]$Action,
    [string]$ReadmePath
  )

  if ($NoGitHubPrompt -or $Action -eq 'push') {
    if ($Action -eq 'push') {
      Write-Host ""
      Write-Host "依據選項，略過上傳 GitHub。" -ForegroundColor Yellow
    }
    return
  }

  Write-Host ""
  Write-Host "==========================" -ForegroundColor Cyan
  Write-Host "GitHub commit" -ForegroundColor Cyan
  Write-Host "=========================="
  Write-Host "自動將最新版號與 API 網址同步至 GitHub。"

  $defaultMsg = if ($Config) { "Bump version to v$($Config.Version)" } else { "Update version" }
  
  $commitMessage =
    Read-Host "Git commit message（直接按 Enter 使用 '$defaultMsg'，輸入 skip 略過）"

  if ($commitMessage.Trim().ToLower() -eq 'skip') {
    Write-Host ""
    Write-Host "已略過 GitHub commit" -ForegroundColor Yellow
    return
  }

  if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = $defaultMsg
  }

  if ($Config -and $ReadmePath) {
    Update-ReadmeCurrentVersions `
      -ReadmePath $ReadmePath `
      -GitHubVersion $Config.Version | Out-Null
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

    # 加入延遲讓 OneDrive 有時間解除暫存檔鎖定
    Start-Sleep -Seconds 1

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

    # 加入延遲讓 OneDrive 有時間解除暫存檔鎖定
    Start-Sleep -Seconds 2

    git push

    if ($LASTEXITCODE -ne 0) {
      Write-Host ""
      Write-Host "git push 發生錯誤。如果遇到終端機權限或版本分歧問題，請嘗試手動執行：" -ForegroundColor Yellow
      Write-Host "git push -f origin master" -ForegroundColor Cyan
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

Write-Host ""
Write-Host "==========================" -ForegroundColor Cyan
Write-Host "目前版本狀態" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

try {
  $currentVersionBeforePush =
    Get-CurrentAppVersion -RootPath $rootPath

  Write-Host ""
  Write-Host "開發版(APP_VERSION)" -ForegroundColor Yellow
  Write-Host "  v$currentVersionBeforePush" -ForegroundColor Green
}
catch {
  Write-Host ""
  Write-Host "開發版(APP_VERSION)" -ForegroundColor Yellow
  Write-Host "  讀取失敗：$($_.Exception.Message)" -ForegroundColor Red
}

try {
  $previewReadmePath =
    Join-Path $rootPath 'README.md'

  if (Test-Path -LiteralPath $previewReadmePath) {
    $previewReadme =
      Get-Content `
        -Path $previewReadmePath `
        -Raw `
        -Encoding UTF8

    $previewProdVersion =
      ([regex]::Match(
        $previewReadme,
        '(?m)^正式版\s*[:：]\s*(.+)$'
      )).Groups[1].Value.Trim()

    $previewTestVersion =
      ([regex]::Match(
        $previewReadme,
        '(?m)^測試版\s*[:：]\s*(.+)$'
      )).Groups[1].Value.Trim()

    $previewGitHubVersion =
      ([regex]::Match(
        $previewReadme,
        '(?m)^Github\s*[:：]\s*(.+)$'
      )).Groups[1].Value.Trim()

    if ([string]::IsNullOrWhiteSpace($previewProdVersion)) {
      $previewProdVersion = 'README 未填'
    }

    if ([string]::IsNullOrWhiteSpace($previewTestVersion)) {
      $previewTestVersion = 'README 未填'
    }

    if ([string]::IsNullOrWhiteSpace($previewGitHubVersion)) {
      $previewGitHubVersion = 'README 未填'
    }

    Write-Host ""
    Write-Host "README紀錄版本" -ForegroundColor Yellow
    Write-Host "  正式版 : $previewProdVersion" -ForegroundColor Cyan
    Write-Host "  測試版 : $previewTestVersion" -ForegroundColor Cyan
    Write-Host "  GitHub : $previewGitHubVersion" -ForegroundColor Cyan
  }
  else {
    Write-Host ""
    Write-Host "README紀錄版本" -ForegroundColor Yellow
    Write-Host "  找不到 README.md" -ForegroundColor Red
  }
}
catch {
  Write-Host ""
  Write-Host "README版本讀取失敗：$($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

if ($env:APP_VERSION_BUMP) {
  $Bump = $env:APP_VERSION_BUMP
}

if ($Action -eq 'ask') {
  Write-Host ""
  $Action = Read-MenuChoice `
    -Message "這次要做什麼？1=僅推送測試版(不傳GitHub)，2=推送測試版並傳GitHub，3=Deploy正式版(傳GitHub) [1]" `
    -Choices @{
      '1' = 'push'
      '2' = 'push-github'
      '3' = 'deploy'
      'p' = 'push'
      'push' = 'push'
      'pg' = 'push-github'
      'push-github' = 'push-github'
      'd' = 'deploy'
      'deploy' = 'deploy'
      'prod' = 'deploy'
    } `
    -Default 'push'
}

if ($Bump -eq 'ask') {
  Write-Host ""
  $Bump = Read-MenuChoice `
    -Message "要更新哪種版本？P=patch 小修，M=minor 新功能，A=major 大改，N=none 不升版 [N]" `
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
    -Default 'none'
}

$defaultReadme = $Bump -in @('minor','major')

$writeReadme = $false

if (-not $NoReadmePrompt) {
  Write-Host ""
  $writeReadme = Read-YesNo -Message "要寫入 README 版本日誌嗎？none/patch 預設 N，minor/major 預設 Y" -Default $defaultReadme
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

$readmePath =
  Join-Path $rootPath 'README.md'

$prodVersionForReadme = $null
if ($Action -eq 'deploy') {
  $prodVersionForReadme = $appConfig.Version
}

Update-ReadmeCurrentVersions `
  -ReadmePath $readmePath `
  -ProdVersion $prodVersionForReadme `
  -TestVersion $appConfig.Version | Out-Null

# 自動更新 DressingFront.html 中的 GitHub 版號
$dressingFrontPath = Join-Path $rootPath '敷料領用登錄系統\DressingFront.html'
if (Test-Path -LiteralPath $dressingFrontPath) {
  $dfContent = Get-Content -Path $dressingFrontPath -Raw -Encoding UTF8
  $dfNewContent = [regex]::Replace($dfContent, '(<span[^>]*>GitHub 版</span>\s*<span>v\.)[^<]+(</span>)', "`${1}$($appConfig.Version)`$2")
  
  # 自動寫入真實的 Apps Script API 部署網址
  if ($appConfig.DeploymentId) {
    $realUrl = "https://script.google.com/macros/s/$($appConfig.DeploymentId)/exec"
    $dfNewContent = [regex]::Replace($dfNewContent, "(APP_ENTRY_URL\s*=\s*')https://script\.google\.com/macros/s/[^/']+/exec(')", "`${1}$realUrl`$2")
  }

  if ($dfContent -cne $dfNewContent) {
    Set-Content -Path $dressingFrontPath -Value $dfNewContent -Encoding UTF8
    Write-Host "Updated GitHub version & API URL in DressingFront.html to v.$($appConfig.Version)" -ForegroundColor Green
  }
}

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

Push-GitHubIfRequested -Config $appConfig -Action $Action -ReadmePath $readmePath