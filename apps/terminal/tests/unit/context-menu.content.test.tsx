import { ContextMenu, ContextMenuTrigger } from "@gencore/ui-kit";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContentContextMenu } from "../../src/modules/context-menu/context-menu.content";

function renderContentMenu() {
  return render(
    <ContextMenu>
      <ContextMenuTrigger>
        <span>Pane</span>
      </ContextMenuTrigger>
      <ContentContextMenu />
    </ContextMenu>,
  );
}

describe("ContentContextMenu", () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("lists Cut, Copy, Paste, and Select All with shortcuts", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve("x")) },
    });

    renderContentMenu();

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Pane") });
    expect(await screen.findByRole("menuitem", { name: /Cut/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Copy/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Paste/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Select All/ })).toBeInTheDocument();
    expect(screen.getByText("Ctrl+X")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+C")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+V")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+A")).toBeInTheDocument();
  });

  it("disables Cut and Copy when there is no selection after the menu opens", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve("x")) },
    });

    renderContentMenu();
    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Pane") });

    expect(await screen.findByRole("menuitem", { name: /Cut/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("menuitem", { name: /Copy/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("enables Cut and Copy when a non-empty selection is present when the menu opens", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve("x")) },
    });

    renderContentMenu();
    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Pane") });
    const paste = await screen.findByRole("menuitem", { name: /Paste/ });
    await waitFor(() => {
      expect(paste).not.toHaveAttribute("aria-disabled", "true");
    });
    await user.keyboard("{Escape}");

    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "hello",
    } as Selection);

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Pane") });

    const cut = await screen.findByRole("menuitem", { name: /Cut/ });
    const copy = screen.getByRole("menuitem", { name: /Copy/ });
    await waitFor(() => {
      expect(cut).not.toHaveAttribute("aria-disabled", "true");
      expect(copy).not.toHaveAttribute("aria-disabled", "true");
    });
  });

  it("disables Paste when canReadClipboard / readText fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.reject(new Error("denied"))) },
    });

    renderContentMenu();
    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Pane") });

    const paste = await screen.findByRole("menuitem", { name: /Paste/ });
    await waitFor(() => {
      expect(paste).toHaveAttribute("aria-disabled", "true");
    });
  });
});
