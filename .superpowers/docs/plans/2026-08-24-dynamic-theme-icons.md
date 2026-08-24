# Dynamic Theme-Contrasted Taskbar, Tray, and Favicon Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement dynamic runtime taskbar, system tray, and DOM favicon theme synchronization with inverted contrast for GenCore Terminal and Explorer apps.

**Architecture:**
- **`gencore-core` Plugin Module (`crates/gencore-core/src/modules/theme_icon/`):** Expose `set_theme_icon` command with `SetThemeIconArgs { theme: String }` (`"polar-night"` | `"snow-storm"`). Inspect `app.config().identifier` to select Terminal vs Explorer rasters, applying inverted contrast (`polar-night` theme -> Snow Storm light icons; `snow-storm` theme -> Polar Night dark icons), updating the `main` window icon via `window.set_icon` and the tray icon via `app.tray_by_id("main-tray").set_icon`.
- **Tray Bootstrap & Default Icons:** Update `apps/terminal/src-tauri/src/modules/tray/mod.rs` and `apps/explorer/src-tauri/src/modules/tray/mod.rs` to register with ID `"main-tray"` and default initial tray icon to `favicon-alt_snow-storm.png` (light glyph on dark default theme).
- **Security & Capabilities:** Grant `gencore-core:allow-set-theme-icon` in `capabilities/main.json` and allowlist `plugin:gencore-core|set_theme_icon` with strict `{ theme }` parameter validation in `isolation.hook.js`.
- **Frontend Sync & UI Kit:** Export favicon URLs in `@gencore/ui-kit` and sync DOM `<link rel="icon">` + `setThemeIcon(theme)` in `apps/terminal` and `apps/explorer`.

**Tech Stack:** Rust 2024 (Tauri 2 plugin, `tauri::image::Image`), React 19, TypeScript, Vite 8, Vitest, Cargo test.

**Spec:** `.superpowers/docs/specs/2026-08-24-dynamic-theme-icons-design.md`

## Global Constraints

- Nord color palette hex tokens only.
- Strict modular naming: `{module}.{role}.{ext}` (JS/TS) or `{module}_api.rs` / `{module}_error.rs` (Rust).
- Object-form CSP; Isolation IPC allowlist with exact parameter validation; `withGlobalTauri: false`; never `window.__TAURI__`.
- Bundled Terminess Nerd Font; no remote CDN or remote font downloads; CSP `font-src` stays `'self'`.
- Windows x64 portable distribution; stable dependency versions only.
- Inverted contrast rule: `polar-night` theme -> Snow Storm icon set; `snow-storm` theme -> Polar Night icon set.

---

### Task 1: Rust `set_theme_icon` Command & Icon Provider in `gencore-core` (Gemini 3.7 High)

**Files:**
- Create: `crates/gencore-core/src/modules/theme_icon/theme_icon_error.rs`
- Create: `crates/gencore-core/src/modules/theme_icon/theme_icon_api.rs`
- Create: `crates/gencore-core/src/modules/theme_icon/mod.rs`
- Modify: `crates/gencore-core/src/modules/mod.rs`
- Modify: `crates/gencore-core/src/modules/error/mod.rs`
- Modify: `crates/gencore-core/src/lib.rs`
- Modify: `crates/gencore-core/build.rs`
- Test: `crates/gencore-core/tests/theme_icon.rs`

**Interfaces:**
- Consumes: `AppHandle<R>`, `app.config().identifier`, `app.get_webview_window("main")`, `app.tray_by_id("main-tray")`.
- Produces: `set_theme_icon` Tauri command with payload `SetThemeIconArgs { theme: String }` (validated against `"polar-night"` and `"snow-storm"`), returning `Result<(), CoreError>`.

- [ ] **Step 1: Write integration tests in `crates/gencore-core/tests/theme_icon.rs`**
- [ ] **Step 2: Run `cargo test -p gencore-core --test theme_icon` to verify failure**
- [ ] **Step 3: Implement `theme_icon_error.rs`, `theme_icon_api.rs`, and wire `mod.rs`**
- [ ] **Step 4: Update `gencore-core/build.rs` and permissions for `set_theme_icon`**
- [ ] **Step 5: Run `cargo test -p gencore-core` to verify all tests pass**
- [ ] **Step 6: Commit**

---

### Task 2: App Tray IDs, Initial Contrasting Tray Icons, Capabilities & Isolation Hooks (Gemini 3.7 Medium)

