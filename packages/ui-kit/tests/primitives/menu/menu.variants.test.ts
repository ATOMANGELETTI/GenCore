import { describe, expect, it } from "vitest";
import {
  dropdownMenuContentVariants,
  dropdownMenuItemVariants,
} from "../../../src/primitives/dropdown-menu/dropdown-menu.variants";
import {
  menuContentVariants,
  menuIndicatorItemVariants,
  menuItemVariants,
  menuLabelVariants,
  menuSeparatorVariants,
  menuShortcutVariants,
} from "../../../src/primitives/menu/menu.variants";

describe("menu.variants", () => {
  it("uses flat popover chrome with no shadow or gradient", () => {
    const content = menuContentVariants();
    expect(content).toContain("bg-popover");
    expect(content).toContain("text-popover-foreground");
    expect(content).toContain("border-border");
    expect(content).toContain("rounded-md");
    expect(content).toContain("p-1");
    expect(content).toContain("min-w-40");
    expect(content).not.toContain("shadow");
    expect(content).not.toContain("gradient");
    expect(content).not.toContain("origin-");
  });

  it("styles items with accent focus and a destructive variant", () => {
    expect(menuItemVariants()).toContain("focus:bg-accent");
    expect(menuItemVariants({ variant: "destructive" })).toContain("text-destructive");
    expect(menuItemVariants({ inset: true })).toContain("pl-8");
  });

  it("keeps indicator, label, separator, and shortcut chrome", () => {
    expect(menuIndicatorItemVariants()).toContain("pl-8");
    expect(menuLabelVariants()).toContain("text-foreground/70");
    expect(menuSeparatorVariants()).toContain("bg-border");
    expect(menuShortcutVariants()).toContain("tabular-nums");
  });

  it("lets dropdown content add only the dropdown transform origin", () => {
    const shared = menuContentVariants();
    const dropdown = dropdownMenuContentVariants();
    expect(dropdown).toContain(shared);
    expect(dropdown).toContain("origin-(--radix-dropdown-menu-content-transform-origin)");
    expect(dropdownMenuItemVariants({ variant: "destructive" })).toBe(
      menuItemVariants({ variant: "destructive" }),
    );
  });
});
