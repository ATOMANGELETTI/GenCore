import { describe, expect, it } from "vitest";
import { autoTitle, nextActiveId, sortTabs } from "../../src/modules/terminal/terminal.hook";

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
