#Requires -Version 7.2
<#
.SYNOPSIS
  Download the latest stable Windows amd64 Oh My Posh into Terminal resources.

.DESCRIPTION
  Places oh-my-posh.exe at apps/terminal/src-tauri/resources/oh-my-posh/.
  Skips the download when the file already exists unless -Force is set.
#>
param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$PSNativeCommandUseErrorActionPreference = $true

$RepoRoot = Split-Path -Parent $PSScriptRoot
$DestDir = Join-Path $RepoRoot 'apps/terminal/src-tauri/resources/oh-my-posh'
$DestExe = Join-Path $DestDir 'oh-my-posh.exe'

if ((Test-Path -LiteralPath $DestExe) -and -not $Force) {
  Write-Host "oh-my-posh.exe already present; skipping (use -Force to re-download)."
  return
}

New-Item -ItemType Directory -Force -Path $DestDir | Out-Null

$Url = 'https://github.com/JanDeDobbeleer/oh-my-posh/releases/latest/download/posh-windows-amd64.exe'
$TempExe = Join-Path $DestDir 'oh-my-posh.exe.download'

Write-Host "Downloading latest stable posh-windows-amd64.exe..."
Invoke-WebRequest -Uri $Url -OutFile $TempExe -UseBasicParsing
if (-not (Test-Path -LiteralPath $TempExe)) {
  throw "Download failed: $Url"
}

Move-Item -LiteralPath $TempExe -Destination $DestExe -Force
Write-Host "Wrote $DestExe"
