# 檔案位置：專案根目錄/push.ps1
# 時間戳記：2026-06-05 09:55 UTC+8
# 用途：累加式四段部署腳本；先完成本地版本/commit 整理，再集中 Git push 到各遠端。
# 階段：1=push app script，2=加上 dev-skhps 分支部署 + commit，3=加上換電腦用備份，4=加上正式版 master + PROD。

param(
  [ValidateSet('ask','commit-only','backup-wip','dev-app','dev-skhps','dev-app-backup','dev-all','release','skhps','all','push','push-github','deploy')]
  [string]$Action = 'ask',

  [ValidateSet('ask','major','minor','patch','none')]
  [string]$Bump = 'ask',

  [string[]]$Note = @(),

  [switch]$NoSaveAllPrompt,

  [switch]$NoReadmePrompt,

  [switch]$NoGitHubPrompt,

  # 非互動模式需要直接部署正式 Apps Script API 時才使用。
  [switch]$DeployProdAppScript
)

chcp 65001 | Out-Null

[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

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

  $continue = Read-Host "手動儲存後按 Enter 繼續；輸入 N 取消"

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

    [string]$GasDevVersion,

    [string]$WebDevVersion,

    [string]$WebProdVersion
  )

  if (-not (Test-Path -LiteralPath $ReadmePath)) {
    Write-Host "找不到 README.md，略過當前版本號更新。" -ForegroundColor Yellow
    return $false
  }

  $content = Get-Content -Path $ReadmePath -Raw -Encoding UTF8
  $updated = $content

  if (-not [string]::IsNullOrWhiteSpace($GasDevVersion)) {
    $gasDevText = Format-ReadmeVersionText -Version $GasDevVersion
    $updated = [regex]::Replace(
      $updated,
      '(?m)^app script測試版\s*[:：]\s*.*$',
      "app script測試版: $gasDevText"
    )
  }

  if (-not [string]::IsNullOrWhiteSpace($WebDevVersion)) {
    $webDevText = Format-ReadmeVersionText -Version $WebDevVersion
    $updated = [regex]::Replace(
      $updated,
      '(?m)^測試版\s*[:：]\s*.*$',
      "測試版: $webDevText"
    )
  }

  if (-not [string]::IsNullOrWhiteSpace($WebProdVersion)) {
    $webProdText = Format-ReadmeVersionText -Version $WebProdVersion
    $updated = [regex]::Replace(
      $updated,
      '(?m)^正式版\s*[:：]\s*.*$',
      "正式版: $webProdText"
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

function Test-GitRemoteExists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RemoteName
  )

  if (-not (Test-CommandExists -Name 'git')) {
    throw "找不到 git 指令。"
  }

  Push-Location -LiteralPath $rootPath

  try {
    $remotes = @(git remote)
  }
  finally {
    Pop-Location
  }

  return $remotes -contains $RemoteName
}

function Get-GitCurrentBranch {
  Push-Location -LiteralPath $rootPath

  try {
    $branch = (git branch --show-current).Trim()
  }
  finally {
    Pop-Location
  }

  if ([string]::IsNullOrWhiteSpace($branch)) {
    return '(detached HEAD)'
  }

  return $branch
}

function Get-GitHeadSha {
  Push-Location -LiteralPath $rootPath

  try {
    $headSha = (git rev-parse HEAD).Trim()
  }
  finally {
    Pop-Location
  }

  if ([string]::IsNullOrWhiteSpace($headSha)) {
    throw "無法讀取本機 HEAD。"
  }

  return $headSha
}

function Show-GitSnapshot {
  if (-not (Test-CommandExists -Name 'git')) {
    Write-Host "找不到 git 指令，略過 Git 狀態顯示。" -ForegroundColor Yellow
    return
  }

  Push-Location -LiteralPath $rootPath

  try {
    Write-Host ""
    Write-Host "==========================" -ForegroundColor Cyan
    Write-Host "Git 狀態" -ForegroundColor Cyan
    Write-Host "==========================" -ForegroundColor Cyan

    $branch = Get-GitCurrentBranch
    Write-Host "目前 branch: $branch" -ForegroundColor Yellow

    Write-Host ""
    Write-Host "remote -v:" -ForegroundColor Yellow
    git remote -v

    Write-Host ""
    Write-Host "git status --short:" -ForegroundColor Yellow
    git status --short
  }
  finally {
    Pop-Location
  }
}

