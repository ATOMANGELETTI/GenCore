import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentSettings } from "../../src/modules/ipc/ipc.types";

const { getAgentSettings, setAgentSettings, setApiKey, clearApiKey } = vi.hoisted(() => ({
  getAgentSettings: vi.fn(),
  setAgentSettings: vi.fn(),
  setApiKey: vi.fn(),
  clearApiKey: vi.fn(),
}));

vi.mock("../../src/modules/ipc/ipc.assistant", () => ({
  getAgentSettings,
  setAgentSettings,
  setApiKey,
  clearApiKey,
}));

import { AgentSettingsProvider, useAgentSettings } from "../../src/modules/config/config.agent";

const IDLE_SETTINGS: AgentSettings = {
  model: "gemini-3.7-flash",
  context_lines: 80,
  has_api_key: false,
};

function Probe() {
  const agent = useAgentSettings();
  return (
    <div>
      <span data-testid="model">{agent.model}</span>
      <span data-testid="context-lines">{agent.contextLines}</span>
      <span data-testid="has-key">{String(agent.hasApiKey)}</span>
      <button type="button" onClick={() => agent.setModel("gemini-3.5-flash")}>
        set-model
      </button>
      <button type="button" onClick={() => agent.setContextLines(150)}>
        set-context-lines
      </button>
      <button type="button" onClick={() => void agent.saveKey("secret-key")}>
        save-key
      </button>
      <button type="button" onClick={() => void agent.clearKey()}>
        clear-key
      </button>
      <button type="button" onClick={() => agent.replaceKey()}>
        replace-key
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AgentSettingsProvider>
      <Probe />
    </AgentSettingsProvider>,
  );
}

describe("useAgentSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAgentSettings.mockResolvedValue(IDLE_SETTINGS);
    setAgentSettings.mockResolvedValue(IDLE_SETTINGS);
    setApiKey.mockResolvedValue(undefined);
    clearApiKey.mockResolvedValue(undefined);
  });

  it("defaults to gemini-3.7-flash, 80 context lines, and no key before the fetch resolves", () => {
    getAgentSettings.mockImplementation(() => new Promise(() => {}));
    renderProbe();

    expect(screen.getByTestId("model")).toHaveTextContent("gemini-3.7-flash");
    expect(screen.getByTestId("context-lines")).toHaveTextContent("80");
    expect(screen.getByTestId("has-key")).toHaveTextContent("false");
  });

  it("loads model, context lines, and has_api_key from getAgentSettings on mount", async () => {
    getAgentSettings.mockResolvedValue({
      model: "gemini-3.5-flash-lite",
      context_lines: 120,
      has_api_key: true,
    });
    renderProbe();

    await waitFor(() => {
      expect(screen.getByTestId("model")).toHaveTextContent("gemini-3.5-flash-lite");
    });
    expect(screen.getByTestId("context-lines")).toHaveTextContent("120");
    expect(screen.getByTestId("has-key")).toHaveTextContent("true");
  });

  it("keeps defaults when getAgentSettings rejects", async () => {
    getAgentSettings.mockRejectedValue(new Error("no ipc"));
    renderProbe();

    await waitFor(() => {
      expect(getAgentSettings).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("model")).toHaveTextContent("gemini-3.7-flash");
    expect(screen.getByTestId("context-lines")).toHaveTextContent("80");
    expect(screen.getByTestId("has-key")).toHaveTextContent("false");
  });

  it("setModel writes through setAgentSettings and updates state optimistically", async () => {
    const user = userEvent.setup();
    renderProbe();
    await waitFor(() => expect(getAgentSettings).toHaveBeenCalledTimes(1));

    await user.click(screen.getByText("set-model"));

    expect(screen.getByTestId("model")).toHaveTextContent("gemini-3.5-flash");
    expect(setAgentSettings).toHaveBeenCalledWith({ model: "gemini-3.5-flash" });
  });

  it("setContextLines writes through setAgentSettings and updates state optimistically", async () => {
    const user = userEvent.setup();
    renderProbe();
    await waitFor(() => expect(getAgentSettings).toHaveBeenCalledTimes(1));

    await user.click(screen.getByText("set-context-lines"));

    expect(screen.getByTestId("context-lines")).toHaveTextContent("150");
    expect(setAgentSettings).toHaveBeenCalledWith({ context_lines: 150 });
  });

  it("saveKey calls setApiKey and flips hasApiKey to true", async () => {
    const user = userEvent.setup();
    renderProbe();
    await waitFor(() => expect(getAgentSettings).toHaveBeenCalledTimes(1));

    await user.click(screen.getByText("save-key"));

    await waitFor(() => {
      expect(setApiKey).toHaveBeenCalledWith("secret-key");
    });
    await waitFor(() => {
      expect(screen.getByTestId("has-key")).toHaveTextContent("true");
    });
  });

  it("saveKey resolves true on success and false when setApiKey rejects", async () => {
    const user = userEvent.setup();
    setApiKey.mockRejectedValueOnce(new Error("dpapi failed"));
    let lastResult: boolean | undefined;

    function ResultProbe() {
      const agent = useAgentSettings();
      return (
        <button
          type="button"
          onClick={() => {
            void agent.saveKey("secret-key").then((result) => {
              lastResult = result;
            });
          }}
        >
          save-key-result
        </button>
      );
    }

    render(
      <AgentSettingsProvider>
        <ResultProbe />
      </AgentSettingsProvider>,
    );
    await waitFor(() => expect(getAgentSettings).toHaveBeenCalledTimes(1));

    await user.click(screen.getByText("save-key-result"));
    await waitFor(() => expect(lastResult).toBe(false));

    await user.click(screen.getByText("save-key-result"));
    await waitFor(() => expect(lastResult).toBe(true));
  });

  it("clearKey calls clearApiKey and flips hasApiKey to false", async () => {
    const user = userEvent.setup();
    getAgentSettings.mockResolvedValue({
      model: "gemini-3.7-flash",
      context_lines: 80,
      has_api_key: true,
    });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("has-key")).toHaveTextContent("true"));

    await user.click(screen.getByText("clear-key"));

    await waitFor(() => {
      expect(clearApiKey).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByTestId("has-key")).toHaveTextContent("false");
    });
  });

  it("replaceKey does not flip hasApiKey or call any IPC (Config owns the local replacing draft)", async () => {
    const user = userEvent.setup();
    getAgentSettings.mockResolvedValue({
      model: "gemini-3.7-flash",
      context_lines: 80,
      has_api_key: true,
    });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("has-key")).toHaveTextContent("true"));

    await user.click(screen.getByText("replace-key"));

    expect(screen.getByTestId("has-key")).toHaveTextContent("true");
    expect(clearApiKey).not.toHaveBeenCalled();
    expect(setApiKey).not.toHaveBeenCalled();
  });
});
