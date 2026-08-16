# GenCore SDD progress ledger

Controller session. No git commits unless the user asks.

## Versions locked 2026-08-15

- pnpm 11.22.0 (Node >=22.13)
- turbo 2.10.10
- react / react-dom 19.2.8
- vite 8.2.1
- typescript 7.0.2
- tailwindcss / @tailwindcss/vite 4.3.3
- @vitejs/plugin-react 6.0.5
- babel-plugin-react-compiler 1.0.0
- @rolldown/plugin-babel (latest stable peer of plugin-react)
- @biomejs/biome 2.5.8
- vitest 4.1.10
- radix-ui 1.6.7
- shadcn CLI 4.18.0
- @tauri-apps/cli 2.11.4
- @tauri-apps/api 2.11.1
- tauri crate max_stable 2.11.5
- tauri-build / tauri-plugin 2.6.3
- @changesets/cli 3.0.0
- husky 9.1.7
- lint-staged 17.3.0
- @commitlint/cli 21.2.2

## Tasks

- Wave 1 workspace-root: complete (review clean)
- Wave 2 shared-crates: complete (review clean) — ACL package names must match plugin ids (`gencore-core`, `gencore-pty`, `gencore-fs`)
- Wave 3 ui-kit: complete (review approved)
- Wave 4 apps + security-ipc: complete (typecheck + CSP fixes applied)
- Wave 5 husky/changesets/vscode: complete (review approved)
- Wave 6a `.cursor/**`: complete (review approved after hook fail-open + rule/ignore fixes)
- Wave 6b `.github/**`: complete (review approved; `changesets/action@v1` is latest stable)
- Controller docs: `README.md`, `LICENSE` (MIT), root + nested `AGENTS.md`

## Follow-ups (not blocking)

- `pnpm approve-builds` may be required before production `vite` / `tauri` build (esbuild)
- Fill CODEOWNERS / GitHub handles when the remote exists
- Optional: smoke `pnpm --filter @gencore/terminal tauri:dev`
- No git commit until the user asks
