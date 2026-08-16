#!/usr/bin/env bash
# Runs in a newly created git worktree to make it usable without touching the
# original checkout's node_modules (no symlinking — each worktree gets its own).
set -euo pipefail

echo "Setting up GenCore worktree (Unix)..."

corepack enable
corepack prepare pnpm@11.22.0 --activate
pnpm install

echo "Worktree ready: pnpm install complete."
