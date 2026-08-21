import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TrayMenu, TrayMenuItem, TrayMenuSeparator } from "../../../src/composites/tray-menu";

describe("TrayMenu", () => {
  it("renders Show, Hide, and Quit items", () => {
    render(
      <TrayMenu>
        <TrayMenuItem>Show</TrayMenuItem>
        <TrayMenuItem>Hide</TrayMenuItem>
        <TrayMenuSeparator />
        <TrayMenuItem variant="destructive">Quit</TrayMenuItem>
      </TrayMenu>,
    );

    expect(screen.getByRole("menuitem", { name: "Show" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Hide" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Quit" })).toBeInTheDocument();
  });

  it("marks Quit with the destructive item variant", () => {
    render(
      <TrayMenu>
        <TrayMenuItem>Show</TrayMenuItem>
        <TrayMenuItem variant="destructive">Quit</TrayMenuItem>
      </TrayMenu>,
    );

    const quit = screen.getByRole("menuitem", { name: "Quit" });
    expect(quit).toHaveAttribute("data-variant", "destructive");
    expect(quit).toHaveClass("text-destructive");
  });

  it("fires onSelect when Show is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <TrayMenu>
        <TrayMenuItem onSelect={onSelect}>Show</TrayMenuItem>
      </TrayMenu>,
    );

    await user.click(screen.getByRole("menuitem", { name: "Show" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("uses menuContentVariants popover chrome", () => {
    render(
      <TrayMenu>
        <TrayMenuItem>Show</TrayMenuItem>
      </TrayMenu>,
    );

    const menu = screen.getByRole("menu");
    expect(menu).toHaveAttribute("data-slot", "tray-menu");
    expect(menu).toHaveClass("border-border");
    expect(menu).toHaveClass("bg-popover");
  });
});
