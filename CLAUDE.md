# Claude Code guidance for GenCore

This repo has three parallel agent-config trees:

- `.cursor/` — Cursor's rules/agents/commands/skills/hooks. **Source of truth.**
- `.agents/` — generated for Antigravity (`agy`) by `pnpm sync:agents`. Never hand-edited.
- `.claude/` — hand-authored for Claude Code, mirroring `.cursor/`'s content. Not generated,
  so it can drift from `.cursor/` if one is updated without the other — when you change
  `.cursor/rules/`, `.cursor/agents/`, `.cursor/commands/`, or `.cursor/skills/`, check whether
  the corresponding file here or under `.claude/` needs the same update.

The full repo-wide brief (layout, naming, security baseline, versions, distribution, commands,
git rules, and the "Learned User Preferences" / "Learned Workspace Facts" logs) lives in
`AGENTS.md` below — read it, it applies to Claude Code exactly as it does to Cursor and
Antigravity.

@AGENTS.md

Nested `CLAUDE.md` files under `apps/terminal/`, `apps/explorer/`, `packages/ui-kit/`, and
`crates/` each import that directory's own `AGENTS.md` the same way, so path-specific rules
apply automatically once you're working in that area.

Custom subagents live in `.claude/agents/`, slash commands in `.claude/commands/`, and skills in
`.claude/skills/` — ported from `.cursor/agents/`, `.cursor/commands/`, and `.cursor/skills/`
respectively, adapted to Claude Code's frontmatter conventions.
