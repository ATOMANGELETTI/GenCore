# GenCore agent instructions

This file is the repo-wide brief. Nested `AGENTS.md` files add path-specific rules and win on conflict. Project Cursor rules in `.cursor/rules/` apply in Cursor (`security.mdc` is always on). Antigravity CLI (`agy`) reads the generated `.agents/` tree (rules, skills, workflows, agents, hooks) plus this file. After editing `.cursor/`, run `pnpm sync:agents` and commit both trees. Do not hand-edit generated `.agents/rules`, `.agents/skills`, `.agents/workflows`, or `.agents/agents` files.

## What this is

A pnpm + Turborepo + Cargo monorepo with two **template** Tauri 2 apps. The Terminal emulator is real; Explorer still has no PTY. Do not implement a real file manager unless the user asks.

## Layout

- `apps/terminal` — `@gencore/terminal`, port 5173, identifier `com.gencore.terminal`
- `apps/explorer` — `@gencore/explorer`, port 5174, identifier `com.gencore.explorer`
- `packages/ui-kit` — Nord design system; **no** `@tauri-apps/*` imports
- `packages/config-typescript`, `packages/config-vite` — shared tooling
- `crates/gencore-core` — package/plugin id `gencore-core`
- `crates/gencore-plugin-pty` — package **and** plugin id `gencore-pty`
- `crates/gencore-plugin-fs` — package **and** plugin id `gencore-fs`
- `crates/gencore-plugin-assistant` — package **and** plugin id `gencore-assistant`

Never name a crate `tauri-plugin-fs` or `tauri-plugin-pty`. Plugin id must equal `CARGO_PKG_NAME` or ACL grants never match.

## Naming

Folder-per-module. Files are `{module}.{role}.{ext}` (JS) or `{module}_api.rs` / `{module}_error.rs` (Rust). Tests only under that unit’s `tests/`.

## Security (non-negotiable)

- Object-form CSP; Isolation IPC; `withGlobalTauri: false`; never `window.__TAURI__`
- `freezePrototype: true`; `assetProtocol.enable: false`; no `dangerous*` flags
- Capabilities: `windows: ["main"]` only. Do not grant `gencore-pty` / `gencore-fs` stub commands until the UI invokes them
- UI talks to Rust only through `src/modules/ipc/` wrappers, except
  `data-tauri-drag-region` on the titlebar, which invokes
  `plugin:window|start_dragging` in the WebView without going through
  `ipc.window.ts`. Keep the capability. Prefer `startDraggingWindow()` for JS
  callers.
- No secrets in the repo. No in-repo MCP configs (`.cursor/mcp.json`, `.agents/mcp_config.json`, `.mcp.json`, ad-hoc `npx` MCP servers). Team MCP is dashboard-only.

## UI

Official Nord hex only. Flat macOS chrome. Import from `radix-ui` (unified). Bundled Terminess Nerd Font; no remote fonts; CSP `font-src` stays `'self'`. Apps override density in `app.theme.css`, not colors.

Exact template copy:

- Terminal: `Tauri Terminal Template` + version from `get_app_info`
- Explorer: `Tauri Explorer Template` + version from `get_app_info`

## Versions

Latest **stable** only. No beta/rc/canary. Do not downgrade the locked stack (React 19.2, Vite 8, Tauri 2, Tailwind 4, pnpm 11, Node >=22.13).

## Distribution

Apps ship as **Windows x64 portable ZIP** only (`pnpm package:win64`). `tauri:build` compiles the exe (`--no-bundle`) and does not emit NSIS/MSI or other OS installers. Do not add installer targets or a default rustc triple in `.cargo/config.toml`.

## Commands

```sh
pnpm install
pnpm turbo run lint typecheck test
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
pnpm package:win64
```

Scoped: `pnpm --filter @gencore/<pkg> test` or `cargo test -p <crate>`. Release ZIPs are produced only by the root `package:win64` script.

## Git

Do not create commits or push unless the user explicitly asks. Conventional commits when they do. Add a changeset for `@gencore/*` package behavior changes (`pnpm changeset`). Binary assets listed in `.gitattributes` (icons, fonts, media, archives) are Git LFS-tracked; run `git lfs install` once.

## Antigravity CLI (`agy`)

Install Superpowers once per machine (re-run to update):

```sh
agy plugin install https://github.com/obra/superpowers
```

The plugin is not vendored. GenCore’s always-on Superpowers rule (artifact paths under `.superpowers/`) is generated into `.agents/rules/superpowers.md`. Do not add `.agents/mcp_config.json`. Team MCP stays dashboard-only.

## Learned User Preferences

