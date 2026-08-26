# Windows x64 portable release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Windows x64 portable ZIPs in `release/`, archive previous ZIPs, and package Terminal and Explorer.

**Architecture:** Keep the existing PowerShell packager. Retarget output from `artifacts/` to `release/`. Archive-on-replace with timestamp collision names. Fetch and copy Terminal sidecars (Oh My Posh + micro). Contract-test the script text; do not run `tauri build` in unit tests.

**Tech Stack:** PowerShell 7.2+, `pnpm package:win64`, Tauri 2 `--no-bundle`, `node:test` in `scripts/tests/`.

**Spec:** `.superpowers/docs/specs/2026-08-25-windows-x64-portable-release-design.md`

## Global Constraints

- Latest **stable** only. No beta/rc/canary.
- Windows x64 portable ZIP only. `bundle.active` stays `false`. `--no-bundle` + `x86_64-pc-windows-msvc`.
- No NSIS/MSI, no 32-bit, no other OS, no GitHub Releases upload, no CI `tauri build`.
- Do not set `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` or port `9223` in `package-win64.ps1`.
- ZIP names: `{slug}-{version}-windows-x64.zip`. Archive collision stamps: `yyyyMMdd-HHmm` then `yyyyMMdd-HHmmss`.
- Gitignore ZIPs; never commit `*.zip` under `release/`.
- `{module}.{role}.{ext}` unchanged. Script tests live in `scripts/tests/`.
- Superpowers files stay under `.superpowers/docs/` (tracked) and `.superpowers/sdd/` (gitignored scratch). Do not write `docs/superpowers/`.
- No Cursor/AI attribution trailers.
- Stage only files listed in the task. Never `git add -A`.
- Work in place. Do not create a worktree or switch branches.

---

## File map

**Create**

- `.superpowers/docs/specs/2026-08-25-windows-x64-portable-release-design.md` (controller)
- `.superpowers/docs/plans/2026-08-25-windows-x64-portable-release.md` (controller)
- `.superpowers/docs/tasks/2026-08-25-windows-x64-portable-release.md` (controller)
- `.superpowers/sdd/windows-x64-portable-release/progress.md` (controller, gitignored)
- `scripts/tests/package-win64.test.mjs` (Task 1)

**Modify**

- `scripts/package-win64.ps1` (Task 2)
- `.gitignore` (Task 2)
- `README.md`, `AGENTS.md`, `.cursor/rules/architecture.mdc`, `apps/terminal/AGENTS.md`, `apps/explorer/AGENTS.md`, `.cursor/skills/add-app/SKILL.md` (Task 3)
- Generated `.agents/` via `pnpm sync:agents` (Task 3)

**Already present (do not recreate unless missing):** `release/.gitkeep`, `release/archive/.gitkeep`

**Do not** enable `bundle.active`, add installer targets, write to `artifacts/`, or commit ZIPs.

---

### Task 1: Failing package-win64 contract tests

**Model:** Grok 4.6 extra high (Fast Mode) (`cursor-grok-4.6-xhigh-fast`)

**Files:**
- Create: `scripts/tests/package-win64.test.mjs`

**Interfaces:**
- Consumes: current `scripts/package-win64.ps1` and `.gitignore` (still `artifacts/` destination)
- Produces: `pnpm test:scripts` failures that Task 2 must turn green

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/package-win64.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.join(import.meta.dirname, "../..");
const SCRIPT = readFileSync(path.join(ROOT, "scripts/package-win64.ps1"), "utf8");
const GITIGNORE = readFileSync(path.join(ROOT, ".gitignore"), "utf8");

test("package:win64 writes Windows x64 ZIPs under release/", () => {
  assert.match(SCRIPT, /Join-Path \$RepoRoot 'release'/);
  assert.doesNotMatch(SCRIPT, /Join-Path \$RepoRoot 'artifacts'/);
  assert.match(SCRIPT, /--no-bundle/);
  assert.match(SCRIPT, /x86_64-pc-windows-msvc/);
  assert.match(SCRIPT, /\$Slug-\$Version-windows-x64\.zip/);
});

test("package:win64 archives previous ZIPs with timestamp on collision", () => {
  assert.match(SCRIPT, /Join-Path \$ReleaseDir 'archive'/);
  assert.match(SCRIPT, /yyyyMMdd-HHmm/);
  assert.match(SCRIPT, /yyyyMMdd-HHmmss/);
  assert.doesNotMatch(SCRIPT, /Remove-Item -LiteralPath \$ZipPath -Force/);
});

test("package:win64 fetches Oh My Posh and micro for Terminal", () => {
  assert.match(SCRIPT, /fetch-oh-my-posh\.ps1/);
  assert.match(SCRIPT, /fetch-micro\.ps1/);
  assert.match(SCRIPT, /oh-my-posh/);
  assert.match(SCRIPT, /micro/);
});

test("package:win64 does not set the WebView2 debug port", () => {
  assert.doesNotMatch(SCRIPT, /9223/);
  assert.doesNotMatch(SCRIPT, /WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS/);
});

