# Monaco & Micro Diff Editor, Config Preference, and Real-Time Source Control

Spec: `.superpowers/docs/specs/2026-08-24-diff-editor-monaco-micro-design.md`
Plan: `.superpowers/docs/plans/2026-08-24-diff-editor-monaco-micro.md`

- [x] Task 1: Micro Editor Nord Colorscheme, Settings & PTY Config Wiring (Grok) — scaffold nord.micro, settings.json, and PTY -config-dir resolution
- [x] Task 2: Config Tab Preference for Default Diff Viewer (Grok) — add diffEditor preference to TerminalConfigV1 and Config subviews
- [x] Task 3: Real-Time Git State Detection & Open Repository Header Button (Grok) — implement 2.5s polling loop, window focus listener, and FolderOpen header button
- [x] Task 4: Monaco Diff Editor Component & Theme Integration (Sonnet 5) — implement offline Monaco Diff Editor with unified/split views, red/green diffing, and Nord theme
- [x] Task 5: Terminal Tab System Integration & End-to-End Verification (Sonnet 5) — wire diff tabs into terminal session, active-repo-view file clicks, and verify workspace
