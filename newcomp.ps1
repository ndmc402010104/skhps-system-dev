$ErrorActionPreference='Stop'

Clear-Host

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host " 新電腦初始化工具 v2" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$paths=@(
"C:\Program Files\Git\cmd",
"C:\Program Files\nodejs",
"$env:APPDATA\npm"
)

Write-Host "修正 PATH..." -ForegroundColor Yellow

foreach($path in $paths){

if(
(Test-Path $path) -and
($env:Path -notlike "*$path*")
){

$env:Path+=";$path"

Write-Host "✓ $path"

}

}

function Exists{

param(
[string]$cmd
)

return $null -ne (
Get-Command $cmd -ErrorAction SilentlyContinue
)

}

function AskInstall{

param(
[string]$name
)

while($true){

$ans=
Read-Host "安裝 $name ? (Y/N)"

if($ans -match '^[Yy]'){
return $true
}

if($ans -match '^[Nn]'){
return $false
}

}

}

Write-Host ""
Write-Host "=== 工具檢查 ===" -ForegroundColor Cyan

if(
Exists "git"
){

Write-Host ""
Write-Host "Git ✓"

git --version

}
else{

Write-Host ""
Write-Host "Git ✗"

Write-Host ""
Write-Host "請安裝："
Write-Host "https://git-scm.com"

}

if(
Exists "node"
){

Write-Host ""
Write-Host "Node ✓"

node -v

}
else{

Write-Host ""
Write-Host "Node ✗"

Write-Host ""
Write-Host "請安裝 Node.js LTS"

}

if(
Exists "npm"
){

Write-Host ""
Write-Host "npm ✓"

npm -v

}
else{

Write-Host ""
Write-Host "npm ✗"

}

if(
Exists "clasp"
){

Write-Host ""
Write-Host "clasp ✓"

clasp -v

}
else{

Write-Host ""

if(
Exists "npm"
){

if(
AskInstall "clasp"
){

npm install -g @google/clasp

Write-Host ""
Write-Host "clasp 安裝完成"

}

}
else{

Write-Host "缺 npm"

}

}

Write-Host ""
Write-Host "=== Repo ===" -ForegroundColor Cyan

if(
Exists "git"
){

try{

git status

}
catch{

Write-Host "不是 Git Repo"

}

}

Write-Host ""
Write-Host "=== Apps Script ===" -ForegroundColor Cyan

if(
Exists "clasp"
){

try{

clasp status

}
catch{

Write-Host ""
Write-Host "尚未登入"

if(
AskInstall "登入 clasp"
){

clasp login

}

}

}

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "完成"
Write-Host "==================================" -ForegroundColor Green
Write-Host ""

Write-Host "下一步："

Write-Host ""
Write-Host ".\push.ps1 -Bump patch" -ForegroundColor Green

Write-Host ""