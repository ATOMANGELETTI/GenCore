# Antigravity `.agents/` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a committed `.agents/` tree from `.cursor/` so `agy` loads the same GenCore rules, skills, slash commands, reviewers, and hook policies as Cursor, with Superpowers installed as an agy plugin and artifact paths kept under `.superpowers/`.

**Architecture:** `.cursor/` stays the source of truth. `scripts/sync-agents.mjs` converts rules, skills, commands, and agents into `.agents/{rules,skills,workflows,agents}`. Hook adapters are hand-written (agy’s JSON contract is not a mechanical copy of Cursor hooks) and import shared policy from `.cursor/hooks/policy.mjs`. Superpowers is not vendored.

**Tech Stack:** Node.js `>=22.13.0` (`node --test`, no new npm dependency), Antigravity CLI (`.agents/` layout), existing Cursor hooks, pnpm root scripts, GitHub Actions JS workflow.

**Spec:** `.superpowers/docs/specs/2026-08-20-antigravity-agents-design.md` (written in Task 1).

## Global Constraints

- Latest **stable** only. No beta/rc/canary. Do not add a YAML library or other dependency; parse the simple Cursor frontmatter by hand.
- Node `>=22.13.0`. Use `node --test` for script tests. Do not add Vitest at the repo root.
- `.cursor/` is the source of truth. Do not edit generated `.agents/rules|skills|workflows|agents` by hand.
- Skip Cursor-only files: `environment.json`, `Dockerfile`, `worktrees.json`, `setup-worktree-unix.sh`, `setup-worktree-windows.ps1`. Do not generate `.agents/mcp_config.json`.
- Skip `.cursor/rules/superpowers-models.mdc`. Do not emit a model-selection rule for agy.
- Superpowers: document `agy plugin install https://github.com/obra/superpowers`. Do not copy Superpowers skills into the repo.
- Root `AGENTS.md` stays the always-on brief. Do not add `GEMINI.md`.
- No `@gencore/*` package API change — **no changeset**.
- Stage **only** the files listed in the task. Never `git add -A`.
- Conventional commits. No Cursor/AI attribution trailers.
- Work in place on the current branch. Do not create a worktree or switch branches unless asked.
- Superpowers files stay under `.superpowers/docs/`. Do not write `docs/superpowers/`.
- Antigravity rule files must be `<= 12000` characters. Fail the generator if a converted rule exceeds that.
- Agy `Stop` hooks must **not** return `decision: "continue"`. Test reminders go through `PreInvocation` `injectSteps`.

---

## File map

**Docs (Task 1)**

- Create: `.superpowers/docs/specs/2026-08-20-antigravity-agents-design.md`
- Create: `.superpowers/docs/plans/2026-08-20-antigravity-agents.md` (this plan, copied in full)

**Generator (Tasks 2–3)**

- Create: `scripts/lib/frontmatter.mjs`
- Create: `scripts/lib/sync-agents.mjs`
- Create: `scripts/sync-agents.mjs`
- Create: `scripts/tests/sync-agents.test.mjs`

**Generated markdown (Task 3 writes these; do not hand-edit later)**

- Create: `.agents/rules/{architecture,modular-naming,no-ai-commit-attribution,react-ui-kit,release,security,superpowers,tauri-rust,testing,versions}.md`
- Create: `.agents/skills/{add-app,add-crate-module,add-ui-primitive,cut-changeset,tauri-capability}/SKILL.md`
- Create: `.agents/workflows/{check-workspace,new-module,new-changeset}.md`
- Create: `.agents/agents/{tauri-reviewer,ui-kit-reviewer,monorepo-debugger}/agent.md`

**Shared hook policy (Task 4)**

- Create: `.cursor/hooks/policy.mjs`
- Modify: `.cursor/hooks/session-start.mjs`
- Modify: `.cursor/hooks/before-shell-execution.mjs`
- Modify: `.cursor/hooks/after-file-edit.mjs`
- Modify: `.cursor/hooks/before-submit-prompt.mjs`
- Modify: `.cursor/hooks/stop.mjs`
- Create: `scripts/tests/hook-policy.test.mjs`

**Agy hooks (Task 5) — hand-written, not generated**

- Create: `.agents/hooks.json`
- Create: `.agents/hooks/pre-invocation.mjs`
- Create: `.agents/hooks/pre-tool-use.mjs`
- Create: `.agents/hooks/post-tool-use.mjs`
- Create: `.agents/hooks/stop.mjs`
- Create: `scripts/tests/agy-hooks.test.mjs`

**Wiring (Task 6)**

- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `.github/workflows/reusable-js.yml`
- Modify: `AGENTS.md`

Do not modify `.cursor/environment.json`, `.cursor/Dockerfile`, `.cursor/worktrees.json`, or worktree setup scripts. Do not create `.agents/mcp_config.json` or `GEMINI.md`.

---

### Task 1: Spec and tracked plan

**Files:**
- Create: `.superpowers/docs/specs/2026-08-20-antigravity-agents-design.md`
- Create: `.superpowers/docs/plans/2026-08-20-antigravity-agents.md`

**Interfaces:**
- Consumes: approved design in this conversation
- Produces: tracked spec that later tasks implement; tracked copy of this implementation plan

- [ ] **Step 1: Write the spec**

Create `.superpowers/docs/specs/2026-08-20-antigravity-agents-design.md` with exactly this content:

```markdown
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
```

- [ ] **Step 2: Save this implementation plan**

Copy the full body of this plan (from the `# Antigravity `.agents/` Implementation Plan` heading through the last task, including the agentic-workers header) to `.superpowers/docs/plans/2026-08-20-antigravity-agents.md`. Do not include the Cursor plan YAML frontmatter.

- [ ] **Step 3: Commit**

```bash
git add .superpowers/docs/specs/2026-08-20-antigravity-agents-design.md .superpowers/docs/plans/2026-08-20-antigravity-agents.md
git commit -m "docs: add antigravity .agents spec and implementation plan"
```

---

### Task 2: Converter library (TDD)

**Files:**
- Create: `scripts/lib/frontmatter.mjs`
- Create: `scripts/lib/sync-agents.mjs`
- Create: `scripts/tests/sync-agents.test.mjs`

**Interfaces:**
- Consumes: Cursor file text (mdc/md)
- Produces:
  - `parseFrontmatter(text) => { frontmatter: Record<string, unknown>, body: string }`
  - `stringifyFrontmatter(fields: Record<string, unknown>) => string`
  - `GENERATED_HEADER(sourceRel: string) => string`
  - `rewriteAgyBody(body: string) => string`
  - `convertRule({ filename, text, sourceRel }) => { relPath: string, content: string } | null`
  - `convertSkill({ name, text, sourceRel }) => { relPath: string, content: string }`
  - `convertCommand({ filename, text, sourceRel }) => { relPath: string, content: string }`
  - `convertAgent({ filename, text, sourceRel }) => { relPath: string, content: string }`
  - `SKIP_RULE_FILES = new Set(["superpowers-models.mdc"])`
  - `MAX_RULE_CHARS = 12000`
  - `READ_ONLY_TOOLS = ["view_file", "grep_search", "find_by_name", "list_dir"]`
  - `DEBUGGER_TOOLS = [...READ_ONLY_TOOLS, "run_command"]`

- [ ] **Step 1: Write the failing tests**

Create `scripts/tests/sync-agents.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  parseFrontmatter,
  convertRule,
  convertSkill,
  convertCommand,
  convertAgent,
  rewriteAgyBody,
  MAX_RULE_CHARS
} from "../lib/sync-agents.mjs";

test("parseFrontmatter reads scalars, booleans, globs, and lists", () => {
  const text = `---
