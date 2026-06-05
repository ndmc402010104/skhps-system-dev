# 檔案位置：scripts/Update-VersionManifest.ps1
# 時間戳記：2026-06-06 03:44 UTC+8
# 用途：更新 GitHub Pages version.json manifest；dev 只更新 dev 區塊，prod 只更新 prod 區塊。

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('dev', 'prod')]
  [string]$Env,

  [Parameter(Mandatory = $true)]
  [string]$Version
)

$ErrorActionPreference = 'Stop'

function Format-ManifestVersion {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $text = $Value.Trim()
  if ($text -match '^[Vv]') {
    return 'v' + $text.Substring(1)
  }

  return 'v' + $text
}

function New-ManifestSection {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Label,

    [Parameter(Mandatory = $true)]
    [string]$EnvName,

    [Parameter(Mandatory = $true)]
    [string]$VersionText,

    [Parameter(Mandatory = $true)]
    [string]$UpdatedAt,

    [string]$Url = '',

    [string]$Note = ''
  )

  $section = [ordered]@{
    label = $Label
    env = $EnvName
    version = $VersionText
    updatedAt = $UpdatedAt
  }

  if (-not [string]::IsNullOrWhiteSpace($Url)) {
    $section.url = $Url
  }

  if (-not [string]::IsNullOrWhiteSpace($Note)) {
    $section.note = $Note
  }

  return [pscustomobject]$section
}

function Ensure-Property {
  param(
    [Parameter(Mandatory = $true)]
    [psobject]$Object,

    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [object]$Value
  )

  if ($Object.PSObject.Properties.Name -contains $Name) {
    $Object.$Name = $Value
    return
  }

  $Object | Add-Member -MemberType NoteProperty -Name $Name -Value $Value
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$versionPath = Join-Path $repoRoot 'version.json'

$twZone = [System.TimeZoneInfo]::FindSystemTimeZoneById('Taipei Standard Time')
$twNow = [System.TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, $twZone)
$stamp = $twNow.ToString("yyyy-MM-dd HH:mm 'UTC+8'")
$versionText = Format-ManifestVersion -Value $Version

if (Test-Path -LiteralPath $versionPath) {
  try {
    $manifest = Get-Content -LiteralPath $versionPath -Raw -Encoding UTF8 | ConvertFrom-Json
  }
  catch {
    throw "version.json 不是合法 JSON，已停止：$($_.Exception.Message)"
  }
}
else {
  $manifest = [pscustomobject]@{}
}

Ensure-Property -Object $manifest -Name 'updatedAt' -Value $stamp

if (-not ($manifest.PSObject.Properties.Name -contains 'prod') -or $null -eq $manifest.prod) {
  Ensure-Property -Object $manifest -Name 'prod' -Value (New-ManifestSection `
    -Label '正式版' `
    -EnvName 'prod' `
    -VersionText 'v0.0.0-prod' `
    -UpdatedAt $stamp `
    -Url 'https://skhps.jonaminz.com/')
}

if (-not ($manifest.PSObject.Properties.Name -contains 'dev') -or $null -eq $manifest.dev) {
  Ensure-Property -Object $manifest -Name 'dev' -Value (New-ManifestSection `
    -Label '測試版' `
    -EnvName 'dev' `
    -VersionText 'v0.0.0-dev' `
    -UpdatedAt $stamp `
    -Url 'https://dev-skhps.jonaminz.com/')
}

if (-not ($manifest.PSObject.Properties.Name -contains 'gasDev') -or $null -eq $manifest.gasDev) {
  Ensure-Property -Object $manifest -Name 'gasDev' -Value (New-ManifestSection `
    -Label 'Apps Script 測試版' `
    -EnvName 'gasDev' `
    -VersionText '以 clasp push 最新版為準' `
    -UpdatedAt $stamp `
    -Note 'Apps Script 測試版第一階段不讀 version.json，只顯示本頁版本。')
}

if ($Env -eq 'dev') {
  Ensure-Property -Object $manifest.dev -Name 'label' -Value '測試版'
  Ensure-Property -Object $manifest.dev -Name 'env' -Value 'dev'
  Ensure-Property -Object $manifest.dev -Name 'version' -Value $versionText
  Ensure-Property -Object $manifest.dev -Name 'updatedAt' -Value $stamp
  Ensure-Property -Object $manifest.dev -Name 'url' -Value 'https://dev-skhps.jonaminz.com/'
}
elseif ($Env -eq 'prod') {
  Ensure-Property -Object $manifest.prod -Name 'label' -Value '正式版'
  Ensure-Property -Object $manifest.prod -Name 'env' -Value 'prod'
  Ensure-Property -Object $manifest.prod -Name 'version' -Value $versionText
  Ensure-Property -Object $manifest.prod -Name 'updatedAt' -Value $stamp
  Ensure-Property -Object $manifest.prod -Name 'url' -Value 'https://skhps.jonaminz.com/'
}

$json = $manifest | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($versionPath, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

& git -C $repoRoot add -- version.json
if ($LASTEXITCODE -ne 0) {
  throw 'git add version.json 失敗'
}

Write-Host "version.json 已更新：$Env $versionText ($stamp)" -ForegroundColor Green

