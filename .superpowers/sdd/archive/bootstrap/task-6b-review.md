# Wave 6b Review — `.github/**`

Read-only review against `task-6b-brief.md`, plus one naming fix in SECURITY.md.

## Spec compliance

Full requested tree is present. CI calls reusable JS + Rust workflows. No
`tauri build`. Labeler uses `pull_request` (not `pull_request_target` + PR
checkout). CODEOWNERS is comment-only. Release uses Changesets without
`NPM_TOKEN`. Dependabot covers npm, cargo, github-actions weekly. Community
and Copilot files are in place. No FUNDING.yml.

## Critical

None.

## Important

None remaining.

`changesets/action@v1` instead of `@v2` is correct: v2 is still `next`
prereleases. SECURITY.md originally named folder paths as if they were plugin
ids; controller corrected that to `gencore-pty` / `gencore-fs`.

## Notes

- Composite setup uses Corepack + `actions/setup-node@v7` (not `pnpm/action-setup`).
- Rust job is ubuntu-only; `os` input can add Windows later.
- `CODEOWNERS` / `OWNER/GenCore` placeholders need real handles when the remote exists.
- YAML was not machine-linted (Wave 6a hook briefly blocked the implementer's shell).

## Verdict

Approved.
