#Requires -Version 7.2
<#
.SYNOPSIS
  Release-only Windows x64 portable ZIP for GenCore apps.

.DESCRIPTION
  Compiles each app with `tauri build --no-bundle` for x86_64-pc-windows-msvc
  and zips the portable folder. Daily `tauri:dev` / `tauri:build` do not invoke
  this script. Output is `release/`; previous ZIPs move to `release/archive/`.
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

function Assert-NonEmptyFile {
  param([Parameter(Mandatory)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Expected file not found: $Path"
  }
  if ((Get-Item -LiteralPath $Path).Length -eq 0) {
    throw "Expected file is zero-byte: $Path"
  }
}

function Move-ZipToArchive {
  param(
    [Parameter(Mandatory)][string]$ZipPath,
    [Parameter(Mandatory)][string]$ArchiveDir
  )
  if (-not (Test-Path -LiteralPath $ZipPath)) {
    return
  }
  New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null
  $Leaf = Split-Path -Leaf $ZipPath
  $Dest = Join-Path $ArchiveDir $Leaf
  if (Test-Path -LiteralPath $Dest) {
    $Base = [System.IO.Path]::GetFileNameWithoutExtension($Leaf)
    $Stamp = Get-Date -Format 'yyyyMMdd-HHmm'
    $Dest = Join-Path $ArchiveDir "$Base-$Stamp.zip"
    if (Test-Path -LiteralPath $Dest) {
      $Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
      $Dest = Join-Path $ArchiveDir "$Base-$Stamp.zip"
    }
  }
  Move-Item -LiteralPath $ZipPath -Destination $Dest
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $RepoRoot

$ReleaseDir = Join-Path $RepoRoot 'release'
$ArchiveDir = Join-Path $ReleaseDir 'archive'
$StagingRoot = Join-Path $ReleaseDir '.staging'
New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null

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

  if ($App.Filter -eq '@gencore/terminal') {
    Write-Host 'Fetching Oh My Posh...'
    & (Join-Path $PSScriptRoot 'fetch-oh-my-posh.ps1')
    Write-Host 'Fetching micro...'
    & (Join-Path $PSScriptRoot 'fetch-micro.ps1')
  }

  Write-Host "Building $ProductName $Version (windows-x64)..."
  pnpm --filter $App.Filter exec -- tauri build --no-bundle --target x86_64-pc-windows-msvc
  if ($LASTEXITCODE -ne 0) {
    throw "tauri build failed for $($App.Filter) (exit $LASTEXITCODE)"
  }

  $ExeSrc = Join-Path $RepoRoot "target/x86_64-pc-windows-msvc/release/$($App.Exe)"
  Assert-NonEmptyFile $ExeSrc
  Copy-Item -LiteralPath $ExeSrc -Destination (Join-Path $StageDir $App.Exe)

  if ($App.Filter -eq '@gencore/terminal') {
    $OmpSrc = Join-Path $RepoRoot 'apps/terminal/src-tauri/resources/oh-my-posh'
    $MicroSrc = Join-Path $RepoRoot 'apps/terminal/src-tauri/resources/micro'
    Assert-NonEmptyFile (Join-Path $OmpSrc 'oh-my-posh.exe')
    Assert-NonEmptyFile (Join-Path $MicroSrc 'micro.exe')
    $ResDest = Join-Path $StageDir 'resources'
    New-Item -ItemType Directory -Force -Path $ResDest | Out-Null
    Copy-Item -LiteralPath $OmpSrc -Destination (Join-Path $ResDest 'oh-my-posh') -Recurse -Force
    Copy-Item -LiteralPath $MicroSrc -Destination (Join-Path $ResDest 'micro') -Recurse -Force
  }

  $ZipPath = Join-Path $ReleaseDir "$Slug-$Version-windows-x64.zip"
  Move-ZipToArchive -ZipPath $ZipPath -ArchiveDir $ArchiveDir
  Compress-Archive -LiteralPath $StageDir -DestinationPath $ZipPath
  Write-Host "Wrote $ZipPath"
}

Remove-Item -LiteralPath $StagingRoot -Recurse -Force
Write-Host 'Windows x64 portable ZIPs are ready under release/.'