function Invoke-GitCommitIfNeeded {
  param(
    [Parameter(Mandatory = $true)]
    [string]$DefaultMessage
  )

  if ($NoGitHubPrompt) {
    Write-Host ""
    Write-Host "NoGitHubPrompt 已啟用，略過 Git commit。" -ForegroundColor Yellow
    return $false
  }

  if (-not (Test-CommandExists -Name 'git')) {
    throw "找不到 git 指令，無法 commit。"
  }

  Write-Host ""
  Write-Host "==========================" -ForegroundColor Cyan
  Write-Host "Git commit" -ForegroundColor Cyan
  Write-Host "=========================="

  $commitMessage = Read-Host "Git commit message（直接按 Enter 使用 '$DefaultMessage'，輸入 skip 略過 commit）"

  if ($commitMessage.Trim().ToLower() -eq 'skip') {
    Write-Host "已略過 Git commit。" -ForegroundColor Yellow
    return $false
  }

  if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = $DefaultMessage
  }

  Push-Location -LiteralPath $rootPath

  try {
    git add .

    if ($LASTEXITCODE -ne 0) {
      throw "git add 失敗。"
    }

    # OneDrive 有時候會短暫鎖檔，保留延遲。
    Start-Sleep -Seconds 1

    $stagedFiles = git diff --cached --name-only

    if ($LASTEXITCODE -ne 0) {
      throw "無法讀取已 staged 的 git 變更。"
    }

    if (-not $stagedFiles) {
      Write-Host "沒有 staged 變更，略過 commit；後續仍可 push 目前 HEAD。" -ForegroundColor Yellow
      return $false
    }

    git commit -m $commitMessage

    if ($LASTEXITCODE -ne 0) {
      throw "git commit 失敗。"
    }

    Start-Sleep -Seconds 2

    Write-Host "Git commit completed." -ForegroundColor Green
    return $true
  }
  finally {
    Pop-Location
  }
}

function Invoke-GitPush {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RemoteName,

    [Parameter(Mandatory = $true)]
    [string]$RefSpec,

    [Parameter(Mandatory = $true)]
    [string]$SiteName,

    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [switch]$ForceWithLease
  )

  if ($NoGitHubPrompt) {
    Write-Host "NoGitHubPrompt 已啟用，略過 $SiteName Git push。" -ForegroundColor Yellow
    return
  }

  if (-not (Test-GitRemoteExists -RemoteName $RemoteName)) {
    if ($RemoteName -eq 'dev') {
      Write-Host "尚未設定 dev remote。" -ForegroundColor Red
      Write-Host "請先執行：" -ForegroundColor Yellow
      Write-Host "git remote add dev https://github.com/ndmc402010104/skhps-system-dev.git" -ForegroundColor Cyan
    }
    elseif ($RemoteName -eq 'origin') {
      Write-Host "尚未設定 origin remote，正式版無法推送。" -ForegroundColor Red
    }
    else {
      Write-Host "尚未設定 $RemoteName remote。" -ForegroundColor Red
    }

    throw "找不到 Git remote: $RemoteName"
  }

  Push-Location -LiteralPath $rootPath

  try {
    Write-Host ""
    if ($ForceWithLease) {
      $destinationBranch = Get-GitRefSpecDestinationBranch -RefSpec $RefSpec
      Update-GitRemoteTrackingBranch -RemoteName $RemoteName -BranchName $destinationBranch

      Write-Host "推送 $SiteName：git push --force-with-lease $RemoteName $RefSpec" -ForegroundColor Cyan
      git push --force-with-lease $RemoteName $RefSpec
    }
    else {
      Write-Host "推送 $SiteName：git push $RemoteName $RefSpec" -ForegroundColor Cyan
      git push $RemoteName $RefSpec
    }

    if ($LASTEXITCODE -ne 0) {
      throw "$SiteName 推送失敗。"
    }

    Write-Host "$SiteName 推送完成：$SiteUrl" -ForegroundColor Green
  }
  finally {
    Pop-Location
  }
}

function Get-GitRefSpecDestinationBranch {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RefSpec
  )

  if ($RefSpec -notmatch ':') {
    return ''
  }

  $destinationRef = (($RefSpec -split ':', 2)[1]).Trim()

  if ([string]::IsNullOrWhiteSpace($destinationRef)) {
    return ''
  }

  return ($destinationRef -replace '^refs/heads/', '')
}

function Update-GitRemoteTrackingBranch {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RemoteName,

    [Parameter(Mandatory = $true)]
    [string]$BranchName
  )

  if ([string]::IsNullOrWhiteSpace($BranchName)) {
    return
  }

  Write-Host "更新 $RemoteName/$BranchName 遠端追蹤資訊，避免 force-with-lease stale info..." -ForegroundColor DarkGray
  git fetch $RemoteName "+refs/heads/$($BranchName):refs/remotes/$($RemoteName)/$($BranchName)"

  if ($LASTEXITCODE -ne 0) {
    throw "無法更新 $RemoteName/$BranchName 遠端追蹤資訊。"
  }
}

