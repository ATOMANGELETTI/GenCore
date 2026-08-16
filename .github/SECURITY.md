# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities privately rather than through a
public GitHub issue, discussion, or pull request.

Preferred channel: use GitHub's
["Report a vulnerability"](../../security/advisories/new) private advisory
form for this repository. This opens a private discussion with maintainers
and lets you attach details safely.

Please include:

- A description of the vulnerability and its impact.
- Steps to reproduce (minimal repro case if possible).
- Affected app(s)/crate(s) and version or commit SHA.

**Do not include public exploit proof-of-concept code in a public issue,
discussion, PR, or commit message.** Share reproduction details only through
the private advisory channel above.

We'll acknowledge new reports as soon as possible and work with you on a fix
and coordinated disclosure timeline before any public details are shared.

## Scope

This project is a set of Tauri 2 desktop applications (`apps/terminal`,
`apps/explorer`), a shared UI package (`packages/ui-kit`), and Rust plugin
crates (`crates/*`). In addition to typical web/application vulnerabilities,
the following are explicitly in scope and treated as security issues:

- Content Security Policy (CSP) regressions in any `tauri.conf.json`.
- Isolation Pattern being disabled or bypassed.
- Overly broad Tauri capability/permission grants (violations of least
  privilege) in any `capabilities/*.json`.
- Any change that gives `gencore-pty` or `gencore-fs` (folders
  `crates/gencore-plugin-pty` / `crates/gencore-plugin-fs`) real PTY or
  filesystem I/O without corresponding capability and CSP review — these
  are currently stub plugins by design.

## Supported versions

This project is pre-1.0 and does not yet maintain multiple supported
release lines. Security fixes are applied to the `main` branch and released
as soon as practical.
