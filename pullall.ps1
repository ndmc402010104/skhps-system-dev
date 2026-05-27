# pullall.ps1
chcp 65001 | Out-Null

[Console]::InputEncoding =
  [System.Text.UTF8Encoding]::new()

[Console]::OutputEncoding =
  [System.Text.UTF8Encoding]::new()

$OutputEncoding =
  [System.Text.UTF8Encoding]::new()

git pull

$changed =
(
git status --porcelain
)

if(
$changed.Count -gt 0
){
  Write-Host "⚠ 本地有未同步變更"
}

clasp pull

code .