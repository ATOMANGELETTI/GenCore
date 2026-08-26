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
