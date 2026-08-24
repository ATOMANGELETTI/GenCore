import type { ThemeName } from "@gencore/ui-kit";
import * as React from "react";
import { getWindowTheme, subscribeWindowTheme } from "../ipc/ipc.window";
import { loadConfig, saveConfig } from "./config.storage";
import type {
  BackgroundEffectType,
  ConfigContextValue,
  EffectInteractionMode,
  PoshThemeId,
  TerminalConfigV1,
  ThemePreference,
} from "./config.types";

const ConfigContext = React.createContext<ConfigContextValue | null>(null);

function mapOsTheme(value: "light" | "dark" | null): ThemeName {
  return value === "light" ? "snow-storm" : "polar-night";
}

export function useTerminalConfig(): ConfigContextValue {
  const initialConfig = React.useMemo(() => loadConfig(), []);
  const configRef = React.useRef<TerminalConfigV1>(initialConfig);
  const [preference, setPreferenceState] = React.useState<ThemePreference>(
    () => initialConfig.theme,
  );
  const [poshTheme, setPoshThemeState] = React.useState<PoshThemeId>(() => initialConfig.poshTheme);
  const [backgroundEffect, setBackgroundEffectState] = React.useState<BackgroundEffectType>(
    () => initialConfig.backgroundEffect,
  );
  const [effectInteraction, setEffectInteractionState] = React.useState<EffectInteractionMode>(
    () => initialConfig.effectInteraction,
  );
  const [effectOpacity, setEffectOpacityState] = React.useState<number>(
    () => initialConfig.effectOpacity,
  );
  const [effectSpeed, setEffectSpeedState] = React.useState<number>(
    () => initialConfig.effectSpeed,
  );
  const [osTheme, setOsTheme] = React.useState<ThemeName>("polar-night");

  const persist = React.useCallback((patch: Partial<TerminalConfigV1>) => {
    const updated: TerminalConfigV1 = {
      ...configRef.current,
      ...patch,
      version: 1,
    };
    configRef.current = updated;
    saveConfig(updated);
  }, []);

  const setPreference = React.useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      persist({ theme: next });
    },
    [persist],
  );

  const setPoshTheme = React.useCallback(
    (next: PoshThemeId) => {
      setPoshThemeState(next);
      persist({ poshTheme: next });
    },
    [persist],
  );

  const setBackgroundEffect = React.useCallback(
    (next: BackgroundEffectType) => {
      setBackgroundEffectState(next);
      persist({ backgroundEffect: next });
    },
    [persist],
  );

  const setEffectInteraction = React.useCallback(
    (next: EffectInteractionMode) => {
      setEffectInteractionState(next);
      persist({ effectInteraction: next });
    },
    [persist],
  );

  const setEffectOpacity = React.useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0.1), 1.0);
      setEffectOpacityState(clamped);
      persist({ effectOpacity: clamped });
    },
    [persist],
  );

  const setEffectSpeed = React.useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0.2), 2.0);
      setEffectSpeedState(clamped);
      persist({ effectSpeed: clamped });
    },
    [persist],
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

  return {
    preference,
    setPreference,
    resolvedTheme,
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
  };
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