**Files:**
- Modify: `apps/terminal/src-tauri/src/modules/tray/mod.rs`
- Modify: `apps/explorer/src-tauri/src/modules/tray/mod.rs`
- Modify: `apps/terminal/src-tauri/capabilities/main.json`
- Modify: `apps/explorer/src-tauri/capabilities/main.json`
- Modify: `apps/terminal/isolation/isolation.hook.js`
- Modify: `apps/explorer/isolation/isolation.hook.js`
- Test: `apps/terminal/tests/unit/isolation.hook.test.ts`
- Test: `apps/explorer/tests/unit/isolation.hook.test.ts`

**Interfaces:**
- Consumes: `TrayIconBuilder::with_id("main-tray")`, `plugin:gencore-core|set_theme_icon`.
- Produces: Persistent `"main-tray"` ID, `favicon-alt_snow-storm.png` initial tray bootstrap, granted `gencore-core:allow-set-theme-icon` permission, and isolation allowlist entry.

- [ ] **Step 1: Write unit tests in `isolation.hook.test.ts` for both apps for `set_theme_icon` validation**
- [ ] **Step 2: Run `pnpm turbo run test` to verify isolation tests fail**
- [ ] **Step 3: Update `tray/mod.rs` in `apps/terminal` and `apps/explorer` with `with_id("main-tray")` and light tray initial icon**
- [ ] **Step 4: Update `capabilities/main.json` and `isolation.hook.js` in `apps/terminal` and `apps/explorer`**
- [ ] **Step 5: Run `pnpm turbo run test` to verify isolation tests pass**
- [ ] **Step 6: Commit**

---

### Task 3: `@gencore/ui-kit` Favicon Exports & Theme Sync Hook (Gemini 3.7 Medium)

**Files:**
- Create: `packages/ui-kit/src/assets/icons/favicon/index.ts`
- Create: `packages/ui-kit/src/lib/favicon.ts`
- Modify: `packages/ui-kit/src/index.ts`
- Test: `packages/ui-kit/tests/lib/favicon.test.ts`

**Interfaces:**
- Consumes: `ThemeName` (`"polar-night"` | `"snow-storm"`), App Name (`"terminal"` | `"explorer"`).
- Produces: `getContrastingFaviconUrl(appName, theme)` and `updateDomFavicon(appName, theme)`.

- [ ] **Step 1: Write unit tests in `packages/ui-kit/tests/lib/favicon.test.ts`**
- [ ] **Step 2: Run `pnpm --filter @gencore/ui-kit test` to verify failure**
- [ ] **Step 3: Implement `favicon/index.ts` asset exports and `lib/favicon.ts` DOM updater**
- [ ] **Step 4: Export from `packages/ui-kit/src/index.ts`**
- [ ] **Step 5: Run `pnpm --filter @gencore/ui-kit test` to verify tests pass**
- [ ] **Step 6: Commit**

---

### Task 4: Terminal & Explorer Frontend Theme Reactivity & End-to-End Verification (Gemini 3.7 Medium)

**Files:**
- Create: `apps/terminal/src/modules/ipc/ipc.theme-icon.ts`
- Create: `apps/explorer/src/modules/ipc/ipc.theme-icon.ts`
- Modify: `apps/terminal/src/modules/app/app.component.tsx`
- Modify: `apps/explorer/src/modules/app/app.component.tsx`
- Test: `apps/terminal/tests/unit/ipc.theme-icon.test.ts`
- Test: `apps/explorer/tests/unit/ipc.theme-icon.test.ts`

**Interfaces:**
- Consumes: `setThemeIcon(theme)` IPC wrapper, `updateDomFavicon(appName, theme)`, `resolvedTheme` / `osTheme`.
- Produces: Automated reactive icon sync whenever the user preference or system theme changes.

- [ ] **Step 1: Write unit tests for `ipc.theme-icon.ts` in `apps/terminal` and `apps/explorer`**
- [ ] **Step 2: Run Vitest to verify tests fail**
- [ ] **Step 3: Implement `ipc.theme-icon.ts` in `apps/terminal` and `apps/explorer`**
- [ ] **Step 4: Wire reactive `useEffect` in `apps/terminal/src/modules/app/app.component.tsx` and `apps/explorer/src/modules/app/app.component.tsx`**
- [ ] **Step 5: Run full test suites (`pnpm turbo run lint typecheck test`, `cargo test --workspace`, `cargo clippy --workspace --all-targets -- -D warnings`)**
- [ ] **Step 6: Commit**
