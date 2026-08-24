import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConfigContextValue } from "../../src/modules/config/config.types";
import { AllSettingsView } from "../../src/modules/config/subviews/all-settings-view.component";
import { AppearanceView } from "../../src/modules/config/subviews/appearance-view.component";
import { AssistantView } from "../../src/modules/config/subviews/assistant-view.component";
import { EffectsView } from "../../src/modules/config/subviews/effects-view.component";
import { PromptView } from "../../src/modules/config/subviews/prompt-view.component";

const setPreference = vi.fn();
const setPoshTheme = vi.fn();
const setBackgroundEffect = vi.fn();
const setEffectInteraction = vi.fn();
const setEffectOpacity = vi.fn();
const setEffectSpeed = vi.fn();
const setDiffEditor = vi.fn();

const configState = {
  preference: "system" as const,
  resolvedTheme: "polar-night" as const,
  poshTheme: "gencore" as const,
  backgroundEffect: "particles" as const,
  effectInteraction: "repel" as const,
  effectOpacity: 0.5,
  effectSpeed: 1.0,
  diffEditor: "monaco" as const,
};

vi.mock("../../src/modules/config/config.hook", () => ({
  useConfig: (): ConfigContextValue => ({
    preference: configState.preference,
    setPreference,
    resolvedTheme: configState.resolvedTheme,
    poshTheme: configState.poshTheme,
    setPoshTheme,
    backgroundEffect: configState.backgroundEffect,
    setBackgroundEffect,
    effectInteraction: configState.effectInteraction,
    setEffectInteraction,
    effectOpacity: configState.effectOpacity,
    setEffectOpacity,
    effectSpeed: configState.effectSpeed,
    setEffectSpeed,
    diffEditor: configState.diffEditor,
    setDiffEditor,
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

describe("Config subviews", () => {
  beforeEach(() => {
    setPreference.mockClear();
    setPoshTheme.mockClear();
    setBackgroundEffect.mockClear();
    setEffectInteraction.mockClear();
    setEffectOpacity.mockClear();
    setEffectSpeed.mockClear();
    setModel.mockClear();
    setContextLines.mockClear();
    saveKey.mockReset();
    saveKey.mockResolvedValue(true);
    clearKey.mockClear();
    replaceKey.mockClear();
  });

  it("renders AppearanceView and handles click", async () => {
    const user = userEvent.setup();
    render(<AppearanceView />);

    expect(screen.getByText("Appearance")).toBeVisible();
    await user.click(screen.getByRole("radio", { name: /Snow Storm/ }));
    expect(setPreference).toHaveBeenCalledWith("snow-storm");
  });

  it("renders EffectsView and handles interactions", async () => {
    const user = userEvent.setup();
    render(<EffectsView />);

    expect(screen.getByText("Background Effect")).toBeVisible();
    await user.click(screen.getByRole("radio", { name: /Molecules/ }));
    expect(setBackgroundEffect).toHaveBeenCalledWith("molecules");
  });

  it("renders PromptView and handles theme selection", async () => {
    const user = userEvent.setup();
    render(<PromptView />);

    expect(screen.getByText("Prompt Theme")).toBeVisible();
    await user.click(screen.getByRole("radio", { name: /Bubbles/ }));
    expect(setPoshTheme).toHaveBeenCalledWith("bubbles");
  });

  it("renders AssistantView and handles model selection", async () => {
    const user = userEvent.setup();
    render(<AssistantView />);

    expect(screen.getByText("Assistant")).toBeVisible();
    await user.click(screen.getByRole("radio", { name: "gemini-3.5-flash" }));
    expect(setModel).toHaveBeenCalledWith("gemini-3.5-flash");
  });

  it("renders AllSettingsView containing all sections", () => {
    render(<AllSettingsView />);
    expect(screen.getByText("Appearance")).toBeVisible();
    expect(screen.getByText("Background Effect")).toBeVisible();
    expect(screen.getByText("Prompt Theme")).toBeVisible();
    expect(screen.getByText("Assistant")).toBeVisible();
  });
});
