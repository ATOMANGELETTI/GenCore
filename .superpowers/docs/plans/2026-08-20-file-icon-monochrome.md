# FileIcon outline glyphs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redraw `@gencore/ui-kit` `FileIcon` as a 16px outline set painted with inherited `currentColor` so every kind is distinct and readable on Polar Night and Snow Storm.

**Architecture:** Put outline stroke attributes on the `FileIcon` `<svg>`. Glyph modules supply geometry only (`currentColor` fill allowed solely for tiny solid dots). Delete `KIND_FILL` and `nordVar` from the glyph file. Tree rows already set `text-foreground` / selected `text-accent-foreground`; `ThemeProvider` already swaps those variables per theme. Do not add tokens, IPC, or app source edits.

**Tech Stack:** React 19.2, SVG, Vitest, Testing Library, `@gencore/ui-kit`. Official Nord palette only via inherited CSS `color` — no Nord hex or `var(--nord-*)` on glyphs.

**Spec:** `.superpowers/docs/specs/2026-08-20-file-icon-monochrome-design.md`

## Global Constraints

- Latest **stable** only. No beta/rc/canary.
- Official Nord hex only (`nord0`–`nord15`). No ad-hoc hex, no Tailwind default palette colors. FileIcon paint is `currentColor` / `none` only — never `var(--nord-*)` on fill or stroke.
- Polar Night unselected icons follow snow-4 (`--foreground`); selected follow frost-8 (`--accent-foreground`). Snow Storm unselected follow polar-0; selected follow frost-10. One glyph set for both themes. No per-theme paths.
- Construction is **outline**: svg `fill="none"` `stroke="currentColor"` `strokeWidth={1.3}` `strokeLinecap="round"` `strokeLinejoin="round"`. A path may set `fill="currentColor"` `stroke="none"` only for a solid dot (drive platter).
- Keep `FileIconKindId`, `FileIcon` props, and `resolveFileIconKind` / `EXTENSION_KIND` unchanged. Distinct path geometry per kind. Closed vs open folder are different shapes. File types use type-specific marks, not a shared dog-eared sheet.
- `{module}.{role}.{ext}`. Tests only under that unit’s `tests/` directory.
- Do not edit `apps/explorer`, `apps/terminal`, `file-icon.kinds.ts`, `file-icon.types.ts`, theme stylesheets, Tree chevron color, or `app.theme.css`.
- Patch changeset for `@gencore/ui-kit` only (`feat: outline FileIcon glyphs that inherit theme text color`). Terminal is private — no app changeset.
- Stage **only** the files listed in the task. Never `git add -A`.
- Conventional commits. No Cursor/AI attribution trailers (`Co-authored-by: Cursor`, `Made-with: Cursor`, or similar).
- Work in place on the current branch. Do not create a worktree or switch branches unless asked.
- Do not bump major versions.
- Superpowers files stay under `.superpowers/docs/`. Do not write `docs/superpowers/`.

---

## File map

**ui-kit**

- Modify: `packages/ui-kit/tests/primitives/file-icon/file-icon.test.tsx`
- Modify: `packages/ui-kit/src/primitives/file-icon/file-icon.component.tsx`
- Modify: `packages/ui-kit/src/primitives/file-icon/file-icon.glyphs.tsx`
- Create: `.changeset/file-icon-monochrome.md`

Do not modify `file-icon.kinds.ts`, `file-icon.types.ts`, `file-icon/index.ts`, Tree, Terminal, or Explorer.

---

### Task 1: Outline FileIcon glyphs and theme-inherited stroke

**Files:**
- Modify: `packages/ui-kit/tests/primitives/file-icon/file-icon.test.tsx`
- Modify: `packages/ui-kit/src/primitives/file-icon/file-icon.component.tsx`
- Modify: `packages/ui-kit/src/primitives/file-icon/file-icon.glyphs.tsx`
- Create: `.changeset/file-icon-monochrome.md`

**Interfaces:**
- Consumes: `resolveFileIconKind({ nodeKind, extension, open })` → `FileIconKindId` (unchanged). `FileIconProps` unchanged. Tree row `color` (`text-foreground` / `text-accent-foreground`).
- Produces: `FileIcon` svg with `fill="none"` `stroke="currentColor"` `stroke-width="1.3"` `stroke-linecap="round"` `stroke-linejoin="round"`. `FileIconGlyph({ kind }: { kind: FileIconKindId })` returns geometry `ReactNode` with no fill callback and no `KIND_FILL`.

- [ ] **Step 1: Write the failing paint tests**

