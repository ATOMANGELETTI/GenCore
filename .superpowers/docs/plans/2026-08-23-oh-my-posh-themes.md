# Terminal Oh My Posh Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add selectable Oh My Posh prompt themes (`gencore`, `bubbles`, `iterm2`, `wholespace`, `wopian`, `clean-detailed`, and `kali`) to the Terminal Config tab, persisting preferences in config storage, launching PTY sessions with the chosen theme, and instantly swapping the prompt across all active tabs.

**Architecture:** Bundle official `.omp.json` theme files in `apps/terminal/src-tauri/resources/oh-my-posh/`. Update `gencore-plugin-pty` to accept and resolve `posh_theme`. Store `poshTheme: PoshThemeId` in `TerminalConfigV1` with default fallback to `"gencore"`. Provide a clean, accessible Nord-styled radio group in `Config` with keyboard navigation. Broadcast PowerShell `$env:POSH_THEME` regex updates across live sessions on theme change.

**Tech Stack:** React 19, TypeScript, Vitest, Tauri 2, Rust, Oh My Posh v3 schemas.

**Spec:** `.superpowers/docs/specs/2026-08-23-oh-my-posh-themes-design.md`

## Global Constraints

- Distribution is Windows x64 portable ZIP only; no installers.
- UI styling uses official Nord tokens from `@gencore/ui-kit` only.
- Strict isolation IPC and least-privilege Tauri capabilities.
- Full keyboard accessibility (`role="radiogroup"`, `role="radio"`, arrow navigation).
- No secrets or ad-hoc dependencies.

---

### Task 1: Bundled Oh My Posh Theme JSON Assets

**Files:**
- Create: `apps/terminal/src-tauri/resources/oh-my-posh/bubbles.omp.json`
- Create: `apps/terminal/src-tauri/resources/oh-my-posh/iterm2.omp.json`
- Create: `apps/terminal/src-tauri/resources/oh-my-posh/wholespace.omp.json`
- Create: `apps/terminal/src-tauri/resources/oh-my-posh/wopian.omp.json`
- Create: `apps/terminal/src-tauri/resources/oh-my-posh/clean-detailed.omp.json`
- Create: `apps/terminal/src-tauri/resources/oh-my-posh/kali.omp.json`
- Modify: `apps/terminal/tests/unit/oh-my-posh-theme.test.ts`

**Interfaces:**
- Produces: 6 new valid `.omp.json` theme definitions matching the official upstream Oh My Posh specifications.
- Consumes: Existing test infrastructure in `oh-my-posh-theme.test.ts`.

- [ ] **Step 1: Update theme test to expect all 7 bundled themes**

Modify `apps/terminal/tests/unit/oh-my-posh-theme.test.ts` to assert that all 7 themes (`gencore-polar-night.omp.json`, `gencore-snow-storm.omp.json`, `bubbles.omp.json`, `iterm2.omp.json`, `wholespace.omp.json`, `wopian.omp.json`, `clean-detailed.omp.json`, `kali.omp.json`) exist, parse as valid JSON, and contain valid blocks.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/oh-my-posh-theme.test.ts`
Expected: FAIL due to missing `.omp.json` files.

- [ ] **Step 3: Create the 6 authentic upstream `.omp.json` theme files**

Write `bubbles.omp.json`, `iterm2.omp.json`, `wholespace.omp.json`, `wopian.omp.json`, `clean-detailed.omp.json`, and `kali.omp.json` under `apps/terminal/src-tauri/resources/oh-my-posh/`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/oh-my-posh-theme.test.ts`
Expected: PASS.

---

### Task 2: PTY Backend Theme Validation & Resolution

**Files:**
- Modify: `crates/gencore-plugin-pty/src/modules/session/session_api.rs`
- Modify: `crates/gencore-plugin-pty/src/modules/session/session_map.rs`
- Modify: `crates/gencore-plugin-pty/src/modules/session/session_shell.rs`
- Modify: `crates/gencore-plugin-pty/tests/session_commands.rs`

**Interfaces:**
- Produces: `OpenArgs` with `posh_theme: Option<String>`, `validate_posh_theme`, and `resolve_oh_my_posh(resource_dir, theme, posh_theme)`.
- Consumes: Tauri command `open`.

- [ ] **Step 1: Add failing Rust tests for `posh_theme` resolution and validation**

In `crates/gencore-plugin-pty/tests/session_commands.rs`, add tests for `validate_posh_theme` allowing `"gencore"`, `"bubbles"`, `"iterm2"`, `"wholespace"`, `"wopian"`, `"clean-detailed"`, `"kali"`, and rejecting invalid strings like `"invalid-theme"`. Test `resolve_oh_my_posh` resolving theme files.

- [ ] **Step 2: Run `cargo test -p gencore-plugin-pty` to verify failure**

Run: `cargo test -p gencore-plugin-pty --test session_commands`
Expected: FAIL with compilation or validation error.

- [ ] **Step 3: Implement `posh_theme` handling in `gencore-plugin-pty`**

1. In `session_api.rs`: Add `#[serde(default)] pub posh_theme: Option<String>` to `OpenArgs` and pass `posh_theme: Option<String>` in `open`.
2. In `session_map.rs`: Add `validate_posh_theme(posh_theme: Option<&str>) -> Result<(), SessionError>`.
3. In `session_shell.rs`: Update `resolve_oh_my_posh(resource_dir: Option<&Path>, theme: Option<&str>, posh_theme: Option<&str>) -> Option<OhMyPoshSpawn>` to map external themes to `{posh_theme}.omp.json` and fallback to `gencore` variants.