function Confirm-GitRemoteRefMatchesHead {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RemoteName,

    [Parameter(Mandatory = $true)]
    [string]$BranchName,

    [Parameter(Mandatory = $true)]
    [string]$Label,

    [string]$ExpectedSha
  )

  Push-Location -LiteralPath $rootPath

  try {
    if ([string]::IsNullOrWhiteSpace($ExpectedSha)) {
      $ExpectedSha = (git rev-parse HEAD).Trim()

      if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($ExpectedSha)) {
        throw "無法讀取本機 HEAD。"
      }
    }

    $remoteLine = git ls-remote $RemoteName "refs/heads/$BranchName"

    if ($LASTEXITCODE -ne 0) {
      throw "無法讀取遠端 $RemoteName/$BranchName。"
    }

    if ([string]::IsNullOrWhiteSpace($remoteLine)) {
      throw "找不到遠端分支 $RemoteName/$BranchName。"
    }

    $remoteSha = (($remoteLine -split '\s+')[0]).Trim()

    if ($remoteSha -ne $ExpectedSha) {
      throw "$Label 驗證失敗：遠端 $($remoteSha.Substring(0, 7))，預期 $($ExpectedSha.Substring(0, 7))。"
    }

    Write-Host "$Label 已驗證：$RemoteName/$BranchName = $($ExpectedSha.Substring(0, 7))" -ForegroundColor Green
  }
  finally {
    Pop-Location
  }
}

function Confirm-GitRefCname {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Ref,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedCname,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $actualCname =
    (& git show "$($Ref):CNAME" 2>$null) |
    Select-Object -First 1

  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($actualCname)) {
    throw "$Label CNAME 檢查失敗：commit $Ref 找不到 CNAME。"
  }

  $actualCname = $actualCname.Trim()

  if ($actualCname -ne $ExpectedCname) {
    throw "$Label CNAME 錯誤：目前是 '$actualCname'，應該是 '$ExpectedCname'。已停止推送。"
  }

  Write-Host "$Label CNAME 確認：$actualCname" -ForegroundColor Green
}


