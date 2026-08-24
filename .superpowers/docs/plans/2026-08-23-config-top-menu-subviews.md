# Config Tab Top Menu & Category Subviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an authentic Cursor-style top icon menu bar and category subviews in the Terminal app's Config tab, featuring left-aligned category icons, an overflow/actions dropdown on the right, and seamless Polar Night subviews.

**Architecture:** Split the monolithic Config component into a dedicated `ConfigToolbar` and modular subviews (`AppearanceView`, `EffectsView`, `PromptView`, `AssistantView`, and `AllSettingsView`). Manage active subview state with localStorage persistence and full WAI-ARIA keyboard navigation.

**Tech Stack:** React 19, TypeScript, Lucide React, Radix UI primitives (`DropdownMenu`, `Tooltip`), Tailwind CSS v4, Vitest, Testing Library.

**Spec:** `.superpowers/docs/specs/2026-08-23-config-top-menu-subviews-design.md`

## Global Constraints

- Nord color palette hex tokens only.
- Seamless dark Polar Night background across toolbar and body (`bg-card` / `bg-background`).
- Strict modular naming: `{module}.{role}.{ext}` under `src/modules/config/`.
- No inline `window.__TAURI__` references; typed IPC only.
- Accessibility: ARIA `tablist` / `tab` / `tabpanel`, ArrowLeft/Right navigation, accessible tooltips.
- Stable versions only (React 19.2, Vite 8, Tauri 2, Tailwind 4).

---

### Task 1: Subview Types and Persistence Storage

**Files:**
- Modify: `apps/terminal/src/modules/config/config.types.ts`
- Modify: `apps/terminal/src/modules/config/config.storage.ts`
- Test: `apps/terminal/tests/unit/config.storage.test.ts`

**Interfaces:**
- Consumes: Existing config storage functions in `config.storage.ts`.
- Produces: `ConfigSubviewId` (`"appearance" | "effects" | "prompt" | "assistant" | "all"`), `CONFIG_SUBVIEWS`, `readActiveSubview()`, `writeActiveSubview(id: ConfigSubviewId)`.

- [ ] **Step 1: Write the failing tests for subview persistence**

```typescript
// in apps/terminal/tests/unit/config.storage.test.ts
import { readActiveSubview, writeActiveSubview } from "../../src/modules/config/config.storage";

describe("active subview storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to 'appearance' when nothing stored", () => {
    expect(readActiveSubview()).toBe("appearance");
  });

  it("writes and reads back a valid subview", () => {
    writeActiveSubview("effects");
    expect(readActiveSubview()).toBe("effects");
  });

  it("falls back to 'appearance' on invalid stored value", () => {
    localStorage.setItem("gencore:config:active-subview", "invalid-view");
    expect(readActiveSubview()).toBe("appearance");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test config.storage.test.ts`
Expected: FAIL with `readActiveSubview` is not defined.

- [ ] **Step 3: Implement subview types and storage helpers**

Add to `apps/terminal/src/modules/config/config.types.ts`:
```typescript
export type ConfigSubviewId = "appearance" | "effects" | "prompt" | "assistant" | "all";
```

Add to `apps/terminal/src/modules/config/config.storage.ts`:
```typescript
const ACTIVE_SUBVIEW_KEY = "gencore:config:active-subview";
const VALID_SUBVIEWS: readonly ConfigSubviewId[] = [
  "appearance",
  "effects",
  "prompt",
  "assistant",
  "all",
];

export function readActiveSubview(): ConfigSubviewId {
  try {
    const raw = localStorage.getItem(ACTIVE_SUBVIEW_KEY);
    if (raw && (VALID_SUBVIEWS as readonly string[]).includes(raw)) {
      return raw as ConfigSubviewId;
    }
  } catch {
    // fallback
  }
  return "appearance";
}

export function writeActiveSubview(id: ConfigSubviewId): void {
  try {
    localStorage.setItem(ACTIVE_SUBVIEW_KEY, id);
  } catch {
    // ignore
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal test config.storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/config/config.types.ts apps/terminal/src/modules/config/config.storage.ts apps/terminal/tests/unit/config.storage.test.ts
git commit -m "feat(terminal): add config subview types and storage persistence"
```

---

### Task 2: Config Toolbar Component with Category Icons & Dropdown

**Files:**
- Create: `apps/terminal/src/modules/config/config.toolbar.tsx`
- Test: `apps/terminal/tests/unit/config.toolbar.test.tsx`

