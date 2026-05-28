# pullall.ps1
chcp 65001 | Out-Null

[Console]::InputEncoding =
  [System.Text.UTF8Encoding]::new()

[Console]::OutputEncoding =
  [System.Text.UTF8Encoding]::new()

$OutputEncoding =
  [System.Text.UTF8Encoding]::new()

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

Write-Host "抓取 GitHub 最新版本..." -ForegroundColor Cyan
Invoke-Git -Arguments @('fetch', 'origin', '--prune')

$upstream = git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($upstream)) {
  $branch = git branch --show-current

  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($branch)) {
    throw "無法判斷目前 Git 分支"
  }

  $upstream = "origin/$branch"
}

Write-Host "覆蓋本機檔案，對齊 $upstream ..." -ForegroundColor Yellow
Invoke-Git -Arguments @('reset', '--hard', $upstream)
Invoke-Git -Arguments @('clean', '-fd')

Write-Host "從 Apps Script 覆蓋拉回線上檔案..." -ForegroundColor Cyan
clasp pull --force

if ($LASTEXITCODE -ne 0) {
  throw "clasp pull --force 失敗"
}

Write-Host "Pullall 完成，本機已使用線上版本。" -ForegroundColor Green

code .
