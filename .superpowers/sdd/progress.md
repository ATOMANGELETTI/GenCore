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

## Feature: Terminal side panel (2026-08-16)

Controller session. No git commits unless the user asks. Work in place on `main` (running `tauri:dev`).

- Task 1 AppShell sidebar slot: complete (working tree, review approved). Minors: truthy `sidebar ?` vs `!= null`; tests do not assert flex classes or document order.
- Task 2 Terminal side-panel module: complete (working tree, review approved). Minors: no keyboard-nav test; Settings click test does not assert other panels hidden.
- Task 3 Wire SidePanel into App: complete (working tree, review approved)
- Task 4 Verify ui-kit + terminal test/typecheck/lint: complete (ui-kit 31/31, terminal 11/11, typecheck+lint clean)
- Final review: Critical hidden+flex fixed (inner wrapper; tests assert hidden + no flex on tabpanel). Important version→Statusbar is pre-existing companion WIP — left in place.
- Fix re-verify: terminal 11/11, typecheck, lint clean

## Feature: Terminess AppShell font (2026-08-16)

Controller session. No git commits unless the user asks. Work in place on `main` (running `tauri:dev`).

- Task 1 fonts.css + globals.css: complete (working tree, review approved). Minors: fonts.test.ts does not lock font-family/display/weight. ⚠️ resolved: TTF+LICENSE+README present (~2.7MB each); CSP font-src 'self' on both apps.
- Task 2 tokens.typography.ts: complete (working tree, review approved). Minors: token test does not re-read globals.css.
- Task 3 tests: complete (covered by Tasks 1–2; ui-kit 34/34).
- Task 4 policy docs: complete (working tree, review approved). Minors: AGENTS.md Learned User Preferences still says “Terminus Nerd Font”.
- Task 5 changeset: complete (working tree, review approved). File: `.changeset/terminess-appshell-font.md`.
- Final review: complete (approved, ready to merge). No Critical/Important. Minors left: fonts.test.ts path-only; token test does not parse globals.css; AGENTS.md:71 still says “Terminus Nerd Font”.
- Controller verify: `pnpm --filter @gencore/ui-kit test` → 8 files / 34 passed.
- Commit: `72a153a` feat: use bundled Terminess Nerd Font in AppShell (main, not pushed).

## Feature: Traffic light hover morph (2026-08-16)

Controller session. SDD + writing-plans. Work in place on `main` (running `tauri:dev`) — dirty tree has unrelated Terminess/sidebar WIP; implementers stage only task files.

- Spec: `docs/superpowers/specs/2026-08-16-traffic-light-hover-design.md` (approved)
- Plan: `docs/superpowers/plans/2026-08-16-traffic-light-hover.md`
- Task 1 Hover morph and glyph removal: complete (commits 72a153a..2e5b7c5, review clean)
- Task 2 Dead glyph tokens and patch changeset: complete (commits 2e5b7c5..9aae58f, review clean). Observation: unrelated untracked menu tests can fail a later full ui-kit suite; not this task.
- Final review: Important `rounded-full` interpolation — human chose `rounded-[6px]` + `transition-[border-radius]`. Fix `bcfea68` re-review clean. Minors left: disabled-light morph class untested.
- Controller verify: titlebar + traffic-tokens 9/9 passed.
- Finish: already on `main` (in-place commits). Local merge is a no-op. No worktree to clean up.

## Feature: Terminal side-panel drag resize (2026-08-16)

Controller session. SDD + writing-plans. Work in place on `main` (running `tauri:dev`). No git commits unless the user asks. Implementers stage only side-panel files.

