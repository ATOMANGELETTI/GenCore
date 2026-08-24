import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigProvider, useConfig, useTerminalConfig } from "../../src/modules/config/config.hook";
import { CONFIG_STORAGE_KEY } from "../../src/modules/config/config.storage";

restoreJsdomLocalStorage();

const { getWindowTheme, subscribeWindowTheme } = vi.hoisted(() => ({
  getWindowTheme: vi.fn(),
  subscribeWindowTheme: vi.fn(),
}));

vi.mock("../../src/modules/ipc/ipc.window", () => ({
  getWindowTheme,
  subscribeWindowTheme,
}));

function ConfigProbe() {
  const {
    preference,
    resolvedTheme,
    setPreference,
    poshTheme,
    setPoshTheme,
    backgroundEffect,
    setBackgroundEffect,
    effectInteraction,
    setEffectInteraction,
    effectOpacity,
    setEffectOpacity,
    effectSpeed,
    setEffectSpeed,
  } = useTerminalConfig();
  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <span data-testid="posh-theme">{poshTheme}</span>
      <span data-testid="background-effect">{backgroundEffect}</span>
      <span data-testid="effect-interaction">{effectInteraction}</span>
      <span data-testid="effect-opacity">{effectOpacity}</span>
      <span data-testid="effect-speed">{effectSpeed}</span>
      <button type="button" onClick={() => setPreference("snow-storm")}>
        snow
      </button>
      <button type="button" onClick={() => setPreference("polar-night")}>
        polar
      </button>
      <button type="button" onClick={() => setPoshTheme("bubbles")}>
        bubbles
      </button>
      <button type="button" onClick={() => setBackgroundEffect("orbs")}>
        orbs
      </button>
      <button type="button" onClick={() => setEffectInteraction("ripple")}>
        ripple
      </button>
      <button type="button" onClick={() => setEffectOpacity(0.8)}>
        opacity
      </button>
      <button type="button" onClick={() => setEffectSpeed(1.5)}>
        speed
      </button>
    </div>
  );
}

