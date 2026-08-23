# GenCore SDD progress ledger

## Feature: Terminal Assistant (2026-08-22)

Plan: `.superpowers/docs/plans/2026-08-22-terminal-assistant.md`
Spec: `.superpowers/docs/specs/2026-08-22-terminal-assistant-design.md`
Branch: `main` (work in place; no worktree). Implementers commit per plan.
BASE before Task 1: `26ca6f5`

- Task 1: complete (commits 26ca6f5..9dacbbd, review clean). User chose portable Path::join expects. Minors for final review: process-global GENCORE_DATA_DIR mutation; crate-graph docs wait for Task 11. Versions: rusqlite 0.40.2, reqwest 0.13.4 feature `rustls` (not `rustls-tls`).
- Task 2: complete (commits 9dacbbd..28e3f5d, review clean). `insert_snapshot(&Snapshot)` + `Snapshot::for_conversation` (clippy too-many-arguments). Extra seed keys `pty.prompt`, `ui.theme`. Minors for final review: conversation `updated_at` only on messages; unknown tool call is stringly `Sqlite`; list_messages/latest_snapshot skip require_conversation; apply_schema always forces user_version=1.
- Task 3: complete (commits 28e3f5d..f03510e, review clean). Secrets never write settings. Minors for final review: has_secret loads full blob; weak leak assertion in unprotect test; DPAPI plaintext not zeroed.
- Task 4: complete (commits f03510e..ee09d50, review clean). `pty_write` has `data` only. Minors for final review: FunctionCall rustdoc overclaims args strip; Gemini error JSON parses as Ok([]); GeminiRequest fields public; no GeminiRequest::new allowlist test.
- Task 5: complete (commits ee09d50..e08aa5e, review clean). Session stamped from snapshot. Minors for final review: no non-pending existing-row test; pty_write success→ran untested (no stub writer); fail() can drop original error; whitespace session id; extra Pty/Store variants.
- Task 6: complete (commits e08aa5e..db5e728, review clean). `GeminiTransport`/`ScriptedTransport` + `send_turn`/`resume_turn`. Minors for final review: snapshot not in model prompt; resume_turn skips key check; title rewrite no-ops if get_conversation None; Gemini(String) vs GeminiHttp/Stream; tool results flattened to user text.
- Task 7: complete (commits db5e728..e2bd3c1, review clean). Persist-before-accept via `continue_turn`. Minors for final review: Isolation test title vs toThrow; source-lock persist tests; message+snapshot not one transaction; token event is post-hoc dump not stream; stale send_message rustdoc; cancel_turn cooperative-only; Task 6 created_at flake. 12 commands wired through Isolation (explicit `reconstructListen` branches, no `entry-changed` fallback), capabilities, `ReqwestTransport`, `ipc.assistant.ts`. Tests: isolation+tauri.conf 149/149, ipc.assistant 17/17, full terminal suite 350/350, `cargo test -p gencore-assistant` 56/56 (clean run), clippy clean. Minors for final review: `cancel_turn` is cooperative-only (doesn't abort the in-flight HTTP call or roll back persisted rows, just suppresses events); pre-existing Task 6 flake in `tests/agent.rs::send_turn_persists_user_message_and_stamps_snapshot_conversation_id` (~50% flake, second-granularity `created_at` tie-broken by random UUID `id` — not touched, out of Task 7 file scope).
- Task 7 review fix: complete. Important finding fixed — `send_message` now `run_blocking`s `insert_message`+`insert_snapshot` and awaits it *before* spawning the Gemini turn / returning `{ accepted: true }`, so an unknown-conversation or store error fails the command itself. Split `agent_api::send_turn` into `send_turn` (persist + delegate, kept for tests) and new `continue_turn` (no persist); the spawned turn now calls `continue_turn`, never re-inserting the user message. See `.superpowers/sdd/task-7-report.md` Fix section. Tests: `cargo test -p gencore-assistant --test agent --test assistant` 16+20 passed (clean run; the pre-existing flake above reproduced once, reran clean), full crate 60/60, clippy clean.
- Task 8: complete (commits e2bd3c1..7441084, review clean). Ledger + conversation-keyed pending/streaming/transcripts. Minors for final review: render-time ref overwrite; send skips You-row append after History switch; shared composer; History/New omit Files tooltips. User routed Tasks 9–11 to Sonnet 5.
- Task 9: complete (commits 7441084..9b6c3dc, review clean). Minors for final review: saveKey clears draft before IPC resolves; replaceKey flips shared hasApiKey with no cancel; setModel/setContextLines comments overclaim refetch. `AgentSettingsProvider`/`useAgentSettings()` in `config.agent.ts` (IPC-backed, optimistic writes, best-effort error swallow). Config gained Assistant (key row + 4-model radiogroup, default `gemini-3.7-flash`) and Context (Terminal lines 20–200) sections after Appearance. `assistant.hook.ts` re-exports the real hook and keeps a test-only `AgentSettingsStubProvider` sharing the same context so Task 8 specs stay green untouched. Tests: `config.agent.test.tsx` (9, new) + `config.component.test.tsx` (Assistant/Context added) pass; `assistant.component.test.tsx`/`assistant.hook.test.tsx`/`side-panel.test.tsx` still pass; full suite 39 files/385 tests, `tsc --noEmit` clean. Concern: whole-repo `pnpm turbo run lint` still shows ~24 pre-existing format errors in files this task never touched (confirmed via `git show HEAD` predating this task); all touched/created files pass `biome check` individually.
- Task 10: complete (commits 9b6c3dc..bc6c63a, review clean). Subscribe-once ui-action. Minors for final review: subscribe-once test does not assert latest handlers; drive→dir untested; revealPath only mocked.
- Task 11: complete (commits bc6c63a..f083d3f, review clean). Minors for final review: Superpowers sentence added in AGENTS.md; crates/AGENTS conventions line still says pty/fs only.
- Whole-branch review: With fixes (1 Critical, 11 Important). Report: `.superpowers/sdd/whole-branch-review.md`.
- Whole-branch fix: complete (commits f083d3f..f4ad79c). Report: `.superpowers/sdd/whole-branch-fix-report.md`.
- Whole-branch re-review: original 1 Critical + 11 Important closed. New Important: Cancel left the chat streaming. Report: `.superpowers/sdd/whole-branch-rereview.md`.
- Cancel fix: complete (`3cede29`). Re-review found two races (begin_turn after prepare; stale empty turn). Follow-up committed.
- Cancel generation follow-up: complete. Whole-branch SDD ready for finishing options.

## Prior sessions

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
- Controller docs: `README.md`, `LICENSE` (GPL-3.0-or-later), root + nested `AGENTS.md`

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

## Feature: IDE Problems + security/quality (2026-08-16)

Controller session. SDD + writing-plans. Work in place on `main` (running `tauri:dev`). No git commits unless the user asks.

- Plan: `docs/superpowers/plans/2026-08-16-ide-problems-security-quality.md`
- Briefs: `.superpowers/sdd/ide-problems-security-quality/`
- Task 1 Inventory: complete (working tree, review approved). ⚠️ 45 Problems-panel items not enumerable via ReadLints. CLI: Biome 16 (not unknown-file), ui-kit lint fails on globals.css wrap only, typecheck/test/clippy green. Extra: 0-byte knip.json → Task 2.
- Task 2 Biome/CSS/schema/slider: complete (working tree, review approved). Minors: schema tag tauri-v2.11.1 vs crate 2.11.5. ui-kit review clean.
- Task 3 setup-node dual inputs: complete (working tree, review approved).
- Task 4 Isolation/CSP + opener `with: undefined` fix: complete (working tree, spec+quality Approved, tauri-reviewer Approved). Minors/nits: no `with: null` test; window-label tests don’t assert payload identity; duplicated hooks.
- Task 5 Quality/consistency: complete (working tree, spec+quality Approved, tauri-reviewer Approved, ui-kit-reviewer Approved). Minors: `clipboard-read` PermissionName cast; Explorer window tests consolidated 4→2; AppShell falsy-sidebar untested; changeset wording slightly inverted.
- Task 6 Verification: complete (working tree). turbo retry 11/11 (172 JS); first turbo Explorer heading timeout flake under parallel load; cargo test 16; clippy 0; biome 147 files clean. Whole-diff tauri + ui-kit Approved. Bugbot: no bugs. Security Review: no medium/high/critical.
- Task 7 Superpowers hygiene: complete (working tree). Plan already at `docs/superpowers/plans/2026-08-16-ide-problems-security-quality.md`. Moved 29 loose SDD-root `task-*.md` / `review-*.diff` into `.superpowers/sdd/archive/bootstrap/`.

## Feature: Terminal Files-tab file tree (2026-08-16)

Controller session. SDD + writing-plans. Work in place on `main` (running `tauri:dev`). Commits allowed (user approved SDD). Implementers stage only task files.

- Spec: `docs/superpowers/specs/2026-08-16-terminal-file-tree-design.md`
- Plan: `docs/superpowers/plans/2026-08-16-terminal-file-tree.md`
- Briefs: `.superpowers/sdd/file-tree/`
- Task 1 list + list_drives: complete (commits 5da30d9..a2045f2, review clean). Minors: unused `ListDrivesError::Io`; `is_usable_mount` is public crate API; blocking I/O on async commands; symlink hidden/system uses followed metadata. Known limit: sysinfo 0.39 Windows omits optical/network volumes. Spec skip empty/not-ready: `total_space == 0`.
- Task 2 create_file + create_dir: complete (commits a2045f2..49211c8, review clean). Minors: create_dir InvalidName/AlreadyExists untested; `final_path_component` dead `unwrap_or`.
- Task 3 watch + unwatch: complete (commits 49211c8..ab2bb89, review clean). Minors: unused `UnwatchError::Io`; crate-root re-export of notify `EventKind`. Mutex poison still `.expect` (minor, not fixed).
- Task 4 Input + icon-sm Button: complete (commits ab2bb89..47baa7b, review clean). Minors: Input tests omit focus-ring classes; icon-sm test omits `p-0`; no disabled/placeholder tokens.
- Task 5 FileIcon catalog: complete (commits 47baa7b..334abd0, review clean). Minor: `font` fill `snow-4` is low-contrast on Snow Storm.
- Task 6 Tree primitive: complete (commits 334abd0..56d1a72, review clean). Minors: no `scrollToIndex` on keyboard selection; tests don't prove windowing; 8px chevron hit target.
- Task 7 ipc.fs + Isolation + capabilities: complete (commits 56d1a72..96c0eb4, review clean). Flattened Rust `path` args; Isolation listen/unlisten locked to `gencore-fs://entry-changed`. Minors: listen tests omit wrong-target case; double-read of `args.path`.
- Task 8 File tree UI + SidePanel: complete (commits 96c0eb4..2dee359, review clean). Minors: create error may clip in 22px overflow-hidden rows; jsdom 100% tree height; disabled create tooltips don't hover; `system` rows not muted (spec dimmed both; task only required hidden); create draft prepended as first child.
- Whole-branch review: Important fixes in `410aefa` (create errors visible; fs I/O on `spawn_blocking`). Re-review clean. Remaining minors deferred (optical/network via sysinfo, system-row dimming, Tree scrollToIndex, dead Io variants, Mutex expect, EventKind re-export, font snow-4, disabled tooltips, draft insert position, listen wrong-target test, last-row viewport clip).



## Feature: Files-tab context menu + default C: expand (2026-08-17)

Controller session. SDD + writing-plans. Work in place on `main` (running `tauri:dev`). Commits allowed (user approved SDD). Implementers stage only task files.

- Spec: `docs/superpowers/specs/2026-08-17-file-tree-context-menu-design.md`
- Plan: `docs/superpowers/plans/2026-08-17-file-tree-context-menu.md`
- Briefs: `.superpowers/sdd/file-tree-context-menu/`
- Model: implementers and task reviewers `cursor-grok-4.6-xhigh-fast` unless blocked; elevate only if needed.
- Task 1 Tree row data-id: complete (commits a585402..58679eb, review clean). ⚠️ TDD/trailers not in diff package; controller confirmed RED `data-id` null then GREEN 16/16, commit body has no AI trailers.
- Task 2 copyText: complete (commits 58679eb..8af6de5, review clean).
- Task 3 FileTreeContextMenu: complete (commits 8af6de5..cb98178, review clean). Minor: only New File handler asserted (plan-mandated).
- Task 4 Auto-expand C: + hook helpers: complete (commits cb98178..0b861aa, review clean). Minors: no cancelled check after expand; no missing-C: test; redundant Windows query.
- Task 5 Wire menu + tests: complete (commits 0b861aa..2a21b3e, review clean). Minors: first-blur 0ms ignore for Radix focus-restore; redundant clipboard stubGlobal; create-draft/blank-selection untested.
- Whole-branch review: complete (9f98ecd..2a21b3e). Code review Ready to merge: Yes. ui-kit-reviewer Approved. tauri-reviewer Approved. No Critical/Important. Controller verify: ui-kit tree 16/16, terminal file-tree+menu+clipboard 36/36.

## Feature: Side-panel chrome density (2026-08-17)

Controller session. SDD + writing-plans. Work in place on current branch. Commits allowed (user approved SDD). Implementers stage only task files.

- Spec: `docs/superpowers/specs/2026-08-17-side-panel-chrome-density-design.md`
- Plan: `docs/superpowers/plans/2026-08-17-side-panel-chrome-density.md`
- Briefs: `.superpowers/sdd/side-panel-chrome-density/`
- Model: implementers and task reviewers `cursor-grok-4.6-xhigh-fast` unless blocked; elevate only if needed.
- Task 1: complete (commits a268de8..38da18d, review clean). Minor: commit subject added “for compact design”. ⚠️ TDD/trailers/worktree resolved by controller (RED size-5 missing then GREEN 6/6; no AI trailer; still on main).
- Task 2: complete (commits 38da18d..e931416, review clean). ⚠️ TDD/trailers resolved (RED size-7 vs size-5 then GREEN 16/16; no AI trailer).
- Task 3: complete (commits e931416..a976887, review clean). Minor: `size-3` checks never ran red (test stopped at `h-6`). ⚠️ TDD/trailers resolved (RED h-8 vs h-6 then GREEN 25/25; no AI trailer).
- Whole-branch review: complete (a268de8..a976887). Code review Ready to merge: Yes. ui-kit-reviewer Approved. No Critical/Important. Minors left: commit subject extra words; Task 3 TDD stopped at h-6; icon-xs test does not lock SVG size-3; stretched tabs keep size-8+h-full (CSS order currently wins).
- Controller verify: ui-kit button 6/6, terminal file-tree+side-panel 25/25.

## Feature: Nord official theme roles (2026-08-20)

Controller session. SDD + writing-plans. Work in place on `main` (running `tauri:dev`). Commits allowed (user chose SDD execution of the plan). Implementers stage only task files.

- Spec: `.superpowers/docs/specs/2026-08-20-nord-theme-roles-design.md`
- Plan: `.superpowers/docs/plans/2026-08-20-nord-theme-roles.md`
- Briefs: `.superpowers/sdd/`
- Model: implementers and task reviewers `cursor-grok-4.6-xhigh-fast` unless blocked; elevate only if needed.
- BASE before Task 1: `bd1411ad6c54dcd9680611a9e28f9955aaa9c2c6`
- Task 1: complete (commits bd1411a..5d49cc4, review clean). ⚠️ trailers/TDD/defaultTheme resolved by controller (no AI trailer; RED then GREEN in report; apps untouched).
- Task 2: complete (commits 5d49cc4..6c6f63d, review clean). ⚠️ trailers/TDD resolved (no AI trailer).
- Task 3: complete (commits 6c6f63d..b545a42, review clean). Minor: selected tree assertion does not prove `text-foreground` is gone. ⚠️ trailers resolved (no AI trailer).
- Task 4: complete (commits b545a42..8310462, review clean). ⚠️ trailers resolved (no AI trailer).
- Whole-branch review: complete (bd1411a..8310462). Code review Ready to merge: Yes. ui-kit-reviewer Approved. No Critical/Important. Minors left: tree selected assertion vs `text-foreground`; `--color-caution` / `tokens.colors.ts` not locked by tests; selected chevron stays `text-foreground/80`.
- Controller verify: ui-kit 153/153, terminal 127/127.
- Finish: already on `main` (in-place commits). Local merge is a no-op. No worktree to clean up. Not pushed (`main` ahead of origin by 4). Spec/plan still untracked under `.superpowers/docs/`.

## Feature: FileIcon outline glyphs (2026-08-20)

Controller session. SDD + writing-plans. Work in place on `main` (running `tauri:dev`). Commits allowed (user chose SDD). Implementers stage only task files. Unrelated dirty tree (titlebar gilded outline) must not be staged.

- Spec: `.superpowers/docs/specs/2026-08-20-file-icon-monochrome-design.md`
- Plan: `.superpowers/docs/plans/2026-08-20-file-icon-monochrome.md`
- Briefs: `.superpowers/sdd/file-icon-monochrome/`
- Model: implementers and task reviewers `cursor-grok-4.6-xhigh-fast` unless blocked; elevate only if needed.
- BASE before Task 1: `8310462ee683953e5bf62f86a507d171721d62ef`
- Task 1: complete (commits 8310462..d7730b0, review clean). ⚠️ trailers/visual resolved by controller (`git log -1` body is subject only, no AI trailers; theme colors inherit from unchanged Tree `text-foreground` / `text-accent-foreground`).
- Whole-branch review: complete (8310462..d7730b0). Code review Ready to merge: Yes. ui-kit-reviewer Approved. No Critical/Important. Minors left: `js` is a bare circle; `pdf` is a dog-eared sheet; `video`/`sh` both use a play triangle. Controller verify: file-icon 78/78.
- Finish: already on `main` (in-place commit). Local merge is a no-op. No worktree to clean up. Not pushed (`main` ahead of origin). Spec/plan still untracked under `.superpowers/docs/`.

## Feature: Antigravity `.agents/` (2026-08-20)

Controller session. SDD + writing-plans. Work in place on `main`. Commits allowed (user chose SDD). Implementers stage only task files. Do not stage `.cursor/hooks/state/continual-learning.json`.

- Spec: `.superpowers/docs/specs/2026-08-20-antigravity-agents-design.md` (Task 1 writes)
- Plan: `.superpowers/docs/plans/2026-08-20-antigravity-agents.md` (Task 1 copies from Cursor plan)
- Source plan: `C:/Users/DUSTI/.cursor/plans/antigravity_agents_folder_672ae988.plan.md`
- Briefs: `.superpowers/sdd/`
- Model: implementers and task reviewers `cursor-grok-4.6-xhigh-fast` unless blocked
- BASE before Task 1: `fc4f2d90ef1058945ebf9049881800233521cd65`
- Task 1: complete (commits fc4f2d9..90e194b, review clean)
- Task 2: complete (commits 90e194b..941b575, review clean). Minor: dual import/re-export of parseFrontmatter in sync-agents.mjs.
- Task 3: complete (commits 941b575..7008ad2, review clean). Minors: skills walk assumes directories; orphan delete leaves empty dirs; test tmpdirs not removed.
- Task 4: complete (commits 951a882..a996e92, review clean). Unrelated commits landed on main around this task.
- Task 5: complete (commits 66c1531..3377fb6, review clean). Minors: cwd-relative state path; CLI stdin/fail-open untested; duplicated isMain.
- Task 6: complete (commits c29ad07..739bca4, review clean). Minor: test:scripts glob vs directory form (Windows Node).
- Whole-branch review: With fixes (plugin crate `-p` names, one-shot secret warning, brittle rewriteAgyBody). Fix commit 587f9de; re-review Ready to merge: Yes. Minor: PostToolUse does not assert secretWarnedText survives a write.
- Controller verify after fix: `pnpm test:scripts` 21/21; `pnpm sync:agents --check` clean.
- Task 4: complete (commits 951a882..a996e92, review clean). Unrelated commits 951a882 and df42786 landed on main around this task; do not include them in task diffs.
- Task 5: complete (commits 66c1531..3377fb6, review clean). Minors: cwd-relative state path; CLI stdin/fail-open untested; duplicated isMain.

## Feature: Terminal Config tab (2026-08-20)

Controller session. SDD + writing-plans. Work in place on `main` (running `tauri:dev`). Commits allowed (user chose SDD execution of the plan). Implementers stage only task files.

- Spec: `.superpowers/docs/specs/2026-08-20-terminal-config-tab-design.md`
- Plan: `.superpowers/docs/plans/2026-08-20-terminal-config-tab.md`
- Briefs: `.superpowers/sdd/`
- Model: implementers and task reviewers `cursor-grok-4.6-xhigh-fast` unless blocked; elevate only if needed.
- BASE before Task 1: `951a8820e1c1babd55aade0ed3f09042d487d3db`
- Task 1: complete (net files `951a882..c29ad07`, review clean). Implementation scooped into `df42786` plus shim commit `c29ad07`. Minors: jsdom `_localStorage` restore is test-only; `DEFAULT_CONFIG` is a shared mutable object. Task 2 tests must restore jsdom `localStorage` (Node 26 shadows it).
- Task 2: complete (commit `ec77ca5`, review clean). JSX in `config.hook.ts` became `React.createElement` (Vite). Minors: `useConfig` throw untested; unlisten assignment race vs StrictMode; ConfigProvider describe does not reset IPC mocks.
- Task 3: complete (commit `d4b0d2b`, review clean). Minor: radiogroup keyboard untested.
- Task 4: complete (commit `7cf3c85`, review clean). Minors: duplicated jsdom localStorage restore in two test files; root AGENTS.md still has OS-only theme fact; package lint fails on unrelated `ipc.window.test.ts`.
- Whole-branch review: complete (feature-scoped `951a882..7cf3c85`). Code review Ready to merge: Yes. No Critical/Important. Minors deferred (DEFAULT_CONFIG mutable, jsdom restore copied 4×, useConfig throw untested, keyboard untested, mocked preference cannot prove check moves, side-panel tests do not mock ipc.window, AGENTS.md OS-only fact, ipc.window.test.ts lint).
- Controller verify: config+side-panel+app 5 files / 34 passed.

## Feature: Terminal window xterm + PTY (2026-08-20)

Controller session. SDD + writing-plans. Work in place on `main` (running `tauri:dev`). Commits allowed (user chose SDD execution of the plan). Implementers stage only task files. Do not stage `.cursor/hooks/**`, Config-tab files, or other dirty unrelated paths.

- Spec: `.superpowers/docs/specs/2026-08-20-terminal-window-design.md`
- Plan: `.superpowers/docs/plans/2026-08-20-terminal-window.md`
- Briefs: `.superpowers/sdd/terminal-window/`
- Model: implementers and task reviewers `cursor-grok-4.6-xhigh-fast` unless blocked; elevate only if needed.
- BASE before Task 1: `951a8820e1c1babd55aade0ed3f09042d487d3db`
- Task 1: complete (commits 66c1531, review clean). Minors: Mono test landed in mixed parent `df42786`; biome wrapped Regular `src` line. Do not amend `df42786`.
- Task 2: complete (commits 1e04f52, review clean). Minors: load does not cap an oversized existing file; `save_pinned_tabs` later flattened to `json: String` in `2e5bed3` (mixed commit). Task 4 Isolation must reconstruct `{ json }`.
- Task 3: complete (commits 1df9661, review clean). Minors: session-map mutex held during write/resize I/O; smoke test accepts any PTY output; exit event untested; invalid-cwd path is hardcoded.
- Task 4: complete (commits 137d6ba, review clean). Tauri review Approved. Minors: reconstructListen duplication; crate docs still say PTY stub; Rust write does not re-cap 64 KiB.
- Task 5: complete (commits 8e296dd, review clean). Minors: OSC 7 per-chunk only; rename commit can freeze auto titles; statusbar always `pwsh` (`OpenResult` has no resolved shell).
- Task 6: complete (commits 021ad64, 126c7d4, review clean). Minors: malformed v1 records with zero parsed tabs can persist empty; gate tests cover helper only; duplicated PinnedTabSource in tests.
- Task 7: complete (commits 88264ff, c07355d, review clean). Tauri review Approved. Minors: git conflict template order; missing-ps1 test gap; swap helper vs hook; `\r\n`; temp dir leaks.
- Whole-branch review: Tauri Approved. First pass Ready to merge: With fixes. Important fixed in d084221, 9934ed3 (Opus 5 after Grok dispatch abort). Re-review Approved. Residual: Alt+F4 persist uses pagehide not awaited destroy; waiter/reader comment nit.

- `pnpm approve-builds` may be required before production `vite` / `tauri` build (esbuild)
- Fill CODEOWNERS / GitHub handles when the remote exists
- Optional: smoke `pnpm --filter @gencore/terminal tauri:dev`
- No git commit until the user asks

## Feature: Nord app icons, tray icons, tray menu (2026-08-20)

Controller session. SDD + writing-plans. Work in place on `main`. No git commits unless the user asks. Implementers stage only task files. Do not stage `.cursor/hooks/state/**` or unrelated dirty paths.

- Spec: `.superpowers/docs/specs/2026-08-20-app-icons-design.md`
- Plan: `.superpowers/docs/plans/2026-08-20-app-icons.md`
- Briefs: `.superpowers/sdd/`
- Model: implementers and task reviewers `cursor-grok-4.6-xhigh-fast` unless blocked. Task 2 SVG authoring uses `claude-opus-5-thinking-high`.
- BASE before Task 1: working tree (no task commit)
- Task 1: complete (working tree, review approved). Minors: hex lock is 6-digit only; TILE/path regexes assume single-line double-quoted attributes.
- Task 2: complete (working tree, review approved). Minors: 16px tiled app icon is tight; folder heavier than chevron; explorer path uses 441.9/462.1. Tray `<g scale>` accepted (shared `d` + 16–32px fill).
- Task 3: complete (working tree, review approved). Minor: cleanup contract (no icns leftovers) is untested.
- Task 4: complete (working tree, review approved after transparent overlay CSS fix). Minors deferred: ConfigProvider storage listener, ipc.tray.ts constant drift, Hide/Quit IPC tests.
- Task 5: complete (working tree, review approved after theme Isolation + blur latch). Minor: Terminal Isolation union lets tray-menu listen to PTY events; ACL still blocks PTY commands.
- Task 6: complete (working tree). scripts 28/28; ui-kit tray-menu 4/4; terminal 98/98; explorer 50/50; gencore-core 18/18; clippy clean after collapsible_match fix.
- Whole-branch review: Ready to merge Yes. ui-kit-reviewer Approved. tauri-reviewer: no blocking; Important residual is Terminal Isolation-union PTY listen on tray-menu (XSS in overlay required; ACL still blocks PTY commands). Spec locked unscoped allow-listen for theme-changed — left as documented residual.
- Commit: none (user has not asked).

## Feature: Terminal telemetry statusbar (2026-08-21)

Controller session. SDD. Isolated worktree `.worktrees/feat-terminal-telemetry-statusbar` on `feat/terminal-telemetry-statusbar`. Commits allowed (user chose SDD + worktree). Implementers stage only task files. Do not stage `.husky/_`.

- Spec: `.superpowers/docs/specs/2026-08-21-terminal-telemetry-statusbar-design.md`
- Plan: `.superpowers/docs/plans/2026-08-21-terminal-telemetry-statusbar.md`
- Briefs: `.worktrees/feat-terminal-telemetry-statusbar/.superpowers/sdd/`
- Model: implementers and task reviewers `cursor-grok-4.6-xhigh-fast` unless blocked
- BASE before Task 1: `81b274745c43a804bd31efc19b13672c75e4944c`
- Worktree baseline: `cargo test -p gencore-core` 18/18
- Task 1: complete (commits 81b2747..0ccdb91, review clean). Minors for final review: PDH `Vec<u8>` buffer alignment; no tests for LUID parse / PDH fail-soft / collector-on-GPU-failure; Mutex held across sysinfo+DXGI+PDH; `TelemetryState::new()` also runs in Explorer (no grant leak); DXGI factory recreated every collect(); crate-root PDH test helpers are public; stale crate description. Accepted: `Cargo.lock` staged after `cargo add`; `windows` 0.62.2.
- Task 2: complete (commits 0ccdb91..36cfd4a, review clean). Minors for final review: stale Isolation header comment omits telemetry; AGENTS least-privilege bullet still says `allow-get-app-info` only; AGENTS IPC wrapper list omits `ipc.telemetry.ts`.
- Task 3: complete (commits 36cfd4a..5a9af3c, review clean). Minors for final review: later-failure test does not assert call count/`error`; `isPaused` not seeded from current visibility; `enabled`/`refresh`/first-failure untested.
- Task 4: complete (commits 5a9af3c..4bf4620, review clean). Minor for final review: no TooltipContent render coverage for `size="rich"`.
- Task 5: complete (commits 4bf4620..3295def, review clean). Minors for final review: GPU omit-kind test never omits a kind; meter/`+N`/VRAM-omit untested; `CHIP_CLASS` copied 3×; span triggers hover-only (no tabIndex); `floor(value/25)` leaves 1–24% fully muted.
- Task 6: complete (commits 3295def..3c178a8, review clean). Minors for final review: collapsed panel stays in tab order (no `inert`); no xterm-handler test that Ctrl/Cmd+B is swallowed; held Ctrl+B key-repeat flickers the panel. Turbo lint fail on pre-existing Explorer CRLF is environment, not a task defect.
- Whole-branch review: first pass With fixes (PDH mean-of-engines; VRAM used=0; Intel Arc iGPU as dGPU). Tauri Approved. ui-kit Approved.
- Fixes: `8c69046` PDH max-of-engine-sums + DXGI VRAM used; `68b9f0f` strip (R)/(TM) before Arc classify.
- Re-review: Ready to merge Yes. Residual: process-local DXGI CurrentUsage (accepted); rustdoc; multi-PID sum test; Arc Pro fixture; `parse_engine_type` untested.
- HEAD: `68b9f0faf75361a990da8a338c6948194f7ae105` on `feat/terminal-telemetry-statusbar`

## Feature: Terminal PTY session alive (2026-08-21)

Controller session. SDD + writing-plans. Work in place on `main`. No git commits unless the user asks. Implementers stage only task files. Do not stage `.cursor/hooks/state/**` or the telemetry worktree.

- Spec: `.superpowers/docs/specs/2026-08-21-terminal-pty-session-alive-design.md`
- Plan: `.superpowers/docs/plans/2026-08-21-terminal-pty-session-alive.md`
- Briefs: `.superpowers/sdd/pty-session-alive/`
- Model: implementers and task reviewers `cursor-grok-4.6-xhigh-fast` unless blocked
- BASE before Task 1: `81b274745c43a804bd31efc19b13672c75e4944c`
- Task 1: complete (working tree, review clean). Minors for final review: OMP launch test does not lock full argv (`-ExecutionPolicy Bypass` / prompt path); `resolve_oh_my_posh` rustdoc still says exe “exists”.
- Task 2: complete (working tree, review clean). ⚠️ DSR-not-in-reader and `-NoExit` sourced from Task 1 `shell_launch` — controller confirmed.
- Task 3: complete (working tree, review clean). Minors: unused `dataHandler` until Task 4; catch-path data unlisten leak if exit subscribe throws (brief-mandated try/catch).
- Task 4: complete (working tree, review clean). Minors: drop test does not assert `closePty("session-1")`; last-tab spawn uses `queueMicrotask` so the shared `resolveOpen` mock stays on the cancelled generation.
- Task 5: complete (controller). `cargo test -p gencore-pty` 19+5 passed including `omp_file_spawn_stays_alive_and_echoes`. Provider tests 11/11. Manual `tauri:dev` not run here (check locally if 5173 is free).
- Whole-branch review: complete (working tree vs `81b2747`). Code review Ready to merge: Yes. No Critical/Important. Minors deferred: OMP launch argv not fully locked; rustdoc “exists”; drop test omits `closePty("session-1")`; `queueMicrotask` last-tab spawn; unmatched exit not parked; parked chunks skip OSC 7.
- Controller re-verify after review: `cargo test -p gencore-pty` 19+5 passed; provider tests 11/11. Manual `tauri:dev` still not run.
- Commit: none (user has not asked). Finish: already on `main` (dirty tree). Local merge is a no-op. No worktree to clean up. Not pushed.

## Feature: Terminal blank pane visual proof (2026-08-21)

Controller session. SDD + writing-plans. Work in place on `main`. No git commits unless the user asks. Implementers stage only task files. Do not stage `.cursor/hooks/state/**` or the telemetry worktree.

- Spec: `.superpowers/docs/specs/2026-08-21-terminal-blank-pane-design.md`
- Plan: `.superpowers/docs/plans/2026-08-21-terminal-blank-pane.md`
- Briefs: `.superpowers/sdd/blank-pane/`
- Model: Tasks 1–2 implementer `cursor-grok-4.6-xhigh-fast`; Tasks 3–6 implementer `claude-sonnet-5-thinking-xhigh`; reviews `claude-sonnet-5-thinking-xhigh`. Opus only per spec last-resort rules.
- BASE before Task 1: `53d76f8bf357c33c9010cc5d987fb752542f43b6`
- Task 1: complete (working tree + user commit `82d35fd`, review Approved). Production seams still dirty (`terminal.types.ts` / `.hook.ts` / `.component.tsx`). Provider tests landed in `82d35fd` (user/hook commit also scooped `.cursor/hooks/state` + spec/plan — not an implementer commit). Minors: `__gencoreXterm` on outer host pane; `data-has-output` on any non-empty write; cleanup `delete` not DEV-gated.
- HEAD now: `82d35fd3ef9fff0cd33d92c1a3d1d1ec2a5c2fd1`
- Task 2: complete (working tree, review Approved). Wrapper `scripts/tauri-dev-terminal.mjs` + `tauri:dev` script. Minors: `test:visual` deferred to Task 5; no spawn `error` listener; tests are string containment.
- Task 3: complete (probe.md, review Approved). Layer: **handshake**. Surface is DOM xterm (no canvas, cursor painted). Session live + UUID. Transport `has-output=true`. Buffer empty / echo swallowed. Minors: no raw `ESC[6n` hex dump; CDP via throwaway Node WS not Playwright. Note for Task 5: do not require a `<canvas>`.
- Task 4: complete (working tree, review Approved after controller ratification + lock test). Root cause: Tauri command args defaulted to camelCase; JS sends `session_id`; CPR writes failed. Fix: `rename_all = "snake_case"` on write/resize/close. Also JS orphan re-flush + startup replay. Lock: `crates/gencore-plugin-pty/tests/command_snake_case_lock.rs`. Live CDP: `PS C:\Users\DUSTI>` + echo works.
- Task 5: complete (working tree, review Approved). `test:visual` 1/1 PASS on WebView2 CDP. Shell: powershell.exe (5.1). Minors: unscoped host if multiple tabs; `pages[0]` fallback; `toContain(MARKER)` can match the typed line.
- Task 6: complete (working tree, review Approved after assertion tighten). Fetched `oh-my-posh.exe` (gitignored). Visual 2/2: Powerline `\uE0B6`/`\uE0B4` before echo + marker. Fallback 5.1 prompt when exe missing. Wrapper deletes `CURSOR_AGENT` so agent-started `tauri:dev` still gets OMP.
- Whole-branch review: Ready to merge With fixes. Important (pinned overwrite on listen-fail + last-tab close) fixed: subscribe catch does not set `hydratedRef`. Re-review Approved.
- Controller verify: vitest provider + wrapper 20/20; `cargo test -p gencore-pty` 25; visual 2/2 earlier on live WebView2.
- Finish: user chose merge locally. Already on `main` (dirty tree, ahead of origin by 13). Local merge is a no-op. No worktree to clean up. Not committed. Not pushed.

## Feature: Terminal error output (2026-08-22)

Controller session. User approved the design and ordered implementation (no second writing-plans file). Work in place. No git commits unless the user asks.

- Spec: `.superpowers/docs/specs/2026-08-22-terminal-error-output-design.md` (written + self-reviewed; user already approved)
- Plan: `C:/Users/DUSTI/.cursor/plans/terminal_error_output_191843e0.plan.md` (Cursor-owned; not copied)
- Task 1 ANSI map: complete (working tree). `red` / `brightRed` = `#BF616A`. Unit theme tests lock official Nord ports.
- Task 2 prompt preference: complete (working tree). Last `$ErrorActionPreference` is `Continue`; `SilentlyContinue` only on `Get-Command oh-my-posh`.
- Task 3 visual gate: complete. Playwright 3/3 on WebView2 CDP `127.0.0.1:9223`. Error phrase present for `gencore-pty-nosuch`.
- Controller verify: `pnpm --filter @gencore/terminal test` 35 files / 284 passed; `test:visual` 3/3.
- Commit: none (user has not asked).


