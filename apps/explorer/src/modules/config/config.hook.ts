import * as React from "react";
import { DEFAULT_CONFIG, loadConfig, saveConfig } from "./config.storage";
import type { ConfigContextValue, ExplorerConfigV1 } from "./config.types";

const ConfigContext = React.createContext<ConfigContextValue | null>(null);

export function useExplorerConfigState(): ConfigContextValue {
  const initialConfig = React.useMemo(() => loadConfig(), []);
  const configRef = React.useRef<ExplorerConfigV1>(initialConfig);
  const [showHiddenFiles, setShowHiddenFilesState] = React.useState(
    () => initialConfig.showHiddenFiles,
  );
  const [showFileExtensions, setShowFileExtensionsState] = React.useState(
    () => initialConfig.showFileExtensions,
  );
  const [confirmBeforeDelete, setConfirmBeforeDeleteState] = React.useState(
    () => initialConfig.confirmBeforeDelete,
  );

  const persist = React.useCallback((patch: Partial<ExplorerConfigV1>) => {
    const updated: ExplorerConfigV1 = { ...configRef.current, ...patch, version: 1 };
    configRef.current = updated;
    saveConfig(updated);
  }, []);

  const setShowHiddenFiles = React.useCallback(
    (value: boolean) => {
      setShowHiddenFilesState(value);
      persist({ showHiddenFiles: value });
    },
    [persist],
  );

  const setShowFileExtensions = React.useCallback(
    (value: boolean) => {
      setShowFileExtensionsState(value);
      persist({ showFileExtensions: value });
    },
    [persist],
  );

  const setConfirmBeforeDelete = React.useCallback(
    (value: boolean) => {
      setConfirmBeforeDeleteState(value);
      persist({ confirmBeforeDelete: value });
    },
    [persist],
  );

  return {
    version: 1,
    showHiddenFiles,
    setShowHiddenFiles,
    showFileExtensions,
    setShowFileExtensions,
    confirmBeforeDelete,
    setConfirmBeforeDelete,
  };
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const value = useExplorerConfigState();
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
