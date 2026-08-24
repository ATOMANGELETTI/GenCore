# SDD Ledger: Monaco & Micro Diff Editor, Config Preference, and Real-Time Source Control

**Plan:** `.superpowers/docs/plans/2026-08-24-diff-editor-monaco-micro.md`  
**Spec:** `.superpowers/docs/specs/2026-08-24-diff-editor-monaco-micro-design.md`  
**Tasks:** `.superpowers/docs/tasks/2026-08-24-diff-editor-monaco-micro.md`  

## Pre-flight Conflict Scan
| Task Pair | Produces / Consumes | Scan Finding | Ruling |
|---|---|---|---|
| Task 1 & Task 5 | Micro config vs Terminal Editor launch | Task 1 configures PTY to pass `-config-dir` for micro; Task 5 invokes it | Clean — Approved |
| Task 2 & Task 5 | Config `diffEditor` state vs ActiveRepoView | Task 2 exposes `diffEditor` setting; Task 5 consumes it to open Monaco vs Micro | Clean — Approved |
| Task 3 & Task 5 | ActiveRepoView Auto-Refresh vs Tab Integration | Task 3 adds auto-polling & open repo; Task 5 connects file click | Clean — Approved |
| Task 4 & Task 5 | Monaco DiffEditor component vs Terminal Host Pane | Task 4 exports DiffEditor; Task 5 mounts it when `tab.kind === "diff"` | Clean — Approved |

## Active Task / Current Work
- **Status**: Complete — All 5 Tasks Finished & Fully Verified.
- **Whole-Branch Verification**: `pnpm turbo run lint typecheck test` (546/546 passed), `cargo test --workspace` (passed), `cargo clippy --workspace --all-targets -- -D warnings` (clean).

## Completed Tasks
- **Task 5: Terminal Tab System Integration & End-to-End Verification (Sonnet 5)**
  - Extended `TerminalTab` with `kind: "diff"` and `diffRepo`, added `openDiffTab` to `TerminalSessionApi`.
  - Mounted `<DiffEditorView />` in `terminal.component.tsx` when active tab is a diff tab.
  - Connected `ActiveRepoView` file clicks to open Monaco diff or Micro PTY tab based on `diffEditor` preference.
  - Files: `apps/terminal/src/modules/terminal/terminal.types.ts`, `terminal.hook.ts`, `terminal.component.tsx`, `active-repo-view.component.tsx`, `apps/terminal/tests/unit/terminal.diff-tab.test.tsx`.
  - Tests: `pnpm --filter @gencore/terminal test` (54/54 test files, 546/546 passed), `cargo test --workspace` (passed), `cargo clippy` (clean).
  - Review: Spec ✅, Quality Approved.

- **Task 1: Micro Editor Nord Colorscheme, Settings & PTY Config Wiring (Grok)**
  - Scaffolded bundled `nord.micro` colorscheme with Nord hex palette tokens and `settings.json` with `diffgutter: true`.
  - Files: `apps/terminal/src-tauri/resources/micro/colorschemes/nord.micro`, `apps/terminal/src-tauri/resources/micro/settings.json`, `crates/gencore-plugin-pty/src/modules/session/session_shell.rs`.
  - Tests: `cargo test -p gencore-pty` (8/8 passed).
  - Review: Spec ✅, Quality Approved.

- **Task 2: Config Tab Preference for Default Diff Viewer (Grok)**
  - Extended `TerminalConfigV1` with `diffEditor: "monaco" | "micro"`, wired storage validation, hook state, and appearance subview UI picker.
  - Files: `apps/terminal/src/modules/config/config.types.ts`, `config.constants.ts`, `config.storage.ts`, `config.hook.ts`, `appearance-view.component.tsx`.
  - Tests: `pnpm --filter @gencore/terminal test config` (7 test files, 68/68 passed).
  - Review: Spec ✅, Quality Approved.

- **Task 3: Real-Time Git State Detection & Open Repository Header Button (Grok)**
  - Implemented 2.5s interval polling and `window.addEventListener("focus")` auto-refresh in `source-control.hook.ts`.
  - Added sleek `FolderOpen` button to `ActiveRepoView` header for instant repo opening/switching.
  - Wired workspace folder toolbar actions in `files.component.tsx`.
  - Files: `apps/terminal/src/modules/source-control/source-control.hook.ts`, `active-repo-view.component.tsx`, `files.component.tsx`.
  - Tests: `pnpm --filter @gencore/terminal test source-control` (3 test files, 16/16 passed).
  - Review: Spec ✅, Quality Approved.

- **Task 4: Monaco Diff Editor Component & Theme Integration (Sonnet 5)**
  - Implemented `DiffEditorView` with offline Monaco `@monaco-editor/react` bundling, custom Nord dark/light themes, unified inline vs split toggle, Stage/Discard/Edit-in-Micro toolbar actions.
  - Files: `apps/terminal/src/modules/diff-editor/diff-editor.types.ts`, `diff-editor.theme.ts`, `diff-editor.component.tsx`, `index.ts`.
  - Tests: `pnpm --filter @gencore/terminal test diff-editor` (2 test files, 8/8 passed).
  - Review: Spec ✅, Quality Approved.

## Deferred Findings & Rulings
- None.
