# Monaco & Micro Diff Editor, Config Preference, and Real-Time Source Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, professional Git Diff and Source Control subsystem in GenCore Terminal with Monaco Diff Editor (inline/split with red deletions and green additions), bundled Nord Micro Editor (`diffgutter: true`), Config preference to switch default diff viewer, real-time background git change detection, and a 1-click Open Repository header button.

**Architecture:**
- **Monaco Diff Editor:** Pure in-app React module (`src/modules/diff-editor/`) wrapping Monaco Diff Editor configured with Nord palette tokens, inline unified view by default, instant split toggle, red/green diff line and word highlighting, stage/discard buttons, and "Edit in Micro" button.
- **Micro Editor Bundling:** Standalone portable `micro.exe` configured with bundled `resources/micro/colorschemes/nord.micro` and `settings.json` with `diffgutter: true` for green `+` / red `-` gutter indicators.
- **Config Storage:** Extend `TerminalConfigV1` with `diffEditor: "monaco" | "micro"`, wired into the Config tab.
- **Real-Time Git State:** 2.5-second polling interval + window focus + terminal triggers in `source-control.hook.ts`.
- **Open Repo Button:** Header button in `ActiveRepoView` invoking `openFolderPicker()`.

**Tech Stack:** React 19, TypeScript, Monaco Editor (`@monaco-editor/react` & `monaco-editor`), Rust 2024 / Tauri 2 (`gencore-plugin-git`, `gencore-plugin-pty`), Tailwind CSS v4, Lucide React, Vitest, Testing Library.

**Spec:** `.superpowers/docs/specs/2026-08-24-diff-editor-monaco-micro-design.md`

## Global Constraints

- Nord color palette hex tokens only (`#2E3440`, `#3B4252`, `#434C5E`, `#4C566A`, `#D8DEE9`, `#E5E9F0`, `#ECEFF4`, `#8FBCBB`, `#88C0D0`, `#81A1C1`, `#5E81AC`, `#BF616A`, `#D08770`, `#EBCB8B`, `#A3BE8C`, `#B48EAD`).
- Strict modular naming: `{module}.{role}.{ext}` (JS/TS) or `{module}_api.rs` / `{module}_error.rs` (Rust). Tests under `{app/package}/tests/unit/`.
- Object-form CSP; Isolation IPC allowlist with parameter validation; `withGlobalTauri: false`; never `window.__TAURI__`.
- Bundled Terminess Nerd Font; no remote CDN or remote font downloads; CSP `font-src` stays `'self'`.
- Windows x64 portable distribution; stable dependency versions only.

---

### Task 1: Micro Editor Nord Colorscheme, Settings & PTY Config Wiring

**Files:**
- Create: `apps/terminal/src-tauri/resources/micro/colorschemes/nord.micro`
- Create: `apps/terminal/src-tauri/resources/micro/settings.json`
- Modify: `crates/gencore-plugin-pty/src/modules/session/session_shell.rs`
- Modify: `crates/gencore-plugin-pty/src/modules/session/mod.rs`
- Test: `crates/gencore-plugin-pty/tests/session_commands.rs`

**Interfaces:**
- Consumes: Resource directory containing `micro/settings.json` and `micro/colorschemes/nord.micro`.
- Produces: `resolve_custom_command(cmd_vec, resource_dir)` passing `-config-dir <resource_dir>/micro` when executing `micro.exe`.

- [ ] **Step 1: Write integration test in `crates/gencore-plugin-pty/tests/session_commands.rs` for `-config-dir` resolution**
- [ ] **Step 2: Run `cargo test -p gencore-pty` to verify failure**
- [ ] **Step 3: Create `nord.micro` colorscheme and `settings.json` in `apps/terminal/src-tauri/resources/micro/`**
- [ ] **Step 4: Update `session_shell.rs` to pass `-config-dir` when spawning `micro.exe`**
- [ ] **Step 5: Run `cargo test -p gencore-pty` to verify tests pass**
- [ ] **Step 6: Commit**

---

### Task 2: Config Tab Preference for Default Diff Viewer

**Files:**
- Modify: `apps/terminal/src/modules/config/config.types.ts`
- Modify: `apps/terminal/src/modules/config/config.storage.ts`
- Modify: `apps/terminal/src/modules/config/config.hook.ts`
- Modify: `apps/terminal/src/modules/config/subviews/appearance-view.component.tsx`
- Modify: `apps/terminal/src/modules/config/subviews/all-settings-view.component.tsx`
- Test: `apps/terminal/tests/unit/config.diff-editor.test.ts`

**Interfaces:**
- Consumes: `DiffEditorPreference` (`"monaco" | "micro"`), `useConfig()`.
- Produces: `diffEditor` state, `setDiffEditor` updater, and interactive settings card in the Config tab.