function Invoke-BackupWipToOrigin {
  param(
    [string]$SourceRef = 'HEAD',

    [string]$ExpectedSha
  )

  Write-Host ""
  Write-Host "==========================" -ForegroundColor Cyan
  Write-Host "[3] 換電腦用備份 origin/wip-current" -ForegroundColor Cyan
  Write-Host "=========================="
  Write-Host "備份 $SourceRef 到 origin/wip-current；不更新任何網站。" -ForegroundColor Yellow

  Invoke-GitPush `
    -RemoteName 'origin' `
    -RefSpec "$($SourceRef):wip-current" `
    -SiteName 'origin/wip-current 工作進度備份' `
    -SiteUrl 'GitHub origin/wip-current' `
    -ForceWithLease

  Confirm-GitRemoteRefMatchesHead `
    -RemoteName 'origin' `
    -BranchName 'wip-current' `
    -Label '換電腦用備份' `
    -ExpectedSha $ExpectedSha

  Write-Host ""
  Write-Host "換電腦時可執行：" -ForegroundColor Green
  Write-Host "git fetch origin" -ForegroundColor Cyan
  Write-Host "git checkout -B wip-current origin/wip-current" -ForegroundColor Cyan
}

function Confirm-ProdPushOrExit {
  Write-Host ""
  Write-Host "你即將推送正式版 skhps.jonaminz.com。" -ForegroundColor Red
  Write-Host "正式版只能從 master 分支推送。" -ForegroundColor Yellow

  $branch = Get-GitCurrentBranch

  if ($branch -ne 'master') {
    throw "目前分支是 '$branch'，正式版只能從 master 分支推送。請先 merge 回 master。"
  }

  $confirm = Read-Host "請輸入 PROD 才繼續"

  if ($confirm -ne 'PROD') {
    throw "未輸入 PROD，已取消正式版推送。"
  }
}

function Move-DevOnlyWorkToLocalBranch {
  param(
    [Parameter(Mandatory = $true)]
    [string]$OriginalBranch
  )

  if ($OriginalBranch -ne 'master' -and $OriginalBranch -ne 'main') {
    return $false
  }

  Write-Host ""
  Write-Host "測試版推送不直接寫在 $OriginalBranch；從 dev 遠端切到 dev-current-local 暫存分支。" -ForegroundColor Yellow
  git fetch dev '+refs/heads/dev-current:refs/remotes/dev/dev-current' '+refs/heads/main:refs/remotes/dev/main'

  if ($LASTEXITCODE -ne 0) {
    throw "無法更新 dev 遠端追蹤分支，已停止避免污染正式版分支。"
  }

  git rev-parse --verify 'dev/main' 2>$null | Out-Null
  $hasDevMain = $LASTEXITCODE -eq 0

  git rev-parse --verify 'dev/dev-current' 2>$null | Out-Null
  $hasDevCurrent = $LASTEXITCODE -eq 0

  $devBaseRef = if ($hasDevMain) {
    'dev/main'
  }
  elseif ($hasDevCurrent) {
    'dev/dev-current'
  }
  else {
    throw "找不到 dev/main 或 dev/dev-current，無法建立測試版暫存分支。"
  }

  git switch -C dev-current-local $devBaseRef

  if ($LASTEXITCODE -ne 0) {
    throw "無法切換到 dev-current-local，已停止避免污染正式版分支。"
  }

  return $true
}

function Restore-OriginalBranchAfterDevOnlyWork {
  param(
    [Parameter(Mandatory = $true)]
    [string]$OriginalBranch,

    [bool]$ShouldRestore = $false
  )

  if (-not $ShouldRestore) {
    return
  }

  Write-Host ""
  Write-Host "測試版推送完成，切回 $OriginalBranch。" -ForegroundColor Yellow
  git switch $OriginalBranch

  if ($LASTEXITCODE -ne 0) {
    throw "測試版已推送，但無法自動切回 $OriginalBranch。請手動執行：git switch $OriginalBranch"
  }
}

function Invoke-UpdateDressingFrontForConfig {
  param(
    [Parameter(Mandatory = $true)]
    [pscustomobject]$Config
  )

  $dressingFrontPath = Join-Path $rootPath '敷料領用登錄系統\DressingFront.html'

  if (-not (Test-Path -LiteralPath $dressingFrontPath)) {
    Write-Host "找不到 DressingFront.html，略過 API URL 自動更新。" -ForegroundColor Yellow
    return
  }

  $dfContent = Get-Content -Path $dressingFrontPath -Raw -Encoding UTF8
  $dfNewContent = $dfContent

  # 自動寫入真實的 Apps Script API 部署網址。
  # dev-skhps 使用 dev DeploymentId；skhps 使用 EntryUrl / prod config。
  if ($Config.DeploymentId) {
    $realUrl = "https://script.google.com/macros/s/$($Config.DeploymentId)/exec"
    $dfNewContent = [regex]::Replace(
      $dfNewContent,
      "(APP_ENTRY_URL\s*=\s*')https://script\.google\.com/macros/s/[^/']+/exec(')",
      "`${1}$realUrl`$2"
    )
    $dfNewContent = [regex]::Replace(
      $dfNewContent,
      "(APP_PROD_URL\s*=\s*')https://script\.google\.com/macros/s/[^/']+/exec(')",
      "`${1}$($Config.EntryUrl)`$2"
    )
  }

  if ($dfContent -cne $dfNewContent) {
    Set-Content -Path $dressingFrontPath -Value $dfNewContent -Encoding UTF8
    Write-Host "Updated API URL in DressingFront.html." -ForegroundColor Green
  }
}

function Update-CnameForEnv {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dev','prod')]
    [string]$DefaultEnv
  )

  $cnamePath = Join-Path $rootPath 'CNAME'
  $cname = if ($DefaultEnv -eq 'prod') {
    'skhps.jonaminz.com'
  }
  else {
    'dev-skhps.jonaminz.com'
  }

  Set-Content -Path $cnamePath -Value $cname -Encoding ascii -NoNewline
  Write-Host "CNAME synced for env=$DefaultEnv：$cname" -ForegroundColor Green
}

function Update-EnvironmentVersionConstants {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [bool]$UpdateGasDevVersion = $false,

    [bool]$UpdateWebDevVersion = $false,

    [bool]$UpdateWebProdVersion = $false
  )

  $configPath = Join-Path $rootPath '共用設定檔\Config.js'
  $footerPath = Join-Path $rootPath '共用設定檔\EnvironmentFooter.js'

  if (Test-Path -LiteralPath $configPath) {
    $configLines = Get-Content -Path $configPath -Encoding UTF8

    if ($UpdateGasDevVersion) {
      $configLines = Set-ConfigConstValue -Lines $configLines -Name 'SKH_GAS_DEV_VERSION' -Value $Version
    }

    if ($UpdateWebDevVersion) {
      $configLines = Set-ConfigConstValue -Lines $configLines -Name 'SKH_WEB_DEV_VERSION' -Value $Version
    }

    if ($UpdateWebProdVersion) {
      $configLines = Set-ConfigConstValue -Lines $configLines -Name 'SKH_WEB_PROD_VERSION' -Value $Version
    }

    [System.IO.File]::WriteAllLines($configPath, $configLines, [System.Text.UTF8Encoding]::new($false))
  }

  if (Test-Path -LiteralPath $footerPath) {
    $content = Get-Content -Path $footerPath -Raw -Encoding UTF8
    $updated = $content

    if ($UpdateGasDevVersion) {
      $updated = [regex]::Replace($updated, "(gasDev:[\s\S]*?version:')v?[^']+(')", "`${1}v$Version`$2")
    }

    if ($UpdateWebDevVersion) {
      $updated = [regex]::Replace($updated, "(webDev:[\s\S]*?version:')v?[^']+(')", "`${1}v$Version`$2")
    }

    if ($UpdateWebProdVersion) {
      $updated = [regex]::Replace($updated, "(webProd:[\s\S]*?version:')v?[^']+(')", "`${1}v$Version`$2")
    }

    if ($updated -cne $content) {
      Set-Content -Path $footerPath -Value $updated -Encoding UTF8
    }
  }
}

function Invoke-SyncVersionForEnv {
  param(
    [Parameter(Mandatory = $true)]
    [string]$DefaultEnv,

    [Parameter(Mandatory = $true)]
    [string]$Version,

    [Parameter(Mandatory = $true)]
    [string]$ReadmePath,

    [bool]$UpdateGasDevVersion = $false,

    [bool]$UpdateWebDevVersion = $false,

    [bool]$UpdateWebProdVersion = $false
  )

  $appConfig = Sync-AppVersion `
    -RootPath $rootPath `
    -Version $Version `
    -DefaultEnv $DefaultEnv

  Update-EnvironmentVersionConstants `
    -Version $appConfig.Version `
    -UpdateGasDevVersion $UpdateGasDevVersion `
    -UpdateWebDevVersion $UpdateWebDevVersion `
    -UpdateWebProdVersion $UpdateWebProdVersion

  Update-CnameForEnv -DefaultEnv $DefaultEnv

  $gasDevVersionForReadme = if ($UpdateGasDevVersion) { $appConfig.Version } else { $null }
  $webDevVersionForReadme = if ($UpdateWebDevVersion) { $appConfig.Version } else { $null }
  $webProdVersionForReadme = if ($UpdateWebProdVersion) { $appConfig.Version } else { $null }

  Update-ReadmeCurrentVersions `
    -ReadmePath $ReadmePath `
    -GasDevVersion $gasDevVersionForReadme `
    -WebDevVersion $webDevVersionForReadme `
    -WebProdVersion $webProdVersionForReadme | Out-Null

  Invoke-UpdateDressingFrontForConfig -Config $appConfig

  Write-Host "APP_VERSION synced for env=$DefaultEnv：v$($appConfig.Version)" -ForegroundColor Green
  Write-Host "Synced .clasp.json scriptId to $($appConfig.ScriptId)" -ForegroundColor DarkGray

  return $appConfig
}

