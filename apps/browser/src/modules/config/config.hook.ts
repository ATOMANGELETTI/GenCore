import * as React from "react";
import { useOsTheme } from "../app/app.hook";
import { DEFAULT_CONFIG, loadConfig, saveConfig } from "./config.storage";
import type {
  BrowserConfigV1,
  ConfigContextValue,
  SearchEngineId,
  ThemePreference,
} from "./config.types";

const ConfigContext = React.createContext<ConfigContextValue | null>(null);

export function useBrowserConfigState(): ConfigContextValue {
  const initialConfig = React.useMemo(() => loadConfig(), []);
  const configRef = React.useRef<BrowserConfigV1>(initialConfig);
  const [themePreference, setThemePreferenceState] = React.useState<ThemePreference>(
    () => initialConfig.themePreference,
  );
  const [homepageUrl, setHomepageUrlState] = React.useState(() => initialConfig.homepageUrl);
  const [searchEngineId, setSearchEngineIdState] = React.useState<SearchEngineId>(
    () => initialConfig.searchEngineId,
  );
  const [showBookmarksBar, setShowBookmarksBarState] = React.useState(
    () => initialConfig.showBookmarksBar,
  );
  const osTheme = useOsTheme();

  const persist = React.useCallback((patch: Partial<BrowserConfigV1>) => {
    const updated: BrowserConfigV1 = { ...configRef.current, ...patch, version: 1 };
    configRef.current = updated;
    saveConfig(updated);
  }, []);

  const setThemePreference = React.useCallback(
    (value: ThemePreference) => {
      setThemePreferenceState(value);
      persist({ themePreference: value });
    },
    [persist],
  );

  const setHomepageUrl = React.useCallback(
    (value: string) => {
      setHomepageUrlState(value);
      persist({ homepageUrl: value });
    },
    [persist],
  );

  const setSearchEngineId = React.useCallback(
    (value: SearchEngineId) => {
      setSearchEngineIdState(value);
      persist({ searchEngineId: value });
    },
    [persist],
  );

  const setShowBookmarksBar = React.useCallback(
    (value: boolean) => {
      setShowBookmarksBarState(value);
      persist({ showBookmarksBar: value });
    },
    [persist],
  );

  const resolvedTheme = themePreference === "system" ? osTheme : themePreference;

  return {
    version: 1,
    themePreference,
    setThemePreference,
    homepageUrl,
    setHomepageUrl,
    searchEngineId,
    setSearchEngineId,
    showBookmarksBar,
    setShowBookmarksBar,
    resolvedTheme,
  };
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const value = useBrowserConfigState();
  return React.createElement(ConfigContext.Provider, { value }, children);
}

export function useConfig(): ConfigContextValue {
  const context = React.useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used inside a <ConfigProvider>");
  }
  return context;
}

export { DEFAULT_CONFIG };
