import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppShell } from "../../src/composites/app-shell";
import { ContextMenuContent, ContextMenuItem } from "../../src/primitives/context-menu";

describe("AppShell", () => {
  it("exposes titlebar, content, and statusbar landmarks", () => {
    render(
      <AppShell title="GenCore" version="0.1.0">
        <p>Workbench</p>
      </AppShell>,
    );

    expect(screen.getByRole("banner")).toHaveAttribute("data-slot", "titlebar");
    expect(screen.getByRole("main")).toHaveAttribute("data-slot", "content-area");
    expect(screen.getByRole("contentinfo")).toHaveAttribute("data-slot", "statusbar");
  });

  it("renders children inside the content area", () => {
    render(
      <AppShell title="GenCore">
        <p>Workbench</p>
      </AppShell>,
    );

    expect(screen.getByRole("main")).toHaveTextContent("Workbench");
  });

  it("fills every slot", () => {
    render(
      <AppShell
        title="GenCore"
        version="0.1.0"
        titlebarStart={<span>start</span>}
        titlebarEnd={<span>end</span>}
        statusbarStart={<span>Indexing</span>}
        statusbarEnd={<span>3 tasks</span>}
      >
        <p>Workbench</p>
      </AppShell>,
    );

    const titlebar = screen.getByRole("banner");
    const statusbar = screen.getByRole("contentinfo");

    expect(titlebar).toHaveTextContent("start");
    expect(titlebar).toHaveTextContent("end");
    expect(titlebar).toHaveTextContent("0.1.0");
    expect(statusbar).toHaveTextContent("Indexing");
    expect(statusbar).toHaveTextContent("3 tasks");
    expect(statusbar).not.toHaveTextContent("0.1.0");
  });

  it("falls back to the idle status label", () => {
    render(<AppShell title="GenCore">content</AppShell>);

    expect(screen.getByRole("contentinfo")).toHaveTextContent("Ready");
  });

  it("switches chrome heights with the density variant", () => {
    const { rerender } = render(<AppShell density="compact">content</AppShell>);
    const shell = () => screen.getByRole("main").parentElement as HTMLElement;

    expect(shell().className).toContain("[--gencore-titlebar-height:28px]");

    rerender(<AppShell density="comfortable">content</AppShell>);
    expect(shell().className).toContain("[--gencore-titlebar-height:32px]");
  });

  it("places sidebar and main as siblings under the body slot", () => {
    render(
      <AppShell title="GenCore" sidebar={<aside>Rail</aside>}>
        <p>Workbench</p>
      </AppShell>,
    );

    const body = document.querySelector('[data-slot="app-shell-body"]');
    const sidebar = screen.getByRole("complementary");
    const main = screen.getByRole("main");

    expect(body).not.toBeNull();
    expect(sidebar.parentElement).toBe(body);
    expect(main.parentElement).toBe(body);
    expect(sidebar).toHaveTextContent("Rail");
    expect(main).toHaveTextContent("Workbench");
    expect(screen.getByRole("banner")).toHaveAttribute("data-slot", "titlebar");
    expect(screen.getByRole("contentinfo")).toHaveAttribute("data-slot", "statusbar");
  });

  it("omits the body slot when sidebar is not passed", () => {
    render(
      <AppShell title="GenCore">
        <p>Workbench</p>
      </AppShell>,
    );

    expect(screen.getByRole("banner")).toHaveAttribute("data-slot", "titlebar");
    expect(screen.getByRole("main")).toHaveAttribute("data-slot", "content-area");
    expect(screen.getByRole("contentinfo")).toHaveAttribute("data-slot", "statusbar");
    expect(document.querySelector('[data-slot="app-shell-body"]')).toBeNull();
  });

  it("suppresses the native context menu on the shell root", () => {
    render(<AppShell title="GenCore">Workbench</AppShell>);
    const shell = document.querySelector("[data-slot='app-shell']") as HTMLElement;
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    shell.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("opens a titlebar context menu only when the titlebar slot is set", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AppShell title="GenCore">Workbench</AppShell>);
    await user.pointer({ keys: "[MouseRight]", target: screen.getByRole("banner") });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    rerender(
      <AppShell
        title="GenCore"
        titlebarContextMenu={
          <ContextMenuContent>
            <ContextMenuItem>Minimize</ContextMenuItem>
          </ContextMenuContent>
        }
      >
        Workbench
      </AppShell>,
    );

    await user.pointer({ keys: "[MouseRight]", target: screen.getByRole("banner") });
    expect(await screen.findByRole("menuitem", { name: "Minimize" })).toBeInTheDocument();
    expect(screen.getByRole("banner", { hidden: true })).toHaveAttribute("data-tauri-drag-region");
  });

  it("opens a content context menu only when the content slot is set", async () => {
    const user = userEvent.setup();
    render(
      <AppShell
        title="GenCore"
        sidebar={<aside>Rail</aside>}
        contentContextMenu={
          <ContextMenuContent>
            <ContextMenuItem>Copy</ContextMenuItem>
          </ContextMenuContent>
        }
      >
        Workbench
      </AppShell>,
    );

    await user.pointer({ keys: "[MouseRight]", target: screen.getByRole("complementary") });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.pointer({ keys: "[MouseRight]", target: screen.getByRole("main") });
    expect(await screen.findByRole("menuitem", { name: "Copy" })).toBeInTheDocument();
  });
});