- [ ] **Step 1: Write unit tests in `apps/terminal/tests/unit/config.diff-editor.test.ts`**
- [ ] **Step 2: Run Vitest to verify tests fail**
- [ ] **Step 3: Implement `diffEditor` in `config.types.ts`, `config.storage.ts`, `config.hook.ts`**
- [ ] **Step 4: Add Diff & Editor settings card in `appearance-view.component.tsx` and `all-settings-view.component.tsx`**
- [ ] **Step 5: Run Vitest to verify all tests pass**
- [ ] **Step 6: Commit**

---

### Task 3: Real-Time Git State Detection & Open Repository Header Button

**Files:**
- Modify: `apps/terminal/src/modules/source-control/source-control.hook.ts`
- Modify: `apps/terminal/src/modules/source-control/views/active-repo-view.component.tsx`
- Modify: `apps/terminal/src/modules/files/files.component.tsx`
- Test: `apps/terminal/tests/unit/source-control.auto-refresh.test.tsx`

**Interfaces:**
- Consumes: `gitGetStatus(path)`, `gitPickFolder()`, `openFolderPicker()`.
- Produces: 2.5s polling loop, window focus listener, and `FolderOpen` header action button in `ActiveRepoView`.

- [ ] **Step 1: Write unit test in `apps/terminal/tests/unit/source-control.auto-refresh.test.tsx`**
- [ ] **Step 2: Run Vitest to verify test fails**
- [ ] **Step 3: Implement 2.5s polling interval and window focus hook in `source-control.hook.ts`**
- [ ] **Step 4: Add `FolderOpen` button in `ActiveRepoView` header and wire `files.component.tsx` callbacks**
- [ ] **Step 5: Run Vitest to verify tests pass**
- [ ] **Step 6: Commit**

---

### Task 4: Monaco Diff Editor Component & Theme Integration

**Files:**
- Modify: `apps/terminal/package.json` (add `@monaco-editor/react` & `monaco-editor`)
- Create: `apps/terminal/src/modules/diff-editor/diff-editor.types.ts`
- Create: `apps/terminal/src/modules/diff-editor/diff-editor.theme.ts`
- Create: `apps/terminal/src/modules/diff-editor/diff-editor.hook.ts`
- Create: `apps/terminal/src/modules/diff-editor/diff-editor.component.tsx`
- Create: `apps/terminal/src/modules/diff-editor/index.ts`
- Test: `apps/terminal/tests/unit/diff-editor.component.test.tsx`

**Interfaces:**
- Consumes: `gitGetDiff(repoPath, filePath)`, `stageFile`, `unstageFile`, `discardChanges`.
- Produces: `DiffEditor` React component with inline (unified) view by default, split view toggle, red/green diff highlights, and action buttons.

- [ ] **Step 1: Write unit tests in `apps/terminal/tests/unit/diff-editor.component.test.tsx`**
- [ ] **Step 2: Run Vitest to verify test fails**
- [ ] **Step 3: Install `@monaco-editor/react` / `monaco-editor` and define `diff-editor.theme.ts` with Nord tokens**
- [ ] **Step 4: Implement `diff-editor.hook.ts` and `diff-editor.component.tsx`**
- [ ] **Step 5: Run Vitest to verify tests pass**
- [ ] **Step 6: Commit**

---

### Task 5: Terminal Tab System Integration & End-to-End Verification

**Files:**
- Modify: `apps/terminal/src/modules/terminal/terminal.types.ts`
- Modify: `apps/terminal/src/modules/terminal/terminal.hook.ts`
- Modify: `apps/terminal/src/modules/terminal/terminal.component.tsx`
- Modify: `apps/terminal/src/modules/source-control/views/active-repo-view.component.tsx`
- Test: `apps/terminal/tests/unit/terminal.diff-tab.test.tsx`

**Interfaces:**
- Consumes: `DiffEditor`, `useConfig().diffEditor`, `openDiffTab(filePath)`.
- Produces: Terminal tabs rendering either `DiffEditor` (when `tab.kind === "diff"`) or Micro PTY (when `tab.kind === "editor"`), switching smoothly based on user config and header actions.

- [ ] **Step 1: Write integration tests in `apps/terminal/tests/unit/terminal.diff-tab.test.tsx`**
- [ ] **Step 2: Run Vitest to verify test fails**
- [ ] **Step 3: Update `terminal.hook.ts` and `terminal.component.tsx` to host `DiffEditor`**
- [ ] **Step 4: Wire `active-repo-view.component.tsx` `handleFileClick` to respect `diffEditor` preference**
- [ ] **Step 5: Run full monorepo test suites (`pnpm turbo run lint typecheck test`, `cargo test --workspace`)**
- [ ] **Step 6: Commit**
