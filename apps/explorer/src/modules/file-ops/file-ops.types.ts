export type ClipboardMode = "copy" | "cut";

export interface FileOpsClipboard {
  readonly paths: readonly string[];
  readonly mode: ClipboardMode;
}

export interface FileOpsApi {
  readonly clipboard: FileOpsClipboard | null;
  readonly busy: boolean;
  readonly error: string | null;
  clearError: () => void;
  copyToClipboard: (paths: readonly string[]) => void;
  cutToClipboard: (paths: readonly string[]) => void;
  pasteInto: (destinationDir: string) => Promise<void>;
  createNewFile: (dir: string, name: string) => Promise<void>;
  createNewDir: (dir: string, name: string) => Promise<void>;
  renameEntry: (path: string, newName: string) => Promise<string | null>;
  deleteEntries: (paths: readonly string[]) => Promise<void>;
}
