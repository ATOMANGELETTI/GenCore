# FileIcon outline glyphs (theme-inherited)

Date: 2026-08-20
Status: approved
Packages: `@gencore/ui-kit`
Reference: [Nord Colors and Palettes](https://www.nordtheme.com/docs/colors-and-palettes)

## Problem

`FileIcon` already maps extensions to distinct kinds, but two things fight Polar Night and Snow Storm:

- Each kind uses a different Nord fill (`KIND_FILL`: aurora folders, frost TypeScript, aurora HTML, and so on). The rainbow sits next to `text-foreground` labels and selected Frost text.
- The current path geometries are abstract blobs. They do not read as drive, folder, or file type at 16px.

## Goals

- One color for every drive, folder, and file icon: the same color as the tree-row label.
- That color must follow the active theme and row state without per-theme glyph copies:
  - Polar Night unselected: snow-4 (`--foreground`). Selected: frost-8 (`--accent-foreground`).
  - Snow Storm unselected: polar-0 (`--foreground`). Selected: frost-10 (`--accent-foreground`).
- Redraw every `FileIconKindId` as a recognizable 16px **outline** glyph (1.3px stroke, round caps and joins).
- Keep the existing kind ids and extension map. Distinct path geometry per kind.

## Non-goals

Per-type Aurora or Frost fills. A `--file-icon` token. Hard-coded nord hex on glyphs. Filled silhouettes. Shared dog-eared file frame with an inner mark. Nerd Font / Terminess glyphs for the tree. Collapsing kinds to folder-vs-file-only. Changing `FileIcon` props or `resolveFileIconKind`. Explorer or Terminal source edits. Tree chevron color (`text-foreground/80`). Theme picker or persistence.

## Approach

Paint with CSS `currentColor`. Tree rows already set `text-foreground` and selected `text-accent-foreground`. `ThemeProvider` already swaps those variables between Polar Night and Snow Storm. Delete `KIND_FILL` and any `nordVar` use in the glyph module.

Put stroke paint on the `FileIcon` `<svg>` (`fill="none"` `stroke="currentColor"` `strokeWidth={1.3}` `strokeLinecap="round"` `strokeLinejoin="round"`). Glyph modules supply geometry only. A path that needs a solid dot (for example the drive platter) may set `fill="currentColor"` and `stroke="none"` — still one inherited color.

## Units

### FileIcon component

- **Does:** Resolves kind, renders the 16×16 svg (`size-4`, `data-slot="file-icon"`, `data-kind`), applies the outline stroke attributes above.
- **Use:** Terminal file tree leading slot; any future kit consumer.
- **Depends on:** `resolveFileIconKind`, `FileIconGlyph`. Parent `color` (defaults to body `--foreground` if used outside Tree).

### Glyphs

- **Does:** One outline drawing per `FileIconKindId` (drive, folder, folder-open, generic file, and every extension kind). Closed vs open folder are different shapes. File types use type-specific marks (braces, T-bar, markdown M, git graph, media frames, and so on), not a shared document sheet.
- **Use:** `FileIcon` only.
- **Depends on:** kind id. Official Nord hex must not appear. No `KIND_FILL`.

### Kind resolver

Unchanged. Drive ignores extension. Folder uses `open` for `folder` vs `folder-open`. Files map through `EXTENSION_KIND` and fall back to `file`.

## Data flow

Unchanged. `ThemeProvider` class on the document sets Polar Night or Snow Storm. Tree row `color` inherits into the svg stroke. No new IPC, tokens, or CSS variables.

## Error handling

None. Unknown extensions already resolve to `file`. Missing `currentColor` cannot happen in normal CSS; the svg would fall back to the UA default only if `color` is unset, which `globals.css` prevents on `body`.

## Testing

In `packages/ui-kit/tests/primitives/file-icon/file-icon.test.tsx`:

- Keep unique serialized geometry per kind.
- The svg uses `stroke="currentColor"`, `fill="none"`, `stroke-width="1.3"`.
- No `var(--nord-*)` on svg or descendant paint attributes. Any path `fill` is either absent, `none`, or `currentColor`.
- Resolver tests stay as they are.

No Terminal tests: the app does not change. Theme stylesheet tests already cover `--foreground` and `--accent-foreground`.

## Release

Patch changeset for `@gencore/ui-kit` (`feat: outline FileIcon glyphs that inherit theme text color`). Terminal is private; no app changeset.

## Decisions

- Color: `currentColor`, not Frost or muted tokens.
- Construction: outline 1.3px, not filled, not file-frame-plus-mark.
- One glyph set for Polar Night and Snow Storm.
- Kind catalog unchanged; geometries redrawn.
- Stroke attributes live on the svg, not a per-kind fill map.