- Spec: `docs/superpowers/specs/2026-08-16-terminal-side-panel-resize-design.md` (approved)
- Plan: `docs/superpowers/plans/2026-08-16-terminal-side-panel-resize.md`
- Briefs: `.superpowers/sdd/side-panel-resize/`
- Task 1 Clamp helpers: complete (working tree, review approved). Minor: innerWidth stub restore is not in try/finally (brief-prescribed test).
- Task 2 Handle + resize behavior: complete (working tree, review approved). Minors: double-click reset is unclamped until next resize observer; pointer-down does not prevent text selection.
- Task 3 Verify: complete — `pnpm --filter @gencore/terminal test` 5 files / 22 passed; typecheck exit 0; lint 24 files clean (after import sort + `<hr>` handle + transparent hr resets).
- Final review: complete (approved, ready to merge). No Critical/Important. Minors left: innerWidth stub not in try/finally; double-click reset unclamped (unreachable at 640px min window); pointer-down does not prevent text selection.
- Commit: none (user has not asked).

## Feature: Shell context menus (2026-08-16)

Controller session. SDD + writing-plans. Work in place on `main` (running `tauri:dev`). Implementers stage only task files. Commits allowed (user approved SDD).

- Plan: `docs/superpowers/plans/2026-08-16-shell-context-menus.md`
- Briefs: `.superpowers/sdd/context-menus/`
- Task 1 Shared menu variants: complete (commits 9aae58f..d72a583, review clean)
- Task 2 ContextMenu primitive: complete (commits d72a583..9ba7574, review clean). Minors: no in-code note that Radix hardcodes sideOffset 2; checkbox/radio/group/label untested. Plan error: sideOffset={5} is invalid on radix-ui 1.6.7 ContextMenu.Content.
- Task 3 AppShell slots and native-menu suppress: complete (commits 87e7b5d..74d76c8, review clean). Minors: caller onContextMenu compose untested; no primitive-level asChild data-slot test; Titlebar/ContentArea spread can still overwrite data-slot; body-slot parent not re-asserted with content menu.
- Task 4 Terminal titlebar and content menus: complete (commits 74d76c8..c95e821, review clean after at-open fix). Minors: @ts-expect-error on onOpenAutoFocus; execCommand shim in production clipboard module; no reverse disabled-flag case. Extra files in fd96e15 were reverted in 9014026.
- Task 5 Changeset and verify: complete (changeset file matches brief; scooped into mixed commit `d4b619f`). ui-kit lint fails on pre-existing `globals.css` font-stack wrap (Terminess, not this feature). Terminal test/typecheck/lint clean.
- Final review: Important items fixed in `cd535f7` (open-only clipboard sample, execCommand shim in test setup, typed onOpenAutoFocus, Select All scoped to content-area).

## Feature: Dev live reload (2026-08-16)

Controller session. SDD + writing-plans. Work in place on `main` (running `tauri:dev`). No git commits unless the user asks.

- Plan: `.cursor/plans/dev_live_reload_60090d11.plan.md` (Cursor-owned; do not copy into `docs/superpowers/`)
- Briefs: `.superpowers/sdd/dev-live-reload/`
- Task 1 Explicit Vite HMR and workspace watch: complete (working tree, review approved). Minors: file comment still mentions only src-tauri ignore; polling-off test does not stub GENCORE_VITE_POLL. ⚠️ TDD runs are report-only — controller accepts RED 5 fail / GREEN 9/9 from task-1-report.md.
- Task 2 Dev-only CSP lock tests and `devCsp`: complete (working tree, review approved). Production csp unchanged; object-form devCsp 5173/5174.
- Task 3 Docs, agent rules, and changeset: complete (working tree, review approved). Changeset `.changeset/vite-hmr-workspace-watch.md`. Minor: README rust-rebuild sentence is brief-mandated and slightly ambiguous next to `pnpm dev`.
- Final review: complete (approved, ready to merge scoped files only). No Critical/Important. Controller verify: config-vite 9/9, terminal 36/36, explorer 12/12. Vite HMR already firing in running `tauri:dev` (app + ui-kit `/@fs/` paths). Commit: none.

## Follow-ups (not blocking)

- `pnpm approve-builds` may be required before production `vite` / `tauri` build (esbuild)
- Fill CODEOWNERS / GitHub handles when the remote exists
- Optional: smoke `pnpm --filter @gencore/terminal tauri:dev`
- No git commit until the user asks
