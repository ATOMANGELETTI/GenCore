#Requires -Version 7.2
<#
.SYNOPSIS
  Download the latest stable Windows amd64 micro editor into Terminal resources.

.DESCRIPTION
  Places micro.exe at apps/terminal/src-tauri/resources/micro/.
  Skips the download when the file already exists unless -Force is set.
#>
param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$PSNativeCommandUseErrorActionPreference = $true

$RepoRoot = Split-Path -Parent $PSScriptRoot
$DestDir = Join-Path $RepoRoot 'apps/terminal/src-tauri/resources/micro'
$DestExe = Join-Path $DestDir 'micro.exe'

if ((Test-Path -LiteralPath $DestExe) -and -not $Force) {
  Write-Host "micro.exe already present; skipping (use -Force to re-download)."
  return
}

New-Item -ItemType Directory -Force -Path $DestDir | Out-Null

$TempZip = Join-Path $DestDir 'micro.zip'
$TempExtract = Join-Path $DestDir 'micro_extract'

Write-Host "Fetching latest micro Windows amd64 release..."
$ApiUrl = 'https://api.github.com/repos/zyedidia/micro/releases/latest'
$Headers = @{ 'User-Agent' = 'GenCore-Terminal-Fetcher' }
$DownloadUrl = $null

try {
  $Release = Invoke-RestMethod -Uri $ApiUrl -Headers $Headers -UseBasicParsing
  $Asset = $Release.assets | Where-Object { $_.name -like '*win64.zip' } | Select-Object -First 1
  if ($Asset) {
    $DownloadUrl = $Asset.browser_download_url
  }
} catch {
  Write-Warning "Failed to query GitHub API: $_. Falling back to known release URL."
}

if (-not $DownloadUrl) {
  $DownloadUrl = 'https://github.com/zyedidia/micro/releases/download/v2.0.14/micro-2.0.14-win64.zip'
}

Write-Host "Downloading $DownloadUrl..."
Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempZip -UseBasicParsing

if (-not (Test-Path -LiteralPath $TempZip)) {
  throw "Download failed: $DownloadUrl"
}

if (Test-Path -LiteralPath $TempExtract) {
  Remove-Item -LiteralPath $TempExtract -Recurse -Force
}

Expand-Archive -LiteralPath $TempZip -DestinationPath $TempExtract -Force
$FoundExe = Get-ChildItem -Path $TempExtract -Filter 'micro.exe' -Recurse | Select-Object -First 1

if (-not $FoundExe) {
  throw "micro.exe not found in archive $TempZip"
}

Copy-Item -LiteralPath $FoundExe.FullName -Destination $DestExe -Force
Remove-Item -LiteralPath $TempZip -Force
Remove-Item -LiteralPath $TempExtract -Recurse -Force

Write-Host "Wrote $DestExe"