describe("useTerminalConfig", () => {
  beforeEach(() => {
    localStorage.clear();
    getWindowTheme.mockReset();
    subscribeWindowTheme.mockReset();
    getWindowTheme.mockResolvedValue("dark");
    subscribeWindowTheme.mockResolvedValue(() => undefined);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to system and maps OS light to snow-storm", async () => {
    getWindowTheme.mockResolvedValueOnce("light");
    render(<ConfigProbe />);
    expect(screen.getByTestId("preference")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("polar-night");
    await waitFor(() => {
      expect(screen.getByTestId("resolved")).toHaveTextContent("snow-storm");
    });
  });

  it("maps OS dark, null, and IPC failure to polar-night while preference stays system", async () => {
    getWindowTheme.mockResolvedValueOnce("dark");
    const first = render(<ConfigProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("preference")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("polar-night");
    first.unmount();

    getWindowTheme.mockResolvedValueOnce(null);
    subscribeWindowTheme.mockClear();
    const second = render(<ConfigProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("resolved")).toHaveTextContent("polar-night");
    second.unmount();

    getWindowTheme.mockRejectedValueOnce(new Error("theme unavailable"));
    subscribeWindowTheme.mockClear();
    render(<ConfigProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("preference")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("polar-night");
  });

  it("keeps snow-storm when preference is explicit even if OS is dark", async () => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ version: 1, theme: "snow-storm" }));
    render(<ConfigProbe />);
    expect(screen.getByTestId("preference")).toHaveTextContent("snow-storm");
    expect(screen.getByTestId("resolved")).toHaveTextContent("snow-storm");
    await waitFor(() => {
      expect(subscribeWindowTheme).not.toHaveBeenCalled();
    });
  });

  it("writes preference on setPreference and unsubscribes when leaving system", async () => {
    const unlisten = vi.fn();
    subscribeWindowTheme.mockResolvedValue(unlisten);
    render(<ConfigProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));

    act(() => {
      screen.getByText("snow").click();
    });

    expect(screen.getByTestId("preference")).toHaveTextContent("snow-storm");
    expect(screen.getByTestId("resolved")).toHaveTextContent("snow-storm");
    expect(JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) ?? "")).toEqual({
      version: 1,
      theme: "snow-storm",
      poshTheme: "gencore",
      backgroundEffect: "particles",
      effectInteraction: "repel",
      effectOpacity: 0.5,
      effectSpeed: 1.0,
    });
    await waitFor(() => {
      expect(unlisten).toHaveBeenCalledTimes(1);
    });
  });

  it("flips resolved theme when system preference hears OS light", async () => {
    let onTheme: ((theme: "light" | "dark") => void) | undefined;
    subscribeWindowTheme.mockImplementation(async (handler: (theme: "light" | "dark") => void) => {
      onTheme = handler;
      return () => undefined;
    });

    render(<ConfigProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));
    act(() => {
      onTheme?.("light");
    });
    expect(screen.getByTestId("preference")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("snow-storm");
  });

  it("loads poshTheme and updates it via setPoshTheme", async () => {
    render(<ConfigProbe />);
    expect(screen.getByTestId("posh-theme")).toHaveTextContent("gencore");

    act(() => {
      screen.getByText("bubbles").click();
    });

    expect(screen.getByTestId("posh-theme")).toHaveTextContent("bubbles");
    expect(JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) ?? "")).toEqual({
      version: 1,
      theme: "system",
      poshTheme: "bubbles",
      backgroundEffect: "particles",
      effectInteraction: "repel",
      effectOpacity: 0.5,
      effectSpeed: 1.0,
    });
  });

  it("updates backgroundEffect, effectInteraction, opacity, and speed", async () => {
    render(<ConfigProbe />);
    expect(screen.getByTestId("background-effect")).toHaveTextContent("particles");
    expect(screen.getByTestId("effect-interaction")).toHaveTextContent("repel");
    expect(screen.getByTestId("effect-opacity")).toHaveTextContent("0.5");
    expect(screen.getByTestId("effect-speed")).toHaveTextContent("1");

    act(() => {
      screen.getByText("orbs").click();
      screen.getByText("ripple").click();
      screen.getByText("opacity").click();
      screen.getByText("speed").click();
    });

    expect(screen.getByTestId("background-effect")).toHaveTextContent("orbs");
    expect(screen.getByTestId("effect-interaction")).toHaveTextContent("ripple");
    expect(screen.getByTestId("effect-opacity")).toHaveTextContent("0.8");
    expect(screen.getByTestId("effect-speed")).toHaveTextContent("1.5");

    expect(JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) ?? "")).toEqual({
      version: 1,
      theme: "system",
      poshTheme: "gencore",
      backgroundEffect: "orbs",
      effectInteraction: "ripple",
      effectOpacity: 0.8,
      effectSpeed: 1.5,
    });
  });
});

describe("ConfigProvider", () => {
  it("shares preference and backgroundEffect through useConfig", () => {
    function Child() {
      const { preference, poshTheme, backgroundEffect, effectOpacity } = useConfig();
      return (
        <div>
          <span data-testid="ctx-pref">{preference}</span>
          <span data-testid="ctx-posh">{poshTheme}</span>
          <span data-testid="ctx-effect">{backgroundEffect}</span>
          <span data-testid="ctx-opacity">{effectOpacity}</span>
        </div>
      );
    }

    localStorage.clear();
    render(
      <ConfigProvider>
        <Child />
      </ConfigProvider>,
    );
    expect(screen.getByTestId("ctx-pref")).toHaveTextContent("system");
    expect(screen.getByTestId("ctx-posh")).toHaveTextContent("gencore");
    expect(screen.getByTestId("ctx-effect")).toHaveTextContent("particles");
    expect(screen.getByTestId("ctx-opacity")).toHaveTextContent("0.5");
  });
});

function restoreJsdomLocalStorage(): void {
  const jsdomStorage = (window as unknown as { _localStorage?: Storage })._localStorage;
  if (!jsdomStorage) {
    return;
  }

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    enumerable: true,
    get: () => jsdomStorage,
  });
}
