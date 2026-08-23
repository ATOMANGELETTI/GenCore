import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Config } from "../../src/modules/config/config.component";
import type { ConfigContextValue } from "../../src/modules/config/config.types";

const setPreference = vi.fn();
const setPoshTheme = vi.fn();

const configState = {
  preference: "system" as const,
  resolvedTheme: "polar-night" as const,
  poshTheme: "gencore" as const,
};

vi.mock("../../src/modules/config/config.hook", () => ({
  useConfig: (): ConfigContextValue => ({
    preference: configState.preference,
    setPreference,
    resolvedTheme: configState.resolvedTheme,
    poshTheme: configState.poshTheme,
    setPoshTheme,
  }),
}));

const setModel = vi.fn();
const setContextLines = vi.fn();
const saveKey = vi.fn();
const clearKey = vi.fn();
const replaceKey = vi.fn();

const agentSettingsState = {
  model: "gemini-3.7-flash",
  contextLines: 80,
  hasApiKey: false,
};

vi.mock("../../src/modules/config/config.agent", () => ({
  useAgentSettings: () => ({
    model: agentSettingsState.model,
    contextLines: agentSettingsState.contextLines,
    hasApiKey: agentSettingsState.hasApiKey,
    setModel,
    setContextLines,
    saveKey,
    clearKey,
    replaceKey,
  }),
}));

