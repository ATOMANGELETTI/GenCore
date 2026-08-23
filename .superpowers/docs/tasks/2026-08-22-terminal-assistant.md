# Terminal Assistant

Spec: `.superpowers/docs/specs/2026-08-22-terminal-assistant-design.md`
Plan: `.superpowers/docs/plans/2026-08-22-terminal-assistant.md`

- [x] Task 1: Plugin crate and data directory (Grok) — scaffold gencore-assistant and the portable data dir
- [x] Task 2: SQLite schema, conversations, and app facts (Grok) — persist threads and snapshots
- [x] Task 3: Settings and DPAPI secrets (Grok) — store the Gemini key with Windows DPAPI
- [x] Task 4: Gemini model allowlist and SSE parse (Sonnet 5) — allowlisted models and stream parse
- [x] Task 5: Confirm gate and tools (Sonnet 5) — approve or reject tool calls before PTY write
- [x] Task 6: Agent turn loop (Sonnet 5) — Gemini turn, persist, pending tools, resume after confirm
- [x] Task 7: IPC, Isolation, capabilities, JS wrappers (Sonnet 5) — wire assistant commands through Isolation
- [x] Task 8: Assistant ledger UI (Grok) — chat ledger in the Assistant side-panel tab
- [x] Task 9: Config Assistant and Context sections (Sonnet 5) — model, context lines, and API key rows
- [x] Task 10: Snapshots, Files selection, UI actions (Sonnet 5) — scrollback/files snapshot and UI-action events
- [x] Task 11: Docs and agent sync (Sonnet 5) — AGENTS.md, architecture, and pnpm sync:agents
