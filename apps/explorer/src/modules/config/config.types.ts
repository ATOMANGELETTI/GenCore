export interface ExplorerConfigV1 {
  readonly version: 1;
  readonly showHiddenFiles: boolean;
  readonly showFileExtensions: boolean;
  readonly confirmBeforeDelete: boolean;
}

export interface ConfigContextValue extends ExplorerConfigV1 {
  setShowHiddenFiles: (value: boolean) => void;
  setShowFileExtensions: (value: boolean) => void;
  setConfirmBeforeDelete: (value: boolean) => void;
}