description: Nord-themed React UI kit conventions
globs: packages/ui-kit/**,apps/**/*.tsx
alwaysApply: false
paths:
  - apps/**
---

# Body
`;
  const { frontmatter, body } = parseFrontmatter(text);
  assert.equal(frontmatter.description, "Nord-themed React UI kit conventions");
  assert.equal(frontmatter.alwaysApply, false);
  assert.equal(frontmatter.globs, "packages/ui-kit/**,apps/**/*.tsx");
  assert.deepEqual(frontmatter.paths, ["apps/**"]);
  assert.equal(body.trim(), "# Body");
});

test("convertRule maps alwaysApply true to always_on and skips superpowers-models", () => {
  const skipped = convertRule({
    filename: "superpowers-models.mdc",
    sourceRel: ".cursor/rules/superpowers-models.mdc",
    text: `---
description: models
alwaysApply: true
---

# Models
`
  });
  assert.equal(skipped, null);

  const converted = convertRule({
    filename: "security.mdc",
    sourceRel: ".cursor/rules/security.mdc",
    text: `---
description: Tauri security baseline
alwaysApply: true
---

# Security
`
  });
  assert.equal(converted.relPath, "rules/security.md");
  assert.match(converted.content, /trigger: always_on/);
  assert.match(converted.content, /Generated from \.cursor\/rules\/security\.mdc/);
  assert.match(converted.content, /# Security/);
  assert.doesNotMatch(converted.content, /alwaysApply/);
});

test("convertRule maps globs to trigger glob even when alwaysApply is false", () => {
  const converted = convertRule({
    filename: "testing.mdc",
    sourceRel: ".cursor/rules/testing.mdc",
    text: `---
description: Test placement
globs: **/tests/**
alwaysApply: false
---

# Testing
`
  });
  assert.match(converted.content, /trigger: glob/);
  assert.match(converted.content, /\*\*\/tests\/\*\*/);
});

test("convertRule maps description-only rules to model_decision", () => {
  const converted = convertRule({
    filename: "release.mdc",
    sourceRel: ".cursor/rules/release.mdc",
    text: `---
description: How to cut a release
---

# Release
`
  });
  assert.match(converted.content, /trigger: model_decision/);
  assert.match(converted.content, /description: "How to cut a release"/);
});

test("convertRule throws when the output exceeds MAX_RULE_CHARS", () => {
  const body = "x".repeat(MAX_RULE_CHARS);
  assert.throws(
    () =>
      convertRule({
        filename: "huge.mdc",
        sourceRel: ".cursor/rules/huge.mdc",
        text: `---\nalwaysApply: true\n---\n\n${body}\n`
      }),
    /12000/
  );
});

test("rewriteAgyBody replaces Cursor-only environment.json and MCP paths", () => {
  const skill = rewriteAgyBody(
    "7. Add the app's dev port to `.cursor/environment.json` `ports` if it needs cloud\n   preview (coordinate with the controller — this file is shared).\n"
  );
  assert.match(skill, /Cursor-only/);
  assert.doesNotMatch(skill, /cloud preview/);

  const rule = rewriteAgyBody(
    "- No shadow MCP servers: do not add `.cursor/mcp.json`, `.mcp.json`, or any ad-hoc\n"
  );
  assert.match(rule, /\.agents\/mcp_config\.json/);
});

test("convertSkill keeps name and description and drops Cursor paths field from output frontmatter", () => {
  const converted = convertSkill({
    name: "add-app",
    sourceRel: ".cursor/skills/add-app/SKILL.md",
    text: `---
name: add-app
description: Scaffolds a new Tauri 2 app.
paths:
  - apps/**
---

# Add app
`
  });
  assert.equal(converted.relPath, "skills/add-app/SKILL.md");
  assert.match(converted.content, /name: "add-app"/);
  assert.doesNotMatch(converted.content, /^paths:/m);
});

test("convertCommand uses filename as workflow name and first paragraph as description", () => {
  const converted = convertCommand({
    filename: "check-workspace.md",
    sourceRel: ".cursor/commands/check-workspace.md",
    text: "Run a full workspace health check and summarize failures.\n\n1. pnpm install\n"
  });
  assert.equal(converted.relPath, "workflows/check-workspace.md");
  assert.match(converted.content, /name: "check-workspace"/);
  assert.match(converted.content, /description: "Run a full workspace health check and summarize failures\."/);
  assert.match(converted.content, /1\. pnpm install/);
});

test("convertAgent maps readonly to read-only tools and debugger to run_command", () => {
  const reviewer = convertAgent({
    filename: "tauri-reviewer.md",
    sourceRel: ".cursor/agents/tauri-reviewer.md",
    text: `---
name: tauri-reviewer
description: Reviews Tauri changes.
model: inherit
readonly: true
---

# Tauri reviewer
`
  });
  assert.equal(reviewer.relPath, "agents/tauri-reviewer/agent.md");
  assert.match(reviewer.content, /subagent: true/);
  assert.match(reviewer.content, /mainAgent: false/);
  assert.match(reviewer.content, /view_file/);
  assert.doesNotMatch(reviewer.content, /run_command/);
  assert.doesNotMatch(reviewer.content, /model:/);

  const debuggerAgent = convertAgent({
    filename: "monorepo-debugger.md",
    sourceRel: ".cursor/agents/monorepo-debugger.md",
    text: `---
name: monorepo-debugger
description: Diagnoses workspace failures.
model: inherit
---

# Monorepo debugger
`
  });
  assert.match(debuggerAgent.content, /run_command/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/tests/sync-agents.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `../lib/sync-agents.mjs`.

- [ ] **Step 3: Write `scripts/lib/frontmatter.mjs`**

```js
/**
 * Minimal YAML-frontmatter parser for Cursor .mdc / SKILL.md files.
 * Supports `key: value`, booleans, and indented `- item` lists. No nested objects.
 */

/**
 * @param {string} text
 * @returns {{ frontmatter: Record<string, unknown>, body: string }}
 */
export function parseFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: {}, body: normalized };
  }
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) {
    return { frontmatter: {}, body: normalized };
  }
  const yaml = normalized.slice(4, end);
  const body = normalized.slice(end + 5);
  return { frontmatter: parseSimpleYaml(yaml), body };
}

/**
 * @param {string} yaml
 * @returns {Record<string, unknown>}
 */
function parseSimpleYaml(yaml) {
  /** @type {Record<string, unknown>} */
  const out = {};
  const lines = yaml.split("\n");
  /** @type {string | null} */
  let listKey = null;
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const listItem = /^[ \t]+-[ \t]+(.+)$/.exec(raw);
    if (listItem && listKey) {
      const list = Array.isArray(out[listKey]) ? out[listKey] : [];
      list.push(unquote(listItem[1].trim()));
      out[listKey] = list;
      continue;
    }
    const kv = /^([A-Za-z0-9_]+):[ \t]*(.*)$/.exec(raw);
    if (!kv) continue;
    const key = kv[1];
    const value = kv[2];
    if (value === "") {
      listKey = key;
      out[key] = [];
      continue;
    }
    listKey = null;
    out[key] = coerceScalar(unquote(value.trim()));
  }
  return out;
}

/**
 * @param {string} value
 * @returns {string}
 */
function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * @param {string} value
 * @returns {string | boolean}
 */
function coerceScalar(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

/**
 * @param {Record<string, unknown>} fields
 * @returns {string}
 */
export function stringifyFrontmatter(fields) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${JSON.stringify(item)}`);
      }
      continue;
    }
    if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
      continue;
    }
    lines.push(`${key}: ${JSON.stringify(value)}`);
  }
  lines.push("---");
  return `${lines.join("\n")}\n`;
}
```

- [ ] **Step 4: Write `scripts/lib/sync-agents.mjs`** (converters only; `planGeneratedFiles` / `syncAgents` come in Task 3)

```js
import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter.mjs";

