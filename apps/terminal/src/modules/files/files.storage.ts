import type { FilesSubviewId } from "./files.types";

export const ACTIVE_FILES_SUBVIEW_KEY = "gencore:files:active-subview";
export const WORKSPACE_FOLDER_KEY = "gencore:files:workspace-folder";

const VALID_FILES_SUBVIEWS: ReadonlySet<string> = new Set(["explorer", "source-control"]);

export function readActiveFilesSubview(): FilesSubviewId {
  try {
    const raw = localStorage.getItem(ACTIVE_FILES_SUBVIEW_KEY);
    if (raw && VALID_FILES_SUBVIEWS.has(raw)) {
      return raw as FilesSubviewId;
    }
  } catch {
    // fallback to default
  }
  return "explorer";
}

export function writeActiveFilesSubview(id: FilesSubviewId): boolean {
  try {
    localStorage.setItem(ACTIVE_FILES_SUBVIEW_KEY, id);
    return true;
  } catch {
    return false;
  }
}

export function readWorkspaceFolder(): string | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_FOLDER_KEY);
    if (raw && typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }
  } catch {
    // fallback
  }
  return null;
}

export function writeWorkspaceFolder(folderPath: string | null): boolean {
  try {
    if (folderPath && folderPath.trim().length > 0) {
      localStorage.setItem(WORKSPACE_FOLDER_KEY, folderPath.trim());
    } else {
      localStorage.removeItem(WORKSPACE_FOLDER_KEY);
    }
    return true;
  } catch {
    return false;
  }
}
