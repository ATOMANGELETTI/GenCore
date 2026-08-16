# GenCore

Turborepo + Cargo monorepo for two Tauri 2 desktop templates that share one design system and one set of Rust plugins. Product distribution is **Windows x64 portable ZIP** only.

The apps are **shells**, not a finished terminal or file manager. They exist so later features drop into an already modular, security-locked layout.

| App | Package | Identifier | Dev URL |
| --- | --- | --- | --- |
| Terminal | `@gencore/terminal` | `com.gencore.terminal` | http://localhost:5173 |
| Explorer | `@gencore/explorer` | `com.gencore.explorer` | http://localhost:5174 |

## Stack

- pnpm 11 workspaces + Turborepo + Cargo workspace
- React 19, Vite, TypeScript, Tailwind CSS 4, React Compiler
- Tauri 2, Isolation IPC, object-form CSP
- `@gencore/ui-kit` — flat, macOS-inspired chrome on official [Nord](https://www.nordtheme.com/) tokens (default Polar Night)
- Radix via the unified `radix-ui` package, shadcn-style primitives
- Biome, Vitest, rustfmt, clippy `-D warnings`, Changesets, Husky

## Repository map

```
apps/terminal          apps/explorer
packages/ui-kit        packages/config-typescript   packages/config-vite
crates/gencore-core    crates/gencore-plugin-pty    crates/gencore-plugin-fs
```

JS packages use `workspace:*`. Rust crates are Cargo workspace members (including each app’s `src-tauri`).

Plugin **folder** names are `gencore-plugin-pty` / `gencore-plugin-fs`. The Cargo package name and Tauri plugin id must match: `gencore-pty` / `gencore-fs`. Do not name a crate `tauri-plugin-fs` or `tauri-plugin-pty`.

## Prerequisites

- Node.js `>=22.13`
- pnpm `11.22.0` (from the root `packageManager` field — `corepack enable`)
- Rust stable with `rustfmt` and `clippy` (`rust-toolchain.toml`)
- Tauri 2 system dependencies for Windows ([Tauri prerequisites](https://v2.tauri.app/start/prerequisites/))
- WebView2 Runtime (ships with Windows 10/11; portable ZIPs do not include a bootstrapper)
- Git LFS (bundled with Git for Windows); run `git lfs install` once. GitHub does not copy LFS objects into “Use this template” repos — forks and clones are fine.

## Commands

```sh
corepack enable
pnpm install
```

| Task | Command |
| --- | --- |
| Both Vite frontends | `pnpm dev` |
| Terminal desktop | `pnpm --filter @gencore/terminal tauri:dev` |
| Explorer desktop | `pnpm --filter @gencore/explorer tauri:dev` |
| Lint / typecheck / test (JS) | `pnpm turbo run lint typecheck test` |
| Rust tests | `cargo test --workspace` |
| Rust lint | `cargo clippy --workspace --all-targets -- -D warnings` |
| Version a change | `pnpm changeset` |
| Windows x64 portable ZIP | `pnpm package:win64` |

`tauri:build` compiles the exe with `--no-bundle` and does not emit NSIS/MSI or other installers. ZIP packaging runs only through `pnpm package:win64` (64-bit Windows). Output lands in `artifacts/`.

VS Code tasks and LLDB launch configs live in `.vscode/`.

The workspace allows esbuild’s install script (`allowBuilds.esbuild` in `pnpm-workspace.yaml`) so production Vite can transpile. If a new dependency needs a lifecycle script, decide explicitly in that file rather than running an ad-hoc approve prompt.

## Security baseline

Both apps ship with:

- Isolation pattern (`apps/<app>/isolation/`) and a command allowlist
- Restrictive CSP (no remote fonts or script CDNs)
- `withGlobalTauri: false` — frontend uses `@tauri-apps/api` only, never `window.__TAURI__`
- `freezePrototype: true`, `assetProtocol.enable: false`
- Capabilities on `windows: ["main"]` only: window chrome + `gencore-core:allow-get-app-info`
- Pty/fs plugin commands are **not** granted until a real UI calls them

Report vulnerabilities privately — see [`.github/SECURITY.md`](.github/SECURITY.md).

## Design system

`@gencore/ui-kit` owns titlebar, content, and statusbar. Apps only supply identity, density, and the center copy:

- Terminal: `Tauri Terminal Template` + app version (`density="compact"`)
- Explorer: `Tauri Explorer Template` + app version (`density="comfortable"`)

Stay on official Nord hex. Override density in `app.theme.css`, not a second palette.

## Tests

Tests live under each unit’s `tests/` directory — never colocated next to source.

## Contributing

See [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md). Agent instructions: [AGENTS.md](AGENTS.md).
