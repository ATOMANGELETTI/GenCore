import assert from "node:assert/strict";
import test from "node:test";
import {
  convertAgent,
  convertCommand,
  convertRule,
  convertSkill,
  MAX_RULE_CHARS,
  parseFrontmatter,
  rewriteAgyBody,
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
`,
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
`,
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
`,
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
`,
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
        text: `---\nalwaysApply: true\n---\n\n${body}\n`,
      }),
    /12000/,
  );
});

test("rewriteAgyBody replaces Cursor-only environment.json and MCP paths", () => {
  const skill = rewriteAgyBody(
    "7. Add the app's dev port to `.cursor/environment.json` `ports` if it needs cloud\n   preview (coordinate with the controller — this file is shared).\n",
  );
  assert.match(skill, /Cursor-only/);
  assert.doesNotMatch(skill, /cloud preview/);

  const rule = rewriteAgyBody(
    "- No shadow MCP servers: do not add `.cursor/mcp.json`, `.mcp.json`, or any ad-hoc\n",
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
`,
  });
  assert.equal(converted.relPath, "skills/add-app/SKILL.md");
  assert.match(converted.content, /name: "add-app"/);
  assert.doesNotMatch(converted.content, /^paths:/m);
});

test("convertCommand uses filename as workflow name and first paragraph as description", () => {
  const converted = convertCommand({
    filename: "check-workspace.md",
    sourceRel: ".cursor/commands/check-workspace.md",
    text: "Run a full workspace health check and summarize failures.\n\n1. pnpm install\n",
  });
  assert.equal(converted.relPath, "workflows/check-workspace.md");
  assert.match(converted.content, /name: "check-workspace"/);
  assert.match(
    converted.content,
    /description: "Run a full workspace health check and summarize failures\."/,
  );
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
`,
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
`,
  });
  assert.match(debuggerAgent.content, /run_command/);
});
