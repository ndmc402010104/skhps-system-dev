# 檔案位置：專案根目錄/pullall.ps1
# 時間戳記：2026-06-05 01:30 UTC+8
# 用途：智慧判斷拉回來源；正式/master 走 origin + clasp pull，換電腦/wip-current 走 origin/wip-current 且預設不 clasp pull。

param(
  [ValidateSet('auto','master','wip','current')]
  [string]$Mode = 'auto',

  [switch]$WithClaspPull,

  [switch]$NoOpenCode
)

chcp 65001 | Out-Null

[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

$ErrorActionPreference = 'Stop'

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & git @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') 失敗"
  }
}

function Read-YesNo {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message,

    [bool]$Default = $false
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

function Get-CurrentBranchName {
  $branch = (git branch --show-current 2>$null).Trim()

  if ([string]::IsNullOrWhiteSpace($branch)) {
    return ''
  }

  return $branch
}

function Test-RemoteRefExists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RefName
  )

  git rev-parse --verify $RefName 2>$null | Out-Null
  return $LASTEXITCODE -eq 0
}

function Get-OriginDefaultRef {
  $remoteHead = git symbolic-ref refs/remotes/origin/HEAD 2>$null

  if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($remoteHead)) {
    return ($remoteHead -replace '^refs/remotes/', '')
  }

  if (Test-RemoteRefExists -RefName 'origin/master') {
    return 'origin/master'
  }

  if (Test-RemoteRefExists -RefName 'origin/main') {
    return 'origin/main'
  }

  throw '無法判斷 origin 預設分支，請確認 GitHub 是 master 還是 main。'
}

function Get-RefSha {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RefName
  )

  $sha = (git rev-parse --verify $RefName 2>$null).Trim()

  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($sha)) {
    return ''
  }

  return $sha
}

function Test-RefIsAncestor {
  param(
    [Parameter(Mandatory = $true)]
    [string]$AncestorRef,

    [Parameter(Mandatory = $true)]
    [string]$DescendantRef
  )

  git merge-base --is-ancestor $AncestorRef $DescendantRef 2>$null
  return $LASTEXITCODE -eq 0
}

function Reset-ToRef {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TargetRef,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  Write-Host "覆蓋本機檔案，對齊 $Label：$TargetRef ..." -ForegroundColor Yellow
  Invoke-Git -Arguments @('reset', '--hard', $TargetRef)
  Invoke-Git -Arguments @('clean', '-fd')
}

function Pull-ClaspIfRequested {
  param(
    [bool]$Default = $false
  )

  $shouldPull = $WithClaspPull

  if (-not $WithClaspPull) {
    $shouldPull = Read-YesNo -Message '要從 Apps Script 覆蓋拉回線上檔案嗎？這會執行 clasp pull --force' -Default $Default
  }

  if (-not $shouldPull) {
    Write-Host '已略過 clasp pull --force。' -ForegroundColor Yellow
    return
  }

  Write-Host '從 Apps Script 覆蓋拉回線上檔案...' -ForegroundColor Cyan
  clasp pull --force

  if ($LASTEXITCODE -ne 0) {
    throw 'clasp pull --force 失敗'
  }
}

Write-Host ''
Write-Host 'SKH Pull Helper' -ForegroundColor Cyan
Write-Host 'auto    = 自動判斷目前情境' -ForegroundColor DarkGray
Write-Host 'master  = 拉正式主線 origin/master，不切到 wip-current' -ForegroundColor DarkGray
Write-Host 'wip     = 換電腦用，拉 origin/wip-current' -ForegroundColor DarkGray
Write-Host 'current = 拉目前分支對應的 origin/目前分支' -ForegroundColor DarkGray
Write-Host ''

Write-Host '抓取 GitHub 最新版本...' -ForegroundColor Cyan
Invoke-Git -Arguments @('fetch', 'origin', '--prune')

$currentBranch = Get-CurrentBranchName
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
  Write-Host '目前不在正常分支上，可能是 detached HEAD。' -ForegroundColor Yellow
}
else {
  Write-Host "目前 branch：$currentBranch" -ForegroundColor Yellow
}

$selectedMode = $Mode

