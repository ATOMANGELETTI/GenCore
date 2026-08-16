#Requires -Version 7.2
<#
.SYNOPSIS
  Release-only Windows x64 portable ZIP for GenCore apps.

.DESCRIPTION
  Compiles each app with `tauri build --no-bundle` for x86_64-pc-windows-msvc
  and zips the exe. Daily `tauri:dev` / `tauri:build` do not invoke this script.
#>

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$PSNativeCommandUseErrorActionPreference = $true

if ($env:OS -ne 'Windows_NT') {
  throw 'package:win64 requires Windows.'
}

if (-not [Environment]::Is64BitOperatingSystem) {
  throw 'package:win64 requires 64-bit Windows.'
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $RepoRoot

$ArtifactsDir = Join-Path $RepoRoot 'artifacts'
$StagingRoot = Join-Path $ArtifactsDir '.staging'
New-Item -ItemType Directory -Force -Path $ArtifactsDir | Out-Null

if (Test-Path -LiteralPath $StagingRoot) {
  Remove-Item -LiteralPath $StagingRoot -Recurse -Force
}

$Apps = @(
  @{ Filter = '@gencore/terminal'; Exe = 'gencore-terminal.exe' }
  @{ Filter = '@gencore/explorer'; Exe = 'gencore-explorer.exe' }
)

foreach ($App in $Apps) {
  $Name = $App.Filter.Split('/')[-1]
  $ConfPath = Join-Path $RepoRoot "apps/$Name/src-tauri/tauri.conf.json"
  $Conf = Get-Content -LiteralPath $ConfPath -Raw | ConvertFrom-Json
  $ProductName = [string]$Conf.productName
  $Version = [string]$Conf.version

  if ([string]::IsNullOrWhiteSpace($ProductName) -or [string]::IsNullOrWhiteSpace($Version)) {
    throw "tauri.conf.json must set productName and version: $ConfPath"
  }

  $Slug = ($ProductName -replace '[^A-Za-z0-9]+', '-').Trim('-').ToLowerInvariant()
  $StageName = "$ProductName-$Version-windows-x64"
  $StageDir = Join-Path $StagingRoot $StageName
  New-Item -ItemType Directory -Force -Path $StageDir | Out-Null

  Write-Host "Building $ProductName $Version (windows-x64)..."
  pnpm --filter $App.Filter exec -- tauri build --no-bundle --target x86_64-pc-windows-msvc
  if ($LASTEXITCODE -ne 0) {
    throw "tauri build failed for $($App.Filter) (exit $LASTEXITCODE)"
  }

  $ExeSrc = Join-Path $RepoRoot "target/x86_64-pc-windows-msvc/release/$($App.Exe)"
  if (-not (Test-Path -LiteralPath $ExeSrc)) {
    throw "Expected exe not found: $ExeSrc"
  }

  Copy-Item -LiteralPath $ExeSrc -Destination (Join-Path $StageDir $App.Exe)

  $ZipPath = Join-Path $ArtifactsDir "$Slug-$Version-windows-x64.zip"
  if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
  }

  Compress-Archive -LiteralPath $StageDir -DestinationPath $ZipPath
  Write-Host "Wrote $ZipPath"
}

Remove-Item -LiteralPath $StagingRoot -Recurse -Force
Write-Host 'Windows x64 portable ZIPs are ready under artifacts/.'
