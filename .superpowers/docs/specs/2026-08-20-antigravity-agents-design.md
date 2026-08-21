# Antigravity `.agents/` from `.cursor/`

Date: 2026-08-20
Status: approved

## Problem

GenCore’s agent behavior lives under `.cursor/` (rules, skills, commands, subagents, hooks) plus root `AGENTS.md`. Antigravity CLI (`agy`) does not read `.cursor/`. It reads `.agents/` (rules, skills, workflows, agents, `hooks.json`) and `AGENTS.md`. Without a generated `.agents/` tree, `agy` misses project rules, GenCore skills, slash commands, reviewers, hook policy, and the Superpowers path override under `.superpowers/`.

## Goals

- Keep `.cursor/` as the source of truth.
- Generate committed `.agents/` files so `agy` follows the same project constraints as Cursor.
- Install Superpowers with `agy plugin install https://github.com/obra/superpowers` (not vendored). Generate only the always-on `.superpowers/` path rule.
- Share hook *policy* (force-push deny, secret warning, repo map, edited-member test reminders) between Cursor and agy.

## Non-goals

- Cursor Cloud environment (`environment.json`, `Dockerfile`) and worktree helpers.
- In-repo MCP (`.agents/mcp_config.json`, `.cursor/mcp.json`, `.mcp.json`).
- Superpowers model-selection rule (Cursor slugs). agy uses the session model.
- Adding `GEMINI.md`.
- Vendoring Superpowers skills.
- Making agy tool names identical to Cursor (`Skill` tool does not exist on agy).

## Approach

A repo script (`pnpm sync:agents`) converts:

- `.cursor/rules/*.mdc` → `.agents/rules/*.md` (skip `superpowers-models.mdc`)
- `.cursor/skills/*/SKILL.md` → `.agents/skills/*/SKILL.md`
- `.cursor/commands/*.md` → `.agents/workflows/*.md`
- `.cursor/agents/*.md` → `.agents/agents/<name>/agent.md`

Hook adapters under `.agents/hooks/` are hand-written because Antigravity’s stdin/stdout contract differs from Cursor. They import `.cursor/hooks/policy.mjs`. `hooks.json` is hand-written.

`--check` fails CI if generated files would change.

## Units

### Generator

- **Does:** Convert Cursor markdown/mdc into Antigravity files. `--check` compares without writing.
- **Use:** After editing `.cursor/`, run `pnpm sync:agents` and commit both trees.
- **Depends on:** Node stdlib only.

Rule triggers: `alwaysApply: true` and no globs → `always_on`. Globs present → `trigger: glob` plus `globs` list. Description only → `model_decision`. Fail if a rule file exceeds 12000 characters.

Readonly Cursor agents (`readonly: true`) get tools `view_file`, `grep_search`, `find_by_name`, `list_dir`. `monorepo-debugger` also gets `run_command`. Drop `model: inherit`. Set `subagent: true`, `mainAgent: false`.

### Hook policy

- **Does:** Force-push deny, secret regexes, repo map, formatter hint, workspace member, test command mapping, transcript last-user-text extraction.
- **Use:** Cursor hooks and agy adapters.
- **Depends on:** none.

### Agy adapters

- **Does:** Map Cursor hook *intent* onto Antigravity events.
- **Use:** `.agents/hooks.json`.
- **Depends on:** hook policy.

Event map:

- sessionStart → `PreInvocation` (`invocationNum === 0`): `injectSteps: [{ ephemeralMessage: <repo map> }]`
- beforeSubmitPrompt → `PreInvocation`: secret scan of last user text from `transcriptPath`; warn via `ephemeralMessage`; never block; skip if transcript missing
- beforeShellExecution → `PreToolUse` matcher `run_command`: `decision: "deny"` or `"allow"` using `toolCall.args.CommandLine`
- afterFileEdit → `PostToolUse` matcher `write_to_file|replace_file_content|multi_replace_file_content`: record members from `TargetFile`; stdout `{}`
- stop → `Stop`: `{ "decision": "stop" }` only (never `continue`)
- Test reminders: `PreInvocation` `ephemeralMessage` when edited members exist and reminder not yet sent for that conversation

State file: `.agents/hooks/state/edited-files.json` (gitignored).

## Data flow

`.cursor/` → `scripts/sync-agents.mjs` → committed `.agents/{rules,skills,workflows,agents}`. Agy also loads root `AGENTS.md`, workspace hooks, and the user-level Superpowers plugin.

## Error handling

- Generator: unknown top-level `.cursor/` entries not in the allow/skip lists → throw with the path. Rule over 12000 chars → throw. `--check` mismatch → exit 1.
- Hooks: fail-open (allow / empty JSON) on parse errors. Never brick the agent loop.

## Testing

- `node --test scripts/tests` for converters, policy, and adapter handlers.
- `node scripts/sync-agents.mjs --check` in CI.

## Decisions

- Generate markdown from `.cursor/`; hand-write agy hook adapters.
- Superpowers via `agy plugin install`; generate path rule only.
- Skip model-selection rule.
- No MCP file, no GEMINI.md, no changeset.