export const SKIP_RULE_FILES = new Set(["superpowers-models.mdc"]);
export const MAX_RULE_CHARS = 12000;
export const READ_ONLY_TOOLS = ["view_file", "grep_search", "find_by_name", "list_dir"];
export const DEBUGGER_TOOLS = [...READ_ONLY_TOOLS, "run_command"];

/**
 * @param {string} sourceRel
 * @returns {string}
 */
export function GENERATED_HEADER(sourceRel) {
  return `<!-- Generated from ${sourceRel} by \`pnpm sync:agents\`. Do not edit. -->\n`;
}

/**
 * @param {string} body
 * @returns {string}
 */
export function rewriteAgyBody(body) {
  return body
    .replace(
      /7\. Add the app's dev port to `\.cursor\/environment\.json` `ports` if it needs cloud\n   preview \(coordinate with the controller — this file is shared\)\.\n/,
      "7. Do not register the app port in `.cursor/environment.json` — that file is Cursor-only.\n"
    )
    .replace(
      "- No shadow MCP servers: do not add `.cursor/mcp.json`, `.mcp.json`, or any ad-hoc",
      "- No shadow MCP servers: do not add `.cursor/mcp.json`, `.agents/mcp_config.json`, `.mcp.json`, or any ad-hoc"
    );
}

/**
 * @param {string} globs
 * @returns {string[]}
 */
function splitGlobs(globs) {
  return globs
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

/**
 * @param {{ filename: string, text: string, sourceRel: string }} input
 * @returns {{ relPath: string, content: string } | null}
 */
export function convertRule({ filename, text, sourceRel }) {
  if (SKIP_RULE_FILES.has(filename)) return null;
  const { frontmatter, body } = parseFrontmatter(text);
  const globs =
    typeof frontmatter.globs === "string" ? splitGlobs(frontmatter.globs) : [];
  /** @type {Record<string, unknown>} */
  const fields = {};
  if (globs.length > 0) {
    fields.trigger = "glob";
    fields.globs = globs;
  } else if (frontmatter.alwaysApply === true) {
    fields.trigger = "always_on";
  } else {
    fields.trigger = "model_decision";
  }
  if (typeof frontmatter.description === "string") {
    fields.description = frontmatter.description;
  }
  const stem = filename.replace(/\.mdc$/i, "");
  const content = `${stringifyFrontmatter(fields)}\n${GENERATED_HEADER(sourceRel)}\n${rewriteAgyBody(body)}`.replace(
    /^\uFEFF/,
    ""
  );
  if (content.length > MAX_RULE_CHARS) {
    throw new Error(
      `${sourceRel} converts to ${content.length} characters (limit ${MAX_RULE_CHARS})`
    );
  }
  return { relPath: `rules/${stem}.md`, content };
}

/**
 * @param {{ name: string, text: string, sourceRel: string }} input
 * @returns {{ relPath: string, content: string }}
 */
export function convertSkill({ name, text, sourceRel }) {
  const { frontmatter, body } = parseFrontmatter(text);
  const fields = {
    name: typeof frontmatter.name === "string" ? frontmatter.name : name,
    description:
      typeof frontmatter.description === "string" ? frontmatter.description : name
  };
  const content = `${stringifyFrontmatter(fields)}\n${GENERATED_HEADER(sourceRel)}\n${rewriteAgyBody(body)}`;
  return { relPath: `skills/${name}/SKILL.md`, content };
}

/**
 * @param {{ filename: string, text: string, sourceRel: string }} input
 * @returns {{ relPath: string, content: string }}
 */
export function convertCommand({ filename, text, sourceRel }) {
  const { frontmatter, body } = parseFrontmatter(text);
  const name = filename.replace(/\.md$/i, "");
  const source = body.trim() ? body : text;
  const firstLine = source
    .trim()
    .split("\n")
    .find((line) => line.trim()) ?? name;
  const description =
    typeof frontmatter.description === "string"
      ? frontmatter.description
      : firstLine.trim();
  const fields = { name, description };
  const content = `${stringifyFrontmatter(fields)}\n${GENERATED_HEADER(sourceRel)}\n${rewriteAgyBody(source)}`;
  return { relPath: `workflows/${name}.md`, content };
}

/**
 * @param {{ filename: string, text: string, sourceRel: string }} input
 * @returns {{ relPath: string, content: string }}
 */
export function convertAgent({ filename, text, sourceRel }) {
  const { frontmatter, body } = parseFrontmatter(text);
  const name =
    typeof frontmatter.name === "string"
      ? frontmatter.name
      : filename.replace(/\.md$/i, "");
  const readonly = frontmatter.readonly === true;
  const fields = {
    name,
    description:
      typeof frontmatter.description === "string" ? frontmatter.description : name,
    subagent: true,
    mainAgent: false,
    tools: readonly ? READ_ONLY_TOOLS : DEBUGGER_TOOLS
  };
  const content = `${stringifyFrontmatter(fields)}\n${GENERATED_HEADER(sourceRel)}\n${rewriteAgyBody(body)}`;
  return { relPath: `agents/${name}/agent.md`, content };
}
```

- [ ] **Step 4b: Re-export parseFrontmatter from `sync-agents.mjs`** so the test import works:

At the top of `scripts/lib/sync-agents.mjs`, add:

```js
export { parseFrontmatter, stringifyFrontmatter } from "./frontmatter.mjs";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test scripts/tests/sync-agents.test.mjs`

Expected: PASS, all tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/frontmatter.mjs scripts/lib/sync-agents.mjs scripts/tests/sync-agents.test.mjs
git commit -m "feat: convert Cursor rules skills commands and agents for agy"
```

---

### Task 3: `pnpm sync:agents` CLI and generated tree

**Files:**
- Modify: `scripts/lib/sync-agents.mjs` (add `planGeneratedFiles`, `syncAgents`, skip/allow lists)
- Create: `scripts/sync-agents.mjs`
- Modify: `scripts/tests/sync-agents.test.mjs`
- Modify: `package.json` (add `"sync:agents": "node scripts/sync-agents.mjs"` only; CI in Task 6)
- Create: all generated `.agents/rules|skills|workflows|agents` files listed in the file map

**Interfaces:**
- Consumes: `convertRule`, `convertSkill`, `convertCommand`, `convertAgent`
- Produces:
  - `CURSOR_SKIP_TOP = new Set(["environment.json", "Dockerfile", "worktrees.json", "setup-worktree-unix.sh", "setup-worktree-windows.ps1", "hooks.json", "hooks"])`
  - `CURSOR_CONVERT_TOP = new Set(["rules", "skills", "commands", "agents"])`
  - `GENERATED_TOP = ["rules", "skills", "workflows", "agents"]`
  - `planGeneratedFiles(repoRoot: string) => Promise<Map<string, string>>` (keys are posix paths relative to `.agents/`)
  - `syncAgents(repoRoot: string, { check?: boolean }) => Promise<{ status: "wrote" | "clean" | "dirty", changed: string[] }>`
  - CLI: `node scripts/sync-agents.mjs` writes; `--check` exits 1 if dirty

- [ ] **Step 1: Write the failing sync tests**

Append to `scripts/tests/sync-agents.test.mjs`:

```js
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { planGeneratedFiles, syncAgents, CURSOR_SKIP_TOP } from "../lib/sync-agents.mjs";

test("planGeneratedFiles skips Cursor-only top-level files and superpowers-models", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gencore-agents-"));
  await mkdir(path.join(root, ".cursor", "rules"), { recursive: true });
  await mkdir(path.join(root, ".cursor", "skills", "demo"), { recursive: true });
  await mkdir(path.join(root, ".cursor", "commands"), { recursive: true });
  await mkdir(path.join(root, ".cursor", "agents"), { recursive: true });
  await writeFile(path.join(root, ".cursor", "environment.json"), "{}");
  await writeFile(
    path.join(root, ".cursor", "rules", "security.mdc"),
    `---
description: security
alwaysApply: true
---

# Security
`
  );
  await writeFile(
    path.join(root, ".cursor", "rules", "superpowers-models.mdc"),
    `---
alwaysApply: true
---

# Models
`
  );
  await writeFile(
    path.join(root, ".cursor", "skills", "demo", "SKILL.md"),
    `---
name: demo
description: Demo skill
---

# Demo
`
  );
  await writeFile(path.join(root, ".cursor", "commands", "new-module.md"), "Scaffold a module.\n");
  await writeFile(
    path.join(root, ".cursor", "agents", "tauri-reviewer.md"),
    `---
name: tauri-reviewer
description: Review Tauri
readonly: true
---

# Tauri
`
  );
  const planned = await planGeneratedFiles(root);
  assert.equal(planned.has("rules/security.md"), true);
  assert.equal(planned.has("rules/superpowers-models.md"), false);
  assert.equal(planned.has("skills/demo/SKILL.md"), true);
  assert.equal(planned.has("workflows/new-module.md"), true);
  assert.equal(planned.has("agents/tauri-reviewer/agent.md"), true);
  assert.ok(CURSOR_SKIP_TOP.has("environment.json"));
});

test("planGeneratedFiles throws on unknown .cursor top-level entries", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gencore-agents-"));
  await mkdir(path.join(root, ".cursor"), { recursive: true });
  await writeFile(path.join(root, ".cursor", "surprise.txt"), "nope");
  await assert.rejects(() => planGeneratedFiles(root), /surprise\.txt/);
});

test("syncAgents --check is dirty before write and clean after", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gencore-agents-"));
  await mkdir(path.join(root, ".cursor", "rules"), { recursive: true });
  await writeFile(
    path.join(root, ".cursor", "rules", "versions.mdc"),
    `---
description: versions
alwaysApply: true
---

# Versions
`
  );
  const dirty = await syncAgents(root, { check: true });
  assert.equal(dirty.status, "dirty");
  const wrote = await syncAgents(root, { check: false });
  assert.equal(wrote.status, "wrote");
  const onDisk = await readFile(path.join(root, ".agents", "rules", "versions.md"), "utf8");
  assert.match(onDisk, /trigger: always_on/);
  const clean = await syncAgents(root, { check: true });
  assert.equal(clean.status, "clean");
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `node --test scripts/tests/sync-agents.test.mjs`

Expected: FAIL — `planGeneratedFiles` / `syncAgents` are not exported.

- [ ] **Step 3: Implement planning and sync**

Append to `scripts/lib/sync-agents.mjs`:

```js
import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

export const CURSOR_SKIP_TOP = new Set([
  "environment.json",
  "Dockerfile",
  "worktrees.json",
  "setup-worktree-unix.sh",
  "setup-worktree-windows.ps1",
  "hooks.json",
  "hooks"
]);

export const CURSOR_CONVERT_TOP = new Set(["rules", "skills", "commands", "agents"]);
export const GENERATED_TOP = ["rules", "skills", "workflows", "agents"];

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function listNames(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.map((e) => e.name);
  } catch (err) {
    if (err && err.code === "ENOENT") return [];
    throw err;
  }
}

