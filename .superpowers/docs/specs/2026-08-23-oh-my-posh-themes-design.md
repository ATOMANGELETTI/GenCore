# Terminal Oh My Posh Themes (Config tab & PTY integration)

Date: 2026-08-23
Status: approved
Packages: `@gencore/terminal`, `gencore-plugin-pty`

## Problem

The Terminal app currently uses a hardcoded `gencore-polar-night.omp.json` / `gencore-snow-storm.omp.json` prompt theme with no option for users to select different prompt styles. Users want to choose between multiple popular Oh My Posh themes (`gencore`, `bubbles`, `iterm2`, `wholespace`, `wopian`, `clean-detailed`, and `kali`) directly from the Config tab in the terminal side-panel, have their choice persist across restarts, and have active terminal tabs update their prompt theme immediately.

## Goals

- Bundle official Oh My Posh `.omp.json` theme definitions for:
  - `gencore` (adaptive: `gencore-polar-night.omp.json` & `gencore-snow-storm.omp.json`)
  - `bubbles` (`bubbles.omp.json`)
  - `iterm2` (`iterm2.omp.json`)
  - `wholespace` (`wholespace.omp.json`)
  - `wopian` (`wopian.omp.json`)
  - `clean-detailed` (`clean-detailed.omp.json`)
  - `kali` (`kali.omp.json`)
- Extend `TerminalConfigV1` with `poshTheme: PoshThemeId` (defaulting to `"gencore"`) persisted in WebView `localStorage` (`gencore.terminal.config`).
- Add an accessible, Nord-styled **Prompt Theme** section to the Config tab UI with compact two-line rows (title + subtitle description), radio group semantics, arrow-key navigation, and checkmark indicators.
- Update `crates/gencore-plugin-pty` (`OpenArgs`, `open` command, `session_map.rs`, `session_shell.rs`) to accept and validate `posh_theme`, launching shells with the corresponding theme path.
- Provide instant live prompt swapping across all active terminal sessions via PowerShell `$env:POSH_THEME` retargeting when the user switches themes in the Config tab.

## Non-goals

- Explorer app prompt themes (Explorer has no PTY).
- Custom user-uploaded `.omp.json` files or arbitrary remote URLs.
- Rewriting upstream theme colors to Nord palettes (upstream themes use their authentic official definitions; `gencore` is the dedicated Nord theme).

## Architecture & Units

### 1. Bundled Theme Assets

- **Location:** `apps/terminal/src-tauri/resources/oh-my-posh/`
- **Files:**
  - `gencore-polar-night.omp.json` (existing Nord Polar Night theme)
  - `gencore-snow-storm.omp.json` (existing Nord Snow Storm theme)
  - `bubbles.omp.json` (upstream Oh My Posh Bubbles theme)
  - `iterm2.omp.json` (upstream Oh My Posh iTerm2 theme)
  - `wholespace.omp.json` (upstream Oh My Posh Wholespace theme)
  - `wopian.omp.json` (upstream Oh My Posh Wopian theme)
  - `clean-detailed.omp.json` (upstream Oh My Posh Clean-Detailed theme)
  - `kali.omp.json` (upstream Oh My Posh Kali theme)
  - `gencore-prompt.ps1` (prompt bootstrap script)

### 2. Config Types & Storage (`@gencore/terminal`)

- **Types (`config.types.ts`):**
  ```typescript
  export type PoshThemeId =
    | "gencore"
    | "bubbles"
    | "iterm2"
    | "wholespace"
    | "wopian"
    | "clean-detailed"
    | "kali";

  export interface TerminalConfigV1 {
    version: 1;
    theme: ThemePreference;
    poshTheme: PoshThemeId;
  }

  export interface ConfigContextValue {
    preference: ThemePreference;
    setPreference: (next: ThemePreference) => void;
    resolvedTheme: ThemeName;
    poshTheme: PoshThemeId;
    setPoshTheme: (next: PoshThemeId) => void;
  }
  ```
- **Storage (`config.storage.ts`):**
  - `DEFAULT_CONFIG`: `{ version: 1, theme: "system", poshTheme: "gencore" }`
  - Validates `poshTheme` in `parseConfig`. Legacy stored configs without `poshTheme` safely default to `"gencore"`.

### 3. PTY Plugin & Shell Launch (`crates/gencore-plugin-pty`)

- **Command Arguments (`session_api.rs`):**
  - `OpenArgs` adds `#[serde(default)] pub posh_theme: Option<String>`.
  - `open` handler accepts `posh_theme: Option<String>`.
