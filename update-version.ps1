$ErrorActionPreference = 'Stop'

$configPath = Join-Path $PSScriptRoot 'Config.js'
$version = Get-Date -Format 'yyyyMMddHHmm'

$content = Get-Content -Raw -Encoding UTF8 $configPath
$pattern = "const APP_VERSION\s*=\s*'[^']*';"
$replacement = "const APP_VERSION =`r`n'$version';"
$regex = [regex]$pattern

if (-not $regex.IsMatch($content)) {
  throw 'Cannot find APP_VERSION in Config.js'
}

$updatedContent = $regex.Replace($content, $replacement, 1)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($configPath, $updatedContent, $utf8NoBom)

Write-Host "APP_VERSION updated to version $version"