/**
 * @param {string} repoRoot
 * @returns {Promise<Map<string, string>>}
 */
export async function planGeneratedFiles(repoRoot) {
  const cursorRoot = path.join(repoRoot, ".cursor");
  const names = await listNames(cursorRoot);
  for (const name of names) {
    if (CURSOR_SKIP_TOP.has(name) || CURSOR_CONVERT_TOP.has(name)) continue;
    throw new Error(
      `Unknown .cursor/${name}. Add it to CURSOR_SKIP_TOP or CURSOR_CONVERT_TOP in scripts/lib/sync-agents.mjs.`
    );
  }

  /** @type {Map<string, string>} */
  const planned = new Map();

  const rulesDir = path.join(cursorRoot, "rules");
  for (const filename of await listNames(rulesDir)) {
    if (!filename.endsWith(".mdc")) continue;
    const sourceRel = `.cursor/rules/${filename}`;
    const text = await readFile(path.join(rulesDir, filename), "utf8");
    const converted = convertRule({ filename, text, sourceRel });
    if (converted) planned.set(converted.relPath, converted.content);
  }

  const skillsDir = path.join(cursorRoot, "skills");
  for (const name of await listNames(skillsDir)) {
    const skillFile = path.join(skillsDir, name, "SKILL.md");
    const text = await readFile(skillFile, "utf8");
    const converted = convertSkill({
      name,
      text,
      sourceRel: `.cursor/skills/${name}/SKILL.md`
    });
    planned.set(converted.relPath, converted.content);
  }

  const commandsDir = path.join(cursorRoot, "commands");
  for (const filename of await listNames(commandsDir)) {
    if (!filename.endsWith(".md")) continue;
    const text = await readFile(path.join(commandsDir, filename), "utf8");
    const converted = convertCommand({
      filename,
      text,
      sourceRel: `.cursor/commands/${filename}`
    });
    planned.set(converted.relPath, converted.content);
  }

  const agentsDir = path.join(cursorRoot, "agents");
  for (const filename of await listNames(agentsDir)) {
    if (!filename.endsWith(".md")) continue;
    const text = await readFile(path.join(agentsDir, filename), "utf8");
    const converted = convertAgent({
      filename,
      text,
      sourceRel: `.cursor/agents/${filename}`
    });
    planned.set(converted.relPath, converted.content);
  }

  return planned;
}

/**
 * @param {string} dir
 * @param {string} prefix
 * @param {string[]} acc
 * @returns {Promise<string[]>}
 */
async function listGeneratedFiles(dir, prefix, acc = []) {
  const names = await listNames(dir);
  for (const name of names) {
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const entries = await readdir(abs, { withFileTypes: true }).catch(() => null);
    if (entries) {
      await listGeneratedFiles(abs, rel, acc);
    } else {
      acc.push(rel.replace(/\\/g, "/"));
    }
  }
  return acc;
}

/**
 * @param {string} repoRoot
 * @param {{ check?: boolean }} [opts]
 */
export async function syncAgents(repoRoot, opts = {}) {
  const check = opts.check === true;
  const planned = await planGeneratedFiles(repoRoot);
  const agentsRoot = path.join(repoRoot, ".agents");
  /** @type {string[]} */
  const changed = [];

  for (const top of GENERATED_TOP) {
    const existing = await listGeneratedFiles(path.join(agentsRoot, top), top);
    for (const rel of existing) {
      if (!planned.has(rel)) changed.push(rel);
    }
  }

  for (const [rel, content] of planned) {
    const abs = path.join(agentsRoot, ...rel.split("/"));
    let current = null;
    try {
      current = await readFile(abs, "utf8");
    } catch {
      current = null;
    }
    if (current !== content) changed.push(rel);
  }

  const unique = [...new Set(changed)].sort();
  if (check) {
    return { status: unique.length === 0 ? "clean" : "dirty", changed: unique };
  }
  if (unique.length === 0) {
    return { status: "clean", changed: [] };
  }

  for (const top of GENERATED_TOP) {
    const existing = await listGeneratedFiles(path.join(agentsRoot, top), top);
    for (const rel of existing) {
      if (!planned.has(rel)) {
        await rm(path.join(agentsRoot, ...rel.split("/")), { force: true });
      }
    }
  }

  for (const [rel, content] of planned) {
    const abs = path.join(agentsRoot, ...rel.split("/"));
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
  }

  return { status: "wrote", changed: unique };
}
```

Fix `listGeneratedFiles`: `readdir` on a file throws. Use `stat` instead:

```js
import { stat } from "node:fs/promises";