function Invoke-DevAppScript {
  param(
    [Parameter(Mandatory = $true)]
    [pscustomobject]$Config
  )

  Write-Host ""
  Write-Host "==========================" -ForegroundColor Cyan
  Write-Host "[1] dev-app script" -ForegroundColor Cyan
  Write-Host "=========================="
  Write-Host "Pushing source files to Apps Script dev project"

  Invoke-Clasp -Arguments @('push') -WorkingDirectory $rootPath

  Write-Host "dev-app script push completed with version $($Config.Description)" -ForegroundColor Green
}

function Invoke-ProdAppScriptDeploy {
  param(
    [Parameter(Mandatory = $true)]
    [pscustomobject]$Config
  )

  if (-not $Config.DeploymentId) {
    throw 'Config.js 找不到 DEPLOYMENT_ID，無法部署正式 Apps Script API。'
  }

  $description = $Config.Description

  Write-Host ""
  Write-Host "==========================" -ForegroundColor Cyan
  Write-Host "正式 Apps Script API deployment" -ForegroundColor Cyan
  Write-Host "=========================="
  Write-Host "Creating Apps Script version $description"

  $versionOutput = Invoke-ClaspCapture -Arguments @('version', $description)
  $versionNumber = Get-ClaspVersionNumberFromOutput -Output $versionOutput

  Write-Host "Updating deployment $($Config.DeploymentId) to version $versionNumber"

  Invoke-Clasp `
    -Arguments @(
      'deploy',
      '-i',
      $Config.DeploymentId,
      '-V',
      [string]$versionNumber,
      '-d',
      $description
    ) `
    -WorkingDirectory $rootPath

  Write-Host "Apps Script prod deploy completed with $description at version $versionNumber" -ForegroundColor Green
}

