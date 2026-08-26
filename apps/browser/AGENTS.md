# Browser app

A real Nord web browser: tabs (open/close/switch/reorder), back/forward/reload/stop/home,
an omnibox address bar (URL vs. search-query detection, local history/bookmark suggestions
only — no live network suggestions), bookmarks, history, downloads, find-in-page, zoom, a
new-tab start page, and Settings. Advanced features (extensions, multiple profiles/incognito,
sync, PDF viewer/reader mode, print, session restore across restarts, real `<title>`/favicon
extraction, hover-link status preview) are intentionally out of scope for now.

- Package `@gencore/browser`, identifier `com.gencore.browser`, Vite port **5175**
- `AppShell` density `comfortable`. Titlebar copy stays exactly `Tauri Browser Template` plus the
  version from `get_app_info` (same convention as Terminal/Explorer's titlebar — not the app's
  real name). Tabs and the nav/address toolbar render as rows inside the `AppShell` content area,
  not inside the shared `Titlebar` composite (it's a fixed-height single row with an absolutely
  centered title span; apps consume ui-kit chrome, they don't fork it)

## Multiwebview architecture — read before touching tab rendering

Page content renders via Tauri 2's **multiwebview** feature (gated behind the `unstable` Cargo
feature on `tauri`, added in `apps/browser/src-tauri/Cargo.toml` and
`crates/gencore-plugin-browser/Cargo.toml`): one real child OS `Webview` per tab, added to the
`main` window via `Window::add_child`, `hide()`/`show()`'d on tab switch (this preserves
DOM/JS/scroll/video state in background tabs). `<iframe>` was deliberately rejected — most real
sites (Google, GitHub, banks, most SPAs) block iframe embedding via
`X-Frame-Options`/`frame-ancestors`.

- A tab with no navigation yet ("New Tab") has **no** child webview — it shows `NewTabPage` in
  chrome. The webview is created lazily on first navigation (`createTabWebview`) and destroyed
  when the tab closes (`closeTabWebview`)
- Bounds tracking: `src/modules/browser-view/browser-view.component.tsx` owns a `ResizeObserver`
  on the content-area container and calls `setTabWebviewBounds` on resize/tab-switch/sidebar-toggle.
  Coordinates are window-relative logical pixels — this works because the chrome webview itself
  fills the whole window (the same coordinate origin as `add_child`'s target)
- Back/forward: Tauri's `Webview` has no history API, so `goBack`/`goForward`/`reload`/`stop` run
  `history.back()` / `history.forward()` / `location.reload()` / `window.stop()` via
  `evalTabWebview` (fire-and-forget `Webview::eval`, no return channel). The actual back/forward
  *state* (`canGoBack`/`canGoForward`) is tracked purely client-side in `tabs.hook.ts` from the
  `gencore-browser://tab-navigated` event stream — see `pushHistory()` there for the
  back/forward/new-entry disambiguation logic
- Find-in-page (`src/modules/find-in-page/`) also uses `evalTabWebview` to inject a
  highlight/prev/next script (`find-in-page.script.ts`) into the *active* tab only. No match count
  is shown — `eval` has no return channel, and adding one would mean exposing IPC surface to
  untrusted tab content, which conflicts with the isolation goal below
- No `<title>`/favicon extraction bridge into content webviews, for the same reason: tabs show the
  hostname as a title fallback, and `https://{host}/favicon.ico` (via a plain `<img>`, not a
  content-script bridge) for the favicon, with a globe-icon fallback on load failure

## Security — this is the part that must not regress

- **`capabilities/main.json` is scoped by `"webviews": ["main"]`, not `"windows": ["main"]`.**
  Tauri: listing a *window* label grants the capability to every webview of that window —
  including tab content webviews, which are children of `main` — regardless of the `webviews`
  field. Webview-label scoping is the only way to keep tab content (arbitrary third-party sites)
  from inheriting **any** IPC capability. `apps/browser/tests/unit/capabilities.test.ts` and
  `isolation.hook.test.ts` assert this doesn't silently regress — do not "simplify" it back to
  `windows: ["main"]`
- Tab webviews are created with `create_tab_webview` (a `gencore-browser` command, not the generic
  JS `new Webview()`) specifically so Rust can attach `on_navigation` (blocks non-http(s)
  navigation), `on_page_load`, and `on_download` hooks at creation time — the JS constructor can't
  attach those. Everyday control of an *existing* tab webview (navigate/size/position/zoom/
  focus/show/hide) goes through Tauri's own already-ACL'd `core:webview:allow-*` commands via the
  JS `Webview` class (`ipc.webview.ts`), except `navigate`/`eval` which have no built-in IPC
  command and are wrapped as `gencore-browser` commands too
- Downloads always resolve into the OS Downloads directory (`app.path().download_dir()`),
  auto-suffixing name collisions (`report (2).pdf`) instead of overwriting — see
  `crates/gencore-plugin-browser/src/modules/downloads/downloads_api.rs`
- `gencore-browser` JSON stores (`bookmarks.json`/`history.json`/`downloads.json` under
  `app_data_dir()`) mirror `gencore-core`'s existing `pinned_store` pattern exactly — opaque
  versioned JSON blobs, Rust just persists a string, the frontend owns the schema
- `isolation/isolation.hook.js` allowlists only the commands the `src/modules/ipc/*.ts` wrappers
  call, with the same strict shape-validate-and-reconstruct pattern as Explorer's hook (never a
  passthrough). Webview control commands additionally require the `label` argument to match the
  `tab-<uuid>` pattern — never `"main"` — so a compromised chrome frontend can't retarget them at
  its own webview