async function listGeneratedFiles(dir, prefix, acc = []) {
  let names;
  try {
    names = await readdir(dir);
  } catch (err) {
    if (err && err.code === "ENOENT") return acc;
    throw err;
  }
  for (const name of names) {
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const info = await stat(abs);
    if (info.isDirectory()) {
      await listGeneratedFiles(abs, rel.replace(/\\/g, "/"), acc);
    } else {
      acc.push(rel.replace(/\\/g, "/"));
    }
  }
  return acc;
}
```

Replace the broken `listGeneratedFiles` in the append with this version.

- [ ] **Step 4: Write `scripts/sync-agents.mjs`**

```js
#!/usr/bin/env node
import { syncAgents } from "./lib/sync-agents.mjs";

const check = process.argv.includes("--check");
const result = await syncAgents(process.cwd(), { check });

if (check && result.status === "dirty") {
  process.stderr.write(
    `.agents/ is out of sync. Run pnpm sync:agents.\nChanged:\n${result.changed.map((c) => `- ${c}`).join("\n")}\n`
  );
  process.exit(1);
}

if (!check && result.status === "wrote") {
  process.stdout.write(`Wrote ${result.changed.length} .agents/ file(s).\n`);
}
```

- [ ] **Step 5: Add the root script**

In `package.json` `scripts`, add:

```json
"sync:agents": "node scripts/sync-agents.mjs"
```

Keep existing scripts. Do not add `test:scripts` yet (Task 6).

- [ ] **Step 6: Run unit tests**

Run: `node --test scripts/tests/sync-agents.test.mjs`

Expected: PASS.

- [ ] **Step 7: Generate the real `.agents/` tree**

Run: `node scripts/sync-agents.mjs`

Expected: stdout `Wrote N .agents/ file(s).` and these paths exist:

- `.agents/rules/architecture.md`
- `.agents/rules/modular-naming.md`
- `.agents/rules/no-ai-commit-attribution.md`
- `.agents/rules/react-ui-kit.md`
- `.agents/rules/release.md`
- `.agents/rules/security.md`
- `.agents/rules/superpowers.md`
- `.agents/rules/tauri-rust.md`
- `.agents/rules/testing.md`
- `.agents/rules/versions.md`
- `.agents/skills/add-app/SKILL.md`
- `.agents/skills/add-crate-module/SKILL.md`
- `.agents/skills/add-ui-primitive/SKILL.md`
- `.agents/skills/cut-changeset/SKILL.md`
- `.agents/skills/tauri-capability/SKILL.md`
- `.agents/workflows/check-workspace.md`
- `.agents/workflows/new-module.md`
- `.agents/workflows/new-changeset.md`
- `.agents/agents/tauri-reviewer/agent.md`
- `.agents/agents/ui-kit-reviewer/agent.md`
- `.agents/agents/monorepo-debugger/agent.md`

Confirm `.agents/rules/superpowers-models.md` does **not** exist.
Confirm `.agents/skills/add-app/SKILL.md` contains `Cursor-only` and not `environment.json` `ports` cloud-preview wording.
Confirm `.agents/rules/security.md` mentions `.agents/mcp_config.json`.
Confirm `.agents/agents/tauri-reviewer/agent.md` has `subagent: true` and no `run_command`.
Confirm `.agents/agents/monorepo-debugger/agent.md` has `run_command`.

Run: `node scripts/sync-agents.mjs --check`

Expected: exit 0, no "out of sync" stderr.

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/sync-agents.mjs scripts/sync-agents.mjs scripts/tests/sync-agents.test.mjs package.json .agents/rules .agents/skills .agents/workflows .agents/agents
git commit -m "feat: add sync-agents CLI and generated .agents tree"
```

Do not add `.agents/hooks` yet.

---

### Task 4: Shared hook policy (TDD)

**Files:**
- Create: `.cursor/hooks/policy.mjs`
- Create: `scripts/tests/hook-policy.test.mjs`
- Modify: `.cursor/hooks/session-start.mjs`
- Modify: `.cursor/hooks/before-shell-execution.mjs`
- Modify: `.cursor/hooks/after-file-edit.mjs`
- Modify: `.cursor/hooks/before-submit-prompt.mjs`
- Modify: `.cursor/hooks/stop.mjs`

**Interfaces:**
- Consumes: none
- Produces from `.cursor/hooks/policy.mjs`:
  - `REPO_MAP: string`
  - `SECRET_WARNING: string`
  - `isForcePushToProtectedBranch(command: string) => boolean`
  - `looksLikeSecret(text: string) => boolean`
  - `formatterHint(filePath: string) => string | null`
  - `workspaceMember(filePath: string) => string | null`
  - `testCommandFor(member: string) => string | null`
  - `testReminderMessage(members: string[]) => string | null`
  - `lastUserTextFromTranscript(jsonl: string) => string`
  - `forcePushDenyReason(configLabel: string) => string`

- [ ] **Step 1: Write failing policy tests**

Create `scripts/tests/hook-policy.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  REPO_MAP,
  isForcePushToProtectedBranch,
  looksLikeSecret,
  formatterHint,
  workspaceMember,
  testCommandFor,
  testReminderMessage,
  lastUserTextFromTranscript,
  forcePushDenyReason
} from "../../.cursor/hooks/policy.mjs";

test("isForcePushToProtectedBranch only denies force-push to main/master", () => {
  assert.equal(isForcePushToProtectedBranch("git push --force origin main"), true);
  assert.equal(isForcePushToProtectedBranch("git push -f origin master"), true);
  assert.equal(isForcePushToProtectedBranch("git push origin main"), false);
  assert.equal(isForcePushToProtectedBranch("git push --force origin feature"), false);
  assert.equal(isForcePushToProtectedBranch("echo hello"), false);
});

test("looksLikeSecret matches known token shapes and ignores ordinary text", () => {
  assert.equal(looksLikeSecret("ghp_abcdefghijklmnopqrstuvwxyz1234567890"), true);
  assert.equal(looksLikeSecret("please implement the titlebar"), false);
});

test("workspaceMember and testCommandFor map apps/packages/crates", () => {
  assert.equal(workspaceMember("packages/ui-kit/src/foo.ts"), "packages/ui-kit");
  assert.equal(testCommandFor("packages/ui-kit"), "pnpm --filter @gencore/ui-kit test");
  assert.equal(testCommandFor("crates/gencore-core"), "cargo test -p gencore-core");
  assert.equal(testCommandFor("apps/terminal"), "pnpm --filter @gencore/terminal test");
  assert.equal(formatterHint("foo.rs"), "cargo fmt");
  assert.equal(formatterHint("foo.ts"), "biome format --write");
});

test("lastUserTextFromTranscript reads the last user-like jsonl row fail-open", () => {
  const jsonl = [
    JSON.stringify({ role: "assistant", content: "sk-thisisnottheprompt00000000" }),
    JSON.stringify({ role: "user", content: "please add a button" })
  ].join("\n");
  assert.equal(lastUserTextFromTranscript(jsonl), "please add a button");
  assert.equal(lastUserTextFromTranscript(""), "");
  assert.equal(lastUserTextFromTranscript("not-json\n"), "");
});

test("testReminderMessage and repo map stay non-empty", () => {
  assert.match(REPO_MAP, /GenCore monorepo/);
  assert.match(
    testReminderMessage(["packages/ui-kit"]),
    /pnpm --filter @gencore\/ui-kit test/
  );
  assert.equal(testReminderMessage([]), null);
  assert.match(forcePushDenyReason(".agents/hooks.json"), /\.agents\/hooks\.json/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/tests/hook-policy.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `policy.mjs`.

- [ ] **Step 3: Write `.cursor/hooks/policy.mjs`**

```js
export const REPO_MAP = [
  "GenCore monorepo (pnpm + Cargo workspaces):",
  "apps: terminal, explorer (Tauri 2 + Vite + React, private).",
  "packages: @gencore/ui-kit, @gencore/config-typescript, @gencore/config-vite.",
  "crates: gencore-core, gencore-pty (crates/gencore-plugin-pty), gencore-fs (crates/gencore-plugin-fs).",
  'security: object-form CSP, Isolation IPC, withGlobalTauri=false, least-privilege capabilities on ["main"] only.'
].join(" ");

