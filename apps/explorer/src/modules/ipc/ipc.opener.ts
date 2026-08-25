import { openPath, openUrl } from "@tauri-apps/plugin-opener";

export const GENCORE_REPO_URL = "https://github.com/ATOMANGELETTI/GenCore";

export function openRepoInBrowser(): Promise<void> {
  return openUrl(GENCORE_REPO_URL);
}

/** Opens a file with its OS default application. */
export function openFile(path: string): Promise<void> {
  return openPath(path);
}
