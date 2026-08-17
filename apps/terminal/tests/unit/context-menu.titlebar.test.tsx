import { ContextMenu, ContextMenuTrigger } from "@gencore/ui-kit";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TitlebarContextMenu } from "../../src/modules/context-menu/context-menu.titlebar";

describe("TitlebarContextMenu", () => {
  it("lists Minimize, Maximize, and destructive Close and calls the handlers", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onMinimize = vi.fn();
    const onToggleMaximize = vi.fn();

    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <span>Bar</span>
        </ContextMenuTrigger>
        <TitlebarContextMenu
          onClose={onClose}
          onMinimize={onMinimize}
          onToggleMaximize={onToggleMaximize}
        />
      </ContextMenu>,
    );

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Bar") });
    await user.click(await screen.findByRole("menuitem", { name: "Minimize" }));
    expect(onMinimize).toHaveBeenCalledTimes(1);

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Bar") });
    await user.click(await screen.findByRole("menuitem", { name: "Maximize" }));
    expect(onToggleMaximize).toHaveBeenCalledTimes(1);

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Bar") });
    const close = await screen.findByRole("menuitem", { name: "Close" });
    expect(close).toHaveAttribute("data-variant", "destructive");
    await user.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
