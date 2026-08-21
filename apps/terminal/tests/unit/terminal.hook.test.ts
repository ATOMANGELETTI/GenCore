import { describe, expect, it } from "vitest";
import {
  autoTitle,
  canFlushPinnedSave,
  fromPinnedFile,
  nextActiveId,
  seamLine,
  sortTabs,
  toPinnedFile,
} from "../../src/modules/terminal/terminal.hook";

type PinnedTabSource = {
  id: string;
  name: string | null;
  pinned: boolean;
  cwd: string | null;
  scrollback: string;
  cols: number;
  rows: number;
};

describe("sortTabs", () => {
  it("sorts pinned tabs before unpinned and keeps relative order", () => {
    const tabs = [
      { id: "u1", pinned: false },
      { id: "p1", pinned: true },
      { id: "u2", pinned: false },
      { id: "p2", pinned: true },
    ];
    expect(sortTabs(tabs).map((t) => t.id)).toEqual(["p1", "p2", "u1", "u2"]);
  });
});

describe("autoTitle", () => {
  it("autoTitle uses PowerShell then the last path segment", () => {
    expect(autoTitle(null, null)).toBe("PowerShell");
    expect(autoTitle(null, "C:\\Users\\DUSTI\\GenCore")).toBe("GenCore");
    expect(autoTitle("Build", "C:\\Users\\DUSTI\\GenCore")).toBe("Build");
    expect(autoTitle(null, "C:\\")).toBe("C:\\");
  });
});

describe("nextActiveId", () => {
  it("keeps the current tab when closing a different tab", () => {
    const tabs = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(nextActiveId(tabs, "a", "b")).toBe("b");
  });

  it("selects the tab to the right, else the left, when closing the active tab", () => {
    const tabs = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(nextActiveId(tabs, "b", "b")).toBe("c");
    expect(nextActiveId(tabs, "c", "c")).toBe("b");
    expect(nextActiveId(tabs, "a", "a")).toBe("b");
  });

  it("returns null when closing the last tab", () => {
    expect(nextActiveId([{ id: "only" }], "only", "only")).toBeNull();
  });
});

function pinnedSource(id: string, overrides: Partial<PinnedTabSource> = {}): PinnedTabSource {
  return {
    id,
    name: null,
    pinned: true,
    cwd: "C:\\work",
    scrollback: "",
    cols: 80,
    rows: 24,
    ...overrides,
  };
}

describe("toPinnedFile", () => {
  it("toPinnedFile includes only pinned tabs and caps at 16", () => {
    const tabs = [
      ...Array.from({ length: 18 }, (_, i) =>
        pinnedSource(`p${i}`, { name: i === 0 ? "First" : null, scrollback: `out-${i}` }),
      ),
      pinnedSource("u1", { pinned: false, name: "Loose", scrollback: "nope" }),
    ];

    const file = toPinnedFile(tabs, "p0");

    expect(file.version).toBe(1);
    expect(file.activeId).toBe("p0");
    expect(file.tabs).toHaveLength(16);
    expect(file.tabs.map((tab) => tab.id)).toEqual(Array.from({ length: 16 }, (_, i) => `p${i}`));
    expect(file.tabs.some((tab) => tab.id === "u1")).toBe(false);
    expect(file.tabs[0]).toEqual({
      id: "p0",
      name: "First",
      cwd: "C:\\work",
      scrollback: "out-0",
      cols: 80,
      rows: 24,
    });
    expect(toPinnedFile(tabs, "u1").activeId).toBeNull();
  });

  it("toPinnedFile drops oldest serialized output over 256 KiB", () => {
    const overflow = `OLD-${"n".repeat(256 * 1024)}`;
    const file = toPinnedFile([pinnedSource("p0", { scrollback: overflow })], "p0");
    const bytes = new TextEncoder().encode(file.tabs[0]?.scrollback ?? "");

    expect(bytes.byteLength).toBeLessThanOrEqual(256 * 1024);
    expect(file.tabs[0]?.scrollback.startsWith("OLD-")).toBe(false);
    expect(file.tabs[0]?.scrollback.endsWith("n")).toBe(true);
  });
});

describe("fromPinnedFile", () => {
  it("fromPinnedFile ignores version !== 1 and returns null", () => {
    expect(fromPinnedFile({ version: 2, activeId: "x", tabs: [] })).toBeNull();
    expect(fromPinnedFile({ version: 1, activeId: null, tabs: [] })).toEqual({
      version: 1,
      activeId: null,
      tabs: [],
    });
  });
});

describe("seamLine", () => {
  it("seamLine is muted dashes up to 80", () => {
    expect(seamLine(120).length).toBe(80);
    expect(seamLine(40).length).toBe(40);
  });
});

describe("canFlushPinnedSave", () => {
  it("does not save before hydrate completes", () => {
    expect(canFlushPinnedSave({ hydrated: false, persistAllowed: false })).toBe(false);
    expect(canFlushPinnedSave({ hydrated: false, persistAllowed: true })).toBe(false);
  });

  it("does not save after hydrate when persist is not allowed", () => {
    expect(canFlushPinnedSave({ hydrated: true, persistAllowed: false })).toBe(false);
  });

  it("saves after hydrate when persist is allowed", () => {
    expect(canFlushPinnedSave({ hydrated: true, persistAllowed: true })).toBe(true);
  });
});