- For Superpowers and multi-agent Task dispatches, default to Grok 4.6 extra high (Fast Mode). Prefer Kimi K3, GLM 5.2, and other cheap enabled models when a different cheap model is needed. Elevate to Sonnet 5 or Opus 5 when planning or orchestration decides a stronger model is needed, or when a cheaper subagent is stuck / cannot finish. Use Opus 5 only as a last resort after Sonnet 5 is stuck — it is expensive. Always pass `model` explicitly; never inherit. GPT 5.6 is allowed if enabled but is not a default. Pick the specialized agent best suited to each task.
- Do not show the app version in the statusbar; it already appears in the titlebar. The titlebar version chip uses a Nord gilded outline and text (not a solid gold fill) and opens the GitHub repo in the system browser on click.
- Reviewer skills (code-reviewer, security-reviewer, performance-reviewer) are read-only: propose a plan, ask which changes to apply, and do not edit unless asked.
- Shared fonts belong in `@gencore/ui-kit` (`packages/ui-kit/src/assets/fonts/`) and may be used in the app shell (Terminess Nerd Font); do not copy font files into apps.
- Keep all Superpowers files under `.superpowers/`: specs in `.superpowers/docs/specs/`, plans in `.superpowers/docs/plans/`, tasks in `.superpowers/docs/tasks/` (same slug as the plan, listing associated `Spec:` + `Plan:` links and per-task model assignments; check off matching `- [x]` immediately upon task completion alongside the SDD ledger and Todo list), reviews in `.superpowers/docs/reviews/`. Do not write `docs/superpowers/`, `docs/plans/`, or `docs/specs/`. Track `.superpowers/docs/`; gitignore only `.superpowers/brainstorm/` and `.superpowers/sdd/`. Do not leave leftover plan or spec clutter in the repo. Maintain `.superpowers/sdd/progress.md` as the default durable SDD execution ledger and keep all default SDD functions (task briefs, review packages, fix loops, minor findings roll-up, whole-branch review) fully operational.
- Shell and chrome UI text is not selectable; keep the content area copyable. The statusbar has no right-click context menu.
- Do not bump major versions without asking first; use minor and patch only while apps stay on 0.x.
- Never add Cursor or AI attribution to commits or PRs (`Co-authored-by: Cursor`, `Made-with: Cursor`, Copilot/ChatGPT/Claude trailers, or similar). Human co-authors are fine. The Husky `commit-msg` hook strips AI trailers if they still appear.
- Keep Files-tab toolbar actions, side-panel Files/Agent/Settings tabs, and settings/config rows compact; oversized chrome looks unprofessional.
- Prefer `portable-pty` for the terminal PTY backend unless a clearly better option is identified.
- File and folder icons should share one theme-inherited color (the row text color) with distinct outline shapes per type; do not use rainbow per-type fills. They must stay legible on Polar Night and Snow Storm.
- When implementing an approved spec, use Superpowers subagent-driven development with TDD unless asked otherwise. Terminal pane work is not done until a real WebView2 visual check (Playwright/CDP) shows a cursor and prompt; jsdom and `http://localhost:5173` have no Tauri IPC and do not count.

## Learned Workspace Facts

- CI and local version managers read `.node-version` (currently `22`); keep that file and keep it aligned with `engines.node` (`>=22.13.0`).
- The public GitHub repository is https://github.com/ATOMANGELETTI/GenCore.
- `TAURI_DEV_HOST` HMR is unsupported; Vite live reload uses `devCsp.connect-src` localhost websockets only.
- The project license is GPL-3.0-or-later.
- The terminal left panel has Files, Assistant, and Config tabs. Assistant is a real Gemini Developer API ledger chat backed by `crates/gencore-plugin-assistant` (plugin id `gencore-assistant`): a portable SQLite database (`gencore-assistant.sqlite` under `GENCORE_DATA_DIR` or `{exe_parent}/data/`) stores conversations, messages, and tool calls, and the Gemini API key is protected with Windows DPAPI — the WebView never sees the key again after save, and `get_agent_settings` returns only `{ model, context_lines, has_api_key }`. Tool calls are propose-and-confirm: Gemini proposes `pty_write`, `switch_tab`, or `reveal_in_files`; Rust only executes `pty_write` after the user clicks Approve, using the `session_id` from the conversation's latest snapshot, never one supplied by Gemini. There are no file create/read agent tools yet — those wait for Explorer to get a real file manager. The statusbar far-left button and Ctrl+B/Cmd+B toggle that panel even when xterm is focused (the chord is not sent to the shell). Terminal-only telemetry chips (CPU, iGPU, dGPU, network) live on the statusbar with Nord rich tooltips; do not add Explorer telemetry unless asked.
- The Terminal right panel is xterm.js + portable-pty. Tabs can be created, closed, renamed, and pinned; pinned tabs persist custom name and history across restarts. Bundle portable Oh My Posh under `apps/terminal/src-tauri/resources/oh-my-posh/` (`oh-my-posh.exe` is gitignored; fetch with `scripts/fetch-oh-my-posh.ps1`) for a theme-aware 2-line Powerline prompt with Nerd Font icons; frost `❯` fallback if the exe is missing or zero-byte. PowerShell Oh My Posh `-File` launch must include `-NoExit` so the tab stays interactive. Never pass Windows `\\?\` verbatim paths into PowerShell. Reject zero-byte App Execution Alias stubs when resolving the PTY shell.
- App icons are a Nord suite (Polar Night rounded tile + Frost glyph): Terminal is a filled `>` chevron plus block cursor; Explorer is a left-tabbed folder. Tray icons are glyph-only and distinct from the window icon. Each app has a Nord-styled tray right-click menu on its own window/capability, not `main`.
- `@xterm/xterm@6.0.0` needs `patches/@xterm__xterm@6.0.0.patch` while `freezePrototype: true` is on (xterm assigns `toString` and the WebView stays blank). Do not disable `freezePrototype` to drop the patch; remove the patch only after a newer stable xterm no longer needs it.
- Tauri plugin builds cache absolute permission-file paths under `target/`; after relocating the repo, run `cargo clean` before `tauri:dev`.
- Apps follow OS appearance: dark → Polar Night, light → Snow Storm; Polar Night if theme IPC fails or returns null.
- `.cursor/` is the source of truth for Cursor agent config; `.agents/` is generated for Antigravity (`agy`) and should not be edited by hand.
- `gencore-pty` IPC arguments are snake_case (`session_id`, not `sessionId`); a camelCase mismatch drops CPR/write/resize and leaves a blank pane. `scripts/tauri-dev-terminal.mjs` launches Terminal `tauri:dev` with WebView2 `--remote-debugging-port=9223` and deletes `CURSOR_AGENT` (Oh My Posh `init` prints nothing when that env is set). Playwright visual tests attach to that WebView2, never to a normal `http://localhost:5173` tab.
