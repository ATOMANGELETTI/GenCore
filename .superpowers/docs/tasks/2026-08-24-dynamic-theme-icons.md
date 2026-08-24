# Dynamic Theme-Contrasted Taskbar, Tray, and Favicon Icons

Spec: `.superpowers/docs/specs/2026-08-24-dynamic-theme-icons-design.md`
Plan: `.superpowers/docs/plans/2026-08-24-dynamic-theme-icons.md`

- [x] Task 1: Rust `set_theme_icon` command & icon provider in `gencore-core` (Gemini 3.7 High) — scaffold theme icon command with high-contrast mapping and tests
- [x] Task 2: App tray IDs, initial contrasting tray icons, capabilities & isolation hooks (Gemini 3.7 Medium) — wire tray IDs, default tray icons, capabilities, and isolation allowlists
- [x] Task 3: `@gencore/ui-kit` favicon exports & theme sync hook (Gemini 3.7 Medium) — export favicon URLs and DOM favicon synchronizer
- [x] Task 4: Terminal & Explorer frontend theme reactivity & end-to-end verification (Gemini 3.7 Medium) — wire IPC callers, reactive hooks, and pass all workspace tests