export const SECRET_WARNING =
  "Heads up: this prompt looks like it may contain a live secret/API key. Consider redacting it before sending.";

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9]{16,}\b/,
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/
];

/**
 * @param {string} command
 * @returns {boolean}
 */
export function isForcePushToProtectedBranch(command) {
  if (typeof command !== "string" || !command) return false;
  const isGitPush = /\bgit\s+push\b/i.test(command);
  if (!isGitPush) return false;
  const hasForceFlag = /(--force(-with-lease)?\b|(?<![\w-])-f\b)/i.test(command);
  if (!hasForceFlag) return false;
  return /\b(main|master)\b/i.test(command);
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikeSecret(text) {
  if (typeof text !== "string") return false;
  return SECRET_PATTERNS.some((re) => re.test(text));
}

/**
 * @param {string} filePath
 * @returns {string | null}
 */
export function formatterHint(filePath) {
  if (/\.(rs)$/i.test(filePath)) return "cargo fmt";
  if (/\.(mts|cts|ts|tsx|mjs|cjs|js|jsx|json|css)$/i.test(filePath)) {
    return "biome format --write";
  }
  return null;
}

/**
 * @param {string} filePath
 * @returns {string | null}
 */
export function workspaceMember(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const match = normalized.match(/(?:^|\/)(apps|packages|crates)\/([^/]+)\//);
  if (!match) return null;
  return `${match[1]}/${match[2]}`;
}

/**
 * @param {string} member
 * @returns {string | null}
 */
export function testCommandFor(member) {
  const [root, name] = member.split("/");
  if (root === "crates") return `cargo test -p ${name}`;
  if (root === "apps") return `pnpm --filter @gencore/${name} test`;
  if (root === "packages") return `pnpm --filter @gencore/${name} test`;
  return null;
}

/**
 * @param {string[]} members
 * @returns {string | null}
 */
export function testReminderMessage(members) {
  const commands = members.map(testCommandFor).filter(Boolean);
  if (commands.length === 0) return null;
  return `Reminder: run tests for the packages/crates touched this turn: ${commands.join(", ")}`;
}

/**
 * @param {string} configLabel
 * @returns {string}
 */
export function forcePushDenyReason(configLabel) {
  return `Blocked: force-pushing to main/master is denied by ${configLabel}. Use a feature branch and open a PR instead, or ask the user to run this manually.`;
}

/**
 * @param {unknown} row
 * @returns {string}
 */
function extractUserText(row) {
  if (!row || typeof row !== "object") return "";
  const role = row.role ?? row.author ?? row.type ?? row.kind;
  const looksUser =
    role === "user" || role === "USER" || role === "human" || row.userMessage != null;
  const candidates = [
    row.userMessage,
    row.user_message,
    typeof row.content === "string" ? row.content : null,
    row.text,
    row.message,
    row.prompt
  ];
  if (Array.isArray(row.content)) {
    candidates.push(
      row.content
        .map((part) => (typeof part === "string" ? part : part?.text ?? part?.content ?? ""))
        .join("\n")
    );
  }
  const text = candidates.find((c) => typeof c === "string" && c.trim());
  if (!text) return "";
  if (looksUser || row.userMessage != null) return text;
  return "";
}

/**
 * @param {string} jsonl
 * @returns {string}
 */
export function lastUserTextFromTranscript(jsonl) {
  if (typeof jsonl !== "string" || !jsonl.trim()) return "";
  const lines = jsonl.split(/\r?\n/).filter((line) => line.trim());
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const text = extractUserText(JSON.parse(lines[i]));
      if (text) return text;
    } catch {
      // skip malformed rows
    }
  }
  return "";
}
```

- [ ] **Step 4: Run policy tests**

Run: `node --test scripts/tests/hook-policy.test.mjs`

Expected: PASS.

- [ ] **Step 5: Refactor Cursor hooks to import policy**

Replace `.cursor/hooks/session-start.mjs` with:

```js
import { readStdinJson, writeJson } from "./_util.mjs";
import { REPO_MAP } from "./policy.mjs";

async function main() {
  await readStdinJson();
  writeJson({ additional_context: REPO_MAP });
}

main().catch(() => {
  writeJson({});
});
```

Replace `.cursor/hooks/before-shell-execution.mjs` with:

```js
import { readStdinJson, writeJson } from "./_util.mjs";
import { forcePushDenyReason, isForcePushToProtectedBranch } from "./policy.mjs";

async function main() {
  const input = await readStdinJson();
  const command = input.command ?? "";

  if (isForcePushToProtectedBranch(command)) {
    writeJson({
      permission: "deny",
      user_message: "Force-push to main/master is blocked by a project hook.",
      agent_message: forcePushDenyReason(".cursor/hooks.json")
    });
    return;
  }

  writeJson({ permission: "allow" });
}

main().catch(() => {
  writeJson({ permission: "allow" });
});
```

In `.cursor/hooks/after-file-edit.mjs`, delete local `formatterHint` and `workspaceMember`. Add:

```js
import { formatterHint, workspaceMember } from "./policy.mjs";
```

Keep `STATE_DIR = ".cursor/hooks/state"` and the rest of the file unchanged.

In `.cursor/hooks/before-submit-prompt.mjs`, delete `SECRET_PATTERNS` and local `looksLikeSecret`. Add:

```js
import { looksLikeSecret, SECRET_WARNING } from "./policy.mjs";
```

Change the warning `user_message` to `SECRET_WARNING`.

In `.cursor/hooks/stop.mjs`, delete local `testCommandFor`. Add:

```js
import { testReminderMessage } from "./policy.mjs";
```

Replace the `commands` / `followup_message` block with:

```js
  const reminder = testReminderMessage(members);
  delete state[conversationId];
  await writeState(state);

  if (!reminder) {
    writeJson({});
    return;
  }

  writeJson({ followup_message: reminder });