In `packages/ui-kit/tests/primitives/file-icon/file-icon.test.tsx`, keep every `resolveFileIconKind` test and the `data-kind` tests. Add these two cases inside `describe("FileIcon")` (after the existing `data-kind` tests, before the geometry test). Replace `serializeGlyphGeometry` with the version below so `rect` / `circle` attributes participate in uniqueness:

```tsx
  it("strokes with inherited currentColor", () => {
    const { container } = render(<FileIcon nodeKind="file" extension="ts" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("fill", "none");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("stroke-width", "1.3");
    expect(svg).toHaveAttribute("stroke-linecap", "round");
    expect(svg).toHaveAttribute("stroke-linejoin", "round");
  });

  it("does not paint glyphs with Nord variables", () => {
    for (const props of Object.values(KIND_INPUT)) {
      const { container, unmount } = render(<FileIcon {...props} />);
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();

      for (const value of paintValues(svg as Element)) {
        expect(value.includes("--nord"), value).toBe(false);
        expect(value === "none" || value === "currentColor", value).toBe(true);
      }

      unmount();
    }
  });
```

Replace the helper at the bottom of the file with:

```tsx
function serializeGlyphGeometry(svg: Element | null): string {
  if (!svg) {
    return "";
  }

  const keys = ["d", "fill-rule", "cx", "cy", "r", "x", "y", "width", "height", "rx", "ry"];

  return [...svg.children]
    .map((node) => {
      const tag = node.tagName.toLowerCase();
      const bits = keys.map((key) => node.getAttribute(key) ?? "");
      return [tag, ...bits].join(":");
    })
    .join("|");
}

function paintValues(root: Element): string[] {
  const values: string[] = [];

  const visit = (el: Element) => {
    for (const name of ["fill", "stroke"] as const) {
      const value = el.getAttribute(name);
      if (value) {
        values.push(value);
      }
    }

    for (const child of el.children) {
      visit(child);
    }
  };

  visit(root);
  return values;
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```sh
pnpm --filter @gencore/ui-kit exec vitest run tests/primitives/file-icon/file-icon.test.tsx
```

Expected: FAIL. `strokes with inherited currentColor` fails because the svg has no `stroke="currentColor"` / `fill="none"` / `stroke-width="1.3"`. `does not paint glyphs with Nord variables` fails because paths still have `fill="var(--nord-…)"`. Do not implement yet.

- [ ] **Step 3: Apply outline stroke on the svg**

Replace `packages/ui-kit/src/primitives/file-icon/file-icon.component.tsx` with:

```tsx
import { cn } from "../../lib/cn";
import { FileIconGlyph } from "./file-icon.glyphs";
import { resolveFileIconKind } from "./file-icon.kinds";
import type { FileIconProps } from "./file-icon.types";

export function FileIcon({ nodeKind, extension, open, className }: FileIconProps) {
  const kind = resolveFileIconKind({ nodeKind, extension, open });

  return (
    <svg
      data-slot="file-icon"
      data-kind={kind}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
      aria-hidden="true"
      focusable="false"
    >
      <FileIconGlyph kind={kind} />
    </svg>
  );
}
```

- [ ] **Step 4: Replace glyphs with the outline set**

Overwrite `packages/ui-kit/src/primitives/file-icon/file-icon.glyphs.tsx` with the file below. Do not keep `KIND_FILL`, `nordVar`, or a fill callback. Do not wrap glyphs in `<g>` (geometry tests serialize **direct** svg children).

```tsx
import type { ReactNode } from "react";
import type { FileIconKindId } from "./file-icon.types";