- CSP is the same locked-down object-form baseline as Explorer/Terminal with one deliberate,
  minimal loosening: `img-src` includes `https:` (not just `'self'`/`data:`) so the tab
  strip/bookmarks/history UI can render `favicon.ico` thumbnails from arbitrary hosts. `connect-src`
  stays `ipc:`/`http://ipc.localhost` only — the address bar has no live network suggestions, by
  design, so chrome JS never needs to `fetch()` a third party
- Content webviews themselves are **not** subject to the app's CSP — they're independent webviews
  rendering real third-party pages, by design

## Layout and modules

- Chrome layout inside `AppShell`'s content area (`app.component.tsx`): `TabStrip` →
  `NavigationBar` (back/forward/reload-or-stop/home + `AddressBar`) → optional `BookmarksBar` →
  `BrowserView` (owns the active tab's webview bounds, renders `NewTabPage` for blank tabs) with a
  floating `FindInPageBar` overlay
- `AppShell` sidebar = `SidePanel` (Bookmarks / History / Downloads / Config tabs, same
  resize/tab-strip mechanics as Explorer/Terminal's side panel)
- `src/modules/tabs/` — tab state (`tabs.hook.ts`), never persisted across restarts (every launch
  starts with one fresh new tab; only bookmarks/history/downloads persist)
- `src/modules/navigation-bar/navigation-bar.omnibox.ts` — URL-vs-search heuristic and default
  search engine (DuckDuckGo, configurable in Settings among DuckDuckGo/Google/Bing)
- Config tab: **General** (search engine, homepage, show-bookmarks-bar toggle, "Clear browsing
  data" — wipes history + downloads-list, not bookmarks), **Appearance** (Polar Night / Snow Storm
  / Match system, identical convention to Explorer/Terminal). Settings persist to `localStorage`
  under `gencore.browser.config`
- Window chrome goes through `src/modules/ipc/ipc.window.ts`. App info through `ipc.app-info.ts`.
  Tab webview lifecycle/control through `ipc.webview.ts`. Bookmarks/history/downloads persistence
  through `ipc.browser-store.ts`. UI never calls `invoke`/`Webview`/`listen` directly
- Tray icon mirrors Explorer's (`src-tauri/src/modules/tray/`): left-click show/focus, right-click
  opens the `tray-menu` overlay, hide-to-tray on close. Uses the pre-staged
  `packages/ui-kit/src/assets/icons/favicon/browser/` assets (registered as `AppIconTarget:
  "browser"` in `packages/ui-kit/src/assets/icons/favicon/index.ts`)
- OS appearance maps dark → Polar Night, light → Snow Storm, IPC failure/null → Polar Night by
  default (`themePreference: "system"`)
- Repo URL opens through `ipc.opener.ts` (`openRepoInBrowser`)
- Override density only in `src/modules/app/app.theme.css`. Keep Nord tokens
- Tests: `apps/browser/tests/` (JS) and `crates/gencore-plugin-browser/tests/` (Rust)
- Release packaging is root `pnpm package:win64` (Windows x64 portable ZIP only)