- [ ] **Step 4: Run `cargo test -p gencore-plugin-pty` to verify pass**

Run: `cargo test -p gencore-plugin-pty`
Expected: PASS.

---

### Task 3: Config Types, Storage, and Hook Integration

**Files:**
- Modify: `apps/terminal/src/modules/config/config.types.ts`
- Modify: `apps/terminal/src/modules/config/config.storage.ts`
- Modify: `apps/terminal/src/modules/config/config.hook.ts`
- Modify: `apps/terminal/tests/unit/config.storage.test.ts`
- Modify: `apps/terminal/tests/unit/config.hook.test.tsx`

**Interfaces:**
- Produces: `PoshThemeId`, `TerminalConfigV1.poshTheme`, `ConfigContextValue.poshTheme`, and `ConfigContextValue.setPoshTheme`.
- Consumes: `localStorage` persistence.

- [ ] **Step 1: Write failing tests in `config.storage.test.ts` and `config.hook.test.tsx`**

Add tests asserting:
1. `parseConfig` parses `poshTheme` values (`"bubbles"`, `"kali"`, etc.).
2. `parseConfig` defaults missing or unrecognized `poshTheme` to `"gencore"`.
3. `useConfig` returns `poshTheme` and updates it via `setPoshTheme`.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/config.storage.test.ts tests/unit/config.hook.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `poshTheme` in `config.types.ts`, `config.storage.ts`, and `config.hook.ts`**

1. In `config.types.ts`: Define `PoshThemeId` and add `poshTheme` to `TerminalConfigV1` and `ConfigContextValue`.
2. In `config.storage.ts`: Update `DEFAULT_CONFIG` with `poshTheme: "gencore"`, add `POSH_THEMES` set, and validate `poshTheme` in `parseConfig`.
3. In `config.hook.ts`: Track `poshTheme` state, expose `setPoshTheme`, and save to storage on change.

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/config.storage.test.ts tests/unit/config.hook.test.tsx`
Expected: PASS.

---

### Task 4: Terminal Prompt Mapping, IPC & Live Session Swapping

**Files:**
- Modify: `apps/terminal/src/modules/ipc/ipc.types.ts`
- Modify: `apps/terminal/src/modules/ipc/ipc.pty.ts`
- Modify: `apps/terminal/src/modules/terminal/terminal.prompt.ts`
- Modify: `apps/terminal/src/modules/terminal/terminal.hook.ts`
- Modify: `apps/terminal/tests/unit/oh-my-posh-theme.test.ts`

**Interfaces:**
- Produces: `poshThemeFilename(poshTheme, theme)`, `poshThemeSwapCommand(poshTheme, theme)`, and updated `OpenPtyArgs`.
- Consumes: `ConfigContextValue.poshTheme` and active PTY sessions.

- [ ] **Step 1: Write failing tests for `poshThemeFilename` and `poshThemeSwapCommand`**

In `apps/terminal/tests/unit/oh-my-posh-theme.test.ts`, test:
1. `poshThemeFilename("gencore", "polar-night")` $\rightarrow$ `"gencore-polar-night.omp.json"`
2. `poshThemeFilename("gencore", "snow-storm")` $\rightarrow$ `"gencore-snow-storm.omp.json"`
3. `poshThemeFilename("bubbles", "polar-night")` $\rightarrow$ `"bubbles.omp.json"`
4. `poshThemeSwapCommand("kali", "polar-night")` replaces any previous theme filename with `kali.omp.json`.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/oh-my-posh-theme.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement prompt filename mapping and live session swapping**

1. In `ipc.types.ts` & `ipc.pty.ts`: Add `posh_theme?: PoshThemeId` to `OpenPtyArgs` and pass it in `openPty`.
2. In `terminal.prompt.ts`: Update `poshThemeFilename` and `poshThemeSwapCommand` to support all 7 themes.
3. In `terminal.hook.ts`: Listen to `[theme, poshTheme]` in `useEffect` and write `poshThemeSwapCommand(poshTheme, theme)` to all open live sessions. Pass `posh_theme: poshTheme` in `openPty`.

- [ ] **Step 4: Run unit tests to verify pass**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/oh-my-posh-theme.test.ts tests/unit/terminal.hook.test.ts`
Expected: PASS.

---

### Task 5: Config Tab UI & Full Workspace Verification

**Files:**
- Modify: `apps/terminal/src/modules/config/config.component.tsx`
- Modify: `apps/terminal/tests/unit/config.component.test.tsx`

**Interfaces:**
- Produces: Beautiful, accessible **Prompt Theme** section in the Config tab.
- Consumes: `useConfig().poshTheme` and `useConfig().setPoshTheme`.

- [ ] **Step 1: Write failing UI tests in `config.component.test.tsx`**

Add tests verifying:
1. A radiogroup with `aria-label="Prompt theme"` is rendered.
2. All 7 theme radio options (`GenCore`, `Bubbles`, `iTerm2`, `Wholespace`, `Wopian`, `Clean Detailed`, `Kali`) render with their titles and subtitles.
3. Clicking a theme calls `setPoshTheme`.
4. Arrow keys navigate across the prompt theme radio options.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/config.component.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement Prompt Theme UI in `config.component.tsx`**

Add the **Prompt Theme** section with the 7 theme options, descriptive subtitles, keyboard arrow navigation, roving tabindex, `aria-checked`, checkmark indicators, and Nord styling matching the Appearance group.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/config.component.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run full workspace verification**

Execute:
```sh
pnpm turbo run lint typecheck test
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
```
Expected: All linters, typechecks, and workspace test suites pass with 0 errors and 0 warnings.
