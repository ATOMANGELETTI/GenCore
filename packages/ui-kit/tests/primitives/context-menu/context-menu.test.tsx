import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "../../../src/primitives/context-menu";
import {
  contextMenuContentVariants,
  contextMenuItemVariants,
} from "../../../src/primitives/context-menu/context-menu.variants";
import { menuContentVariants, menuItemVariants } from "../../../src/primitives/menu/menu.variants";

describe("ContextMenu", () => {
  it("opens on right-click and selects an item", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <span>Target</span>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={onSelect}>Minimize</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Target") });
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Minimize" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("applies shared chrome plus the context-menu transform origin", () => {
    expect(contextMenuContentVariants()).toContain(menuContentVariants());
    expect(contextMenuContentVariants()).toContain(
      "origin-(--radix-context-menu-content-transform-origin)",
    );
    expect(contextMenuItemVariants({ variant: "destructive" })).toBe(
      menuItemVariants({ variant: "destructive" }),
    );
  });

  it("marks a destructive item and renders a shortcut", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <span>Target</span>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem variant="destructive">
            Close
            <ContextMenuShortcut>Ctrl+W</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
        </ContextMenuContent>
      </ContextMenu>,
    );

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Target") });
    const item = await screen.findByRole("menuitem", { name: /Close/ });
    expect(item).toHaveAttribute("data-variant", "destructive");
    expect(item).toHaveClass("text-destructive");
    expect(screen.getByText("Ctrl+W")).toHaveAttribute("data-slot", "context-menu-shortcut");
  });
});
