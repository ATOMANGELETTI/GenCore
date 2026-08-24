# Source Control & Git Panel

Spec: `.superpowers/docs/specs/2026-08-23-source-control-git-panel-design.md`
Plan: `.superpowers/docs/plans/2026-08-23-source-control-git-panel.md`

- [x] Task 1: Scaffolding `crates/gencore-plugin-git` & Rust Gitoxide Backend (Grok) — scaffold gencore-plugin-git crate with gix, rfd, status, stage, commit, graph, branch, and stash modules
- [x] Task 2: Frontend Typed IPC Wrappers, Isolation Hook & Capabilities (Grok) — typed ipc.git.ts, isolation hook key validation, and main capability permissions
- [x] Task 3: Portable Micro Editor Binary Fetch & Diff Terminal Tab Integration (Grok) — fetch-micro.ps1 script, editor tab kind in terminal model, and micro launcher
- [x] Task 4: Files Tab Top Toolbar (`FilesToolbar`) & Subview Storage (Grok) — FilesToolbar with Explorer/Source Control tabs, overflow dropdown, and active subview storage
- [x] Task 5: Source Control Empty & Uninitialized State Views (Grok) — NoFolderView with folder picker dialog and InitRepoView with git init action
- [x] Task 6: Active Source Control Panel (Staging, Working Changes, Commit Box) (Sonnet 5) — branch header chip, commit box, collapsible Staged/Working/Untracked accordions, and micro diff tab triggers
- [x] Task 7: Interactive Git Graph & Branch History Component (Sonnet 5) — SVG/canvas commit graph with Nord branch tracks, author, timestamp, commit hashes, and ref badges
- [x] Task 8: AI Assistant Git Tools, Commit Message Generator & Snapshot Context (Sonnet 5) — commit message generator from staged diffs, propose-and-confirm Git tools, and conversation snapshot Git context
- [x] Task 9: Wire Files Tab Integration, Full Monorepo Build & Verification (Grok) — wire FilesToolbar into file-tree.component, run workspace typecheck/lint/tests/clippy, and verify in WebView2