describe("Config", () => {
  beforeEach(() => {
    setPreference.mockClear();
    setPoshTheme.mockClear();
    setModel.mockClear();
    setContextLines.mockClear();
    saveKey.mockReset();
    saveKey.mockResolvedValue(true);
    clearKey.mockClear();
    replaceKey.mockClear();
    configState.preference = "system";
    configState.resolvedTheme = "polar-night";
    configState.poshTheme = "gencore";
    agentSettingsState.model = "gemini-3.7-flash";
    agentSettingsState.contextLines = 80;
    agentSettingsState.hasApiKey = false;
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

  describe("Prompt Theme section", () => {
    it("renders the Prompt Theme label and all 7 themes", () => {
      render(<Config />);

      expect(screen.getByText("Prompt Theme")).toBeVisible();
      const group = screen.getByRole("radiogroup", { name: "Prompt Theme" });
      expect(group).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /GenCore/ })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /Bubbles/ })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /iTerm2/ })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /Wholespace/ })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /Wopian/ })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /Clean Detailed/ })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /Kali/ })).toBeInTheDocument();
    });

    it("checks GenCore by default", () => {
      render(<Config />);

      expect(screen.getByRole("radio", { name: /GenCore/ })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      expect(screen.getByRole("radio", { name: /Bubbles/ })).toHaveAttribute(
        "aria-checked",
        "false",
      );
    });

    it("calls setPoshTheme('bubbles') when Bubbles is clicked", async () => {
      const user = userEvent.setup();
      render(<Config />);

      await user.click(screen.getByRole("radio", { name: /Bubbles/ }));
      expect(setPoshTheme).toHaveBeenCalledTimes(1);
      expect(setPoshTheme).toHaveBeenCalledWith("bubbles");
    });

    it("calls setPoshTheme('kali') when Kali is clicked", async () => {
      const user = userEvent.setup();
      render(<Config />);

      await user.click(screen.getByRole("radio", { name: /Kali/ }));
      expect(setPoshTheme).toHaveBeenCalledTimes(1);
      expect(setPoshTheme).toHaveBeenCalledWith("kali");
    });
  });

  describe("Assistant section", () => {
    it("renders the Assistant label and a Model radiogroup with four radios", () => {
      render(<Config />);

      expect(screen.getByText("Assistant")).toBeVisible();
      const group = screen.getByRole("radiogroup", { name: "Model" });
      expect(within(group).getAllByRole("radio")).toHaveLength(4);
      expect(screen.getByRole("radio", { name: "gemini-3.7-flash" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "gemini-3.5-flash" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "gemini-3.5-flash-lite" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "gemini-3.1-pro-preview" })).toBeInTheDocument();
    });

    it("checks gemini-3.7-flash by default", () => {
      render(<Config />);

      expect(screen.getByRole("radio", { name: "gemini-3.7-flash" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      expect(screen.getByRole("radio", { name: "gemini-3.5-flash" })).toHaveAttribute(
        "aria-checked",
        "false",
      );
    });

    it("calls setModel when another model radio is clicked", async () => {
      const user = userEvent.setup();
      render(<Config />);

      await user.click(screen.getByRole("radio", { name: "gemini-3.5-flash-lite" }));
      expect(setModel).toHaveBeenCalledWith("gemini-3.5-flash-lite");
    });

    it("shows a password key input and Save button when no key is saved", () => {
      render(<Config />);

      const input = screen.getByLabelText("Gemini API key");
      expect(input).toHaveAttribute("type", "password");
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });

    it("calls saveKey and clears the draft once the save succeeds", async () => {
      const user = userEvent.setup();
      render(<Config />);

      await user.type(screen.getByLabelText("Gemini API key"), "secret-key");
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(saveKey).toHaveBeenCalledWith("secret-key");
      await waitFor(() => {
        expect(screen.getByLabelText("Gemini API key")).toHaveValue("");
      });
    });

    it("keeps the draft when saveKey resolves false (failed save)", async () => {
      saveKey.mockResolvedValueOnce(false);
      const user = userEvent.setup();
      render(<Config />);

      await user.type(screen.getByLabelText("Gemini API key"), "secret-key");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(saveKey).toHaveBeenCalledWith("secret-key");
      });
      expect(screen.getByLabelText("Gemini API key")).toHaveValue("secret-key");
    });

    it("shows the saved-key copy and never echoes the plaintext key", () => {
      agentSettingsState.hasApiKey = true;
      render(<Config />);

      expect(screen.getByText("Gemini API key")).toHaveClass("text-primary");
      expect(screen.getByText("Key saved · Windows DPAPI")).toBeVisible();
      expect(screen.queryByLabelText("Gemini API key")).toBeNull();
      expect(screen.getByRole("button", { name: "Replace" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    });

    it("calls clearKey from the saved-key actions", async () => {
      const user = userEvent.setup();
      agentSettingsState.hasApiKey = true;
      render(<Config />);

      await user.click(screen.getByRole("button", { name: "Clear" }));
      expect(clearKey).toHaveBeenCalledTimes(1);
    });

    it("Replace shows the draft input without flipping hasApiKey, and Cancel restores the saved-key row", async () => {
      const user = userEvent.setup();
      agentSettingsState.hasApiKey = true;
      render(<Config />);

      await user.click(screen.getByRole("button", { name: "Replace" }));

      expect(replaceKey).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText("Gemini API key")).toBeInTheDocument();
      expect(screen.queryByText("Key saved · Windows DPAPI")).toBeNull();

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByLabelText("Gemini API key")).toBeNull();
      expect(screen.getByText("Key saved · Windows DPAPI")).toBeVisible();
      expect(saveKey).not.toHaveBeenCalled();
    });

    it("exits the replacing draft once saveKey succeeds", async () => {
      const user = userEvent.setup();
      agentSettingsState.hasApiKey = true;
      render(<Config />);

      await user.click(screen.getByRole("button", { name: "Replace" }));
      await user.type(screen.getByLabelText("Gemini API key"), "new-secret");
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(saveKey).toHaveBeenCalledWith("new-secret");
      await waitFor(() => {
        expect(screen.queryByLabelText("Gemini API key")).toBeNull();
      });
      expect(screen.getByText("Key saved · Windows DPAPI")).toBeVisible();
    });
  });

  describe("Context section", () => {
    it("renders Terminal lines with a number input and a subtitle reflecting the current value", () => {
      render(<Config />);

      expect(screen.getByText("Terminal lines")).toBeVisible();
      expect(screen.getByText("Last 80 lines with each send")).toBeVisible();
      const input = screen.getByRole("spinbutton", { name: "Terminal lines" });
      expect(input).toHaveValue(80);
    });

    it("writes a valid in-range value", async () => {
      const user = userEvent.setup();
      render(<Config />);

      const input = screen.getByRole("spinbutton", { name: "Terminal lines" });
      await user.clear(input);
      await user.type(input, "150");

      expect(setContextLines).toHaveBeenCalledWith(150);
    });

    it("does not write for an empty or out-of-range value", async () => {
      const user = userEvent.setup();
      render(<Config />);

      const input = screen.getByRole("spinbutton", { name: "Terminal lines" });
      await user.clear(input);
      expect(setContextLines).not.toHaveBeenCalled();

      await user.type(input, "5");
      expect(setContextLines).not.toHaveBeenCalled();
    });
  });
});