**Interfaces:**
- Consumes: `ConfigSubviewId`, `Button`, `Tooltip`, `TooltipProvider`, `TooltipContent`, `TooltipTrigger` from `@gencore/ui-kit`, `Palette`, `Sparkles`, `Terminal`, `Bot`, `ChevronDown` from `lucide-react`.
- Produces: `ConfigToolbar` component with props `{ activeSubview: ConfigSubviewId; onSelectSubview: (id: ConfigSubviewId) => void; onResetActive?: () => void; }`.

- [ ] **Step 1: Write failing test for ConfigToolbar**

```typescript
// in apps/terminal/tests/unit/config.toolbar.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfigToolbar } from "../../src/modules/config/config.toolbar";

describe("ConfigToolbar", () => {
  it("renders 4 category tabs and overflow button", () => {
    const onSelect = vi.fn();
    render(<ConfigToolbar activeSubview="appearance" onSelectSubview={onSelect} />);

    expect(screen.getByRole("tab", { name: /Appearance/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Background Effects/i })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: /Shell Prompt/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /AI Assistant/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /More categories/i })).toBeInTheDocument();
  });

  it("calls onSelectSubview when a category tab is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ConfigToolbar activeSubview="appearance" onSelectSubview={onSelect} />);

    await user.click(screen.getByRole("tab", { name: /Background Effects/i }));
    expect(onSelect).toHaveBeenCalledWith("effects");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test config.toolbar.test.tsx`
Expected: FAIL with `ConfigToolbar` not found.

- [ ] **Step 3: Implement ConfigToolbar component**

Create `apps/terminal/src/modules/config/config.toolbar.tsx`:
- Render 4 icon buttons on left with `role="tab"` inside a `role="tablist"` container.
- Use stroke SVG icons from `lucide-react`: `Palette` (Appearance), `Sparkles` (Effects), `Terminal` (Prompt), `Bot` (Assistant).
- Apply Cursor-style active pill styling: `h-7 w-7 rounded-md p-0` with `aria-selected=true` getting `bg-accent/80 text-accent-foreground ring-1 ring-primary/30`.
- ArrowLeft / ArrowRight keyboard navigation across tabs.
- Right side: `ChevronDown` button triggering a clean dropdown menu containing "All Settings", the 4 direct category jumps with active checkmark indicators, and "Reset Section".

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal test config.toolbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/config/config.toolbar.tsx apps/terminal/tests/unit/config.toolbar.test.tsx
git commit -m "feat(terminal): add Cursor-style ConfigToolbar with icons and dropdown"
```

---

### Task 3: Scaffold Modular Subview Components

**Files:**
- Create: `apps/terminal/src/modules/config/subviews/appearance-view.component.tsx`
- Create: `apps/terminal/src/modules/config/subviews/effects-view.component.tsx`
- Create: `apps/terminal/src/modules/config/subviews/prompt-view.component.tsx`
- Create: `apps/terminal/src/modules/config/subviews/assistant-view.component.tsx`
- Create: `apps/terminal/src/modules/config/subviews/all-settings-view.component.tsx`
- Test: `apps/terminal/tests/unit/config.subviews.test.tsx`

**Interfaces:**
- Consumes: `useConfig()`, `useAgentSettings()`, `THEME_OPTIONS`, `BACKGROUND_EFFECT_OPTIONS`, `INTERACTION_OPTIONS`, `POSH_THEME_OPTIONS`.
- Produces: `AppearanceView`, `EffectsView`, `PromptView`, `AssistantView`, `AllSettingsView`.

- [ ] **Step 1: Write failing tests for each subview**

```typescript
// in apps/terminal/tests/unit/config.subviews.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppearanceView } from "../../src/modules/config/subviews/appearance-view.component";
import { EffectsView } from "../../src/modules/config/subviews/effects-view.component";
import { PromptView } from "../../src/modules/config/subviews/prompt-view.component";
import { AssistantView } from "../../src/modules/config/subviews/assistant-view.component";