const GLYPHS: Record<FileIconKindId, ReactNode> = {
  drive: (
    <>
      <rect x="1.75" y="5.2" width="12.5" height="6.6" rx="1.15" />
      <circle cx="4.35" cy="8.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  folder: <path d="M2 12.75V4.75h3.4l1.15 1.6H14V12.75H2z" />,
  "folder-open": (
    <>
      <path d="M2 5.15h3.35l1.15 1.5H8" />
      <path d="M2.35 13.05 3.8 8.2h10.35L12.65 13.05z" />
    </>
  ),
  file: (
    <>
      <path d="M4.5 2.75h5.1L12.5 5.7v7.55H4.5z" />
      <path d="M9.6 2.75v2.95h2.9" />
    </>
  ),
  ts: (
    <>
      <rect x="2.6" y="2.6" width="10.8" height="10.8" rx="1.5" />
      <path d="M5.2 6.15h5.6M8 6.15v5.05" />
    </>
  ),
  tsx: (
    <>
      <rect x="2.6" y="2.6" width="10.8" height="10.8" rx="1.5" />
      <path d="M5.2 5.55h5.6M8 5.55v4.15" />
      <path d="M5.45 12.15h5.1" />
    </>
  ),
  js: <circle cx="8" cy="8" r="5.7" />,
  jsx: (
    <>
      <circle cx="8" cy="8" r="5.7" />
      <path d="M5.6 8h4.8M8 5.6v4.8" />
    </>
  ),
  json: (
    <path d="M6.15 3.35c-1.7 0-2.35.85-2.35 2.05 0 .85.4 1.35 1.35 1.65-1 .3-1.35.8-1.35 1.65 0 1.2.65 2.05 2.35 2.05M9.85 3.35c1.7 0 2.35.85 2.35 2.05 0 .85-.4 1.35-1.35 1.65 1 .3 1.35.8 1.35 1.65 0 1.2-.65 2.05-2.35 2.05" />
  ),
  toml: <path d="M3 4.15h10M3 8h10M3 11.85h10" />,
  yaml: <path d="M3 4.15h10M3 8h7.4M3 11.85h4.8" />,
  xml: <path d="M6.45 2.85 2.15 8l4.3 5.15M9.55 2.85 13.85 8l-4.3 5.15" />,
  html: (
    <>
      <path d="M5.85 2.85 2.15 8l3.7 5.15M10.15 2.85 13.85 8l-3.7 5.15" />
      <path d="M9.35 3.1 6.65 12.9" />
    </>
  ),
  css: <path d="M6.15 2.6v10.8M9.85 2.6v10.8M2.6 6.15h10.8M2.6 9.85h10.8" />,
  md: <path d="M3.1 12.35V3.65h2.15l2.75 5 2.75-5H12.9v8.7" />,
  txt: <path d="M3.1 3.55h9.8M3.1 6.35h9.8M3.1 9.15h9.8M3.1 11.95h6.4" />,
  rs: <path d="M8 1.85 13.7 5.15v5.7L8 14.15 2.3 10.85v-5.7z" />,
  py: (
    <>
      <circle cx="8" cy="5.05" r="2.55" />
      <circle cx="8" cy="10.95" r="2.55" />
    </>
  ),
  go: <path d="M4.35 4.55h7.3a3.45 3.45 0 1 1 0 6.9h-7.3a3.45 3.45 0 1 1 0-6.9z" />,
  java: (
    <>
      <path d="M4.15 3.15h7.1v6.05c0 1.95-1.55 3.2-3.55 3.2s-3.55-1.25-3.55-3.2z" />
      <path d="M11.25 5.35h1.15c1.05 0 1.9.8 1.9 1.8s-.85 1.8-1.9 1.8h-1.15" />
    </>
  ),
  c: <path d="M11.55 4.25A5.35 5.35 0 1 0 11.55 11.75" />,
  cpp: (
    <>
      <path d="M10.35 4.35A5.15 5.15 0 1 0 10.35 11.65" />
      <path d="M11.15 6.35h3.3M12.8 4.7v3.3" />
    </>
  ),
  cs: (
    <>
      <path d="M10.35 4.35A5.15 5.15 0 1 0 10.35 11.65" />
      <rect x="10.85" y="6.05" width="3.35" height="3.35" rx="0.4" />
    </>
  ),
  sh: (
    <>
      <path d="M3.15 3.55 10.15 8 3.15 12.45z" />
      <path d="M11.15 11.05h2.7" />
    </>
  ),
  ps1: <path d="M9.55 1.85 4.35 8.15h3.15L5.15 14.15l6.55-7.7H8.5z" />,
  sql: (
    <>
      <path d="M3.15 4.15c0-1.2 2.15-2.15 4.85-2.15s4.85.95 4.85 2.15v7.7c0 1.2-2.15 2.15-4.85 2.15s-4.85-.95-4.85-2.15z" />
      <path d="M3.15 4.15c0 1.2 2.15 2.15 4.85 2.15s4.85-.95 4.85-2.15" />
    </>
  ),
  svg: <path d="M8 1.85 14.15 8 8 14.15 1.85 8z" />,
  image: (
    <>
      <rect x="2.45" y="3.45" width="11.1" height="9.1" rx="1" />
      <circle cx="6.05" cy="6.35" r="1.05" />
      <path d="M2.7 10.55 5.85 7.55l2.1 2.15 2.15-2.95 3.15 3.8" />
    </>
  ),
  audio: (
    <>
      <path d="M2.55 6.15h2.85L9.15 3.15v9.7L5.4 9.85H2.55z" />
      <path d="M11.05 6.15c.95.7.95 2.95 0 3.65" />
    </>
  ),
  video: <path d="M3.55 2.85 13.15 8 3.55 13.15z" />,
  pdf: (
    <>
      <path d="M5.15 1.85h5.7L13.45 4.9v9.25H5.15z" />
      <path d="M1.85 6.85h3.3v5.7" />
    </>
  ),
  archive: (
    <>
      <path d="M2.15 6.35h11.7v7.45H2.15z" />
      <path d="M8 2.25 13.85 6.35H2.15z" />
    </>
  ),
  exe: (
    <>
      <rect x="2.35" y="2.85" width="11.3" height="2.35" rx="0.4" />
      <rect x="2.35" y="5.2" width="11.3" height="7.95" rx="0.4" />
    </>
  ),
  lock: (
    <>
      <path d="M8 2.15a2.65 2.65 0 0 1 2.65 2.65v2.05H9.15V4.8a1.15 1.15 0 0 0-2.3 0v2.05H5.35V4.8A2.65 2.65 0 0 1 8 2.15z" />
      <rect x="4.15" y="7.35" width="7.7" height="6.35" rx="0.7" />
    </>
  ),
  env: (
    <path d="M4.15 8.05a2.35 2.35 0 1 1 2.15 1.2h2.85V7.5h1.2v1.75h1.15V7.5h1.2v2.95H6.3A2.35 2.35 0 0 1 4.15 8.05z" />
  ),
  git: (
    <>
      <circle cx="8" cy="3.7" r="1.35" />
      <circle cx="4.15" cy="12.2" r="1.35" />
      <circle cx="11.85" cy="12.2" r="1.35" />
      <path d="M8 5.05v2.15L5.35 10.7M8 7.2l2.65 3.5" />
    </>
  ),
  docker: (
    <path d="M2 8.35h3.35v3.35H2zM5.7 8.35h3.35v3.35H5.7zM9.4 8.35h3.35v3.35H9.4zM3.85 4.65h3.35v3.35H3.85z" />
  ),
  font: <path d="M8 2.55 13.45 13.45H11.1l-1-2.55H5.9l-1 2.55H2.55zm-1.55 6.55h3.1" />,
  log: (
    <path d="M3.45 3.15h8.55a1.4 1.4 0 0 1 0 2.8H5.55v5.35h6.45a1.4 1.4 0 0 1 0 2.8H3.45" />
  ),
};

export function FileIconGlyph({ kind }: { kind: FileIconKindId }) {
  return GLYPHS[kind];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```sh
pnpm --filter @gencore/ui-kit exec vitest run tests/primitives/file-icon/file-icon.test.tsx
```

Expected: PASS. All `resolveFileIconKind` cases still pass. `strokes with inherited currentColor` and `does not paint glyphs with Nord variables` pass. `renders a distinct path geometry for each kind` still has 39 unique serializations. If geometry collides, the assertion names the other kind — change only that kind’s `d` / `cx` / `cy` / `r` / rect box, do not merge kinds.

- [ ] **Step 6: Add the patch changeset**

Create `.changeset/file-icon-monochrome.md`:

```md
---
"@gencore/ui-kit": patch
---

feat: outline FileIcon glyphs that inherit theme text color
```

- [ ] **Step 7: Commit**

Stage **only** the four files listed in this task:

```sh
git add packages/ui-kit/tests/primitives/file-icon/file-icon.test.tsx packages/ui-kit/src/primitives/file-icon/file-icon.component.tsx packages/ui-kit/src/primitives/file-icon/file-icon.glyphs.tsx .changeset/file-icon-monochrome.md
git commit -m "$(cat <<'EOF'
feat(ui-kit): outline FileIcon glyphs that inherit theme text color

EOF
)"
```

If the commit-msg hook rewrites the message, create a **new** commit. Do not `--amend` a hook rejection. Do not add `Co-authored-by: Cursor` or `Made-with: Cursor`.

Optional visual check (not a test gate): Terminal Files tab on Polar Night (snow-4 icons, frost-8 on the selected row) and Snow Storm (polar-0 icons, frost-10 on the selected row).

---

## Self-review

**Spec coverage**

- One color / `currentColor` / drop `KIND_FILL` → Task 1 steps 3–4.
- Polar Night snow-4 / frost-8 and Snow Storm polar-0 / frost-10 via inherited row text → Task 1 (no theme CSS edits; Tree already sets the classes).
- Outline 1.3px round caps/joins on the svg → Task 1 step 3.
- Redraw every `FileIconKindId`, unique geometry, distinct folder open/closed, type-specific marks → Task 1 step 4 + existing geometry test.
- Kind resolver and props unchanged → not modified.
- Tests: unique geometry, svg stroke attrs, no `var(--nord-*)`, resolver kept → Task 1 steps 1 and 5.
- Patch changeset, no Terminal/Explorer edits → Task 1 step 6; file map.

**Placeholders:** none.

**Types:** `FileIconGlyph({ kind }: { kind: FileIconKindId })` still takes only `kind`. `GLYPHS` is `Record<FileIconKindId, ReactNode>`. `FileIcon` props unchanged.
