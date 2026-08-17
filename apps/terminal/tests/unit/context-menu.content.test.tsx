import { ContextMenu, ContextMenuTrigger } from "@gencore/ui-kit";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContentContextMenu } from "../../src/modules/context-menu/context-menu.content";

describe("ContentContextMenu", () => {
  it("lists Cut, Copy, Paste, and Select All with shortcuts", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve("x")) },
    });

    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <span>Pane</span>
        </ContextMenuTrigger>
        <ContentContextMenu />
      </ContextMenu>,
    );

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Pane") });
    expect(await screen.findByRole("menuitem", { name: /Cut/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Copy/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Paste/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Select All/ })).toBeInTheDocument();
    expect(screen.getByText("Ctrl+X")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+C")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+V")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+A")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