if ($selectedMode -eq 'auto') {
  if (Test-RemoteRefExists -RefName 'origin/wip-current') {
    $originDefaultRef = Get-OriginDefaultRef
    $wipSha = Get-RefSha -RefName 'origin/wip-current'
    $defaultSha = Get-RefSha -RefName $originDefaultRef
    $wipDiffersFromDefault = (
      -not [string]::IsNullOrWhiteSpace($wipSha) -and
      -not [string]::IsNullOrWhiteSpace($defaultSha) -and
      $wipSha -ne $defaultSha
    )

    if ([string]::IsNullOrWhiteSpace($currentBranch)) {
      $selectedMode = 'wip'
    }
    elseif ($currentBranch -eq 'wip-current') {
      $selectedMode = 'wip'
    }
    elseif ($wipDiffersFromDefault -and (Test-RefIsAncestor -AncestorRef $originDefaultRef -DescendantRef 'origin/wip-current')) {
      Write-Host ''
      Write-Host "偵測到 origin/wip-current 比 $originDefaultRef 新。" -ForegroundColor Yellow
      Write-Host 'auto 模式將使用換電腦備份進度，避免拉到較舊的正式 master。' -ForegroundColor Cyan
      $selectedMode = 'wip'
    }
    elseif ($currentBranch -eq 'master' -or $currentBranch -eq 'main') {
      $selectedMode = 'master'
    }
    else {
      Write-Host ''
      Write-Host "偵測到你目前在工作分支：$currentBranch" -ForegroundColor Yellow
      Write-Host '如果是換電腦要接續工作，建議拉 origin/wip-current。' -ForegroundColor Cyan
      Write-Host "如果是要回到正式主線，建議拉 $originDefaultRef。" -ForegroundColor Cyan
      Write-Host ''

      $useWip = Read-YesNo -Message '是否要切到換電腦用進度 origin/wip-current？' -Default $true
      $selectedMode = if ($useWip) { 'wip' } else { 'current' }
    }
  }
  else {
    Write-Host '找不到 origin/wip-current，改用正式/目前分支拉回。' -ForegroundColor Yellow
    $selectedMode = if ($currentBranch -eq 'master' -or $currentBranch -eq 'main') { 'master' } else { 'current' }
  }
}

switch ($selectedMode) {
  'wip' {
    if (-not (Test-RemoteRefExists -RefName 'origin/wip-current')) {
      throw '找不到 origin/wip-current。請先在舊電腦用 push.ps1 的「換電腦用」備份目前工作進度。'
    }

    Write-Host ''
    Write-Host '模式：換電腦用，拉 origin/wip-current。' -ForegroundColor Cyan
    Write-Host '這不代表正式版，也不會更新 skhps.jonaminz.com。' -ForegroundColor Yellow

    Invoke-Git -Arguments @('checkout', '-B', 'wip-current', 'origin/wip-current')

    Write-Host '已切到 wip-current，並對齊 origin/wip-current。' -ForegroundColor Green

    # 換電腦接續工作時，預設不要 clasp pull，避免把 GitHub 備份進度又被 Apps Script 線上版本覆蓋。
    Pull-ClaspIfRequested -Default $false
  }

  'master' {
    $targetRef = if (Test-RemoteRefExists -RefName 'origin/master') { 'origin/master' } elseif (Test-RemoteRefExists -RefName 'origin/main') { 'origin/main' } else { Get-OriginDefaultRef }
    $targetBranch = ($targetRef -replace '^origin/', '')

    Write-Host ''
    Write-Host "模式：正式主線，拉 $targetRef。" -ForegroundColor Cyan

    Invoke-Git -Arguments @('checkout', '-B', $targetBranch, $targetRef)
    Reset-ToRef -TargetRef $targetRef -Label $targetRef

    # 正式主線同步舊 pullall 行為，預設詢問是否 clasp pull。
    Pull-ClaspIfRequested -Default $true
  }

  'current' {
    if ([string]::IsNullOrWhiteSpace($currentBranch)) {
      $targetRef = Get-OriginDefaultRef
    }
    else {
      $targetRef = "origin/$currentBranch"

      if (-not (Test-RemoteRefExists -RefName $targetRef)) {
        Write-Host "找不到 $targetRef，改用 origin 預設分支。" -ForegroundColor Yellow
        $targetRef = Get-OriginDefaultRef
      }
    }

    Write-Host ''
    Write-Host "模式：目前分支，拉 $targetRef。" -ForegroundColor Cyan
    Reset-ToRef -TargetRef $targetRef -Label $targetRef

    Pull-ClaspIfRequested -Default $true
  }

  default {
    throw "未知 Mode：$selectedMode"
  }
}

Write-Host ''
Write-Host 'Pull 完成。' -ForegroundColor Green
Write-Host "目前 branch：$(Get-CurrentBranchName)" -ForegroundColor Cyan

if (-not $NoOpenCode) {
  code .
}
