import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { trayAction } = vi.hoisted(() => ({
  trayAction: vi.fn(() => Promise.resolve()),
}));

const { getWindowTheme, subscribeWindowTheme } = vi.hoisted(() => ({
  getWindowTheme: vi.fn(() => Promise.resolve("dark" as const)),
  subscribeWindowTheme: vi.fn(async () => () => undefined),
}));

vi.mock("../../src/modules/ipc/ipc.tray", () => ({
  trayAction,
}));

vi.mock("../../src/modules/ipc/ipc.window", () => ({
  getWindowTheme,
  subscribeWindowTheme,
}));

describe("TrayMenuApp", () => {
  beforeEach(() => {
    trayAction.mockClear();
    getWindowTheme.mockClear();
    subscribeWindowTheme.mockClear();
    getWindowTheme.mockResolvedValue("dark");
    subscribeWindowTheme.mockResolvedValue(() => undefined);
  });

  it("renders Show, Hide, and Quit", async () => {
    const { TrayMenuApp } = await import("../../src/modules/tray-menu/tray-menu.component");
    render(<TrayMenuApp />);

    expect(screen.getByRole("menuitem", { name: "Show" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Hide" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Quit" })).toBeInTheDocument();
  });

  it("calls trayAction show when Show is clicked", async () => {
    const user = userEvent.setup();
    const { TrayMenuApp } = await import("../../src/modules/tray-menu/tray-menu.component");
    render(<TrayMenuApp />);

    await user.click(screen.getByRole("menuitem", { name: "Show" }));
    expect(trayAction).toHaveBeenCalledWith("show");
  });
});

describe("tray-menu.html", () => {
  it("makes html, body, and #root transparent for the overlay window", () => {
    const html = readFileSync(resolve(process.cwd(), "tray-menu.html"), "utf8");
    expect(html).toMatch(/html,\s*body,\s*#root\s*\{[^}]*background:\s*transparent/);
  });
});
