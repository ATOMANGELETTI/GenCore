# Windows Taskbar ICON_BIG Theme Icons

**Status:** approved
**Date:** 2026-08-25

## Problem

Tray icons already use the new `@gencore/ui-kit` `favicon-alt_*.png` rasters. The Windows taskbar still shows the old Opus 5 Polar Night tile because:

1. Tauri 2.11.5 `WebviewWindow::set_icon` maps to tao `set_window_icon`, which sends **ICON_SMALL** only.
2. The taskbar uses **ICON_BIG**, which stays on the PE resource baked from `apps/*/src-tauri/icons/icon.ico`.
3. `set_theme_icon` swallows `set_icon` / `tray.set_icon` errors (`let _ =`), so a failed apply is silent.

Contrast mapping (Polar Night theme → snow-storm rasters; Snow Storm theme → polar-night rasters) is already correct.

## Decision

- Keep decoding ui-kit **PNG** bytes (`favicon_*.png` for window/taskbar, `favicon-alt_*.png` for tray).
- Keep `tray.set_icon` for `favicon-alt`.
- On Windows, after decode, `CreateIcon` from RGBA and `SendMessageW(WM_SETICON)` for **ICON_BIG** (max 256px) and **ICON_SMALL** (~32px). Keep live `HICON`s in plugin-managed `ThemeIconState`; destroy the previous pair on the next switch.
- Return `ThemeIconError` instead of swallowing window/taskbar/tray apply failures. Missing `main` is `WindowMissing`. Missing tray is skipped (tray may not exist yet).
- Replace bundled `icon.ico`, `32x32.png`, `128x128.png`, `128x128@2x.png` from ui-kit `favicon_snow-storm.png` (Polar Night is the fallback theme → light icon for contrast).
- Retarget `scripts/generate-app-icons.ps1` so app-icon rasters come from that ui-kit PNG, not the old Opus 5 `icon.svg`. Leave the SVGs in place; do not invent new SVG masters.

No new IPC, capabilities, or Isolation keys.

## Does / Does Not

**Does:** update the live Windows taskbar via ICON_BIG, theme-switch contrasting favicons, refresh baked exe icons, keep tray on favicon-alt.

**Does not:** redesign ui-kit rasters, change Isolation/CSP/capabilities, add macOS `icon.icns`, or clear the Windows Explorer thumbnail cache.
