# Runs in a newly created git worktree to make it usable without touching the
# original checkout's node_modules (no symlinking — each worktree gets its own).
$ErrorActionPreference = 'Stop'

Write-Output "Setting up GenCore worktree (Windows)..."

corepack enable
corepack prepare pnpm@11.22.0 --activate
pnpm install

Write-Output "Worktree ready: pnpm install complete."