```

- [ ] **Step 6: Re-run policy tests**

Run: `node --test scripts/tests/hook-policy.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add .cursor/hooks/policy.mjs .cursor/hooks/session-start.mjs .cursor/hooks/before-shell-execution.mjs .cursor/hooks/after-file-edit.mjs .cursor/hooks/before-submit-prompt.mjs .cursor/hooks/stop.mjs scripts/tests/hook-policy.test.mjs
git commit -m "refactor: extract shared agent hook policy"
```

---

### Task 5: Antigravity hook adapters (TDD)

**Files:**
- Create: `.agents/hooks.json`
- Create: `.agents/hooks/pre-invocation.mjs`
- Create: `.agents/hooks/pre-tool-use.mjs`
- Create: `.agents/hooks/post-tool-use.mjs`
- Create: `.agents/hooks/stop.mjs`
- Create: `scripts/tests/agy-hooks.test.mjs`

**Interfaces:**
- Consumes: `.cursor/hooks/policy.mjs`, `.cursor/hooks/_util.mjs`
- Produces:
  - `handlePreInvocation(input, deps) => Promise<object>`
  - `handlePreToolUse(input) => object`
  - `handlePostToolUse(input, deps) => Promise<object>`
  - `handleStop() => { decision: "stop" }`
  - Edit state shape: `{ [conversationId: string]: { members: string[], testReminderSent: boolean } }`
  - State path: `.agents/hooks/state/edited-files.json`

`deps` for tests:

```js
{
  readTranscript: async (transcriptPath) => string,
  readState: async () => object,
  writeState: async (state) => void
}
```

- [ ] **Step 1: Write failing adapter tests**

Create `scripts/tests/agy-hooks.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { handlePreInvocation } from "../../.agents/hooks/pre-invocation.mjs";
import { handlePreToolUse } from "../../.agents/hooks/pre-tool-use.mjs";
import { handlePostToolUse } from "../../.agents/hooks/post-tool-use.mjs";
import { handleStop } from "../../.agents/hooks/stop.mjs";
import { REPO_MAP, SECRET_WARNING } from "../../.cursor/hooks/policy.mjs";

test("handlePreToolUse denies force-push to main and allows other commands", () => {
  const deny = handlePreToolUse({
    toolCall: { name: "run_command", args: { CommandLine: "git push --force origin main" } }
  });
  assert.equal(deny.decision, "deny");
  assert.match(deny.reason, /main\/master/);

  const allow = handlePreToolUse({
    toolCall: { name: "run_command", args: { CommandLine: "pnpm test" } }
  });
  assert.equal(allow.decision, "allow");
});

test("handleStop never continues the loop", () => {
  assert.deepEqual(handleStop(), { decision: "stop" });
});

test("handlePreInvocation injects repo map once, secret warning, and one test reminder", async () => {
  /** @type {Record<string, unknown>} */
  let state = {
    conv: { members: ["packages/ui-kit"], testReminderSent: false }
  };
  const deps = {
    readTranscript: async () =>
      `${JSON.stringify({ role: "user", content: "ghp_abcdefghijklmnopqrstuvwxyz1234567890" })}\n`,
    readState: async () => state,
    writeState: async (next) => {
      state = next;
    }
  };

  const first = await handlePreInvocation(
    { invocationNum: 0, conversationId: "conv", transcriptPath: "t.jsonl" },
    deps
  );
  assert.equal(first.injectSteps[0].ephemeralMessage, REPO_MAP);
  assert.equal(first.injectSteps[1].ephemeralMessage, SECRET_WARNING);
  assert.match(first.injectSteps[2].ephemeralMessage, /@gencore\/ui-kit/);
  assert.equal(state.conv.testReminderSent, true);

  const second = await handlePreInvocation(
    { invocationNum: 1, conversationId: "conv", transcriptPath: "t.jsonl" },
    {
      ...deps,
      readTranscript: async () => ""
    }
  );
  assert.deepEqual(second, {});
});

