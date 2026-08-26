#Requires -Version 7.2
<#
.SYNOPSIS
  Rasterize Windows PNG/ICO and tray.png from ui-kit favicons and tray.svg.

.DESCRIPTION
  Runs `tauri icon` for Terminal and Explorer using the ui-kit snow-storm
  taskbar favicon (not the old Opus 5 icon.svg), keeps Windows bundle rasters,
  and writes a 32x32 tray.png from tray.svg without overwriting 32x32.png.
#>

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$PSNativeCommandUseErrorActionPreference = $true

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $RepoRoot

$Apps = @('terminal', 'explorer')

function Remove-IfPresent {
  param([Parameter(Mandatory)][string]$Path)
  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
}

foreach ($Name in $Apps) {
  $icons = Join-Path $RepoRoot "apps/$Name/src-tauri/icons"
  $IconPng = Join-Path $RepoRoot "packages/ui-kit/src/assets/icons/favicon/$Name/favicon_snow-storm.png"
  $TraySvg = Join-Path $icons 'tray.svg'

  if (-not (Test-Path -LiteralPath $IconPng)) {
    throw "Missing ui-kit favicon: $IconPng"
  }
  if (-not (Test-Path -LiteralPath $TraySvg)) {
    throw "Missing tray master: $TraySvg"
  }

  Write-Host "Rasterizing $Name app icon..."
  pnpm --filter "@gencore/$Name" exec -- tauri icon $IconPng -o $icons
  if ($LASTEXITCODE -ne 0) {
    throw "tauri icon failed for $Name app icon (exit $LASTEXITCODE)"
  }

  Remove-IfPresent (Join-Path $icons 'icon.icns')
  Remove-IfPresent (Join-Path $icons 'icon.png')
  Remove-IfPresent (Join-Path $icons '64x64.png')
  Remove-IfPresent (Join-Path $icons 'StoreLogo.png')
  Remove-IfPresent (Join-Path $icons 'android')
  Remove-IfPresent (Join-Path $icons 'ios')
  Get-ChildItem -LiteralPath $icons -Filter 'Square*Logo.png' -ErrorAction SilentlyContinue |
    ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force }

  $temp = Join-Path ([System.IO.Path]::GetTempPath()) ("gencore-tray-$Name-" + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $temp | Out-Null
  try {
    Write-Host "Rasterizing $Name tray icon..."
    pnpm --filter "@gencore/$Name" exec -- tauri icon $TraySvg -o $temp --png 32
    if ($LASTEXITCODE -ne 0) {
      throw "tauri icon failed for $Name tray icon (exit $LASTEXITCODE)"
    }

    $TraySrc = Join-Path $temp '32x32.png'
    if (-not (Test-Path -LiteralPath $TraySrc)) {
      $listing = (Get-ChildItem -LiteralPath $temp -Recurse | ForEach-Object { $_.FullName }) -join "`n"
      throw "Expected 32x32.png in tray temp dir for ${Name}:`n$listing"
    }

    Copy-Item -LiteralPath $TraySrc -Destination (Join-Path $icons 'tray.png') -Force
  }
  finally {
    Remove-IfPresent $temp
  }

  Write-Host "Wrote Windows rasters and tray.png for $Name"
}

Write-Host 'App icons are ready.'