- **Validation (`session_map.rs`):**
  - `validate_posh_theme(posh_theme: Option<&str>)` enforces allowlist: `None | Some("gencore" | "bubbles" | "iterm2" | "wholespace" | "wopian" | "clean-detailed" | "kali")`.
- **Resolution (`session_shell.rs`):**
  - `resolve_oh_my_posh(resource_dir, theme, posh_theme)` resolves:
    - `"gencore"` / `None` $\rightarrow$ `gencore-snow-storm.omp.json` (if `theme == "snow-storm"`) or `gencore-polar-night.omp.json`.
    - Other themes $\rightarrow$ `{posh_theme}.omp.json`.
    - Falls back to `gencore` theme if the target file is missing.

### 4. IPC Wrappers (`apps/terminal/src/modules/ipc/`)

- `ipc.types.ts`:
  - `OpenPtyArgs` adds `readonly posh_theme?: PoshThemeId;`.
- `ipc.pty.ts`:
  - `openPty(args)` passes `posh_theme: args.posh_theme` to `plugin:gencore-pty|open`.

### 5. Terminal Prompt Swapping (`terminal.prompt.ts` & `terminal.hook.ts`)

- `poshThemeFilename(poshTheme: PoshThemeId, theme: ThemeName): string`: Returns filename of target theme.
- `poshThemeSwapCommand(poshTheme: PoshThemeId, theme: ThemeName): string`:
  ```typescript
  const ALL_THEMES_PATTERN = "(gencore-(polar-night|snow-storm)|bubbles|iterm2|wholespace|wopian|clean-detailed|kali)\\.omp\\.json";

  export function poshThemeSwapCommand(poshTheme: PoshThemeId, theme: ThemeName): string {
    const file = poshThemeFilename(poshTheme, theme);
    return `$env:POSH_THEME = [regex]::Replace([string]$env:POSH_THEME, '${ALL_THEMES_PATTERN}', '${file}')\r\n`;
  }
  ```
- `terminal.hook.ts`:
  - Effect listens to `[theme, poshTheme]` and sends `poshThemeSwapCommand(poshTheme, theme)` to all open live sessions.
  - Spawning new tabs includes `posh_theme: poshTheme` in `OpenPtyArgs`.

### 6. Config Tab UI (`config.component.tsx`)

- Renders a **Prompt Theme** section using a `role="radiogroup"` labelled `Prompt theme`.
- Options:
  1. **GenCore**: `Adaptive Nord Powerline`
  2. **Bubbles**: `Rounded multi-segment bubbles`
  3. **iTerm2**: `Minimal classic terminal prompt`
  4. **Wholespace**: `Spaced powerline glyphs`
  5. **Wopian**: `Clean developer prompt with git status`
  6. **Clean Detailed**: `Multi-line detailed system prompt`
  7. **Kali**: `Kali Linux signature prompt`
- Full keyboard support (ArrowUp, ArrowDown, Home, End).
- Nord styling matching the Appearance group (`bg-accent`, `text-accent-foreground`, checkmark icon when selected).

## Data Flow

```text
User selects Prompt Theme in Config Tab
         │
         ├──► setPoshTheme(id) ──► saveConfig (localStorage)
         │
         ├──► Active Tabs: writes poshThemeSwapCommand into live PTY sessions
         │       └─► $env:POSH_THEME updated in PowerShell (instant next prompt)
         │
         └──► New Tabs: openPty({ ..., posh_theme: id })
                 └─► Rust resolves {id}.omp.json ──► spawns PTY with POSH_THEME env
```

## Testing & Verification

### Unit Tests
- `apps/terminal/tests/unit/oh-my-posh-theme.test.ts`:
  - Validate all 7 `.omp.json` files exist and parse as valid JSON.
  - Validate `poshThemeFilename` mappings.
  - Validate `poshThemeSwapCommand` produces valid PowerShell regex swaps with no absolute path leakage.
- `apps/terminal/tests/unit/config.storage.test.ts`:
  - Test parsing, legacy migration, and serialization of `poshTheme`.
- `apps/terminal/tests/unit/config.component.test.tsx` & `config.hook.test.tsx`:
  - Test rendering of all 7 theme options, keyboard navigation, and selection events.
- `crates/gencore-plugin-pty`:
  - Test `validate_posh_theme` and `resolve_oh_my_posh` for all theme variants.

### Workspace Verification
- `pnpm turbo run lint typecheck test`
- `cargo test --workspace`
- `cargo clippy --workspace --all-targets -- -D warnings`
