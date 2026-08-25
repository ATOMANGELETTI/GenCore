---
name: git-commit
description: Generates a commitlint-compliant conventional commit message and quickly commits changes with user confirmation. Use when creating git commits, drafting commit messages, or running quick commit workflows.
---

# Git commit

Fast, streamlined workflow to craft a conventional commit message strictly adhering to repository commitlint rules, present choices to the user, and execute the commit quickly.

## Workflow

1. **Inspect changes**:
   - Run `git status -s` to see modified, added, deleted, or untracked files.
   - Run `git diff --staged` (or `git diff` if nothing is staged) to understand the exact scope and nature of the changes.

2. **Draft conventional commit message**:
   - Strictly follow repository commitlint rules:
     - **Header**: `<type>(<scope>): <subject>` or `<type>: <subject>`
     - **Length**: Strict maximum 100 characters; target ≤ 50–72 characters (minimum necessary length).
     - **Allowed Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
     - **Scope** (optional, lowercase in parentheses): package, crate, app, or area (e.g. `(terminal)`, `(explorer)`, `(ui-kit)`, `(pty)`, `(assistant)`, `(scripts)`, `(core)`).
     - **Subject**: Lowercase first letter, imperative mood (`add`, `fix`, `update`, not `added`, `fixes`, `updating`), no trailing period (`.`).
     - **Body** (optional, for multi-concern/detailed changes): Separated by an empty line, wrapped at 72 chars, explaining *what* and *why* (not *how*).
     - **No AI attribution**: Strictly never include `Co-authored-by: Cursor`, `Made-with: Cursor`, `Generated-by: Cursor`, `Assisted-by: AI`, Copilot, ChatGPT, or Claude trailers.

3. **Present message and prompt user**:
   - Display the draft commit message clearly in a code block.
   - Present quick, actionable choices:
     - **Option 1**: Stage all changes and commit (`git add -A && git commit -m "..."`)
     - **Option 2**: Commit only currently staged changes (`git commit -m "..."`)
     - **Option 3**: Adjust commit message / type / scope
     - **Option 4**: Create a changeset first (`pnpm changeset` if `@gencore/*` behavior changed)
     - **Option 5**: Cancel / abort

4. **Execute commit immediately**:
   - Upon user selection or confirmation, execute the commit command immediately without unnecessary back-and-forth.
   - Output the commit result (hash and summary).

## Constraints

- Never commit without user confirmation or explicit request.
- Keep the entire interaction fast and easy: inspect, draft, ask choice, commit.
- Never add AI co-author or attribution trailers.