test("handlePostToolUse records workspace members from TargetFile", async () => {
  /** @type {Record<string, unknown>} */
  let state = {};
  const out = await handlePostToolUse(
    {
      conversationId: "c1",
      toolCall: {
        name: "write_to_file",
        args: { TargetFile: "packages/ui-kit/src/foo.ts" }
      }
    },
    {
      readState: async () => state,
      writeState: async (next) => {
        state = next;
      }
    }
  );
  assert.deepEqual(out, {});
  assert.deepEqual(state.c1.members, ["packages/ui-kit"]);
  assert.equal(state.c1.testReminderSent, false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/tests/agy-hooks.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Write the four adapter modules**

`.agents/hooks/pre-tool-use.mjs`:

```js
import { readStdinJson, writeJson } from "../../.cursor/hooks/_util.mjs";
import { forcePushDenyReason, isForcePushToProtectedBranch } from "../../.cursor/hooks/policy.mjs";

/**
 * @param {Record<string, unknown>} input
 */
export function handlePreToolUse(input) {
  const command = input?.toolCall?.args?.CommandLine ?? "";
  if (isForcePushToProtectedBranch(command)) {
    return {
      decision: "deny",
      reason: forcePushDenyReason(".agents/hooks.json")
    };
  }
  return { decision: "allow" };
}

async function main() {
  const input = await readStdinJson();
  writeJson(handlePreToolUse(input));
}

if (import.meta.filename === process.argv[1] || process.argv[1]?.endsWith("pre-tool-use.mjs")) {
  main().catch(() => {
    writeJson({ decision: "allow" });
  });
}
```

`.agents/hooks/stop.mjs`:

```js
import { readStdinJson, writeJson } from "../../.cursor/hooks/_util.mjs";

export function handleStop() {
  return { decision: "stop" };
}

async function main() {
  await readStdinJson();
  writeJson(handleStop());
}

if (import.meta.filename === process.argv[1] || process.argv[1]?.endsWith("stop.mjs")) {
  main().catch(() => {
    writeJson({ decision: "stop" });
  });
}
```

Windows `import.meta.filename` is Node 20.10+ / 22 — this repo requires `>=22.13.0`, so use `import.meta.filename` only:

```js
import { fileURLToPath } from "node:url";

function isMain() {
  return fileURLToPath(import.meta.url) === process.argv[1];
}
```

On Windows `process.argv[1]` may be a different path spelling. Use:

```js
import path from "node:path";
import { fileURLToPath } from "node:url";

function isMain() {
  try {
    return path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
}
```

Put `isMain` in each adapter (repeat it; do not add a new shared file unless tests force it). Only call `main()` when `isMain()` is true so tests can import handlers without running stdin.

`.agents/hooks/post-tool-use.mjs`:

```js
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readStdinJson, writeJson } from "../../.cursor/hooks/_util.mjs";
import { workspaceMember } from "../../.cursor/hooks/policy.mjs";

const STATE_PATH = path.join(".agents", "hooks", "state", "edited-files.json");

function isMain() {
  try {
    return path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
}

async function defaultReadState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function defaultWriteState(state) {
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ readState?: Function, writeState?: Function }} [deps]
 */
export async function handlePostToolUse(input, deps = {}) {
  const readState = deps.readState ?? defaultReadState;
  const writeState = deps.writeState ?? defaultWriteState;
  const filePath = input?.toolCall?.args?.TargetFile ?? "";
  const conversationId = input?.conversationId ?? "unknown";
  const member = workspaceMember(filePath);
  if (!member) return {};
  const state = await readState();
  const current = state[conversationId] ?? { members: [], testReminderSent: false };
  const members = new Set(current.members ?? []);
  members.add(member);
  state[conversationId] = {
    members: Array.from(members),
    testReminderSent: false
  };
  await writeState(state);
  return {};
}

async function main() {
  const input = await readStdinJson();
  writeJson(await handlePostToolUse(input));
}

if (isMain()) {
  main().catch(() => {
    writeJson({});
  });
}
```

`.agents/hooks/pre-invocation.mjs`:

```js
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readStdinJson, writeJson } from "../../.cursor/hooks/_util.mjs";
import {
  REPO_MAP,
  SECRET_WARNING,
  lastUserTextFromTranscript,
  looksLikeSecret,
  testReminderMessage
} from "../../.cursor/hooks/policy.mjs";

const STATE_PATH = path.join(".agents", "hooks", "state", "edited-files.json");

function isMain() {
  try {
    return path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
}

async function defaultReadTranscript(transcriptPath) {
  if (typeof transcriptPath !== "string" || !transcriptPath) return "";
  try {
    return await readFile(transcriptPath, "utf8");
  } catch {
    return "";
  }
}

async function defaultReadState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function defaultWriteState(state) {
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ readTranscript?: Function, readState?: Function, writeState?: Function }} [deps]
 */
export async function handlePreInvocation(input, deps = {}) {
  const readTranscript = deps.readTranscript ?? defaultReadTranscript;
  const readState = deps.readState ?? defaultReadState;
  const writeState = deps.writeState ?? defaultWriteState;
  /** @type {{ ephemeralMessage: string }[]} */
  const injectSteps = [];

  if (input?.invocationNum === 0) {
    injectSteps.push({ ephemeralMessage: REPO_MAP });
  }

  const transcript = await readTranscript(input?.transcriptPath);
  const lastUser = lastUserTextFromTranscript(transcript);
  if (looksLikeSecret(lastUser)) {
    injectSteps.push({ ephemeralMessage: SECRET_WARNING });
  }

  const conversationId = input?.conversationId ?? "unknown";
  const state = await readState();
  const current = state[conversationId];
  if (current?.members?.length && current.testReminderSent !== true) {
    const reminder = testReminderMessage(current.members);
    if (reminder) {
      injectSteps.push({ ephemeralMessage: reminder });
      state[conversationId] = { ...current, testReminderSent: true };
      await writeState(state);
    }
  }

  return injectSteps.length > 0 ? { injectSteps } : {};
}

async function main() {
  const input = await readStdinJson();
  writeJson(await handlePreInvocation(input));
}

if (isMain()) {
  main().catch(() => {
    writeJson({});
  });
}
```

Add the same `isMain` helper to `pre-tool-use.mjs` and `stop.mjs` (do not use the `endsWith` fallback).

- [ ] **Step 4: Write `.agents/hooks.json`**

```json
{
  "gencore-repo-map-and-reminders": {
    "PreInvocation": [
      {
        "type": "command",
        "command": "node .agents/hooks/pre-invocation.mjs",
        "timeout": 30
      }
    ]
  },
  "gencore-force-push-guard": {
    "PreToolUse": [
      {
        "matcher": "run_command",
        "hooks": [
          {
            "type": "command",
            "command": "node .agents/hooks/pre-tool-use.mjs"
          }
        ]
      }
    ]
  },
  "gencore-edit-tracker": {
    "PostToolUse": [
      {
        "matcher": "write_to_file|replace_file_content|multi_replace_file_content",
        "hooks": [
          {
            "type": "command",
            "command": "node .agents/hooks/post-tool-use.mjs"
          }
        ]
      }
    ]
  },
  "gencore-stop": {
    "Stop": [
      {
        "type": "command",
        "command": "node .agents/hooks/stop.mjs"
      }
    ]
  }
}
```

- [ ] **Step 5: Run adapter tests**

Run: `node --test scripts/tests/agy-hooks.test.mjs`

Expected: PASS.

If `isMain()` is true during `node --test` (argv points at the test file, not the adapter), handlers must still export. Do not run `main()` from the test file.

- [ ] **Step 6: Commit**

```bash
git add .agents/hooks.json .agents/hooks/pre-invocation.mjs .agents/hooks/pre-tool-use.mjs .agents/hooks/post-tool-use.mjs .agents/hooks/stop.mjs scripts/tests/agy-hooks.test.mjs
git commit -m "feat: add Antigravity CLI hook adapters"
```

---

### Task 6: Gitignore, AGENTS.md, and CI

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `.github/workflows/reusable-js.yml`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `syncAgents(..., { check: true })`, `node --test scripts/tests`
- Produces: CI fails when `.agents/` markdown drifts; hook state is not committed

- [ ] **Step 1: Gitignore hook state**

Append to `.gitignore`:

```
# Antigravity / Cursor hook runtime state
.agents/hooks/state/
```

Do not gitignore `.agents/` itself.

- [ ] **Step 2: Root scripts**

In `package.json` `scripts`, keep `sync:agents` and add:

```json
"test:scripts": "node --test scripts/tests"
```

- [ ] **Step 3: CI**

In `.github/workflows/reusable-js.yml`, after the existing Test step, add:

```yaml
      - name: Script tests
        if: inputs.test
        run: pnpm test:scripts

      - name: Agents sync check
        run: pnpm sync:agents --check
```

`pnpm sync:agents --check` extra args are forwarded to `node scripts/sync-agents.mjs --check`.

- [ ] **Step 4: AGENTS.md**

Replace the sentence:

`Project Cursor rules in `.cursor/rules/` apply as well (`security.mdc` is always on).`

with:

`Project Cursor rules in `.cursor/rules/` apply in Cursor (`security.mdc` is always on). Antigravity CLI (`agy`) reads the generated `.agents/` tree (rules, skills, workflows, agents, hooks) plus this file. After editing `.cursor/`, run `pnpm sync:agents` and commit both trees. Do not hand-edit generated `.agents/rules`, `.agents/skills`, `.agents/workflows`, or `.agents/agents` files.`

After the Git section, add:

```markdown
## Antigravity CLI (`agy`)

Install Superpowers once per machine (re-run to update):

```sh
agy plugin install https://github.com/obra/superpowers
```

The plugin is not vendored. GenCore’s always-on Superpowers rule (artifact paths under `.superpowers/`) is generated into `.agents/rules/superpowers.md`. Do not add `.agents/mcp_config.json`. Team MCP stays dashboard-only.
```

In the Security bullet that mentions `.cursor/mcp.json`, change it to also name `.agents/mcp_config.json`:

`No secrets in the repo. No in-repo MCP configs (`.cursor/mcp.json`, `.agents/mcp_config.json`, `.mcp.json`, ad-hoc `npx` MCP servers). Team MCP is dashboard-only.`

- [ ] **Step 5: Run verification**

Run:

```sh
node --test scripts/tests
pnpm sync:agents --check
```

Expected: all tests PASS; `--check` exits 0.

If `--check` is dirty because Task 3 files were not regenerated after later edits, run `pnpm sync:agents` and include any regenerated markdown in this commit.

Run: `pnpm exec biome check scripts .agents/hooks.json .agents/hooks`

Expected: no errors. If Biome wants formatting, apply `pnpm exec biome check --write scripts .agents/hooks.json .agents/hooks` and keep tests passing.

- [ ] **Step 6: Commit**

```bash
git add .gitignore package.json .github/workflows/reusable-js.yml AGENTS.md
git commit -m "chore: wire agy sync check into CI and document Superpowers install"
```

If `pnpm sync:agents` rewrote markdown in Step 5, add those generated files to the same commit.

---

## Self-review (spec coverage)

- Generate from `.cursor/`: Tasks 2–3
- Skip environment/Dockerfile/worktrees/MCP/models rule: Tasks 2–3 skip lists + spec
- Superpowers plugin + path rule: Tasks 1, 3 (`superpowers.mdc` → `.agents/rules/superpowers.md`), Task 6 AGENTS.md
- No model-selection rule: `SKIP_RULE_FILES`
- Hook event map, fail-open, Stop never continues: Tasks 4–5
- Shared policy: Task 4
- `--check` + CI: Tasks 3 and 6
- Gitignore `.agents/hooks/state/`: Task 6
- No GEMINI.md, no changeset: Global Constraints
- `AGENTS.md` updates: Task 6
- 12000-character rule cap: Task 2
- Readonly vs debugger tools: Task 2
- add-app environment.json rewrite: Task 2 `rewriteAgyBody`

## Out of scope (do not implement)

- Cursor Cloud environment and worktree scripts
- Vendoring Superpowers
- Gemini model defaults
- In-repo MCP
