# GenCore app icons, tray icons, and tray menu

**Status:** approved  
**Date:** 2026-08-20

## Problem

Terminal and Explorer ship the same empty Tauri placeholder (Polar Night tile, thick Frost rim, no mark). There is no notification-area icon and no tray menu. The apps need a matching Nord suite identity, a tray glyph that stays legible at 16–32px, and a right-click menu that looks like the in-app ui-kit menus.

## Decision

- **App icons:** shared Polar Night rounded tile, thin Frost rim, unique filled Frost glyph (Terminal = prompt chevron + block cursor; Explorer = tabbed folder).
- **Tray icons:** the same Frost glyph on a transparent canvas — no tile, no Polar Night fill, no rim.
- **Tray menu:** a hidden `tray-menu` webview that renders ui-kit `TrayMenu` (Nord Polar Night / Snow Storm). Not a native Windows tray menu.
- **Close:** hide `main` to the tray. **Quit** on the tray menu calls `app.exit(0)`.
- Masters are SVG. Windows PNG/ICO come from `tauri icon`. Opus 5 authors glyph geometry; no raster AI.

## App icon

Canvas `1024×1024`, transparent outside the tile.

| Attribute | Value |
| --- | --- |
| Tile | `<rect x="96" y="96" width="832" height="832" rx="184" ry="184">` |
| Fill | `#2E3440` (nord0) |
| Stroke | `#88C0D0` (nord8), `stroke-width="32"` (1px at 32px) |
| Glyph | filled `#88C0D0`, optically centered, no stroke |

Allowed hex only: `#2E3440`, `#88C0D0`. No gradients, filters, drop shadows, or Aurora hues. One `.ico` per app (Windows cannot swap light/dark).

**Terminal glyph:** right-pointing prompt chevron plus a block cursor to its right. Not a media-play triangle.

**Explorer glyph:** tabbed folder, tab on the left, rounded body — same silhouette language as the ui-kit folder mark. No papers, magnifier, or tree.

## Tray icon

Same 1024 canvas. No tile rect. Transparent background. The glyph paths must match that app’s `icon.svg` glyph (shared `d` values). Raster to `tray.png` at 32×32 only.

## Tray behavior

- Left-click: unminimize, show, focus `main`; hide `tray-menu` if open.
- Right-click: show `tray-menu` above the tray icon, clamped to the work area.
- Close (traffic light, titlebar Close, Alt+F4): `CloseRequested` on `main` → prevent close → hide `main`.
- Tray menu items: Show, Hide, separator, Quit (`destructive`).
- Focus lost or Escape on `tray-menu`: hide it.
- Tooltip: `GenCore Terminal` / `GenCore Explorer`.
- No native `TrayIconBuilder.menu()`.

## Overlay window

Label `tray-menu`. `visible: false`, `decorations: false`, `transparent: true`, `skipTaskbar: true`, `alwaysOnTop: true`, `resizable: false`, `shadow: false`, about 200×140. URL `tray-menu.html` (second Vite entry; not AppShell).

Terminal tray UI wraps `ConfigProvider` so theme follows Config. Explorer uses `useOsTheme`.

## IPC

`gencore-core` command `tray_action` with `{ "action": "show" | "hide" | "quit" }` and `deny_unknown_fields`.

- `show`: unminimize + show + focus `main`, hide `tray-menu`
- `hide`: hide `main`, hide `tray-menu`
- `quit`: `app.exit(0)`

Frontend calls it only from `src/modules/ipc/ipc.tray.ts`. Tray is created in Rust `setup`, not JS `TrayIcon.new`.

## Security

- `capabilities/main.json` stays `"windows": ["main"]`. Do not grant `tray_action` to main.
- `capabilities/tray-menu.json`: `"windows": ["tray-menu"]` with only `gencore-core:allow-tray-action`, `core:window:allow-theme`, `core:event:allow-listen`, `core:event:allow-unlisten`.
- Isolation allowlists `plugin:gencore-core|tray_action` and `tauri://theme-changed` for Window labels `main` or `tray-menu`. Reconstruct must keep the requested allowed label (not rewrite tray-menu to main).
- No `gencore-pty` / `gencore-fs` / `core:default` / `core:tray:*` on tray-menu.
- Extra windows get their own capability file. Main stays `["main"]` only.

## Does / does not

**Does:** replace Windows app icons, add tray glyphs, hide-to-tray, Nord tray menu, Isolation/capability split, security rule note.

**Does not:** macOS `icon.icns` in `bundle.icon`, native tray menus, close-quits, JS tray API, raster AI, new installer targets.
