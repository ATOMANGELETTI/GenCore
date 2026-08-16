import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "../../src/composites/app-shell";

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
    expect(statusbar).toHaveTextContent("Indexing");
    expect(statusbar).toHaveTextContent("3 tasks");
    expect(statusbar).toHaveTextContent("0.1.0");
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
});
