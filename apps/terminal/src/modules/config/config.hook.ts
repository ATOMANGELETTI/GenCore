import type { ThemeName } from "@gencore/ui-kit";
import * as React from "react";
import { getWindowTheme, subscribeWindowTheme } from "../ipc/ipc.window";
import { loadConfig, saveConfig } from "./config.storage";
import type { ConfigContextValue, PoshThemeId, ThemePreference } from "./config.types";

const ConfigContext = React.createContext<ConfigContextValue | null>(null);

function mapOsTheme(value: "light" | "dark" | null): ThemeName {
  return value === "light" ? "snow-storm" : "polar-night";
}

export function useTerminalConfig(): ConfigContextValue {
  const initialConfig = React.useMemo(() => loadConfig(), []);
  const [preference, setPreferenceState] = React.useState<ThemePreference>(
    () => initialConfig.theme,
  );
  const [poshTheme, setPoshThemeState] = React.useState<PoshThemeId>(() => initialConfig.poshTheme);
  const [osTheme, setOsTheme] = React.useState<ThemeName>("polar-night");

  const setPreference = React.useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      saveConfig({ version: 1, theme: next, poshTheme });
    },
    [poshTheme],
  );

  const setPoshTheme = React.useCallback(
    (next: PoshThemeId) => {
      setPoshThemeState(next);
      saveConfig({ version: 1, theme: preference, poshTheme: next });
    },
    [preference],
  );

  React.useEffect(() => {
    if (preference !== "system") {
      return;
    }

    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      try {
        const osThemeValue = await getWindowTheme();
        if (!cancelled) {
          setOsTheme(mapOsTheme(osThemeValue));
        }
      } catch {
        if (!cancelled) {
          setOsTheme("polar-night");
        }
      }

      if (cancelled) {
        return;
      }

      try {
        const stop = await subscribeWindowTheme((value) => {
          setOsTheme(mapOsTheme(value));
        });
        if (cancelled) {
          stop();
          return;
        }
        unlisten = stop;
      } catch {
        // Stay on the last mapped theme when live updates are unavailable.
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [preference]);

  const resolvedTheme: ThemeName = preference === "system" ? osTheme : preference;

  return { preference, setPreference, resolvedTheme, poshTheme, setPoshTheme };
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const value = useTerminalConfig();
  return React.createElement(ConfigContext.Provider, { value }, children);
}

export function useOptionalConfig(): ConfigContextValue | null {
  return React.useContext(ConfigContext);
}

export function useConfig(): ConfigContextValue {
  const context = React.useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used inside a <ConfigProvider>");
  }
  return context;
}
