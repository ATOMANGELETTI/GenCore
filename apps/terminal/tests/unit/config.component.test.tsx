import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Config } from "../../src/modules/config/config.component";
import type { ConfigContextValue } from "../../src/modules/config/config.types";

const setPreference = vi.fn();

vi.mock("../../src/modules/config/config.hook", () => ({
  useConfig: (): ConfigContextValue => ({
    preference: "system",
    setPreference,
    resolvedTheme: "polar-night",
  }),
}));

describe("Config", () => {
  beforeEach(() => {
    setPreference.mockClear();
  });

  it("renders CONFIG, Appearance, and three theme radios", () => {
    render(<Config />);

    expect(screen.getByText("CONFIG")).toBeVisible();
    expect(screen.getByText("Appearance")).toBeVisible();
    const group = screen.getByRole("radiogroup", { name: "Theme" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Polar Night/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Snow Storm/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Match system/ })).toBeInTheDocument();
  });

  it("checks Match system when preference is system even if resolved theme is Polar Night", () => {
    render(<Config />);

    expect(screen.getByRole("radio", { name: /Match system/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: /Polar Night/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("calls setPreference('snow-storm') when Snow Storm is clicked", async () => {
    const user = userEvent.setup();
    render(<Config />);

    await user.click(screen.getByRole("radio", { name: /Snow Storm/ }));
    expect(setPreference).toHaveBeenCalledTimes(1);
    expect(setPreference).toHaveBeenCalledWith("snow-storm");
  });
});
