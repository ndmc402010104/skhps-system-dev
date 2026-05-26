$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'clasp-tools.ps1')

$rootPath = $PSScriptRoot
$debounceSeconds = 1.5
$pollSeconds = 1
$pendingPush = $false
$lastChangeAt = Get-Date

function Test-WatchFile {
  param(
    [Parameter(Mandatory = $true)]
    [System.IO.FileInfo]$File
  )

  if ($File.Name -eq '.clasp.json') {
    return $false
  }

  if ($File.FullName -like '*\.git\*') {
    return $false
  }

  if ($File.FullName -like '*\.vscode\*') {
    return $false
  }

  if ($File.Name -eq 'appsscript.json') {
    return $true
  }

  if ($File.Name -eq 'README.md') {
    return $false
  }

  return $File.Extension -in @(
    '.js',
    '.html',
    '.json'
  )
}

function Get-WatchSnapshot {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $snapshot = @{}

  Get-ChildItem -Path $Path -File -Recurse |
    Where-Object { Test-WatchFile -File $_ } |
    ForEach-Object {
      $snapshot[$_.FullName] = '{0}|{1}' -f $_.LastWriteTimeUtc.Ticks, $_.Length
    }

  return $snapshot
}

function Test-SnapshotChanged {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Before,

    [Parameter(Mandatory = $true)]
    [hashtable]$After
  )

  if ($Before.Count -ne $After.Count) {
    return $true
  }

  foreach ($key in $After.Keys) {
    if (-not $Before.ContainsKey($key)) {
      return $true
    }

    if ($Before[$key] -ne $After[$key]) {
      return $true
    }
  }

  return $false
}

function Invoke-VersionedPush {
  $version = New-AppVersion -RootPath $rootPath -Bump 'patch'
  $appConfig = Sync-AppVersion -RootPath $rootPath -Version $version -DefaultEnv 'dev'
  $readmeUpdated = Update-ReadmeVersionLog -RootPath $rootPath -Version $version -ReleaseType 'dev' -Notes @()

  Write-Host "[$(Get-Date -Format 'HH:mm:ss')] APP_VERSION updated to $($appConfig.Description)"
  if ($readmeUpdated) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] README version log updated"
  }
  Invoke-Clasp -Arguments @('push') -WorkingDirectory $rootPath
  Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Push completed"
}

Write-Host 'Watching project files. Save a .js, .html, .json, or appsscript file to update APP_VERSION and push.'

$snapshot = Get-WatchSnapshot -Path $rootPath

while ($true) {
  Start-Sleep -Seconds $pollSeconds

  $currentSnapshot = Get-WatchSnapshot -Path $rootPath

  if (Test-SnapshotChanged -Before $snapshot -After $currentSnapshot) {
    $pendingPush = $true
    $lastChangeAt = Get-Date
    $snapshot = $currentSnapshot
  }

  if (
    $pendingPush -and
    ((Get-Date) - $lastChangeAt).TotalSeconds -ge $debounceSeconds
  ) {
    try {
      Invoke-VersionedPush
    }
    catch {
      Write-Host "Push failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    $snapshot = Get-WatchSnapshot -Path $rootPath
    $pendingPush = $false
  }
}
