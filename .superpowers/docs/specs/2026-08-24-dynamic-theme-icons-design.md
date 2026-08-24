# Dynamic Theme-Contrasted Taskbar, Tray, and Favicon Icons

**Status:** approved  
**Date:** 2026-08-24

## Problem

GenCore apps (Terminal and Explorer) currently load static app and tray icons regardless of whether the user is in Polar Night (dark) or Snow Storm (light) mode. Furthermore, on dark taskbars/trays, dark icons have poor contrast, while on light taskbars/trays, light icons blend into the background.

The apps require:
1. Dynamic runtime taskbar/window icon (`window.set_icon`) and system tray icon (`tray.set_icon`) switching in response to theme changes.
2. Inverted contrast mapping for maximum legibility against system chrome:
   - Polar Night theme (dark) -> display Snow Storm (light) icons.
   - Snow Storm theme (light) -> display Polar Night (dark) icons.
3. Support for automatic switching when theme preference is "system" (following OS light/dark appearance) and locked persistence when locked to "polar-night" or "snow-storm".
4. DOM `<link rel="icon">` synchronization matching the active theme's favicon.

## Decision

- **Assets in `@gencore/ui-kit`:**
  - `packages/ui-kit/src/assets/icons/favicon/terminal/`:
    - `favicon_polar-night.png` / `favicon_snow-storm.png` (Taskbar / Window)
    - `favicon-alt_polar-night.png` / `favicon-alt_snow-storm.png` (Tray)
  - `packages/ui-kit/src/assets/icons/favicon/explorer/`:
    - `favicon_polar-night.png` / `favicon_snow-storm.png` (Taskbar / Window)
    - `favicon-alt_polar-night.png` / `favicon-alt_snow-storm.png` (Tray)
- **High-Contrast Mapping Rule:**
  - Active Theme `polar-night` -> Window/Taskbar: `favicon_snow-storm.png`, Tray: `favicon-alt_snow-storm.png`, DOM Favicon: `favicon_snow-storm.png`.
  - Active Theme `snow-storm` -> Window/Taskbar: `favicon_polar-night.png`, Tray: `favicon-alt_polar-night.png`, DOM Favicon: `favicon_polar-night.png`.
- **Tray ID:**
  - Stable Tray ID `const MAIN_TRAY_ID: &str = "main-tray"` used in `TrayIconBuilder::with_id(MAIN_TRAY_ID)` across both apps.
  - Default bootstrap tray icon: `favicon-alt_snow-storm.png` (light glyph on dark default background).
- **Backend IPC (`crates/gencore-core`):**
  - Command: `set_theme_icon(app: AppHandle<R>, args: SetThemeIconArgs)` where `SetThemeIconArgs { theme: String }` (`"polar-night"` | `"snow-storm"`).
  - App identifier detection: `app.config().identifier` (`com.gencore.terminal` vs `com.gencore.explorer`).
  - Calls `main.set_icon(taskbar_image)` on the `main` window.
  - Calls `tray.set_icon(Some(tray_image))` on `app.tray_by_id(MAIN_TRAY_ID)`.
- **Capabilities & Isolation:**
  - `capabilities/main.json`: Grant `"gencore-core:allow-set-theme-icon"`.
  - `isolation/isolation.hook.js`: Validate `plugin:gencore-core|set_theme_icon` allowing only `{ theme: "polar-night" | "snow-storm" }`.
- **Frontend Sync:**
  - `@gencore/ui-kit`: Export favicon asset paths/helpers.
  - Terminal: Reactive sync in `AppShellTree` on `resolvedTheme` change.
  - Explorer: Reactive sync in `App` on `osTheme` change.

## Security

- Least-privilege capability: `gencore-core:allow-set-theme-icon` granted only to `main` window in `capabilities/main.json`.
- Strict Isolation hook validation: rejects unknown commands, unrecognized theme strings, and extra payload properties.
- Embedded rasters: compile-time embedded byte slices (`include_bytes!`), no dynamic filesystem reads of untrusted icon paths.

## Does / Does Not

**Does:**
- Dynamically update taskbar icon, system tray icon, and DOM favicon when theme switches.
- Invert contrast between theme and icon so icons stand out against system background.
- Support both live OS theme changes (under System mode) and manual theme locks in Settings.
- Support both Terminal and Explorer desktop templates.

**Does Not:**
- Implement arbitrary runtime icon file uploading.
- Modify native installer builds (portable ZIP distribution remains).
