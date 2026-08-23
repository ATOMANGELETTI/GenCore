---
trigger: always_on
description: "Superpowers per-plan tasks checklists — create and check off under .superpowers/docs/tasks/"
---

<!-- Generated from .cursor/rules/superpowers-tasks.mdc by `pnpm sync:agents`. Do not edit. -->


# Superpowers tasks files

Every implementation plan gets a matching checklist. This file is the
progress board — not the long plan body and not `.superpowers/sdd/progress.md`.

## Path

`.superpowers/docs/tasks/YYYY-MM-DD-<feature-name>.md` — same slug as the plan.

Track these files. Do not gitignore `.superpowers/docs/tasks/`.

## Format

Title, `Spec:` and `Plan:` links, then one checkbox per `### Task N:` heading with the assigned subagent model in parentheses. No file maps, commands, or copied steps.

```markdown
# Terminal Assistant

Spec: `.superpowers/docs/specs/2026-08-22-terminal-assistant-design.md`
Plan: `.superpowers/docs/plans/2026-08-22-terminal-assistant.md`

- [x] Task 1: Plugin crate and data directory (Grok) — scaffold gencore-assistant and the portable data dir
- [ ] Task 4: Gemini model allowlist and SSE parse (Sonnet 5) — allowlisted models and stream parse
```

- Title matches the plan heading.
- Under the title, provide relative links to the associated specification (`Spec:`) and plan (`Plan:`). If a plan had no preceding spec, write `Spec: none`.
- Each task line lists the task number, title, execution model in parentheses (e.g. `(Grok)`, `(Sonnet 5)`, `(Opus 5)`, `(Kimi)`), and after an em dash, one short outcome clause.
- The model tag reflects the planned model per `.cursor/rules/superpowers-models.mdc` (defaulting to Grok, elevated to Sonnet 5 or Opus 5 for complex tasks/re-dispatches). If a task is re-dispatched to a stronger model, update the tag.
- `- [ ]` until finished, then `- [x]`.
- If the plan gains tasks, append matching unchecked lines. Do not delete completed items.

## When to write

1. **Create** the file in the same turn the plan is saved. All items unchecked.
2. **Before executing** an existing plan, create the file from `### Task N:` headings if it is missing. Check off tasks already finished.
3. **Check off** the matching line immediately when a task is finished. The parent/controller does this. Do not wait for the user to ask.
4. Do not require flipping checkboxes inside the plan body.

## Bookkeeping Sequence on Task Completion

Whenever a task completes (review approved, tests pass, or manual task verified), the controller must perform all 3 bookkeeping actions in the exact same turn:

1. **Check off the task file**: Mark `- [x]` in `.superpowers/docs/tasks/YYYY-MM-DD-<feature>.md`.
2. **Update the SDD progress ledger**: Record `Task N: complete (...)` in `.superpowers/sdd/progress.md`.
3. **Update Cursor todos**: Mark the task completed via `TodoWrite`.

Never dispatch the next task, pause, or end a turn without keeping `.superpowers/docs/tasks/` in sync with the latest completed task state.