test("release ZIPs and staging are gitignored", () => {
  assert.match(GITIGNORE, /release\/\*\*\/\*\.zip/);
  assert.match(GITIGNORE, /release\/\.staging\//);
  assert.match(GITIGNORE, /^artifacts\/$/m);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:scripts`

Expected: `package-win64.test.mjs` FAIL (script still uses `artifacts/`, deletes `$ZipPath`, no `fetch-micro.ps1`, gitignore missing `release/**/*.zip`). Other `scripts/tests/*.test.mjs` still pass.

- [ ] **Step 3: Commit**

```bash
git add scripts/tests/package-win64.test.mjs
git commit -m "test(scripts): add package-win64 release layout contract"
```

Do not modify `package-win64.ps1` in this task.

---

### Task 2: Retarget packager and gitignore

**Model:** Grok 4.6 extra high (Fast Mode) (`cursor-grok-4.6-xhigh-fast`)

**Files:**
- Modify: `scripts/package-win64.ps1` (replace file)
- Modify: `.gitignore` (after `artifacts/` add two lines)

**Interfaces:**
- Consumes: Task 1 tests
- Produces: `pnpm test:scripts` all pass; packager writes `release/`, archives previous ZIPs, fetches micro

- [ ] **Step 1: Confirm Task 1 tests are red**

Run: `pnpm test:scripts`

Expected: `package-win64.test.mjs` still FAIL.

- [ ] **Step 2: Replace `scripts/package-win64.ps1` with this exact script**

```powershell
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
```

- [ ] **Step 3: Update `.gitignore`**

Keep `artifacts/`. Immediately after that line, add:

```
release/**/*.zip
release/.staging/
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `pnpm test:scripts`

Expected: PASS including `package-win64.test.mjs`.

Also run: `pnpm --filter @gencore/terminal test -- tests/unit/tauri.dev-port.test.ts`

Expected: PASS (script still must not contain `9223`).

- [ ] **Step 5: Commit**

```bash
git add scripts/package-win64.ps1 .gitignore
git commit -m "feat: land windows x64 zips in release with archive"
```

Do not run `pnpm package:win64` in this task. Do not edit README.

---

### Task 3: Docs and agent sync

**Model:** Grok 4.6 extra high (Fast Mode) (`cursor-grok-4.6-xhigh-fast`)

**Files:**
- Modify: `README.md` (packaging paragraph)
- Modify: `AGENTS.md` (Distribution + Commands scoped sentence)
- Modify: `.cursor/rules/architecture.mdc` (distribution bullet)
- Modify: `apps/terminal/AGENTS.md` (last packaging bullet)
- Modify: `apps/explorer/AGENTS.md` (last packaging bullet)
- Modify: `.cursor/skills/add-app/SKILL.md` (step 4 release sentence)
- Run: `pnpm sync:agents` (generated `.agents/` files)

**Interfaces:**
- Consumes: Task 2 behavior (`release/`, archive)
- Produces: docs that say `release/` not `artifacts/` for packaging output

- [ ] **Step 1: README.md**

Replace the paragraph that currently ends with `Output lands in artifacts/.` with:

```
`tauri:build` compiles the exe with `--no-bundle` and does not emit NSIS/MSI or other installers. ZIP packaging runs only through `pnpm package:win64` (64-bit Windows). Output lands in `release/`. A previous ZIP with the same name is moved to `release/archive/` (timestamp suffix on collision).
```

- [ ] **Step 2: AGENTS.md**

In `## Distribution`, keep Windows x64 portable ZIP only. After the `package:win64` sentence, ensure readers know ZIPs land in `release/` (not `artifacts/`). In the scoped sentence under Commands, change to: `Release ZIPs are produced only by the root package:win64 script and land in release/.`

- [ ] **Step 3: `.cursor/rules/architecture.mdc`**

Keep `bundle.active` stays `false`. Extend the distribution bullet so it names `release/` as the ZIP destination (still `pnpm package:win64`).

- [ ] **Step 4: App AGENTS.md files**

Change the last bullet in both `apps/terminal/AGENTS.md` and `apps/explorer/AGENTS.md` to:

```
- Release packaging is root `pnpm package:win64` (Windows x64 portable ZIP only; output `release/`)
```

- [ ] **Step 5: add-app skill**

In `.cursor/skills/add-app/SKILL.md` step 4, after `Release ZIP is pnpm package:win64.`, add `Output lands in release/.`

- [ ] **Step 6: Sync agents**

Run: `pnpm sync:agents`

Expected: `.agents/` copies of architecture / add-app / AGENTS updates. Do not hand-edit `.agents/`.

- [ ] **Step 7: Commit**

```bash
git add README.md AGENTS.md .cursor/rules/architecture.mdc apps/terminal/AGENTS.md apps/explorer/AGENTS.md .cursor/skills/add-app/SKILL.md .agents
git commit -m "docs: point windows x64 packaging output at release/"
```

---

### Task 4: Package Terminal and Explorer

**Model:** Grok 4.6 extra high (Fast Mode) (`cursor-grok-4.6-xhigh-fast`)

**Files:**
- Run only (gitignored outputs): `release/gencore-terminal-*-windows-x64.zip`, `release/gencore-explorer-*-windows-x64.zip`
- Do not commit those ZIPs

**Interfaces:**
- Consumes: Task 2 script
- Produces: two current ZIPs under `release/`; any pre-existing same-named ZIPs under `release/archive/`

- [ ] **Step 1: Run the packager**

Run: `pnpm package:win64`

Expected: exit 0. Console includes `Wrote` paths under `release/` and the final line `Windows x64 portable ZIPs are ready under release/.` Both `tauri build --no-bundle --target x86_64-pc-windows-msvc` succeed. Terminal fetch steps run.

- [ ] **Step 2: Confirm artifacts**

Confirm both files exist (versions from each `tauri.conf.json`, currently `0.1.0`):

- `release/gencore-terminal-0.1.0-windows-x64.zip`
- `release/gencore-explorer-0.1.0-windows-x64.zip`

`git status` must **not** list those ZIPs as untracked (gitignore). `release/.staging` must not remain.

- [ ] **Step 3: Do not commit.** Write the report with exact zip paths and `pnpm package:win64` exit code.

