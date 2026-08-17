# GenCore agent instructions

This file is the repo-wide brief. Nested `AGENTS.md` files add path-specific rules and win on conflict. Project Cursor rules in `.cursor/rules/` apply as well (`security.mdc` is always on).

## What this is

A pnpm + Turborepo + Cargo monorepo with two **template** Tauri 2 apps. Do not implement a real PTY emulator or file manager unless the user asks.

## Layout

- `apps/terminal` — `@gencore/terminal`, port 5173, identifier `com.gencore.terminal`
- `apps/explorer` — `@gencore/explorer`, port 5174, identifier `com.gencore.explorer`
- `packages/ui-kit` — Nord design system; **no** `@tauri-apps/*` imports
- `packages/config-typescript`, `packages/config-vite` — shared tooling
- `crates/gencore-core` — package/plugin id `gencore-core`
- `crates/gencore-plugin-pty` — package **and** plugin id `gencore-pty`
- `crates/gencore-plugin-fs` — package **and** plugin id `gencore-fs`

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
- No secrets in the repo. No in-repo MCP configs (`.cursor/mcp.json`, `.mcp.json`, ad-hoc `npx` MCP servers). Team MCP is dashboard-only.

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

## Learned User Preferences

- For multi-agent orchestration, use Grok 4.6 extra high unless a stronger model is clearly required. Prefer Kimi K3 or GLM 5.2 when a different model is needed; elevate to Opus 5, Sonnet 5, or GPT 5.6 (sol/luna/terra) only when necessary. Pick the specialized agent best suited to each task.
- Do not show the app version in the statusbar; it already appears in the titlebar. The titlebar version chip uses a Nord gilded hover and opens the GitHub repo in the system browser on click.
- Reviewer skills (code-reviewer, security-reviewer, performance-reviewer) are read-only: propose a plan, ask which changes to apply, and do not edit unless asked.
- Shared fonts belong in `@gencore/ui-kit` (`packages/ui-kit/src/assets/fonts/`) and may be used in the app shell (Terminess Nerd Font); do not copy font files into apps.
- Keep Superpowers-generated folders (`docs/superpowers/`, plans, specs, `.superpowers/`) clean and organized; do not leave leftover plan or spec clutter in the repo.
- Shell and chrome UI text is not selectable; keep the content area copyable. The statusbar has no right-click context menu.
- Do not bump major versions without asking first; use minor and patch only while apps stay on 0.x.
- Never add Cursor or AI attribution to commits or PRs (`Co-authored-by: Cursor`, `Made-with: Cursor`, Copilot/ChatGPT/Claude trailers, or similar). Human co-authors are fine. The Husky `commit-msg` hook strips AI trailers if they still appear.

## Learned Workspace Facts

- CI and local version managers read `.node-version` (currently `22`); keep that file and keep it aligned with `engines.node` (`>=22.13.0`).
- The public GitHub repository is https://github.com/ATOMANGELETTI/GenCore.
- `TAURI_DEV_HOST` HMR is unsupported; Vite live reload uses `devCsp.connect-src` localhost websockets only.
- The project license is GPL-3.0-or-later.

