import * as React from "react";
import { clearApiKey, getAgentSettings, setAgentSettings, setApiKey } from "../ipc/ipc.assistant";

/** Mirrors `gencore_assistant::secrets::DEFAULT_MODEL`. */
export const DEFAULT_AGENT_MODEL = "gemini-3.7-flash";

/** Mirrors `gencore_assistant::secrets::DEFAULT_CONTEXT_LINES`. */
export const DEFAULT_AGENT_CONTEXT_LINES = 80;

export interface AgentSettingsValue {
  readonly model: string;
  readonly contextLines: number;
  readonly hasApiKey: boolean;
  readonly setModel: (model: string) => void;
  readonly setContextLines: (lines: number) => void;
  readonly saveKey: (key: string) => Promise<void>;
  readonly clearKey: () => Promise<void>;
  readonly replaceKey: () => void;
}

const DEFAULT_AGENT_SETTINGS: AgentSettingsValue = {
  model: DEFAULT_AGENT_MODEL,
  contextLines: DEFAULT_AGENT_CONTEXT_LINES,
  hasApiKey: false,
  setModel: () => undefined,
  setContextLines: () => undefined,
  saveKey: async () => undefined,
  clearKey: async () => undefined,
  replaceKey: () => undefined,
};

/**
 * Shared across `config.agent.ts` and the assistant module's test-only stub
 * provider so `useAgentSettings()` resolves to the same value however it is
 * supplied.
 */
export const AgentSettingsContext = React.createContext<AgentSettingsValue>(DEFAULT_AGENT_SETTINGS);

export function useAgentSettingsState(): AgentSettingsValue {
  const [model, setModelState] = React.useState(DEFAULT_AGENT_MODEL);
  const [contextLines, setContextLinesState] = React.useState(DEFAULT_AGENT_CONTEXT_LINES);
  const [hasApiKey, setHasApiKey] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void getAgentSettings()
      .then((settings) => {
        if (cancelled) {
          return;
        }
        setModelState(settings.model);
        setContextLinesState(settings.context_lines);
        setHasApiKey(settings.has_api_key);
      })
      .catch(() => {
        // Keep defaults when Tauri IPC is unavailable (tests, first run).
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setModel = React.useCallback((next: string) => {
    setModelState(next);
    void setAgentSettings({ model: next }).catch(() => {
      // Optimistic update stays; the next successful fetch reconciles state.
    });
  }, []);

  const setContextLines = React.useCallback((next: number) => {
    setContextLinesState(next);
    void setAgentSettings({ context_lines: next }).catch(() => {
      // Optimistic update stays; the next successful fetch reconciles state.
    });
  }, []);

  const saveKey = React.useCallback(async (key: string) => {
    try {
      await setApiKey(key);
      setHasApiKey(true);
    } catch {
      // Best-effort; the unsaved-key input stays visible so the user can retry.
    }
  }, []);

  const clearKey = React.useCallback(async () => {
    try {
      await clearApiKey();
      setHasApiKey(false);
    } catch {
      // Best-effort; the saved-key view stays until a clear actually succeeds.
    }
  }, []);

  // Only flips the local view back to the unsaved-key input; the stored key
  // is untouched until `saveKey` persists a replacement.
  const replaceKey = React.useCallback(() => {
    setHasApiKey(false);
  }, []);

  return React.useMemo(
    () => ({
      model,
      contextLines,
      hasApiKey,
      setModel,
      setContextLines,
      saveKey,
      clearKey,
      replaceKey,
    }),
    [model, contextLines, hasApiKey, setModel, setContextLines, saveKey, clearKey, replaceKey],
  );
}

export function AgentSettingsProvider({ children }: { children: React.ReactNode }) {
  const value = useAgentSettingsState();
  return React.createElement(AgentSettingsContext.Provider, { value }, children);
}

export function useAgentSettings(): AgentSettingsValue {
  return React.useContext(AgentSettingsContext);
}
