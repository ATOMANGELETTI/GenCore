import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOsTheme } from "../../src/modules/app/app.hook";

const { getWindowTheme, subscribeWindowTheme } = vi.hoisted(() => ({
  getWindowTheme: vi.fn(),
  subscribeWindowTheme: vi.fn(),
}));

vi.mock("../../src/modules/ipc/ipc.window", () => ({
  getWindowTheme,
  subscribeWindowTheme,
}));

function ThemeProbe() {
  const theme = useOsTheme();
  return <span data-testid="os-theme">{theme}</span>;
}

describe("useOsTheme", () => {
  beforeEach(() => {
    getWindowTheme.mockReset();
    subscribeWindowTheme.mockReset();
    getWindowTheme.mockResolvedValue("dark");
    subscribeWindowTheme.mockResolvedValue(() => undefined);
  });

  it("starts on polar-night and maps OS light to snow-storm", async () => {
    getWindowTheme.mockResolvedValueOnce("light");

    render(<ThemeProbe />);

    expect(screen.getByTestId("os-theme")).toHaveTextContent("polar-night");
    await waitFor(() => {
      expect(screen.getByTestId("os-theme")).toHaveTextContent("snow-storm");
    });
  });

  it("maps OS dark, null, and IPC failure to polar-night", async () => {
    getWindowTheme.mockResolvedValueOnce("dark");
    const { unmount } = render(<ThemeProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("os-theme")).toHaveTextContent("polar-night");
    unmount();

    getWindowTheme.mockResolvedValueOnce(null);
    subscribeWindowTheme.mockClear();
    const second = render(<ThemeProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("os-theme")).toHaveTextContent("polar-night");
    second.unmount();

    getWindowTheme.mockRejectedValueOnce(new Error("theme unavailable"));
    subscribeWindowTheme.mockClear();
    render(<ThemeProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("os-theme")).toHaveTextContent("polar-night");
  });

  it("flips polar-night to snow-storm when the subscribe handler reports light", async () => {
    let onTheme: ((theme: "light" | "dark") => void) | undefined;
    subscribeWindowTheme.mockImplementation(async (handler: (theme: "light" | "dark") => void) => {
      onTheme = handler;
      return () => undefined;
    });

    render(<ThemeProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("os-theme")).toHaveTextContent("polar-night");

    act(() => {
      onTheme?.("light");
    });
    expect(screen.getByTestId("os-theme")).toHaveTextContent("snow-storm");
  });

  it("unlistens on unmount", async () => {
    const unlisten = vi.fn();
    subscribeWindowTheme.mockResolvedValueOnce(unlisten);

    const { unmount } = render(<ThemeProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));
    unmount();
    expect(unlisten).toHaveBeenCalledTimes(1);
  });
});
