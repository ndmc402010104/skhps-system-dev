$ErrorActionPreference = 'Stop'

Clear-Host

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host " 新電腦初始化工具 v3" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$paths = @(
  "C:\Program Files\Git\cmd",
  "C:\Program Files\nodejs",
  "$env:APPDATA\npm"
)

Write-Host "修正目前 PowerShell PATH..." -ForegroundColor Yellow

foreach($path in $paths){

  if((Test-Path $path) -and ($env:Path -notlike "*$path*")){

    $env:Path += ";$path"
    Write-Host "已加入：$path" -ForegroundColor Green

  }

}

function Test-CommandExists{

  param(
    [string]$Command
  )

  return $null -ne (
    Get-Command $Command -ErrorAction SilentlyContinue
  )

}

function Ask-YesNo{

  param(
    [string]$Message
  )

  while($true){

    $answer = Read-Host "$Message (Y/N)"

    if($answer -match '^[Yy]'){
      return $true
    }

    if($answer -match '^[Nn]'){
      return $false
    }

  }

}

Write-Host ""
Write-Host "=== 工具檢查 ===" -ForegroundColor Cyan

Write-Host ""
Write-Host "1. Git"

if(Test-CommandExists "git"){

  git --version

}else{

  Write-Host "找不到 Git，請先安裝 Git for Windows" -ForegroundColor Red
  Write-Host "https://git-scm.com" -ForegroundColor Yellow

}

Write-Host ""
Write-Host "2. Node.js"

if(Test-CommandExists "node"){

  node -v

}else{

  Write-Host "找不到 Node.js，請安裝 Node.js LTS" -ForegroundColor Red
  Write-Host "https://nodejs.org" -ForegroundColor Yellow

}

Write-Host ""
Write-Host "3. npm"

if(Test-CommandExists "npm"){

  npm -v

}else{

  Write-Host "找不到 npm，通常安裝 Node.js LTS 會一起安裝" -ForegroundColor Red

}

Write-Host ""
Write-Host "4. clasp"

if(Test-CommandExists "clasp"){

  clasp -v

}else{

  Write-Host "找不到 clasp" -ForegroundColor Yellow

  if(Test-CommandExists "npm"){

    if(Ask-YesNo "是否安裝 @google/clasp"){

      npm install -g @google/clasp

      Write-Host ""
      Write-Host "clasp 安裝完成" -ForegroundColor Green

    }

  }else{

    Write-Host "缺少 npm，無法安裝 clasp" -ForegroundColor Red

  }

}

Write-Host ""
Write-Host "=== Git Repo 檢查 ===" -ForegroundColor Cyan

if(Test-CommandExists "git"){

  try{

    git status

  }catch{

    Write-Host "目前資料夾不是 Git Repo，或 Git 尚未初始化" -ForegroundColor Yellow

  }

}

Write-Host ""
Write-Host "=== Git 使用者設定 ===" -ForegroundColor Cyan

$gitName =
git config --global user.name

$gitEmail =
git config --global user.email

if(!$gitName){

  git config --global user.name "益昇 石"

  Write-Host "已設定 git user.name：益昇 石" -ForegroundColor Green

}else{

  Write-Host "git user.name：$gitName"

}

if(!$gitEmail){

  git config --global user.email "ndmc402010104@gmail.com"

  Write-Host "已設定 git user.email：ndmc402010104@gmail.com" -ForegroundColor Green

}else{

  Write-Host "git user.email：$gitEmail"

}

$claspRc =
Join-Path $env:USERPROFILE ".clasprc.json"
Write-Host ""
Write-Host "=== Apps Script / clasp 檢查 ===" -ForegroundColor Cyan

$claspRc =
Join-Path $env:USERPROFILE ".clasprc.json"

if(Test-CommandExists "clasp"){

  if(!(Test-Path $claspRc)){

    Write-Host ""
    Write-Host "找不到 clasp 登入憑證：$claspRc" -ForegroundColor Yellow

    if(Ask-YesNo "是否現在登入 Google Apps Script"){

      clasp login

    }

  }

  Write-Host ""
  Write-Host "重新確認 clasp 狀態..." -ForegroundColor Cyan

  try{

    clasp status

    Write-Host ""
    Write-Host "clasp 可用" -ForegroundColor Green

  }catch{

    Write-Host ""
    Write-Host "clasp 仍不可用，請手動執行：" -ForegroundColor Red
    Write-Host "clasp login" -ForegroundColor Green

  }

}else{

  Write-Host "找不到 clasp，略過 Apps Script 檢查" -ForegroundColor Yellow

}

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host " 新電腦初始化完成" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

Write-Host ""
Write-Host "下一步可以執行：" -ForegroundColor Cyan
Write-Host ".\push.ps1 -Bump patch" -ForegroundColor Green