Save-AllOpenFiles
Show-GitSnapshot

Write-Host ""
Write-Host "==========================" -ForegroundColor Cyan
Write-Host "目前版本狀態" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

try {
  $currentVersionBeforePush = Get-CurrentAppVersion -RootPath $rootPath

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
  $previewReadmePath = Join-Path $rootPath 'README.md'

  if (Test-Path -LiteralPath $previewReadmePath) {
    $previewReadme = Get-Content -Path $previewReadmePath -Raw -Encoding UTF8

    $previewGasDevVersion = ([regex]::Match($previewReadme, '(?m)^app script測試版\s*[:：]\s*(.+)$')).Groups[1].Value.Trim()
    $previewWebDevVersion = ([regex]::Match($previewReadme, '(?m)^測試版\s*[:：]\s*(.+)$')).Groups[1].Value.Trim()
    $previewWebProdVersion = ([regex]::Match($previewReadme, '(?m)^正式版\s*[:：]\s*(.+)$')).Groups[1].Value.Trim()

    if ([string]::IsNullOrWhiteSpace($previewGasDevVersion)) {
      $previewGasDevVersion = 'README 未填'
    }

    if ([string]::IsNullOrWhiteSpace($previewWebDevVersion)) {
      $previewWebDevVersion = 'README 未填'
    }

    if ([string]::IsNullOrWhiteSpace($previewWebProdVersion)) {
      $previewWebProdVersion = 'README 未填'
    }

    Write-Host ""
    Write-Host "README紀錄版本" -ForegroundColor Yellow
    Write-Host "  app script測試版 : $previewGasDevVersion" -ForegroundColor Cyan
    Write-Host "  測試版           : $previewWebDevVersion" -ForegroundColor Cyan
    Write-Host "  正式版           : $previewWebProdVersion" -ForegroundColor Cyan
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

if ($env:APP_VERSION_BUMP) {
  $Bump = $env:APP_VERSION_BUMP
}

# 舊參數相容：
# push        -> dev-app script
# push-github -> dev-app script + dev-skhps
# deploy      -> skhps；並預設啟用正式 Apps Script API deploy
$legacyDeployRequested = $false

switch ($Action) {
  'push' {
    $Action = 'dev-app'
  }
  'push-github' {
    $Action = 'dev-all'
  }
  'deploy' {
    $Action = 'release'
    $legacyDeployRequested = $true
    $DeployProdAppScript = $true
  }
}

if ($Action -eq 'ask') {
  Write-Host ""
  Write-Host "累加式部署目標：" -ForegroundColor Cyan
  Write-Host "[1] push app script"
  Write-Host "    = clasp push；只更新 app script測試版，測 Apps Script 後端"
  Write-Host "[2] 加上 push dev-skhps.jonaminz.com 分支 + commit"
  Write-Host "    = 1 + git commit + git push --force-with-lease dev HEAD:dev-current + HEAD:main"
  Write-Host "[3] 加上換電腦用備份 origin/wip-current"
  Write-Host "    = 1 + 2 + git push --force-with-lease origin HEAD:wip-current，不更新正式版"
  Write-Host "[4] 加上 push master + PROD"
  Write-Host "    = 1 + 2 + 正式版 skhps.jonaminz.com；只允許 master，需輸入 PROD"
  Write-Host "[0] 取消"

  $Action = Read-MenuChoice `
    -Message "請選擇 [1]" `
    -Choices @{
      '1' = 'dev-app'
      'dev-app' = 'dev-app'
      'app' = 'dev-app'
      'gas' = 'dev-app'

      '2' = 'dev-all'
      'dev-all' = 'dev-all'
      'dev-skhps' = 'dev-all'
      'dev' = 'dev-all'
      'test' = 'dev-all'

      '3' = 'all'
      'backup' = 'all'
      'wip' = 'all'
      'switch' = 'all'
      'daily' = 'all'

      '4' = 'release'
      'release' = 'release'
      'prod' = 'release'
      'skhps' = 'release'

      '0' = 'cancel'
      'cancel' = 'cancel'
    } `
    -Default 'dev-app'
}

if ($Action -eq 'cancel') {
  Write-Host "已取消。" -ForegroundColor Yellow
  exit 0
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
$readmePath = Join-Path $rootPath 'README.md'

$needsDevApp = $Action -in @('dev-app','dev-all','all','release')
$needsDevSkhps = $Action -in @('dev-all','all','release')
$needsSkhps = $Action -in @('release')
$needsBackupWip = $Action -in @('all')
$needsAnyGit = $Action -in @('dev-all','all','release')
$pendingGitPushes = @()
$devPushSha = $null
$prodPushSha = $null
$originalBranch = Get-GitCurrentBranch
$restoreOriginalBranchAfterDevOnly = $false

if ($needsDevSkhps -and -not $needsSkhps) {
  $restoreOriginalBranchAfterDevOnly = Move-DevOnlyWorkToLocalBranch -OriginalBranch $originalBranch
}

# skhps 正式版若不是舊 deploy 參數，互動詢問是否一併部署正式 Apps Script API。
if ($needsSkhps -and -not $legacyDeployRequested -and -not $DeployProdAppScript) {
  Write-Host ""
  $DeployProdAppScript = Read-YesNo -Message "這次 skhps 正式上線要同時部署正式 Apps Script API 嗎？通常只有後端 API 有改才需要" -Default $false
}

$devConfig = $null
$prodConfig = $null

if ($needsDevApp -or $needsDevSkhps) {
  $devConfig = Invoke-SyncVersionForEnv `
    -DefaultEnv 'dev' `
    -Version $version `
    -ReadmePath $readmePath `
    -UpdateGasDevVersion $needsDevApp `
    -UpdateWebDevVersion $needsDevSkhps
}

if ($writeReadme -and ($needsDevApp -or $needsDevSkhps)) {
  $readmeUpdated = Update-ReadmeVersionLog `
    -RootPath $rootPath `
    -Version $version `
    -ReleaseType 'dev' `
    -SourceVersion $sourceVersion `
    -Notes $Note

  if ($readmeUpdated) {
    Write-Host "README version log updated with $($devConfig.Description)"
  }
  else {
    Write-Host "README already contains $($devConfig.Description)"
  }
}
elseif ($writeReadme -and -not ($needsDevApp -or $needsDevSkhps)) {
  Write-Host "README version log for dev skipped because no dev target selected." -ForegroundColor Yellow
}
else {
  Write-Host "README version log skipped."
}

if ($needsAnyGit) {
  $defaultMsg = if ($devConfig) {
    "Bump version to v$($devConfig.Version)"
  }
  else {
    "Update project"
  }

  Invoke-GitCommitIfNeeded -DefaultMessage $defaultMsg | Out-Null
  $devPushSha = Get-GitHeadSha
}

if ($needsDevApp) {
  Invoke-DevAppScript -Config $devConfig
}

if ($needsDevSkhps) {
  $pendingGitPushes += [pscustomobject]@{
    Header = '[2] 推送 dev-skhps.jonaminz.com 分支'
    Description = '測試版會推到 dev repo 的 dev-current；同時更新 main，避免 GitHub Pages 仍指向 main 時網站不更新。'
    RemoteName = 'dev'
    RefSpec = "$($devPushSha):dev-current"
    SiteName = 'dev-skhps'
    SiteUrl = 'https://dev-skhps.jonaminz.com'
    ForceWithLease = $true
    BranchName = 'dev-current'
    Label = 'dev-skhps dev-current'
    ExpectedSha = $devPushSha
    ExpectedCname = 'dev-skhps.jonaminz.com'
    Footer = $null
  }

  $pendingGitPushes += [pscustomobject]@{
    Header = $null
    Description = $null
    RemoteName = 'dev'
    RefSpec = "$($devPushSha):main"
    SiteName = 'dev-skhps Pages main'
    SiteUrl = 'https://dev-skhps.jonaminz.com'
    ForceWithLease = $true
    BranchName = 'main'
    Label = 'dev-skhps main'
    ExpectedSha = $devPushSha
    ExpectedCname = 'dev-skhps.jonaminz.com'
    Footer = 'dev-skhps 建議在 GitHub Pages 設定為 Branch: dev-current / (root)；目前腳本也同步 main 以相容現有設定。'
  }

  Write-Host "dev-skhps Git push 已排程，會等本地階段全部處理完成後再推出。" -ForegroundColor DarkGray
}

if ($needsBackupWip) {
  $pendingGitPushes += [pscustomobject]@{
    Header = '[3] 換電腦用備份 origin/wip-current'
    Description = "備份 $devPushSha 到 origin/wip-current；不更新任何網站。"
    RemoteName = 'origin'
    RefSpec = "$($devPushSha):wip-current"
    SiteName = 'origin/wip-current 工作進度備份'
    SiteUrl = 'GitHub origin/wip-current'
    ForceWithLease = $true
    BranchName = 'wip-current'
    Label = '換電腦用備份'
    ExpectedSha = $devPushSha
    ExpectedCname = $null
    Footer = "換電腦時可執行：`ngit fetch origin`ngit checkout -B wip-current origin/wip-current"
  }

  Write-Host "origin/wip-current 備份推送已排程，會等本地階段全部處理完成後再推出。" -ForegroundColor DarkGray
}

if ($needsSkhps) {
  Confirm-ProdPushOrExit

  $prodConfig = Invoke-SyncVersionForEnv `
    -DefaultEnv 'prod' `
    -Version $version `
    -ReadmePath $readmePath `
    -UpdateWebProdVersion $true

  if ($writeReadme) {
    $readmeUpdated = Update-ReadmeVersionLog `
      -RootPath $rootPath `
      -Version $version `
      -ReleaseType 'prod' `
      -SourceVersion $sourceVersion `
      -Notes $Note

    if ($readmeUpdated) {
      Write-Host "README version log updated with $($prodConfig.Description)"
    }
    else {
      Write-Host "README already contains $($prodConfig.Description)"
    }
  }

  if ($DeployProdAppScript) {
    Invoke-ProdAppScriptDeploy -Config $prodConfig
  }
  else {
    Write-Host "略過正式 Apps Script API deployment，只推送 skhps 前端。" -ForegroundColor Yellow
  }

  Invoke-GitCommitIfNeeded -DefaultMessage "Release skhps v$($prodConfig.Version)" | Out-Null
  $prodPushSha = Get-GitHeadSha

  $pendingGitPushes += [pscustomobject]@{
    Header = '[4] 推送 master + PROD'
    Description = $null
    RemoteName = 'origin'
    RefSpec = "$($prodPushSha):master"
    SiteName = 'skhps'
    SiteUrl = 'https://skhps.jonaminz.com'
    ForceWithLease = $false
    BranchName = 'master'
    Label = '正式版 master'
    ExpectedSha = $prodPushSha
    ExpectedCname = 'skhps.jonaminz.com'
    Footer = $null
  }

  Write-Host "正式版 Git push 已排程，會等本地階段全部處理完成後再推出。" -ForegroundColor DarkGray
}

if ($pendingGitPushes.Count -gt 0) {
  Write-Host ""
  Write-Host "==========================" -ForegroundColor Cyan
  Write-Host "集中 Git push" -ForegroundColor Cyan
  Write-Host "==========================" -ForegroundColor Cyan
  Write-Host "本地各階段已處理完成，現在才開始推送遠端。" -ForegroundColor Yellow

  foreach ($pendingPush in $pendingGitPushes) {
    if ($pendingPush.Header) {
      Write-Host ""
      Write-Host "==========================" -ForegroundColor Cyan
      Write-Host $pendingPush.Header -ForegroundColor Cyan
      Write-Host "==========================" -ForegroundColor Cyan
    }

    if ($pendingPush.Description) {
      Write-Host $pendingPush.Description -ForegroundColor Yellow
    }

    if ($pendingPush.ExpectedCname) {
      Confirm-GitRefCname `
        -Ref $pendingPush.ExpectedSha `
        -ExpectedCname $pendingPush.ExpectedCname `
        -Label $pendingPush.Label
    }

    if ($pendingPush.ForceWithLease) {
      Invoke-GitPush `
        -RemoteName $pendingPush.RemoteName `
        -RefSpec $pendingPush.RefSpec `
        -SiteName $pendingPush.SiteName `
        -SiteUrl $pendingPush.SiteUrl `
        -ForceWithLease
    }
    else {
      Invoke-GitPush `
        -RemoteName $pendingPush.RemoteName `
        -RefSpec $pendingPush.RefSpec `
        -SiteName $pendingPush.SiteName `
        -SiteUrl $pendingPush.SiteUrl
    }

    Confirm-GitRemoteRefMatchesHead `
      -RemoteName $pendingPush.RemoteName `
      -BranchName $pendingPush.BranchName `
      -Label $pendingPush.Label `
      -ExpectedSha $pendingPush.ExpectedSha

    if ($pendingPush.Footer) {
      Write-Host $pendingPush.Footer -ForegroundColor Yellow
    }
  }
}

Restore-OriginalBranchAfterDevOnlyWork `
  -OriginalBranch $originalBranch `
  -ShouldRestore $restoreOriginalBranchAfterDevOnly

if ($Action -eq 'commit-only') {
  Write-Host ""
  Write-Host "已完成 commit-only 流程，未部署。" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================" -ForegroundColor Cyan
Write-Host "完成" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Cyan