describe("Config subviews", () => {
  it("renders AppearanceView", () => {
    render(<AppearanceView />);
    expect(screen.getByText("Appearance")).toBeVisible();
    expect(screen.getByRole("radio", { name: /Polar Night/ })).toBeInTheDocument();
  });

  it("renders EffectsView", () => {
    render(<EffectsView />);
    expect(screen.getByText("Background Effect")).toBeVisible();
  });

  it("renders PromptView", () => {
    render(<PromptView />);
    expect(screen.getByText("Prompt Theme")).toBeVisible();
  });

  it("renders AssistantView", () => {
    render(<AssistantView />);
    expect(screen.getByText("Assistant")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test config.subviews.test.tsx`
Expected: FAIL with subviews missing.

- [ ] **Step 3: Implement modular subview components**

Implement each subview with seamless flat rows, matching the user's selected Option 1A design:
- `AppearanceView`: Theme radios with checkmark indicators.
- `EffectsView`: Background effects radios, physics interaction radios, opacity slider + preset chips, speed slider + preset chips.
- `PromptView`: 7 Oh My Posh theme options with subtitles and prompt previews.
- `AssistantView`: Gemini API key with DPAPI save/replace/clear, model radio list, terminal lines numeric input.
- `AllSettingsView`: Combines all 4 subviews into one continuous scrollable view.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal test config.subviews.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/config/subviews/ apps/terminal/tests/unit/config.subviews.test.tsx
git commit -m "feat(terminal): implement modular config subview components"
```

---

### Task 4: Integrate ConfigToolbar and Subviews into Config Component

**Files:**
- Modify: `apps/terminal/src/modules/config/config.component.tsx`
- Modify: `apps/terminal/tests/unit/config.component.test.tsx`

**Interfaces:**
- Consumes: `ConfigToolbar`, `readActiveSubview`, `writeActiveSubview`, `AppearanceView`, `EffectsView`, `PromptView`, `AssistantView`, `AllSettingsView`.
- Produces: Refactored `Config` component rendering the toolbar at the top and the active subview inside a seamless `bg-card` scroll container.

- [ ] **Step 1: Update `config.component.test.tsx` for subview switching**

```typescript
// update apps/terminal/tests/unit/config.component.test.tsx
it("switches subviews when toolbar tabs are clicked", async () => {
  const user = userEvent.setup();
  render(<Config />);

  // Default is Appearance
  expect(screen.getByText("Appearance")).toBeVisible();

  // Click Effects tab
  await user.click(screen.getByRole("tab", { name: /Background Effects/i }));
  expect(screen.getByText("Background Effect")).toBeVisible();
  expect(screen.queryByText("Appearance")).toBeNull();

  // Click Prompt tab
  await user.click(screen.getByRole("tab", { name: /Shell Prompt/i }));
  expect(screen.getByText("Prompt Theme")).toBeVisible();
  expect(screen.queryByText("Background Effect")).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test config.component.test.tsx`
Expected: FAIL before refactoring.

- [ ] **Step 3: Refactor `Config` component in `config.component.tsx`**

Integrate `ConfigToolbar` at the top:
```tsx
export function Config() {
  const [activeSubview, setActiveSubview] = React.useState<ConfigSubviewId>(() => readActiveSubview());

  function handleSelectSubview(id: ConfigSubviewId) {
    setActiveSubview(id);
    writeActiveSubview(id);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <ConfigToolbar activeSubview={activeSubview} onSelectSubview={handleSelectSubview} />
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {activeSubview === "appearance" ? (
          <AppearanceView />
        ) : activeSubview === "effects" ? (
          <EffectsView />
        ) : activeSubview === "prompt" ? (
          <PromptView />
        ) : activeSubview === "assistant" ? (
          <AssistantView />
        ) : (
          <AllSettingsView />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify all tests pass**

Run: `pnpm --filter @gencore/terminal test`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/config/config.component.tsx apps/terminal/tests/unit/config.component.test.tsx
git commit -m "feat(terminal): wire ConfigToolbar and subviews into Config component"
```

---

### Task 5: Full Workspace Health Check & Visual Verification

**Files:**
- Workspace-wide verification.

- [ ] **Step 1: Run workspace lint and typecheck**

Run: `pnpm turbo run lint typecheck test`
Expected: All packages pass with 0 errors.

- [ ] **Step 2: Run cargo tests**

Run: `cargo test --workspace`
Expected: All Rust crates pass.

- [ ] **Step 3: Visual WebView2 Verification**

Inspect running Terminal app at dev port 5173 / WebView2:
- Category icons render cleanly on the top bar.
- Tooltips display on hover.
- Clicking each category instantly renders only that subview on a seamless dark background.
- Dropdown menu allows selecting "All Settings" and individual categories.
- Refreshing preserves the active category.
