Draft a commitlint-compliant conventional commit message and quickly commit changes with user confirmation.

1. Inspect working tree status (`git status -s`) and diff (`git diff --staged` or `git diff`).
2. Draft a conventional commit message strictly adhering to repository rules:
   - `<type>(<scope>): <subject>` (≤ 72 chars target, max 100).
   - Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
   - Lowercase imperative subject, no trailing period.
   - Optional 72-col body explaining *what* and *why*.
   - Strictly NO AI attribution trailers (`Co-authored-by: Cursor`, `Made-with: Cursor`, `Generated-by: Cursor`, `Assisted-by: AI`).
3. Present the drafted message and offer choices to the user:
   - Stage all & commit (`git add -A && git commit -m "..."`)
   - Commit staged only (`git commit -m "..."`)
   - Edit message / scope / type
   - Create changeset first (`pnpm changeset` if `@gencore/*` package behavior changed)
   - Cancel
4. Execute the chosen commit action immediately upon user confirmation.
